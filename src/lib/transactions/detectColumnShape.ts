import type { CleanedRow, ColumnRole } from '../pdf/types';
import { parseAmountWithConfidence } from './parseAmount';
import type { ColumnShape } from './types';

const MIN_STRONG_VOTES = 3;

function amountAt(row: CleanedRow, index: number): number | null {
  return parseAmountWithConfidence(row.cells[index] ?? '')?.value ?? null;
}

// Step 2's detectColumnRoles already collapses everything down to at most
// one 'amount' + one 'balance'. When it instead leaves two 'amount' columns
// standing, that's a real Debit/Credit layout — this decides which column
// is which using the balance column as a witness: whichever column's
// non-empty value lines up with the balance increasing is credit, the one
// that lines up with it decreasing is debit.
export function refineColumnRoles(
  rows: CleanedRow[],
  baseRoles: ColumnRole[],
): { roles: ColumnRole[]; shape: ColumnShape } {
  const roles = [...baseRoles];
  const amountIndices = roles.reduce<number[]>((acc, role, index) => {
    if (role === 'amount') acc.push(index);
    return acc;
  }, []);

  if (amountIndices.length !== 2) {
    return { roles, shape: { kind: 'single-amount' } };
  }

  const [colA, colB] = amountIndices;
  const balanceIndex = roles.findIndex((role) => role === 'balance');

  let aCredit = 0;
  let aDebit = 0;
  let bCredit = 0;
  let bDebit = 0;

  if (balanceIndex >= 0) {
    let previousBalance: number | null = null;
    for (const row of rows) {
      const balanceValue = amountAt(row, balanceIndex);
      const aValue = amountAt(row, colA);
      const bValue = amountAt(row, colB);

      if (previousBalance !== null && balanceValue !== null) {
        const delta = balanceValue - previousBalance;
        const onlyA = aValue !== null && bValue === null;
        const onlyB = bValue !== null && aValue === null;

        if (onlyA && delta > 0) aCredit += 1;
        else if (onlyA && delta < 0) aDebit += 1;
        else if (onlyB && delta > 0) bCredit += 1;
        else if (onlyB && delta < 0) bDebit += 1;
      }

      if (balanceValue !== null) previousBalance = balanceValue;
    }
  }

  const aScore = aCredit - aDebit;
  const bScore = bCredit - bDebit;
  const totalEvidence = aCredit + aDebit + bCredit + bDebit;

  let debitIndex: number;
  let creditIndex: number;

  if (totalEvidence > 0 && aScore !== bScore) {
    const aIsCredit = aScore > bScore;
    creditIndex = aIsCredit ? colA : colB;
    debitIndex = aIsCredit ? colB : colA;
  } else {
    // No usable balance evidence (or a dead-even split): fall back to the
    // common "Debit column first" layout convention.
    debitIndex = colA;
    creditIndex = colB;
  }

  const aConsistent = aCredit === 0 || aDebit === 0;
  const bConsistent = bCredit === 0 || bDebit === 0;
  const confidence =
    totalEvidence >= MIN_STRONG_VOTES && aConsistent && bConsistent
      ? 'high'
      : 'medium';

  roles[debitIndex] = 'debit';
  roles[creditIndex] = 'credit';

  return {
    roles,
    shape: { kind: 'debit-credit', debitIndex, creditIndex, confidence },
  };
}
