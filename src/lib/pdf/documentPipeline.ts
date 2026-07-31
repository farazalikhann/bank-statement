import { analyzePage } from './analyzePage';
import { mapRowToColumns } from './mapRowToColumns';
import { mergeMultiLineRows } from './mergeMultiLineRows';
import {
  buildRepeatedRowFrequency,
  dropOrphanRows,
  stripPatternFurniture,
} from './filterJunkRows';
import { stitchCrossPageRows } from './stitchCrossPageRows';
import { detectColumnRoles } from './detectColumnRoles';
import { recoverMergedDateColumn } from './recoverMergedDateColumn';
import { looksLikeSummaryLine } from './textPatterns';
import { PdfProcessingError, wrapStageError } from './errors';
import type {
  CleanedRow,
  ColumnCluster,
  ColumnRole,
  DroppedRow,
  ExtractionStats,
  PageExtraction,
  RawRow,
} from './types';
import { refineColumnRoles } from '../transactions/detectColumnShape';
import { computeFallbackYear, resolveDateFormat } from '../transactions/parseDate';
import { buildTransactions } from '../transactions/buildTransactions';
import { detectTransactionOrder } from '../transactions/detectOrder';
import { extractSummaryBlocks } from '../transactions/extractSummaryBlocks';
import type {
  ColumnShape,
  DateFieldOrder,
  DateFormatInfo,
  PageIntegrity,
  StatementSummary,
  SummaryItem,
  Transaction,
  TransactionOrder,
} from '../transactions/types';

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

export interface DocumentCleanupData {
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

export interface DocumentTransactionsData {
  perPageEffectiveRoles: ColumnRole[][];
  columnShape: ColumnShape;
  dateFormatInfo: DateFormatInfo;
  fallbackYear: number | null;
  transactionsByPage: Transaction[][];
  transactionRowIndicesByPage: number[][];
  transactions: Transaction[];
  transactionOrder: TransactionOrder;
  pageIntegrity: PageIntegrity[];
  statementSummary: StatementSummary;
  columnDetectionWarning: string | null;
}

// Stage A: PDF text -> cleaned rows, stitched across page boundaries. Pulled
// out of usePdfExtraction as a pure function (no React) so it can be unit-
// and integration-tested directly, without rendering a component.
export function computeDocumentCleanup(
  allPages: PageExtraction[],
  toleranceY: number,
  gapX: number,
): { data: DocumentCleanupData | null; error: PdfProcessingError | null } {
  if (allPages.length === 0) return { data: null, error: null };

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
}

// Stage B: cleaned rows -> typed transactions. Cheap (just reads already-
// cleaned rows), so in the hook this is fine to re-run on every role/date
// override change. Also pulled out as a pure function for the same testing
// reason as computeDocumentCleanup.
export function computeDocumentTransactions(
  cleanup: DocumentCleanupData,
  columnRoleOverrides: Partial<Record<number, ColumnRole>>,
  dateFormatOverride: DateFieldOrder | null,
): { data: DocumentTransactionsData | null; error: PdfProcessingError | null } {
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
}
