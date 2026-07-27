import type {
  ColumnShape,
  DateFieldOrder,
  DateFormatInfo,
  Transaction,
  TransactionOrder,
} from '../lib/transactions/types';

interface ParsingSummaryProps {
  dateFormatInfo: DateFormatInfo;
  onDateFormatChange: (order: DateFieldOrder) => void;
  columnShape: ColumnShape;
  transactionOrder: TransactionOrder;
  currentPageTransactions: Transaction[];
}

const ORDER_LABEL: Record<TransactionOrder, string> = {
  'oldest-first': 'Oldest → Newest',
  'newest-first': 'Newest → Oldest',
  unknown: 'Order unclear',
};

function countFlagged(transactions: Transaction[]): number {
  let count = 0;
  for (const transaction of transactions) {
    for (const level of Object.values(transaction.confidence)) {
      if (level !== 'high') count += 1;
    }
  }
  return count;
}

export function ParsingSummary({
  dateFormatInfo,
  onDateFormatChange,
  columnShape,
  transactionOrder,
  currentPageTransactions,
}: ParsingSummaryProps) {
  const flaggedCount = countFlagged(currentPageTransactions);

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="flex items-center gap-2 text-sm text-ink">
          Date format
          <select
            value={dateFormatInfo.order}
            onChange={(event) =>
              onDateFormatChange(event.target.value as DateFieldOrder)
            }
            className="rounded border border-line-strong bg-surface px-2 py-1 text-sm font-medium text-ink"
          >
            <option value="MDY">MM/DD/YYYY (US)</option>
            <option value="DMY">DD/MM/YYYY</option>
          </select>
        </label>

        <span className="text-sm text-ink-muted">
          {columnShape.kind === 'single-amount'
            ? 'Single signed Amount column'
            : `Debit/Credit columns detected (Column ${columnShape.debitIndex + 1} = Debit, Column ${columnShape.creditIndex + 1} = Credit)`}
        </span>

        <span className="text-sm text-ink-muted">
          Transactions: {ORDER_LABEL[transactionOrder]}
        </span>
      </div>

      {!dateFormatInfo.resolved && (
        <p className="rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-sm text-ink">
          Couldn't tell whether dates in this document are MM/DD or DD/MM from
          the data itself — defaulting to MM/DD (US). Double-check the
          flagged dates below, or choose the correct format above.
        </p>
      )}

      {flaggedCount > 0 && (
        <p className="text-sm text-ink-muted">
          {flaggedCount} field{flaggedCount > 1 ? 's' : ''} flagged for review
          on this page — look for the dotted underline in the table below.
        </p>
      )}
    </div>
  );
}
