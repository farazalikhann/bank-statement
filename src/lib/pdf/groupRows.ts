import type { TextItem, Row, RowGroupingOptions } from './types';

export function groupRows(
  items: TextItem[],
  { toleranceY }: RowGroupingOptions,
): Row[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);

  const rows: Row[] = [];

  for (const item of sorted) {
    const currentRow = rows[rows.length - 1];
    if (currentRow && item.y - currentRow.y <= toleranceY) {
      currentRow.items.push(item);
    } else {
      rows.push({ y: item.y, items: [item] });
    }
  }

  for (const row of rows) {
    row.items.sort((a, b) => a.x - b.x);
  }

  return rows;
}
