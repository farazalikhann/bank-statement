import { useCallback, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf } from '../lib/pdf/loadPdf';
import { extractTextItems } from '../lib/pdf/extractTextItems';
import { analyzePage } from '../lib/pdf/analyzePage';
import { mapRowToColumns } from '../lib/pdf/mapRowToColumns';
import { mergeMultiLineRows } from '../lib/pdf/mergeMultiLineRows';
import {
  buildRepeatedRowFrequency,
  dropOrphanRows,
  stripPatternFurniture,
} from '../lib/pdf/filterJunkRows';
import { stitchCrossPageRows } from '../lib/pdf/stitchCrossPageRows';
import { detectColumnRoles } from '../lib/pdf/detectColumnRoles';
import { recoverMergedDateColumn } from '../lib/pdf/recoverMergedDateColumn';
import { looksLikeSummaryLine } from '../lib/pdf/textPatterns';
import { PdfProcessingError, wrapStageError } from '../lib/pdf/errors';
import type {
  CleanedRow,
  ColumnCluster,
  ColumnRole,
  DroppedRow,
  ExtractionStats,
  PageExtraction,
  RawRow,
} from '../lib/pdf/types';
import { refineColumnRoles } from '../lib/transactions/detectColumnShape';
import { computeFallbackYear, resolveDateFormat } from '../lib/transactions/parseDate';
import { buildTransactions } from '../lib/transactions/buildTransactions';
import { detectTransactionOrder } from '../lib/transactions/detectOrder';
import { extractSummaryBlocks } from '../lib/transactions/extractSummaryBlocks';
import type {
  ConfidenceLevel,
  DateFieldOrder,
  PageIntegrity,
  StatementSummary,
  SummaryItem,
  Transaction,
} from '../lib/transactions/types';

const DEFAULT_TOLERANCE_Y = 2;
// Tuned to sit above normal character/word kerning (~1-4px) but below a
// real column gutter — the whitespace-projection column detector treats any
// gap wider than this as a column boundary (see detectColumns.ts).
const DEFAULT_GAP_X = 6;

// Stable empty-array references for the "no document loaded yet" case —
// a fresh `[]` literal on every render would change identity each time,
// which breaks anything that depends on these in a useEffect dependency
// array (e.g. useEditableTransactions' re-seed effect), causing it to fire
// every render instead of only when the data actually changes.
const EMPTY_ROLES: ColumnRole[] = [];
const EMPTY_TRANSACTIONS: Transaction[] = [];
const EMPTY_INDICES: number[] = [];
const EMPTY_PAGE_INTEGRITY: PageIntegrity[] = [];
const EMPTY_CLEANED_ROWS: CleanedRow[] = [];
const EMPTY_DROPPED_ROWS: DroppedRow[] = [];
const EMPTY_STATEMENT_SUMMARY: StatementSummary = { items: [] };

function roleConfidence(
  role: ColumnRole,
  transaction: Transaction,
): ConfidenceLevel | null {
  switch (role) {
    case 'date':
      return transaction.confidence.date;
    case 'description':
      return transaction.confidence.description;
    case 'balance':
      return transaction.confidence.balance;
    case 'amount':
    case 'debit':
    case 'credit':
      return transaction.confidence.amount;
    default:
      return null;
  }
}

// Runs a pipeline sub-step, tagging any *unexpected* throw with the given
// stage. An error that's already a PdfProcessingError (thrown deeper inside,
// e.g. analyzePage's own row-grouping/column-detection split) is passed
// through untouched so the more specific tag wins.
function runStage<T>(kind: PdfProcessingError['kind'], context: string, fn: () => T): T {
  try {
    return fn();
  } catch (err) {
    if (err instanceof PdfProcessingError) throw err;
    throw wrapStageError(kind, context, err);
  }
}

interface DocumentCleanupData {
  perPage: {
    rawStats: ExtractionStats;
    columns: ColumnCluster[];
    kept: CleanedRow[];
    dropped: DroppedRow[];
    columnsMatchConsensus: boolean;
  }[];
  documentColumnRoles: ColumnRole[];
  rowsForRoleDetection: CleanedRow[];
}

export function usePdfExtraction() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [allPages, setAllPages] = useState<PageExtraction[] | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [currentPageNumber, setCurrentPageNumber] = useState(1);

  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [error, setError] = useState<PdfProcessingError | null>(null);

  const [toleranceY, setToleranceY] = useState(DEFAULT_TOLERANCE_Y);
  const [gapX, setGapX] = useState(DEFAULT_GAP_X);
  const [columnRoleOverrides, setColumnRoleOverrides] = useState<
    Partial<Record<number, ColumnRole>>
  >({});
  const [dateFormatOverride, setDateFormatOverride] =
    useState<DateFieldOrder | null>(null);

  const loadRequestId = useRef(0);

  const reset = useCallback(() => {
    loadRequestId.current += 1;
    setFileName(null);
    setDoc(null);
    setAllPages(null);
    setExtractionProgress(null);
    setCurrentPageNumber(1);
    setError(null);
    setIsLoadingFile(false);
    setColumnRoleOverrides({});
    setDateFormatOverride(null);
  }, []);

  const loadFile = useCallback(async (file: File) => {
    const requestId = ++loadRequestId.current;
    setFileName(null);
    setDoc(null);
    setAllPages(null);
    setExtractionProgress(null);
    setError(null);
    setColumnRoleOverrides({});
    setDateFormatOverride(null);
    setIsLoadingFile(true);

    try {
      let nextDoc: PDFDocumentProxy;
      try {
        nextDoc = await loadPdf(file);
      } catch (err) {
        throw err instanceof PdfProcessingError
          ? err
          : wrapStageError('load-failed', `"${file.name}" could not be opened`, err);
      }
      if (requestId !== loadRequestId.current) return;

      const total = nextDoc.numPages;
      const pages: PageExtraction[] = [];
      let hasText = false;

      for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
        try {
          const page = await nextDoc.getPage(pageNumber);
          const extraction = await extractTextItems(page);
          if (requestId !== loadRequestId.current) return;

          pages.push(extraction);
          if (extraction.items.length > 0) hasText = true;
          setExtractionProgress({ done: pageNumber, total });
        } catch (err) {
          throw wrapStageError(
            'text-extraction-failed',
            `Could not read text from page ${pageNumber} of "${file.name}"`,
            err,
          );
        }
      }

      if (!hasText) {
        throw new PdfProcessingError(
          'no-text-layer',
          `"${file.name}" has no extractable text.`,
        );
      }

      setFileName(file.name);
      setDoc(nextDoc);
      setAllPages(pages);
      setCurrentPageNumber(1);
    } catch (err) {
      if (requestId !== loadRequestId.current) return;
      setError(
        err instanceof PdfProcessingError
          ? err
          : wrapStageError('load-failed', `"${file.name}" could not be processed`, err),
      );
    } finally {
      if (requestId === loadRequestId.current) {
        setIsLoadingFile(false);
        setExtractionProgress(null);
      }
    }
  }, []);

  // Stage A: PDF text -> cleaned rows, stitched across page boundaries.
  // Expensive, independent of role/date overrides so tweaking a dropdown
  // doesn't re-run it. Returns { data, error } instead of throwing so a
  // failure mid-pipeline surfaces as a proper stage-tagged error instead of
  // crashing the render tree.
  const documentCleanup = useMemo((): {
    data: DocumentCleanupData | null;
    error: PdfProcessingError | null;
  } => {
    if (!allPages) return { data: null, error: null };

    try {
      const perPageAnalyzed = allPages.map((page, i) =>
        analyzePage(page.items, { toleranceY }, { gapX }, i + 1),
      );

      const perPageRawRows: RawRow[][] = runStage(
        'column-detection-failed',
        'Mapping rows to columns failed',
        () =>
          perPageAnalyzed.map((analyzed, i) =>
            analyzed.rows.map((row) => ({
              cells: mapRowToColumns(row, analyzed.columns),
              relativeY:
                allPages[i].pageHeight > 0 ? row.y / allPages[i].pageHeight : 0,
            })),
          ),
      );

      const { perPageFinal, perPageStripped, canonicalColumnCount } = runStage(
        'row-grouping-failed',
        'Row processing failed',
        () => {
          // Cross-page (not just adjacent) so a header/footer repeated
          // throughout the document is recognized regardless of how far
          // apart the pages are.
          const frequency = buildRepeatedRowFrequency(perPageRawRows);

          const perPageStripped = perPageRawRows.map((rawRows, pageIndex) =>
            stripPatternFurniture(rawRows, frequency, pageIndex === 0),
          );
          const perPageMerged = perPageStripped.map((stripped) =>
            mergeMultiLineRows(stripped.candidates),
          );
          // Only after each page's own furniture is gone do we let a
          // wrapped description continue across the page boundary.
          const stitchedPages = stitchCrossPageRows(perPageMerged);
          const perPageFinal = stitchedPages.map((merged) => dropOrphanRows(merged));

          const columnCountVotes = new Map<number, number>();
          for (const analyzed of perPageAnalyzed) {
            const count = analyzed.columns.length;
            columnCountVotes.set(count, (columnCountVotes.get(count) ?? 0) + 1);
          }
          let canonicalColumnCount = 0;
          let bestVotes = -1;
          for (const [count, votes] of columnCountVotes) {
            if (votes > bestVotes) {
              bestVotes = votes;
              canonicalColumnCount = count;
            }
          }

          return { perPageFinal, perPageStripped, canonicalColumnCount };
        },
      );

      // Summary lines (opening balance, totals) are excluded from the role-
      // detection sample even though they stay in `kept` for display — they
      // have no date, which would otherwise drag down the date column's
      // match rate and risk misclassifying it.
      const rowsForRoleDetection = perPageAnalyzed.flatMap((analyzed, i) =>
        analyzed.columns.length === canonicalColumnCount
          ? perPageFinal[i].kept.filter((row) => !looksLikeSummaryLine(row.cells))
          : [],
      );
      const documentColumnRoles = runStage(
        'role-assignment-failed',
        'Column role detection failed',
        () => detectColumnRoles(rowsForRoleDetection, canonicalColumnCount),
      );

      const perPage = perPageAnalyzed.map((analyzed, i) => ({
        rawStats: analyzed.stats,
        columns: analyzed.columns,
        kept: perPageFinal[i].kept,
        dropped: [...perPageStripped[i].dropped, ...perPageFinal[i].dropped],
        columnsMatchConsensus: analyzed.columns.length === canonicalColumnCount,
      }));

      return {
        data: { perPage, documentColumnRoles, rowsForRoleDetection },
        error: null,
      };
    } catch (err) {
      const taggedError =
        err instanceof PdfProcessingError
          ? err
          : wrapStageError('column-detection-failed', 'Processing this statement failed', err);
      return { data: null, error: taggedError };
    }
  }, [allPages, toleranceY, gapX]);

  // Stage B: cleaned rows -> typed transactions. Cheap (just reads already
  // -cleaned rows), so it's fine for this to re-run on every role/date
  // override change.
  const documentTransactions = useMemo(() => {
    if (!documentCleanup.data) {
      return { data: null, error: documentCleanup.error };
    }
    const cleanup = documentCleanup.data;

    try {
      const { roles: refinedRoles, shape: columnShape } = runStage(
        'role-assignment-failed',
        'Debit/Credit role refinement failed',
        () => refineColumnRoles(cleanup.rowsForRoleDetection, cleanup.documentColumnRoles),
      );

      const rawPerPageEffectiveRoles: ColumnRole[][] = cleanup.perPage.map((page) =>
        page.columns.map((_, index) => {
          const override = columnRoleOverrides[index];
          if (override) return override;
          return refinedRoles[index] ?? 'unknown';
        }),
      );

      // Last-resort recovery: if column detection still couldn't separate
      // Date from Description (roles/columns look fine otherwise, but Date
      // is mostly empty while Description visibly starts with a date most
      // of the time), split it back out here rather than shipping merged
      // text. A no-op for the common case where Date is already its own
      // column.
      const correctedPerPage = cleanup.perPage.map((page, pageIndex) => {
        const { rows: kept, roles: effectiveRoles } = recoverMergedDateColumn(
          page.kept,
          rawPerPageEffectiveRoles[pageIndex],
        );
        return { ...page, kept, effectiveRoles };
      });
      const perPageEffectiveRoles: ColumnRole[][] = correctedPerPage.map(
        (page) => page.effectiveRoles,
      );

      const { summaryItems, perPageTransactionRows, perPageTransactionRowIndices } =
        runStage('typing-failed', 'Extracting summary blocks failed', () => {
          const summaryItems: SummaryItem[] = [];
          const perPageTransactionRows: CleanedRow[][] = [];
          // Parallel to perPageTransactionRows: for each surviving row, its
          // index in the page's original `kept` array (which still includes
          // summary rows) — needed to map a transaction's confidence back
          // onto the right row of the raw per-page table, since summary
          // rows are excluded here but not there.
          const perPageTransactionRowIndices: number[][] = [];
          correctedPerPage.forEach((page, pageIndex) => {
            const dateIndex = perPageEffectiveRoles[pageIndex].indexOf('date');
            const { items, remainingRows, remainingIndices } = extractSummaryBlocks(
              page.kept,
              pageIndex + 1,
              dateIndex,
            );
            summaryItems.push(...items);
            perPageTransactionRows.push(remainingRows);
            perPageTransactionRowIndices.push(remainingIndices);
          });
          return { summaryItems, perPageTransactionRows, perPageTransactionRowIndices };
        });

      const allDateTexts: string[] = [];
      perPageTransactionRows.forEach((rows, pageIndex) => {
        const dateIndex = perPageEffectiveRoles[pageIndex].indexOf('date');
        if (dateIndex < 0) return;
        for (const row of rows) {
          const text = row.cells[dateIndex];
          if (text?.trim()) allDateTexts.push(text);
        }
      });

      const dateFormatInfo = dateFormatOverride
        ? { order: dateFormatOverride, resolved: true }
        : resolveDateFormat(allDateTexts);
      const fallbackYear = computeFallbackYear(allDateTexts, dateFormatInfo);

      const transactionsByPage: Transaction[][] = runStage(
        'typing-failed',
        'Building transactions failed',
        () =>
          correctedPerPage.map((page, pageIndex) =>
            buildTransactions(
              perPageTransactionRows[pageIndex],
              perPageEffectiveRoles[pageIndex],
              columnShape,
              dateFormatInfo,
              fallbackYear,
              pageIndex + 1,
              !page.columnsMatchConsensus,
            ),
          ),
      );

      const transactions = transactionsByPage.flat();
      const transactionOrder = detectTransactionOrder(transactions);

      // If column detection landed on the wrong column, the Amount field
      // reads as 0.00 across most rows — never show that silently, say so.
      // Requires a minimum sample size so a handful of legitimately blank
      // amounts (e.g. a lone opening-balance row) on a very short statement
      // doesn't misfire this warning — the 30% rate is only meaningful once
      // there's enough rows for it to reflect a real pattern.
      const MIN_TRANSACTIONS_FOR_SANITY_CHECK = 5;
      const zeroAmountCount = transactions.filter((t) => t.amount === 0).length;
      const columnDetectionWarning =
        transactions.length >= MIN_TRANSACTIONS_FOR_SANITY_CHECK &&
        zeroAmountCount / transactions.length > 0.3
          ? 'Column detection looks wrong for this statement — check the column labels above the table.'
          : null;

      const pageIntegrity: PageIntegrity[] = cleanup.perPage.map((page, pageIndex) => ({
        pageNumber: pageIndex + 1,
        transactionCount: transactionsByPage[pageIndex].length,
        droppedCount: page.dropped.length,
        columnsMatchConsensus: page.columnsMatchConsensus,
      }));

      return {
        data: {
          perPageEffectiveRoles,
          columnShape,
          dateFormatInfo,
          fallbackYear,
          transactionsByPage,
          transactionRowIndicesByPage: perPageTransactionRowIndices,
          transactions,
          transactionOrder,
          pageIntegrity,
          statementSummary: { items: summaryItems },
          columnDetectionWarning,
        },
        error: null,
      };
    } catch (err) {
      const taggedError =
        err instanceof PdfProcessingError
          ? err
          : wrapStageError('typing-failed', 'Processing this statement failed', err);
      return { data: null, error: taggedError };
    }
  }, [documentCleanup, columnRoleOverrides, dateFormatOverride]);

  const currentPage = documentCleanup.data?.perPage[currentPageNumber - 1] ?? null;
  const currentPageIndex = currentPageNumber - 1;

  const columnRoles = useMemo(
    () => documentTransactions.data?.perPageEffectiveRoles[currentPageIndex] ?? EMPTY_ROLES,
    [documentTransactions, currentPageIndex],
  );
  const currentPageTransactions = useMemo(
    () => documentTransactions.data?.transactionsByPage[currentPageIndex] ?? EMPTY_TRANSACTIONS,
    [documentTransactions, currentPageIndex],
  );

  const currentPageConfidence = useMemo<(ConfidenceLevel | null)[][]>(() => {
    const rowCount = currentPage?.kept.length ?? 0;
    const blankRow = () => columnRoles.map(() => null);
    const result: (ConfidenceLevel | null)[][] = Array.from(
      { length: rowCount },
      blankRow,
    );

    const rowIndices =
      documentTransactions.data?.transactionRowIndicesByPage[currentPageIndex] ??
      EMPTY_INDICES;
    rowIndices.forEach((originalIndex, i) => {
      const transaction = currentPageTransactions[i];
      if (!transaction || originalIndex >= result.length) return;
      result[originalIndex] = columnRoles.map((role) =>
        roleConfidence(role, transaction),
      );
    });

    return result;
  }, [
    currentPage,
    currentPageIndex,
    currentPageTransactions,
    columnRoles,
    documentTransactions,
  ]);

  const setColumnRoleOverride = useCallback(
    (index: number, role: ColumnRole) => {
      setColumnRoleOverrides((prev) => ({ ...prev, [index]: role }));
    },
    [],
  );

  return {
    fileName,
    numPages: doc?.numPages ?? 0,
    currentPageNumber,
    setCurrentPageNumber,
    isLoadingFile,
    extractionProgress,
    error: error ?? documentCleanup.error ?? documentTransactions.error,
    toleranceY,
    setToleranceY,
    gapX,
    setGapX,
    rawStats: currentPage?.rawStats ?? null,
    cleanedRows: currentPage?.kept ?? EMPTY_CLEANED_ROWS,
    droppedRows: currentPage?.dropped ?? EMPTY_DROPPED_ROWS,
    columnRoles,
    setColumnRoleOverride,
    dateFormatInfo: documentTransactions.data?.dateFormatInfo ?? null,
    fallbackYear: documentTransactions.data?.fallbackYear ?? null,
    setDateFormatOverride,
    columnShape: documentTransactions.data?.columnShape ?? null,
    transactionOrder: documentTransactions.data?.transactionOrder ?? 'unknown',
    transactions: documentTransactions.data?.transactions ?? EMPTY_TRANSACTIONS,
    currentPageTransactions,
    currentPageConfidence,
    pageIntegrity: documentTransactions.data?.pageIntegrity ?? EMPTY_PAGE_INTEGRITY,
    statementSummary: documentTransactions.data?.statementSummary ?? EMPTY_STATEMENT_SUMMARY,
    columnDetectionWarning: documentTransactions.data?.columnDetectionWarning ?? null,
    loadFile,
    reset,
  };
}
