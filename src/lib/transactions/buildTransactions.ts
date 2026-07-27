import type { CleanedRow, ColumnRole } from '../pdf/types';
import { parseAmountWithConfidence } from './parseAmount';
import { parseDateValue } from './parseDate';
import type {
  ColumnShape,
  ConfidenceLevel,
  DateFormatInfo,
  Transaction,
} from './types';

const CONFIDENCE_RANK: Record<ConfidenceLevel, number> = {
  high: 2,
  medium: 1,
  low: 0,
};

function weakerConfidence(a: ConfidenceLevel, b: ConfidenceLevel): ConfidenceLevel {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

function cellAt(row: CleanedRow, index: number): string {
  return index >= 0 ? (row.cells[index] ?? '') : '';
}

function resolveAmountField(
  row: CleanedRow,
  roles: ColumnRole[],
  shape: ColumnShape,
): { amount: number; raw: string; confidence: ConfidenceLevel } {
  if (shape.kind === 'single-amount') {
    const index = roles.indexOf('amount');
    const raw = cellAt(row, index);
    const parsed = raw.trim() ? parseAmountWithConfidence(raw) : null;
    return {
      amount: parsed?.value ?? 0,
      raw,
      confidence: parsed?.confidence ?? 'low',
    };
  }

  const debitRaw = cellAt(row, shape.debitIndex);
  const creditRaw = cellAt(row, shape.creditIndex);
  const debit = debitRaw.trim() ? parseAmountWithConfidence(debitRaw) : null;
  const credit = creditRaw.trim() ? parseAmountWithConfidence(creditRaw) : null;

  if (credit && !debit) {
    return {
      amount: Math.abs(credit.value),
      raw: creditRaw,
      confidence: weakerConfidence(credit.confidence, shape.confidence),
    };
  }
  if (debit && !credit) {
    return {
      amount: -Math.abs(debit.value),
      raw: debitRaw,
      confidence: weakerConfidence(debit.confidence, shape.confidence),
    };
  }
  if (debit && credit) {
    // Both columns filled on the same row is unexpected for a Debit/Credit
    // layout — net them but flag it plainly rather than guessing which wins.
    return {
      amount: Math.abs(credit.value) - Math.abs(debit.value),
      raw: `${debitRaw} / ${creditRaw}`,
      confidence: 'low',
    };
  }
  return { amount: 0, raw: debitRaw || creditRaw, confidence: 'low' };
}

export function buildTransactions(
  rows: CleanedRow[],
  roles: ColumnRole[],
  shape: ColumnShape,
  dateFormatInfo: DateFormatInfo,
  fallbackYear: number | null,
  pageNumber: number,
  forceLowConfidence: boolean,
): Transaction[] {
  const dateIndex = roles.indexOf('date');
  const descriptionIndex = roles.indexOf('description');
  const balanceIndex = roles.indexOf('balance');

  return rows.map((row) => {
    const dateRaw = cellAt(row, dateIndex);
    const parsedDate = dateRaw.trim()
      ? parseDateValue(dateRaw, dateFormatInfo, fallbackYear)
      : null;

    const descriptionRaw = cellAt(row, descriptionIndex);

    const balanceRaw = cellAt(row, balanceIndex);
    const parsedBalance = balanceRaw.trim()
      ? parseAmountWithConfidence(balanceRaw)
      : null;

    const { amount, raw: amountRaw, confidence: amountConfidence } =
      resolveAmountField(row, roles, shape);

    const transaction: Transaction = {
      date: parsedDate?.iso ?? '',
      description: descriptionRaw,
      amount,
      balance: parsedBalance?.value ?? null,
      pageNumber,
      raw: {
        date: dateRaw,
        description: descriptionRaw,
        amount: amountRaw,
        balance: balanceRaw,
      },
      confidence: forceLowConfidence
        ? { date: 'low', description: 'low', amount: 'low', balance: 'low' }
        : {
            date: parsedDate?.confidence ?? 'low',
            description:
              descriptionIndex >= 0 && descriptionRaw.trim() ? 'high' : 'low',
            amount: amountConfidence,
            balance: parsedBalance?.confidence ?? 'low',
          },
    };

    return transaction;
  });
}
