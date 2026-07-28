// The minimal shape every check needs — deliberately structural (not
// imported from useEditableTransactions) so this module has no dependency
// on the hooks layer; EditableTransaction already satisfies this shape.
export interface ValidatableRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  balance: number | null;
}

export interface BalanceBreak {
  rowId: string;
  expectedBalance: number;
  actualBalance: number;
  difference: number;
}

export type SeverityTier = 'balanced' | 'minor' | 'moderate' | 'significant';

export interface DuplicateGroup {
  key: string;
  rowIds: string[];
}

export interface DateIssue {
  rowId: string;
  kind: 'outside-period' | 'ordering-break';
}

export type BalanceSource = 'summary' | 'manual';

export interface ReconciliationResult {
  openingBalance: number | null;
  openingSource: BalanceSource | null;
  closingBalance: number | null;
  closingSource: BalanceSource | null;
  sumOfAmounts: number;
  expectedClosing: number | null;
  difference: number | null;
  severity: SeverityTier | null;
  balanceBreaks: BalanceBreak[];
  duplicates: DuplicateGroup[];
  dateIssues: DateIssue[];
}
