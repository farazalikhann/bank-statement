import type {
  PageIntegrity,
  StatementSummary,
  SummaryItemKind,
} from '../lib/transactions/types';

interface IntegrityReportProps {
  pageIntegrity: PageIntegrity[];
  statementSummary: StatementSummary;
}

const SUMMARY_LABEL: Record<SummaryItemKind, string> = {
  'opening-balance': 'Opening Balance',
  'closing-balance': 'Closing Balance',
  'total-deposits': 'Total Deposits',
  'total-withdrawals': 'Total Withdrawals',
};

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function IntegrityReport({
  pageIntegrity,
  statementSummary,
}: IntegrityReportProps) {
  if (pageIntegrity.length === 0) return null;

  const flaggedPages = pageIntegrity.filter((p) => !p.columnsMatchConsensus);
  const emptyPages = pageIntegrity.filter((p) => p.transactionCount === 0);
  const totalDropped = pageIntegrity.reduce((sum, p) => sum + p.droppedCount, 0);
  const totalTransactions = pageIntegrity.reduce(
    (sum, p) => sum + p.transactionCount,
    0,
  );

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
        <span>
          <span className="font-medium text-ink">{pageIntegrity.length}</span>{' '}
          page{pageIntegrity.length > 1 ? 's' : ''} processed
        </span>
        <span>
          <span className="font-medium text-ink">{totalTransactions}</span>{' '}
          transaction{totalTransactions === 1 ? '' : 's'} total
        </span>
        <span>
          <span className="font-medium text-ink">{totalDropped}</span> row
          {totalDropped === 1 ? '' : 's'} dropped as furniture
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {pageIntegrity.map((page) => {
          const isEmpty = page.transactionCount === 0;
          const isFlagged = !page.columnsMatchConsensus;
          const className = isEmpty
            ? 'border-danger-line bg-danger-soft text-ink'
            : isFlagged
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line-strong bg-canvas text-ink-muted';
          return (
            <span
              key={page.pageNumber}
              title={
                isEmpty
                  ? `Page ${page.pageNumber} produced no transactions`
                  : isFlagged
                    ? `Page ${page.pageNumber}'s columns don't match the rest of the document`
                    : `Page ${page.pageNumber}: ${page.transactionCount} transaction${page.transactionCount === 1 ? '' : 's'}`
              }
              className={`rounded-full border px-2 py-0.5 font-mono text-xs ${className}`}
            >
              P{page.pageNumber}: {page.transactionCount}
            </span>
          );
        })}
      </div>

      {emptyPages.length > 0 && (
        <p className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-ink">
          Page{emptyPages.length > 1 ? 's' : ''}{' '}
          {emptyPages.map((p) => p.pageNumber).join(', ')} produced zero
          transactions — that usually means a parsing failure, not an empty
          page. Worth a manual check.
        </p>
      )}

      {flaggedPages.length > 0 && (
        <p className="text-sm text-ink-muted">
          Page{flaggedPages.length > 1 ? 's' : ''}{' '}
          {flaggedPages.map((p) => p.pageNumber).join(', ')}{' '}
          {flaggedPages.length > 1 ? "don't" : "doesn't"} match the document's
          column layout — every field on{' '}
          {flaggedPages.length > 1 ? 'those pages is' : 'that page is'}{' '}
          marked low confidence rather than assumed correct.
        </p>
      )}

      {statementSummary.items.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm">
          {statementSummary.items.map((item, index) => (
            <span key={index} className="text-ink-muted">
              {SUMMARY_LABEL[item.kind]}:{' '}
              <span className="font-mono text-ink">
                {formatAmount(item.value)}
              </span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
