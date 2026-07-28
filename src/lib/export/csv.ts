import type { EditableTransaction } from '../../hooks/useEditableTransactions';
import { csvEscape, formatDate, selectRows } from './rowSelection';
import type { ExportOptions } from './types';

function formatAmountPlain(value: number): string {
  return value.toFixed(2);
}

export function buildGenericCsv(
  rows: EditableTransaction[],
  rowFlags: Map<string, string[]>,
  options: ExportOptions,
): string {
  const selected = selectRows(rows, rowFlags, options);
  const { columns, amountMode } = options;

  const headers: string[] = [];
  if (columns.date) headers.push('Date');
  if (columns.description) headers.push('Description');
  if (columns.amount) {
    if (amountMode === 'split') headers.push('Debit', 'Credit');
    else headers.push('Amount');
  }
  if (columns.balance) headers.push('Balance');
  if (columns.pageNumber) headers.push('Page');

  const lines = [headers.map(csvEscape).join(',')];

  for (const row of selected) {
    const fields: string[] = [];
    if (columns.date) fields.push(formatDate(row.date, options.dateFormat));
    if (columns.description) fields.push(row.description);
    if (columns.amount) {
      if (amountMode === 'split') {
        const debit = row.amount < 0 ? formatAmountPlain(Math.abs(row.amount)) : '';
        const credit = row.amount >= 0 ? formatAmountPlain(row.amount) : '';
        fields.push(debit, credit);
      } else {
        fields.push(formatAmountPlain(row.amount));
      }
    }
    if (columns.balance) {
      fields.push(row.balance === null ? '' : formatAmountPlain(row.balance));
    }
    if (columns.pageNumber) {
      fields.push(row.pageNumber === null ? '' : String(row.pageNumber));
    }
    lines.push(fields.map(csvEscape).join(','));
  }

  return lines.join('\r\n');
}

// UTF-8 BOM prefix so Excel (which otherwise guesses ANSI on Windows)
// opens the file with correct encoding; the browser's Blob constructor
// encodes a JS string as UTF-8 automatically.
const BOM = String.fromCharCode(0xfeff);

export function buildCsvBlob(csv: string): Blob {
  return new Blob([BOM + csv], { type: 'text/csv;charset=utf-8' });
}
