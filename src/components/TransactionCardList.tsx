import { useState } from 'react';
import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';
import { isFieldFlagged } from '../lib/editableTransactionFlags';

interface TransactionCardListProps {
  rows: EditableTransaction[];
  onCommitEdit: (id: string, field: EditableField, rawValue: string) => boolean;
  onDeleteRow: (id: string) => void;
  onInsertRow: (afterId: string | null) => void;
  rowFlags?: Map<string, string[]>;
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

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

interface EditableFieldRowProps {
  row: EditableTransaction;
  field: EditableField;
  label: string;
  emphasis?: 'prominent' | 'secondary' | 'normal';
  onCommitEdit: (id: string, field: EditableField, rawValue: string) => boolean;
}

// One tap-to-edit field within a card. Correct input type per field is the
// whole point on mobile — never make someone hunt for digits on a text
// keyboard, and a native date picker beats typing a date by hand.
function EditableFieldRow({ row, field, label, emphasis = 'normal', onCommitEdit }: EditableFieldRowProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() => editValueFor(row, field));
  const [hasError, setHasError] = useState(false);
  const flagged = isFieldFlagged(row, field);

  const commit = () => {
    const ok = onCommitEdit(row.id, field, value);
    if (ok) {
      setEditing(false);
      setHasError(false);
    } else {
      setHasError(true);
    }
  };

  const displayValue = (() => {
    if (field === 'date') return row.date || '—';
    if (field === 'description') return row.description || '—';
    if (field === 'amount') return formatAmount(row.amount);
    return row.balance === null ? '—' : formatAmount(row.balance);
  })();

  const sizeClass =
    emphasis === 'prominent' ? 'text-xl font-semibold' : emphasis === 'secondary' ? 'text-sm text-ink-muted' : 'text-base';

  if (editing) {
    const inputProps =
      field === 'date'
        ? { type: 'date' as const }
        : field === 'amount' || field === 'balance'
          ? { type: 'text' as const, inputMode: 'decimal' as const }
          : { type: 'text' as const };

    return (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-ink-muted">{label}</span>
        <input
          {...inputProps}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              setValue(editValueFor(row, field));
              setEditing(false);
              setHasError(false);
            }
          }}
          className={`min-h-11 w-full rounded-md border bg-accent-soft px-3 py-2 font-mono text-base text-ink outline-none ${
            hasError ? 'border-danger ring-2 ring-danger' : 'border-line-strong'
          } ${field === 'amount' || field === 'balance' ? 'text-right' : 'text-left'}`}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setValue(editValueFor(row, field));
        setEditing(true);
      }}
      className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-md px-1 py-1 text-left transition-colors hover:bg-canvas ${
        field === 'amount' || field === 'balance' ? 'flex-row-reverse' : ''
      }`}
    >
      <span className="text-xs text-ink-muted">{label}</span>
      <span
        className={`font-mono ${sizeClass} ${flagged ? 'underline decoration-warn decoration-dotted underline-offset-4' : ''}`}
      >
        {displayValue}
      </span>
    </button>
  );
}

function TransactionCard({
  row,
  onCommitEdit,
  onDeleteRow,
  issues,
}: {
  row: EditableTransaction;
  onCommitEdit: (id: string, field: EditableField, rawValue: string) => boolean;
  onDeleteRow: (id: string) => void;
  issues?: string[];
}) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <EditableFieldRow row={row} field="date" label="Date" onCommitEdit={onCommitEdit} />
          <EditableFieldRow
            row={row}
            field="description"
            label="Description"
            onCommitEdit={onCommitEdit}
          />
        </div>
        <button
          type="button"
          onClick={() => onDeleteRow(row.id)}
          aria-label="Delete transaction"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-lg text-ink-muted transition-colors hover:bg-danger-soft hover:text-danger"
        >
          ×
        </button>
      </div>

      <div className="flex items-end justify-between gap-2 border-t border-line pt-2">
        <EditableFieldRow
          row={row}
          field="balance"
          label="Balance"
          emphasis="secondary"
          onCommitEdit={onCommitEdit}
        />
        <EditableFieldRow
          row={row}
          field="amount"
          label="Amount"
          emphasis="prominent"
          onCommitEdit={onCommitEdit}
        />
      </div>

      {issues && issues.length > 0 && (
        <p className="rounded-md border border-warn-line bg-warn-soft px-2 py-1.5 text-xs text-ink">
          {issues.join(' · ')}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-ink-muted">
        <span>{row.pageNumber !== null ? `Page ${row.pageNumber}` : 'Added manually'}</span>
        {row.pageNumber !== null && (
          <button
            type="button"
            onClick={() => setShowSource((prev) => !prev)}
            className="min-h-11 px-2 font-medium text-accent"
          >
            {showSource ? 'Hide source' : 'Show source'}
          </button>
        )}
      </div>

      {showSource && row.raw && (
        <div className="flex flex-col gap-1 border-t border-line pt-2 font-mono text-xs text-ink-muted">
          <span>Date raw: {row.raw.date.trim() ? `"${row.raw.date}"` : '(empty)'}</span>
          <span>
            Description raw: {row.raw.description.trim() ? `"${row.raw.description}"` : '(empty)'}
          </span>
          <span>Amount raw: {row.raw.amount.trim() ? `"${row.raw.amount}"` : '(empty)'}</span>
          <span>Balance raw: {row.raw.balance.trim() ? `"${row.raw.balance}"` : '(empty)'}</span>
        </div>
      )}
    </div>
  );
}

export function TransactionCardList({
  rows,
  onCommitEdit,
  onDeleteRow,
  onInsertRow,
  rowFlags,
}: TransactionCardListProps) {
  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-line bg-surface p-12 text-sm text-ink-muted">
        No transactions yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <TransactionCard
          key={row.id}
          row={row}
          onCommitEdit={onCommitEdit}
          onDeleteRow={onDeleteRow}
          issues={rowFlags?.get(row.id)}
        />
      ))}
      <button
        type="button"
        onClick={() => onInsertRow(null)}
        className="min-h-11 rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent"
      >
        + Add transaction
      </button>
    </div>
  );
}
