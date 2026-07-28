import type { EditableTransaction, EditableField } from '../hooks/useEditableTransactions';

interface TransactionDetailPanelProps {
  row: EditableTransaction | null;
}

const FIELD_LABEL: Record<EditableField, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  balance: 'Balance',
};

function formatValue(value: string | number | null): string {
  if (value === null) return '(none)';
  if (typeof value === 'number') {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return value.trim() ? value : '(none)';
}

export function TransactionDetailPanel({ row }: TransactionDetailPanelProps) {
  if (!row) {
    return (
      <div className="rounded-md border border-line bg-surface p-4 text-sm text-ink-muted">
        Select a row to see its source page and the raw text the parser saw.
      </div>
    );
  }

  if (row.pageNumber === null) {
    return (
      <div className="rounded-md border border-line bg-surface p-4 text-sm text-ink-muted">
        This row was added manually — there's no source page or raw text to
        trace it back to.
      </div>
    );
  }

  const fields: EditableField[] = ['date', 'description', 'amount', 'balance'];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <p className="text-sm font-medium text-ink">Page {row.pageNumber}</p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        {fields.map((field) => {
          const rawText = row.raw?.[field] ?? '';
          const originalValue = row.original?.[field] ?? null;
          const currentValue =
            field === 'amount' || field === 'balance'
              ? (row[field] as number | null)
              : (row[field] as string);
          const changed = row.edited[field];

          return (
            <div key={field} className="flex flex-col gap-0.5">
              <span className="text-sm text-ink-muted">
                {FIELD_LABEL[field]}
              </span>
              <span className="font-mono text-sm text-ink">
                Raw: {rawText.trim() ? `"${rawText}"` : '(empty)'}
              </span>
              {changed && (
                <span className="font-mono text-sm text-ink-muted">
                  Originally: {formatValue(originalValue)} → now{' '}
                  {formatValue(currentValue)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
