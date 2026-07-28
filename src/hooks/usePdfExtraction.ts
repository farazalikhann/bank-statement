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
import { looksLikeSummaryLine } from '../lib/pdf/textPatterns';
import { PdfProcessingError } from '../lib/pdf/errors';
import type {
  CleanedRow,
  ColumnRole,
  DroppedRow,
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
const DEFAULT_GAP_X = 10;

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
      const nextDoc = await loadPdf(file);
      if (requestId !== loadRequestId.current) return;

      const total = nextDoc.numPages;
      const pages: PageExtraction[] = [];
      let hasText = false;

      for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
        const page = await nextDoc.getPage(pageNumber);
        const extraction = await extractTextItems(page);
        if (requestId !== loadRequestId.current) return;

        pages.push(extraction);
        if (extraction.items.length > 0) hasText = true;
        setExtractionProgress({ done: pageNumber, total });
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
          : new PdfProcessingError('load-failed', `"${file.name}" could not be loaded.`),
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
  // doesn't re-run it.
  const documentCleanup = useMemo(() => {
    if (!allPages) return null;

    const perPageAnalyzed = allPages.map((page) =>
      analyzePage(page.items, { toleranceY }, { gapX }),
    );

    const perPageRawRows: RawRow[][] = perPageAnalyzed.map((analyzed, i) =>
      analyzed.rows.map((row) => ({
        cells: mapRowToColumns(row, analyzed.columns),
        relativeY: allPages[i].pageHeight > 0 ? row.y / allPages[i].pageHeight : 0,
      })),
    );

    // Cross-page (not just adjacent) so a header/footer repeated throughout
    // the document is recognized regardless of how far apart the pages are.
    const frequency = buildRepeatedRowFrequency(perPageRawRows);

    const perPageStripped = perPageRawRows.map((rawRows, pageIndex) =>
      stripPatternFurniture(rawRows, frequency, pageIndex === 0),
    );
    const perPageMerged = perPageStripped.map((stripped) =>
      mergeMultiLineRows(stripped.candidates),
    );
    // Only after each page's own furniture is gone do we let a wrapped
    // description continue across the page boundary.
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

    // Summary lines (opening balance, totals) are excluded from the role-
    // detection sample even though they stay in `kept` for display — they
    // have no date, which would otherwise drag down the date column's
    // match rate and risk misclassifying it.
    const rowsForRoleDetection = perPageAnalyzed.flatMap((analyzed, i) =>
      analyzed.columns.length === canonicalColumnCount
        ? perPageFinal[i].kept.filter((row) => !looksLikeSummaryLine(row.cells))
        : [],
    );
    const documentColumnRoles = detectColumnRoles(
      rowsForRoleDetection,
      canonicalColumnCount,
    );

    const perPage = perPageAnalyzed.map((analyzed, i) => ({
      rawStats: analyzed.stats,
      columns: analyzed.columns,
      kept: perPageFinal[i].kept,
      dropped: [...perPageStripped[i].dropped, ...perPageFinal[i].dropped],
      columnsMatchConsensus: analyzed.columns.length === canonicalColumnCount,
    }));

    return { perPage, documentColumnRoles, rowsForRoleDetection };
  }, [allPages, toleranceY, gapX]);

  // Stage B: cleaned rows -> typed transactions. Cheap (just reads already
  // -cleaned rows), so it's fine for this to re-run on every role/date
  // override change.
  const documentTransactions = useMemo(() => {
    if (!documentCleanup) return null;

    const { roles: refinedRoles, shape: columnShape } = refineColumnRoles(
      documentCleanup.rowsForRoleDetection,
      documentCleanup.documentColumnRoles,
    );

    const perPageEffectiveRoles: ColumnRole[][] = documentCleanup.perPage.map(
      (page) =>
        page.columns.map((_, index) => {
          const override = columnRoleOverrides[index];
          if (override) return override;
          return refinedRoles[index] ?? 'unknown';
        }),
    );

    const summaryItems: SummaryItem[] = [];
    const perPageTransactionRows: CleanedRow[][] = [];
    // Parallel to perPageTransactionRows: for each surviving row, its index
    // in the page's original `kept` array (which still includes summary
    // rows) — needed to map a transaction's confidence back onto the right
    // row of the raw per-page table, since summary rows are excluded here
    // but not there.
    const perPageTransactionRowIndices: number[][] = [];
    documentCleanup.perPage.forEach((page, pageIndex) => {
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

    const transactionsByPage: Transaction[][] = documentCleanup.perPage.map(
      (page, pageIndex) =>
        buildTransactions(
          perPageTransactionRows[pageIndex],
          perPageEffectiveRoles[pageIndex],
          columnShape,
          dateFormatInfo,
          fallbackYear,
          pageIndex + 1,
          !page.columnsMatchConsensus,
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

    const pageIntegrity: PageIntegrity[] = documentCleanup.perPage.map(
      (page, pageIndex) => ({
        pageNumber: pageIndex + 1,
        transactionCount: transactionsByPage[pageIndex].length,
        droppedCount: page.dropped.length,
        columnsMatchConsensus: page.columnsMatchConsensus,
      }),
    );

    return {
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
    };
  }, [documentCleanup, columnRoleOverrides, dateFormatOverride]);

  const currentPage = documentCleanup?.perPage[currentPageNumber - 1] ?? null;
  const currentPageIndex = currentPageNumber - 1;

  const columnRoles = useMemo(
    () => documentTransactions?.perPageEffectiveRoles[currentPageIndex] ?? EMPTY_ROLES,
    [documentTransactions, currentPageIndex],
  );
  const currentPageTransactions = useMemo(
    () => documentTransactions?.transactionsByPage[currentPageIndex] ?? EMPTY_TRANSACTIONS,
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
      documentTransactions?.transactionRowIndicesByPage[currentPageIndex] ??
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
    error,
    toleranceY,
    setToleranceY,
    gapX,
    setGapX,
    rawStats: currentPage?.rawStats ?? null,
    cleanedRows: currentPage?.kept ?? EMPTY_CLEANED_ROWS,
    droppedRows: currentPage?.dropped ?? EMPTY_DROPPED_ROWS,
    columnRoles,
    setColumnRoleOverride,
    dateFormatInfo: documentTransactions?.dateFormatInfo ?? null,
    fallbackYear: documentTransactions?.fallbackYear ?? null,
    setDateFormatOverride,
    columnShape: documentTransactions?.columnShape ?? null,
    transactionOrder: documentTransactions?.transactionOrder ?? 'unknown',
    transactions: documentTransactions?.transactions ?? EMPTY_TRANSACTIONS,
    currentPageTransactions,
    currentPageConfidence,
    pageIntegrity: documentTransactions?.pageIntegrity ?? EMPTY_PAGE_INTEGRITY,
    statementSummary: documentTransactions?.statementSummary ?? EMPTY_STATEMENT_SUMMARY,
    columnDetectionWarning: documentTransactions?.columnDetectionWarning ?? null,
    loadFile,
    reset,
  };
}
