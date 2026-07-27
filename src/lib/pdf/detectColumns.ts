import type { Row, ColumnCluster, ColumnDetectionOptions } from './types';

export function detectColumns(
  rows: Row[],
  { gapX }: ColumnDetectionOptions,
): ColumnCluster[] {
  const xPositions = rows
    .flatMap((row) => row.items.map((item) => item.x))
    .sort((a, b) => a - b);

  const clusters: ColumnCluster[] = [];

  for (const x of xPositions) {
    const currentCluster = clusters[clusters.length - 1];
    if (currentCluster && x - currentCluster.end <= gapX) {
      currentCluster.end = x;
    } else {
      clusters.push({ index: clusters.length, start: x, end: x });
    }
  }

  return clusters;
}
