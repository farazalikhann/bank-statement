import type { CleanedRow, ColumnRole } from './types';
import { isDateLike, parseCurrencyAmount } from './textPatterns';

const MATCH_THRESHOLD = 0.6;
// A column can look amount-shaped or fill-worthy by rate and still be the
// wrong choice — these gates catch that after the fact instead of trusting
// the rate alone, per the "validate the result, not just the candidate"
// requirement.
const ZERO_OR_NULL_REJECTION_THRESHOLD = 0.3;
const EMPTY_REJECTION_THRESHOLD = 0.3;
// Below this many consecutive-row balance checks, there isn't enough
// evidence to override the default "rightmost column is Balance"
// convention — matches the MIN_STRONG_VOTES bar used for the analogous
// Debit/Credit disambiguation in detectColumnShape.ts.
const MIN_BALANCE_EVIDENCE_ROWS = 3;

interface ColumnStats {
  index: number;
  nonEmpty: number;
  dateMatches: number;
  amountMatches: number;
  alphaMatches: number;
}

function computeColumnStats(rows: CleanedRow[], columnCount: number): ColumnStats[] {
  const stats: ColumnStats[] = Array.from({ length: columnCount }, (_, index) => ({
    index,
    nonEmpty: 0,
    dateMatches: 0,
    amountMatches: 0,
    alphaMatches: 0,
  }));

  for (const row of rows) {
    row.cells.forEach((rawCell, index) => {
      const stat = stats[index];
      if (!stat) return;
      const cell = rawCell.trim();
      if (!cell) return;
      stat.nonEmpty += 1;
      if (isDateLike(cell)) stat.dateMatches += 1;
      if (parseCurrencyAmount(cell) !== null) stat.amountMatches += 1;
      if (/[a-zA-Z]{2,}/.test(cell)) stat.alphaMatches += 1;
    });
  }

  return stats;
}

// Counts how often previousBalance + amount == currentBalance across
// consecutive rows for a candidate (amountIndex, balanceIndex) pairing —
// the arithmetic ground truth for which of two amount-shaped columns is
// really the running balance, rather than guessing from column position.
function balanceConsistencyEvidence(
  rows: CleanedRow[],
  amountIndex: number,
  balanceIndex: number,
): { checked: number; rate: number } {
  let checked = 0;
  let consistent = 0;
  let previousBalance: number | null = null;

  for (const row of rows) {
    const balance = parseCurrencyAmount(row.cells[balanceIndex]?.trim() ?? '');
    const amount = parseCurrencyAmount(row.cells[amountIndex]?.trim() ?? '');

    if (previousBalance !== null && balance !== null && amount !== null) {
      checked += 1;
      if (Math.abs(previousBalance + amount - balance) < 0.01) consistent += 1;
    }
    if (balance !== null) previousBalance = balance;
  }

  return { checked, rate: checked === 0 ? 0 : consistent / checked };
}

// A real Amount column is essentially never mostly-zero/unparseable. If a
// candidate is, it's almost certainly a mis-clustered fragment rather than
// the true amount column, even though its match *rate* looked qualifying.
function zeroOrNullRate(rows: CleanedRow[], columnIndex: number): number {
  let total = 0;
  let zeroOrNull = 0;
  for (const row of rows) {
    const cell = row.cells[columnIndex]?.trim();
    if (!cell) continue;
    total += 1;
    const parsed = parseCurrencyAmount(cell);
    if (parsed === null || parsed === 0) zeroOrNull += 1;
  }
  return total === 0 ? 1 : zeroOrNull / total;
}

export function detectColumnRoles(
  rows: CleanedRow[],
  columnCount: number,
): ColumnRole[] {
  const stats = computeColumnStats(rows, columnCount);
  const roles: ColumnRole[] = Array.from({ length: columnCount }, () => 'unknown');
  const assigned = new Set<number>();

  const dateCandidate = stats
    .filter((s) => s.nonEmpty > 0)
    .map((s) => ({ ...s, rate: s.dateMatches / s.nonEmpty }))
    .filter((s) => s.rate >= MATCH_THRESHOLD)
    .sort((a, b) => b.rate - a.rate)[0];
  if (dateCandidate) {
    roles[dateCandidate.index] = 'date';
    assigned.add(dateCandidate.index);
  }

  // Every column that looks amount-shaped by rate AND survives the
  // zero/null self-check qualifies; the rightmost of those becomes Balance
  // (existing convention) and the rest stay 'amount' candidates for
  // refineColumnRoles' later Debit/Credit split.
  const qualifiedAmountColumns = stats
    .filter((s) => !assigned.has(s.index) && s.nonEmpty > 0)
    .map((s) => ({ ...s, rate: s.amountMatches / s.nonEmpty }))
    .filter(
      (s) =>
        s.rate >= MATCH_THRESHOLD &&
        zeroOrNullRate(rows, s.index) <= ZERO_OR_NULL_REJECTION_THRESHOLD,
    )
    .sort((a, b) => a.index - b.index);

  for (const candidate of qualifiedAmountColumns) {
    roles[candidate.index] = 'amount';
    assigned.add(candidate.index);
  }
  if (qualifiedAmountColumns.length > 1) {
    // Default convention: rightmost qualified column is Balance. But when
    // there are exactly two candidates, arithmetic evidence beats position
    // — if the running-balance check clearly favors the *other* column,
    // the default guess is wrong (e.g. columns merged/reordered upstream)
    // and gets corrected here instead of silently shipping swapped roles.
    let balanceIndex = qualifiedAmountColumns[qualifiedAmountColumns.length - 1].index;

    if (qualifiedAmountColumns.length === 2) {
      const [left, right] = qualifiedAmountColumns.map((c) => c.index);
      const rightIsBalance = balanceConsistencyEvidence(rows, left, right);
      const leftIsBalance = balanceConsistencyEvidence(rows, right, left);

      if (
        leftIsBalance.checked >= MIN_BALANCE_EVIDENCE_ROWS &&
        leftIsBalance.rate > rightIsBalance.rate
      ) {
        balanceIndex = left;
      }
    }

    roles[balanceIndex] = 'balance';
  }

  // Description: prefer the most alphabetic-content column among what's
  // left, but reject one that's empty on too many rows (e.g. a reference-
  // number column that happens to contain some letters) in favor of the
  // next-best candidate.
  const descriptionCandidates = stats
    .filter((s) => !assigned.has(s.index) && s.alphaMatches > 0)
    .map((s) => ({
      ...s,
      alphaRate: s.nonEmpty > 0 ? s.alphaMatches / s.nonEmpty : 0,
      fillRate: rows.length > 0 ? s.nonEmpty / rows.length : 0,
    }))
    .sort((a, b) => b.alphaRate - a.alphaRate);

  const descriptionCandidate =
    descriptionCandidates.find(
      (s) => s.fillRate >= 1 - EMPTY_REJECTION_THRESHOLD,
    ) ?? descriptionCandidates[0];

  if (descriptionCandidate) {
    roles[descriptionCandidate.index] = 'description';
  }

  return roles;
}
