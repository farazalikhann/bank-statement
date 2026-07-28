import type { BalanceBreak, ValidatableRow } from './types';

const EPSILON = 0.005;

interface BalanceCheckResult {
  balanceBreaks: BalanceBreak[];
  sumOfAmounts: number;
  expectedClosing: number | null;
  difference: number | null;
}

// One chain walk produces both the per-row running-balance check and the
// statement-level reconciliation: the opening balance is just the
// "previous balance" for row 0, so there's no separate algorithm for the
// two — the closing check is simply the last link. If a row's own balance
// is unreadable (null), the chain carries the accumulated amount forward
// and re-anchors at the next row with a real balance, so one bad row
// doesn't cascade into every row after it looking broken too.
export function checkBalances(
  rows: ValidatableRow[],
  openingBalance: number | null,
  closingBalance: number | null,
): BalanceCheckResult {
  const balanceBreaks: BalanceBreak[] = [];
  let lastKnownBalance = openingBalance;
  let carried = 0;
  let sumOfAmounts = 0;

  for (const row of rows) {
    sumOfAmounts += row.amount;
    carried += row.amount;

    if (row.balance !== null) {
      if (lastKnownBalance !== null) {
        const expected = lastKnownBalance + carried;
        const difference = row.balance - expected;
        if (Math.abs(difference) >= EPSILON) {
          balanceBreaks.push({
            rowId: row.id,
            expectedBalance: expected,
            actualBalance: row.balance,
            difference,
          });
        }
      }
      lastKnownBalance = row.balance;
      carried = 0;
    }
  }

  const expectedClosing =
    openingBalance !== null ? openingBalance + sumOfAmounts : null;
  const difference =
    closingBalance !== null && expectedClosing !== null
      ? closingBalance - expectedClosing
      : null;

  return { balanceBreaks, sumOfAmounts, expectedClosing, difference };
}

export function severityFor(difference: number): 'balanced' | 'minor' | 'moderate' | 'significant' {
  const abs = Math.abs(difference);
  if (abs < 0.01) return 'balanced';
  if (abs <= 1) return 'minor';
  if (abs <= 25) return 'moderate';
  return 'significant';
}
