import type { DuplicateGroup, ValidatableRow } from './types';

// Same date + amount + description appearing more than once. Real
// duplicate transactions do happen (a genuine double charge, a repeated
// fee) so this only ever flags — never removes anything.
export function findDuplicates(rows: ValidatableRow[]): DuplicateGroup[] {
  const groups = new Map<string, string[]>();

  for (const row of rows) {
    if (!row.date || !row.description.trim()) continue;
    const key = `${row.date}|${row.amount.toFixed(2)}|${row.description.trim().toLowerCase()}`;
    const ids = groups.get(key) ?? [];
    ids.push(row.id);
    groups.set(key, ids);
  }

  return Array.from(groups.entries())
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, rowIds: ids }));
}
