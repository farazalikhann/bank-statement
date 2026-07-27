import type { CleanedRow, ColumnRole } from './types';
import { isDateLike, parseCurrencyAmount } from './textPatterns';

const MATCH_THRESHOLD = 0.6;

export function detectColumnRoles(
  rows: CleanedRow[],
  columnCount: number,
): ColumnRole[] {
  const stats = Array.from({ length: columnCount }, () => ({
    nonEmpty: 0,
    dateMatches: 0,
    amountMatches: 0,
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
    });
  }

  const roles: ColumnRole[] = stats.map((stat) => {
    if (stat.nonEmpty === 0) return 'unknown';
    const dateRate = stat.dateMatches / stat.nonEmpty;
    const amountRate = stat.amountMatches / stat.nonEmpty;
    if (dateRate >= MATCH_THRESHOLD) return 'date';
    if (amountRate >= MATCH_THRESHOLD) return 'amount';
    return 'description';
  });

  const amountIndices = roles.reduce<number[]>((acc, role, index) => {
    if (role === 'amount') acc.push(index);
    return acc;
  }, []);

  if (amountIndices.length > 1) {
    roles[amountIndices[amountIndices.length - 1]] = 'balance';
  }

  return roles;
}
