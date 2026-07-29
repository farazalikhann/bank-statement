import { useEffect, useMemo, useState } from 'react';
import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';
import { collectFlaggedFields } from '../lib/editableTransactionFlags';

interface ReviewModeProps {
  rows: EditableTransaction[];
  onCommitEdit: (id: string, field: EditableField, rawValue: string) => boolean;
  onExit: () => void;
}

const FIELD_LABEL: Record<EditableField, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  balance: 'Balance',
};

function editValueFor(row: EditableTransaction, field: EditableField): string {
  switch (field) {
    case 'date':
      return row.date;
    case 'description':
      return row.description;
    case 'amount':
      return String(row.amount);
    case 'balance':
      return row.balance === null ? '' : String(row.balance);
  }
}

// Default mobile entry point: step through only the fields that actually
// need a look, one at a time, instead of handing someone the full table.
export function ReviewMode({ rows, onCommitEdit, onExit }: ReviewModeProps) {
  const flaggedFields = useMemo(() => collectFlaggedFields(rows), [rows]);
  const [stepIndex, setStepIndex] = useState(0);
  const clampedIndex =
    flaggedFields.length === 0 ? 0 : Math.min(stepIndex, flaggedFields.length - 1);
  const current = flaggedFields[clampedIndex] ?? null;
  const row = current ? rows.find((r) => r.id === current.rowId) ?? null : null;

  const [value, setValue] = useState('');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (row && current) setValue(editValueFor(row, current.field));
    setHasError(false);
  }, [row, current]);

  if (!current || !row) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-md border border-line bg-surface p-8 text-center">
        <p className="text-base font-medium text-ink">
          {rows.length === 0 ? 'No transactions yet.' : 'All flagged fields reviewed.'}
        </p>
        <button
          type="button"
          onClick={onExit}
          className="min-h-11 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          View all transactions
        </button>
      </div>
    );
  }

  const commit = (): boolean => {
    const ok = onCommitEdit(row.id, current.field, value);
    setHasError(!ok);
    return ok;
  };

  const goNext = () => {
    if (!commit()) return;
    setStepIndex((i) => Math.min(i + 1, Math.max(0, flaggedFields.length - 1)));
  };
  const goPrevious = () => {
    if (!commit()) return;
    setStepIndex((i) => Math.max(0, i - 1));
  };

  const inputProps =
    current.field === 'date'
      ? { type: 'date' as const }
      : current.field === 'amount' || current.field === 'balance'
        ? { type: 'text' as const, inputMode: 'decimal' as const }
        : { type: 'text' as const };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-line bg-surface p-4">
      <div className="flex items-center justify-between text-sm text-ink-muted">
        <span>
          Field {clampedIndex + 1} of {flaggedFields.length}
        </span>
        <button type="button" onClick={onExit} className="min-h-11 px-2 font-medium text-accent">
          Skip to full list
        </button>
      </div>

      <div className="flex flex-col gap-0.5 border-b border-line pb-2 text-sm text-ink-muted">
        <span>{row.date || 'No date'}</span>
        <span className="truncate text-ink">{row.description || '(no description)'}</span>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-ink">{FIELD_LABEL[current.field]}</span>
        <input
          {...inputProps}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`min-h-11 w-full rounded-md border bg-accent-soft px-3 py-2.5 font-mono text-lg text-ink outline-none ${
            hasError ? 'border-danger ring-2 ring-danger' : 'border-line-strong'
          }`}
        />
        {hasError && (
          <span className="text-sm text-danger">
            Couldn't read that value — check the format and try again.
          </span>
        )}
      </label>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goPrevious}
          disabled={clampedIndex === 0}
          className="min-h-11 flex-1 rounded-md border border-line-strong px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={goNext}
          className="min-h-11 flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
        >
          {clampedIndex + 1 === flaggedFields.length ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
