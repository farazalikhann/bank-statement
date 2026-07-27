import type { ConfidenceLevel } from '../pdf/types';

export type { ConfidenceLevel };

export interface Transaction {
  date: string;
  description: string;
  amount: number;
  balance: number | null;
  raw: {
    date: string;
    description: string;
    amount: string;
    balance: string;
  };
  confidence: {
    date: ConfidenceLevel;
    description: ConfidenceLevel;
    amount: ConfidenceLevel;
    balance: ConfidenceLevel;
  };
}

export type DateFieldOrder = 'MDY' | 'DMY';

export interface DateFormatInfo {
  order: DateFieldOrder;
  resolved: boolean;
}

export type ColumnShape =
  | { kind: 'single-amount' }
  | {
      kind: 'debit-credit';
      debitIndex: number;
      creditIndex: number;
      confidence: ConfidenceLevel;
    };

export type TransactionOrder = 'oldest-first' | 'newest-first' | 'unknown';
