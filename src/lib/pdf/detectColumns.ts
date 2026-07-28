import type { Row, ColumnCluster, ColumnDetectionOptions } from './types';

const MAX_PLAUSIBLE_COLUMNS = 8;
const MAX_WIDEN_ATTEMPTS = 6;
const WIDEN_FACTOR = 1.6;

// Merges each item's full [start, end] interval (not just its start point),
// so a right-aligned numeric column (varying start x, shared end x across
// different digit-widths) still merges into one band: every value in it
// overlaps at least at the shared right edge, regardless of how wide the
// value itself is.
function clusterByRange(rows: Row[], gapX: number): ColumnCluster[] {
  const intervals = rows
    .flatMap((row) => row.items.map((item) => ({ start: item.x, end: item.x + item.width })))
    .sort((a, b) => a.start - b.start);

  const bands: { start: number; end: number }[] = [];

  for (const interval of intervals) {
    const current = bands[bands.length - 1];
    if (current && interval.start - current.end <= gapX) {
      current.end = Math.max(current.end, interval.end);
    } else {
      bands.push({ start: interval.start, end: interval.end });
    }
  }

  return bands.map((band, index) => ({ index, start: band.start, end: band.end }));
}

export function detectColumns(
  rows: Row[],
  { gapX }: ColumnDetectionOptions,
): ColumnCluster[] {
  let currentGap = gapX;
  let columns = clusterByRange(rows, currentGap);
  const initialColumnCount = columns.length;

  let attempts = 0;
  while (columns.length > MAX_PLAUSIBLE_COLUMNS && attempts < MAX_WIDEN_ATTEMPTS) {
    currentGap *= WIDEN_FACTOR;
    columns = clusterByRange(rows, currentGap);
    attempts += 1;
  }

  if (attempts > 0) {
    console.info(
      `[detectColumns] too many columns (${initialColumnCount}) at ${gapX}px gap — widened to ${Math.round(currentGap)}px over ${attempts} attempt(s), settled on ${columns.length} columns.`,
    );
  }

  return columns;
}
