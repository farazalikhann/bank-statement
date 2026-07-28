import type { EditableTransaction } from '../../hooks/useEditableTransactions';
import { selectRows } from './rowSelection';
import type { AuditInfo, ExportDateFormat, ExportOptions } from './types';

const DATE_FORMAT_CODES: Record<ExportDateFormat, string> = {
  MDY: 'mm/dd/yyyy',
  DMY: 'dd/mm/yyyy',
  ISO: 'yyyy-mm-dd',
};

// Parenthesized negatives, comma grouping, no hardcoded currency symbol
// (this app never reliably detects the statement's currency, so a
// symbol-free accounting-style format is the honest choice over
// guessing "$").
const AMOUNT_FORMAT = '#,##0.00;(#,##0.00)';

const DESCRIPTION_MAX_WIDTH = 60;

function isoToLocalDate(iso: string): Date | null {
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function amountWidth(values: number[]): number {
  const longest = values.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
  return Math.max(String(Math.trunc(longest)).length + 8, 10);
}

function textWidth(header: string, values: string[], max = 100): number {
  const longest = values.reduce((m, v) => Math.max(m, v.length), header.length);
  return Math.min(Math.max(longest + 2, header.length + 2), max);
}

export async function buildWorkbookBlob(
  rows: EditableTransaction[],
  rowFlags: Map<string, string[]>,
  options: ExportOptions,
  audit: AuditInfo,
): Promise<Blob> {
  const ExcelJS = await import('exceljs');
  const selected = selectRows(rows, rowFlags, options);
  const { columns, amountMode } = options;

  interface ColumnDef {
    header: string;
    key: string;
    width: number;
  }
  const columnDefs: ColumnDef[] = [];
  if (columns.date) columnDefs.push({ header: 'Date', key: 'date', width: 12 });
  if (columns.description) {
    columnDefs.push({
      header: 'Description',
      key: 'description',
      width: textWidth('Description', selected.map((r) => r.description), DESCRIPTION_MAX_WIDTH),
    });
  }
  if (columns.amount) {
    if (amountMode === 'split') {
      columnDefs.push(
        { header: 'Debit', key: 'debit', width: amountWidth(selected.map((r) => r.amount)) },
        { header: 'Credit', key: 'credit', width: amountWidth(selected.map((r) => r.amount)) },
      );
    } else {
      columnDefs.push({
        header: 'Amount',
        key: 'amount',
        width: amountWidth(selected.map((r) => r.amount)),
      });
    }
  }
  if (columns.balance) {
    columnDefs.push({
      header: 'Balance',
      key: 'balance',
      width: amountWidth(selected.map((r) => r.balance ?? 0)),
    });
  }
  if (columns.pageNumber) columnDefs.push({ header: 'Page', key: 'page', width: 8 });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Transactions');
  sheet.columns = columnDefs;

  for (const row of selected) {
    const record: Record<string, string | number | Date | null> = {};
    if (columns.date) record.date = isoToLocalDate(row.date);
    if (columns.description) record.description = row.description;
    if (columns.amount) {
      if (amountMode === 'split') {
        record.debit = row.amount < 0 ? Math.abs(row.amount) : null;
        record.credit = row.amount >= 0 ? row.amount : null;
      } else {
        record.amount = row.amount;
      }
    }
    if (columns.balance) record.balance = row.balance;
    if (columns.pageNumber) record.page = row.pageNumber;
    sheet.addRow(record);
  }

  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  if (columns.date) sheet.getColumn('date').numFmt = DATE_FORMAT_CODES[options.dateFormat];
  if (columns.amount) {
    if (amountMode === 'split') {
      sheet.getColumn('debit').numFmt = AMOUNT_FORMAT;
      sheet.getColumn('credit').numFmt = AMOUNT_FORMAT;
    } else {
      sheet.getColumn('amount').numFmt = AMOUNT_FORMAT;
    }
  }
  if (columns.balance) sheet.getColumn('balance').numFmt = AMOUNT_FORMAT;

  const auditSheet = workbook.addWorksheet('Audit');
  auditSheet.columns = [
    { header: 'Field', key: 'field', width: 28 },
    { header: 'Value', key: 'value', width: 60 },
  ];
  auditSheet.getRow(1).font = { bold: true };
  auditSheet.addRows([
    { field: 'Source file', value: audit.sourceFileName },
    { field: 'Pages processed', value: audit.pageCount },
    { field: 'Transactions in this export', value: audit.transactionCount },
    { field: 'Reconciliation', value: audit.reconciliationSummary },
    { field: 'Manually edited cells', value: audit.editedCellCount },
    { field: 'Exported at', value: audit.exportedAt.toLocaleString() },
  ]);

  const buffer = await workbook.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
