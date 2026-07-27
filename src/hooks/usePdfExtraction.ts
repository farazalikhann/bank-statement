import { useCallback, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf } from '../lib/pdf/loadPdf';
import { extractTextItems } from '../lib/pdf/extractTextItems';
import { analyzePage } from '../lib/pdf/analyzePage';
import { mapRowToColumns } from '../lib/pdf/mapRowToColumns';
import { mergeMultiLineRows } from '../lib/pdf/mergeMultiLineRows';
import { buildRepeatedRowFrequency, filterJunkRows } from '../lib/pdf/filterJunkRows';
import { detectColumnRoles } from '../lib/pdf/detectColumnRoles';
import { PdfProcessingError } from '../lib/pdf/errors';
import type { CleanedRow, ColumnRole, PageExtraction } from '../lib/pdf/types';
import { refineColumnRoles } from '../lib/transactions/detectColumnShape';
import { computeFallbackYear, resolveDateFormat } from '../lib/transactions/parseDate';
import { buildTransactions } from '../lib/transactions/buildTransactions';
import { detectTransactionOrder } from '../lib/transactions/detectOrder';
import type {
  ConfidenceLevel,
  DateFieldOrder,
  Transaction,
} from '../lib/transactions/types';

const DEFAULT_TOLERANCE_Y = 2;
const DEFAULT_GAP_X = 10;

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

  // Stage A: PDF text -> cleaned rows. Expensive (re-extracts nothing, but
  // re-groups/merges/filters every page), independent of role/date overrides
  // so tweaking a dropdown doesn't re-run it.
  const documentCleanup = useMemo(() => {
    if (!allPages) return null;

    const perPageAnalyzed = allPages.map((page) =>
      analyzePage(page.items, { toleranceY }, { gapX }),
    );

    const perPageRawCells = perPageAnalyzed.map((analyzed) =>
      analyzed.rows.map((row) => mapRowToColumns(row, analyzed.columns)),
    );
    const frequency = buildRepeatedRowFrequency(perPageRawCells);

    const perPageMerged = perPageRawCells.map((cellsList) =>
      mergeMultiLineRows(cellsList, frequency),
    );
    const perPageFiltered = perPageMerged.map((merged) =>
      filterJunkRows(merged, frequency),
    );

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

    const rowsForRoleDetection = perPageAnalyzed.flatMap((analyzed, i) =>
      analyzed.columns.length === canonicalColumnCount
        ? perPageFiltered[i].kept
        : [],
    );
    const documentColumnRoles = detectColumnRoles(
      rowsForRoleDetection,
      canonicalColumnCount,
    );

    const perPage = perPageAnalyzed.map((analyzed, i) => ({
      rawStats: analyzed.stats,
      columns: analyzed.columns,
      kept: perPageFiltered[i].kept,
      dropped: perPageFiltered[i].dropped,
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

    const allDateTexts: string[] = [];
    documentCleanup.perPage.forEach((page, pageIndex) => {
      const dateIndex = perPageEffectiveRoles[pageIndex].indexOf('date');
      if (dateIndex < 0) return;
      for (const row of page.kept) {
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
          page.kept,
          perPageEffectiveRoles[pageIndex],
          columnShape,
          dateFormatInfo,
          fallbackYear,
        ),
    );

    const transactions = transactionsByPage.flat();
    const transactionOrder = detectTransactionOrder(transactions);

    return {
      perPageEffectiveRoles,
      columnShape,
      dateFormatInfo,
      transactionsByPage,
      transactions,
      transactionOrder,
    };
  }, [documentCleanup, columnRoleOverrides, dateFormatOverride]);

  const currentPage = documentCleanup?.perPage[currentPageNumber - 1] ?? null;
  const currentPageIndex = currentPageNumber - 1;

  const columnRoles = useMemo(
    () => documentTransactions?.perPageEffectiveRoles[currentPageIndex] ?? [],
    [documentTransactions, currentPageIndex],
  );
  const currentPageTransactions = useMemo(
    () => documentTransactions?.transactionsByPage[currentPageIndex] ?? [],
    [documentTransactions, currentPageIndex],
  );

  const currentPageConfidence = useMemo<(ConfidenceLevel | null)[][]>(
    () =>
      currentPageTransactions.map((transaction) =>
        columnRoles.map((role) => roleConfidence(role, transaction)),
      ),
    [currentPageTransactions, columnRoles],
  );

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
    cleanedRows: currentPage?.kept ?? ([] as CleanedRow[]),
    droppedRows: currentPage?.dropped ?? [],
    columnRoles,
    setColumnRoleOverride,
    dateFormatInfo: documentTransactions?.dateFormatInfo ?? null,
    setDateFormatOverride,
    columnShape: documentTransactions?.columnShape ?? null,
    transactionOrder: documentTransactions?.transactionOrder ?? 'unknown',
    transactions: documentTransactions?.transactions ?? [],
    currentPageTransactions,
    currentPageConfidence,
    loadFile,
    reset,
  };
}
