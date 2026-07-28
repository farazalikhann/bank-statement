import type { EditableTransaction } from '../../hooks/useEditableTransactions';
import { csvEscape, formatDate, selectRows } from './rowSelection';
import type { ExportOptions } from './types';

function formatAmountPlain(value: number): string {
  return value.toFixed(2);
}

// Fixed 3-column layout — Date, Description, Amount — regardless of the
// options panel's column/amount-mode selections. Deviating from exactly
// these 3 columns would defeat the point of calling this "QuickBooks
// -compatible"; dateFormat and includeFlagged still apply since those
// don't change the column layout itself.
export function buildQuickBooksCsv(
  rows: EditableTransaction[],
  rowFlags: Map<string, string[]>,
  options: Pick<ExportOptions, 'includeFlagged' | 'dateFormat'>,
): string {
  const selected = selectRows(rows, rowFlags, options);
  const lines = ['Date,Description,Amount'];

  for (const row of selected) {
    const fields = [
      formatDate(row.date, options.dateFormat),
      row.description,
      formatAmountPlain(row.amount),
    ];
    lines.push(fields.map(csvEscape).join(','));
  }

  return lines.join('\r\n');
}

// Standard documented Xero bank-statement-import layout: Date, Amount,
// Payee, Description. We only track one text field, so both Payee and
// Description get the transaction description — redundant, but ensures
// the text shows up regardless of which column Xero's importer surfaces.
export function buildXeroCsv(
  rows: EditableTransaction[],
  rowFlags: Map<string, string[]>,
  options: Pick<ExportOptions, 'includeFlagged' | 'dateFormat'>,
): string {
  const selected = selectRows(rows, rowFlags, options);
  const lines = ['Date,Amount,Payee,Description'];

  for (const row of selected) {
    const fields = [
      formatDate(row.date, options.dateFormat),
      formatAmountPlain(row.amount),
      row.description,
      row.description,
    ];
    lines.push(fields.map(csvEscape).join(','));
  }

  return lines.join('\r\n');
}
