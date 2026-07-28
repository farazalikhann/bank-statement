export interface ExportColumns {
  date: boolean;
  description: boolean;
  amount: boolean;
  balance: boolean;
  pageNumber: boolean;
}

export type ExportDateFormat = 'MDY' | 'DMY' | 'ISO';
export type AmountMode = 'signed' | 'split';

export interface ExportOptions {
  columns: ExportColumns;
  dateFormat: ExportDateFormat;
  includeFlagged: boolean;
  amountMode: AmountMode;
}

export interface AuditInfo {
  sourceFileName: string;
  pageCount: number;
  transactionCount: number;
  reconciliationSummary: string;
  editedCellCount: number;
  exportedAt: Date;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  columns: {
    date: true,
    description: true,
    amount: true,
    balance: true,
    pageNumber: false,
  },
  dateFormat: 'ISO',
  includeFlagged: true,
  amountMode: 'signed',
};
