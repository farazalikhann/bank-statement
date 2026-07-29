import type { EditableField, EditableTransaction } from '../hooks/useEditableTransactions';
import type { ExportOptions } from './export/types';
import { formatDate } from './export/rowSelection';
import { parseAmountWithConfidence } from './transactions/parseAmount';

// What the table actually renders as columns — a superset of EditableField:
// debit/credit share the single underlying signed `amount`, split by sign;
// pageNumber is parsed metadata with no place in the edit model at all.
export type DisplayColumn =
  | 'date'
  | 'description'
  | 'debit'
  | 'credit'
  | 'amount'
  | 'balance'
  | 'pageNumber';

export const DISPLAY_COLUMN_LABEL: Record<DisplayColumn, string> = {
  date: 'Date',
  description: 'Description',
  debit: 'Debit',
  credit: 'Credit',
  amount: 'Amount',
  balance: 'Balance',
  pageNumber: 'Page',
};

// Same set of columns the Output panel would produce, in the same order —
// this is the single definition of "what the table shows" so it can never
// silently diverge from "what gets exported".
export function computeDisplayColumns(options: ExportOptions): DisplayColumn[] {
  const cols: DisplayColumn[] = [];
  if (options.columns.date) cols.push('date');
  if (options.columns.description) cols.push('description');
  if (options.columns.amount) {
    if (options.amountMode === 'split') cols.push('debit', 'credit');
    else cols.push('amount');
  }
  if (options.columns.balance) cols.push('balance');
  if (options.columns.pageNumber) cols.push('pageNumber');
  return cols;
}

export function underlyingFieldFor(column: DisplayColumn): EditableField | null {
  switch (column) {
    case 'date':
      return 'date';
    case 'description':
      return 'description';
    case 'debit':
    case 'credit':
    case 'amount':
      return 'amount';
    case 'balance':
      return 'balance';
    case 'pageNumber':
      return null;
  }
}

function formatAmount(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function getDisplayValue(
  row: EditableTransaction,
  column: DisplayColumn,
  dateFormat: ExportOptions['dateFormat'],
): string {
  switch (column) {
    case 'date':
      return row.date ? formatDate(row.date, dateFormat) : '—';
    case 'description':
      return row.description || '—';
    case 'amount':
      return formatAmount(row.amount);
    // Same rule as csv.ts's split-amount export, so the table is provably
    // the same thing the export would produce, not a second implementation.
    case 'debit':
      return row.amount < 0 ? formatAmount(Math.abs(row.amount)) : '—';
    case 'credit':
      return row.amount >= 0 ? formatAmount(row.amount) : '—';
    case 'balance':
      return row.balance === null ? '—' : formatAmount(row.balance);
    case 'pageNumber':
      return row.pageNumber === null ? '—' : String(row.pageNumber);
  }
}

// The edit input always shows/expects the raw ISO date, never the display-
// formatted one — the edit parser resolves MM/DD-vs-DD/MM ambiguity against
// the *document's* detected format, a different concept from this *display*
// format option, and feeding it export-formatted text risks misparsing a
// clean, unedited value the moment the user just hits Enter.
export function getEditValue(row: EditableTransaction, column: DisplayColumn): string {
  switch (column) {
    case 'date':
      return row.date;
    case 'description':
      return row.description;
    case 'amount':
      return String(row.amount);
    case 'debit':
      return row.amount < 0 ? String(Math.abs(row.amount)) : '';
    case 'credit':
      return row.amount >= 0 ? String(row.amount) : '';
    case 'balance':
      return row.balance === null ? '' : String(row.balance);
    case 'pageNumber':
      return '';
  }
}

export function getOriginalDisplay(
  row: EditableTransaction,
  column: DisplayColumn,
): string | null {
  const field = underlyingFieldFor(column);
  if (!field || !row.original || !row.edited[field]) return null;
  switch (column) {
    case 'date':
      return row.original.date || '(none)';
    case 'description':
      return row.original.description || '(none)';
    case 'amount':
      return formatAmount(row.original.amount);
    case 'debit':
      return row.original.amount < 0 ? formatAmount(Math.abs(row.original.amount)) : '(none)';
    case 'credit':
      return row.original.amount >= 0 ? formatAmount(row.original.amount) : '(none)';
    case 'balance':
      return row.original.balance === null ? '(none)' : formatAmount(row.original.balance);
    case 'pageNumber':
      return null;
  }
}

// Translates a raw edit into the underlying (field, value) pair the actual
// commit API understands. Debit/credit reuse the same amount parser used
// everywhere else (handles CR/DR, parens, currency symbols) so a value
// typed into a split cell is held to the same standard as any other amount
// entry, then reconstructed with the correct sign for that side.
export function resolveEditCommit(
  column: DisplayColumn,
  rawValue: string,
): { field: EditableField; value: string } | null {
  const field = underlyingFieldFor(column);
  if (!field) return null;

  if (column === 'debit' || column === 'credit') {
    const trimmed = rawValue.trim();
    if (trimmed === '') return { field, value: '0' };
    const parsed = parseAmountWithConfidence(trimmed);
    if (!parsed) return { field, value: rawValue };
    const magnitude = Math.abs(parsed.value);
    return { field, value: String(column === 'debit' ? -magnitude : magnitude) };
  }

  return { field, value: rawValue };
}
