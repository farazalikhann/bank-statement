import type { EditableTransaction } from '../../hooks/useEditableTransactions';
import type { ExportDateFormat, ExportOptions } from './types';

const FIELDS = ['date', 'description', 'amount', 'balance'] as const;

// Same combined signal TransactionGrid's per-cell badge and
// ReconciliationPanel's per-row "!" marker already use — a row still
// "needs review" if any field has a non-high parser confidence that
// hasn't been manually corrected, or a validation issue (balance break,
// duplicate, date issue) was recorded against it.
export function isRowFlagged(
  row: EditableTransaction,
  rowFlags: Map<string, string[]>,
): boolean {
  if ((rowFlags.get(row.id)?.length ?? 0) > 0) return true;
  return FIELDS.some((field) => !row.edited[field] && row.confidence[field] !== 'high');
}

export function selectRows(
  rows: EditableTransaction[],
  rowFlags: Map<string, string[]>,
  options: Pick<ExportOptions, 'includeFlagged'>,
): EditableTransaction[] {
  if (options.includeFlagged) return rows;
  return rows.filter((row) => !isRowFlagged(row, rowFlags));
}

export function formatDate(iso: string, format: ExportDateFormat): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-');
  if (!year || !month || !day) return iso;
  switch (format) {
    case 'MDY':
      return `${month}/${day}/${year}`;
    case 'DMY':
      return `${day}/${month}/${year}`;
    case 'ISO':
    default:
      return iso;
  }
}

// RFC 4180: quote a field if it contains a comma, double-quote, or
// newline, doubling any internal double-quotes.
export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
