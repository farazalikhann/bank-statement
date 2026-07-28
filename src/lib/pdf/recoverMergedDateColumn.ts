import type { CleanedRow, ColumnRole } from './types';
import { isDateLike } from './textPatterns';

const EMPTY_DATE_REJECTION_THRESHOLD = 0.3;
const LEADING_DATE_PRESENCE_THRESHOLD = 0.5;

// Last-resort fallback for when column detection still couldn't separate
// Date from Description — if the Date column (or the lack of one) is empty
// on more than 30% of rows while Description's cells visibly start with a
// date most of the time, split each row's description on its leading
// date-like token rather than leaving dates stuck inside the description
// text. Only touches rows/roles when both conditions hold; otherwise
// returns the inputs unchanged.
export function recoverMergedDateColumn(
  rows: CleanedRow[],
  roles: ColumnRole[],
): { rows: CleanedRow[]; roles: ColumnRole[] } {
  const descriptionIndex = roles.indexOf('description');
  if (descriptionIndex < 0 || rows.length === 0) return { rows, roles };

  const existingDateIndex = roles.indexOf('date');

  let emptyDateCount = 0;
  for (const row of rows) {
    const cell = existingDateIndex >= 0 ? row.cells[existingDateIndex]?.trim() : '';
    if (!cell) emptyDateCount += 1;
  }
  const emptyDateRate = emptyDateCount / rows.length;
  if (emptyDateRate <= EMPTY_DATE_REJECTION_THRESHOLD) return { rows, roles };

  const descriptionCells = rows
    .map((row) => row.cells[descriptionIndex]?.trim() ?? '')
    .filter(Boolean);
  if (descriptionCells.length === 0) return { rows, roles };

  const leadingDateCount = descriptionCells.filter((cell) => {
    const [first] = cell.split(/\s+/);
    return first !== undefined && isDateLike(first);
  }).length;
  if (leadingDateCount / descriptionCells.length < LEADING_DATE_PRESENCE_THRESHOLD) {
    return { rows, roles };
  }

  const dateTargetIndex = existingDateIndex >= 0 ? existingDateIndex : roles.length;
  const nextRoles: ColumnRole[] = existingDateIndex >= 0 ? roles : [...roles, 'date'];

  const nextRows = rows.map((row) => {
    const original = row.cells[descriptionIndex]?.trim() ?? '';
    const spaceIndex = original.indexOf(' ');
    const leading = spaceIndex >= 0 ? original.slice(0, spaceIndex) : original;
    if (!isDateLike(leading)) return row;

    const cells = [...row.cells];
    cells[descriptionIndex] = spaceIndex >= 0 ? original.slice(spaceIndex + 1).trim() : '';
    cells[dateTargetIndex] = leading;
    return { ...row, cells };
  });

  return { rows: nextRows, roles: nextRoles };
}
