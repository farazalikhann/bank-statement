import { useCallback, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { loadPdf } from '../lib/pdf/loadPdf';
import { extractTextItems } from '../lib/pdf/extractTextItems';
import { PdfProcessingError, wrapStageError } from '../lib/pdf/errors';
import {
  computeDocumentCleanup,
  computeDocumentTransactions,
} from '../lib/pdf/documentPipeline';
import type {
  CleanedRow,
  ColumnRole,
  DroppedRow,
  PageExtraction,
} from '../lib/pdf/types';
import type {
  ConfidenceLevel,
  DateFieldOrder,
  PageIntegrity,
  StatementSummary,
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
  // doesn't re-run it. Delegates to the pure computeDocumentCleanup (kept
  // outside the hook so it's directly unit-testable) and just owns the
  // memoization boundary here.
  const documentCleanup = useMemo(() => {
    if (!allPages) return { data: null, error: null };
    return computeDocumentCleanup(allPages, toleranceY, gapX);
  }, [allPages, toleranceY, gapX]);

  // Stage B: cleaned rows -> typed transactions. Cheap (just reads already
  // -cleaned rows), so it's fine for this to re-run on every role/date
  // override change. Same split as above — pure computation lives in
  // computeDocumentTransactions.
  const documentTransactions = useMemo(() => {
    if (!documentCleanup.data) {
      return { data: null, error: documentCleanup.error };
    }
    return computeDocumentTransactions(
      documentCleanup.data,
      columnRoleOverrides,
      dateFormatOverride,
    );
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
