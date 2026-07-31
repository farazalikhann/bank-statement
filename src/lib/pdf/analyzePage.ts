import { groupRows } from './groupRows';
import { detectColumns } from './detectColumns';
import { wrapStageError } from './errors';
import type {
  TextItem,
  AnalyzedPage,
  Row,
  ColumnCluster,
  RowGroupingOptions,
  ColumnDetectionOptions,
} from './types';

function mostCommonCellCountFrequency(rows: { items: unknown[] }[]): number {
  const counts = new Map<number, number>();
  for (const row of rows) {
    const n = row.items.length;
    counts.set(n, (counts.get(n) ?? 0) + 1);
  }
  let bestFrequency = 0;
  for (const frequency of counts.values()) {
    if (frequency > bestFrequency) bestFrequency = frequency;
  }
  return bestFrequency;
}

export function analyzePage(
  items: TextItem[],
  rowOptions: RowGroupingOptions,
  columnOptions: ColumnDetectionOptions,
  pageNumber: number,
): AnalyzedPage {
  let rows: Row[];
  try {
    rows = groupRows(items, rowOptions);
  } catch (err) {
    throw wrapStageError(
      'row-grouping-failed',
      `Row grouping failed on page ${pageNumber}`,
      err,
    );
  }

  let columns: ColumnCluster[];
  try {
    columns = detectColumns(rows, columnOptions, pageNumber === 1);
  } catch (err) {
    throw wrapStageError(
      'column-detection-failed',
      `Column detection failed on page ${pageNumber}`,
      err,
    );
  }

  const rowCount = rows.length;
  const matchingRows = mostCommonCellCountFrequency(rows);

  return {
    rows,
    columns,
    stats: {
      itemCount: items.length,
      rowCount,
      columnCount: columns.length,
      columnConsistencyPct:
        rowCount === 0 ? 0 : Math.round((matchingRows / rowCount) * 1000) / 10,
    },
  };
}
