import type { Row, ColumnCluster } from './types';

export function mapRowToColumns(row: Row, columns: ColumnCluster[]): string[] {
  const cells = columns.map(() => [] as string[]);

  for (const item of row.items) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    for (const column of columns) {
      const distance =
        item.x < column.start
          ? column.start - item.x
          : item.x > column.end
            ? item.x - column.end
            : 0;
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = column.index;
      }
    }
    cells[bestIndex].push(item.text);
  }

  return cells.map((texts) => texts.join(' '));
}
