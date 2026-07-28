import type { Row, ColumnCluster, ColumnDetectionOptions } from './types';
import { isDateLike, parseCurrencyAmount } from './textPatterns';
import { mapRowToColumns } from './mapRowToColumns';

const MAX_PLAUSIBLE_COLUMNS = 8;
const MAX_WIDEN_ATTEMPTS = 6;
const WIDEN_FACTOR = 1.6;

const MIN_SHRINK_GAP = 1;
const MAX_SHRINK_ATTEMPTS = 5;
const SHRINK_FACTOR = 0.5;

// A date is never anywhere close to this long — a cell this long in the
// column that otherwise looks like "the date column" means it absorbed the
// next column's text (columns merged, not just this one row being unusual).
const MAX_PLAUSIBLE_DATE_CELL_LENGTH = 20;

const HEADER_WORD_PATTERN =
  /^(dates?|descriptions?|transactions?|details?|amounts?|balances?|debits?|credits?|references?|withdrawals?|deposits?|payees?|memos?)$/i;

// Real statements almost always spell out column headers using this small,
// predictable vocabulary — requiring 2+ matches on one row keeps this from
// ever mistaking an ordinary transaction description for a header.
function isLikelyHeaderRow(row: Row): boolean {
  const matches = row.items.filter((item) =>
    HEADER_WORD_PATTERN.test(item.text.trim()),
  ).length;
  return matches >= 2;
}

// A preamble/summary line (account number, "Opening Balance: 4,182.55") is
// often a single wide, un-split text blob rather than several separately-
// positioned cells — and that one blob can span the gap between two real
// columns, bridging them in the projection even though no actual
// transaction row ever does. Requiring both a date-shaped token AND a
// currency-shaped token is a precise, direct qualifier for "this is a real
// transaction row" — a preamble line never has both (a "Statement Period:
// X to Y" line has two dates but no amount; an "Opening Balance: N" line
// has an amount but no date), so this excludes exactly the noise that
// would otherwise distort the projection.
function isTransactionRow(row: Row): boolean {
  const hasDate = row.items.some((item) => isDateLike(item.text.trim()));
  const hasCurrency = row.items.some(
    (item) => parseCurrencyAmount(item.text.trim()) !== null,
  );
  return hasDate && hasCurrency;
}

// Merges each item's full [start, end] interval (not just its start point),
// so a right-aligned numeric column (varying start x, shared end x across
// different digit-widths) still merges into one band: every value in it
// overlaps at least at the shared right edge, regardless of how wide the
// value itself is. This is the same thing as "find unoccupied bands wider
// than gapX": a gap this wide never closes over, no matter what's typeset
// on either side of it, which is what makes it a reliable column boundary
// signal instead of a tuned guess.
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

// Finds whichever column has the highest rate of cells starting with a
// date-like token, then checks whether that column's cells are still a
// plausible date length. If they're not, Date merged with whatever sits
// next to it (e.g. Description) — the surest sign the gap threshold is
// still too wide for this statement.
function dateColumnLooksOverMerged(rows: Row[], columns: ColumnCluster[]): boolean {
  if (columns.length === 0) return false;

  const cellsByColumn: string[][] = columns.map(() => []);
  for (const row of rows) {
    const mapped = mapRowToColumns(row, columns);
    mapped.forEach((cell, i) => cellsByColumn[i]?.push(cell));
  }

  let bestIndex = -1;
  let bestRate = 0;
  cellsByColumn.forEach((cells, i) => {
    const nonEmpty = cells.map((c) => c.trim()).filter(Boolean);
    if (nonEmpty.length === 0) return;
    const dateLikeCount = nonEmpty.filter((c) => isDateLike(c.split(/\s+/)[0] ?? c)).length;
    const rate = dateLikeCount / nonEmpty.length;
    if (rate > bestRate) {
      bestRate = rate;
      bestIndex = i;
    }
  });

  // No plausible date column at all is a different, ambiguous situation —
  // not this check's job (role assignment's own validation covers it).
  if (bestIndex === -1 || bestRate < 0.5) return false;

  const dateCells = cellsByColumn[bestIndex].map((c) => c.trim()).filter(Boolean);
  const overLongCount = dateCells.filter((c) => c.length > MAX_PLAUSIBLE_DATE_CELL_LENGTH).length;
  return overLongCount / dateCells.length > 0.2;
}

export function detectColumns(
  rows: Row[],
  { gapX }: ColumnDetectionOptions,
): ColumnCluster[] {
  const headerRow = rows.find(isLikelyHeaderRow) ?? null;
  const transactionRows = rows.filter(isTransactionRow);
  // Fall back to "everything but the header" only if nothing qualified as
  // a transaction row at all — an edge-case layout where a date and its
  // amount never land on the same raw row before merging — rather than
  // handing the projection an empty sample.
  const dataRows =
    transactionRows.length > 0
      ? transactionRows
      : rows.filter((row) => row !== headerRow);

  let currentGap = gapX;
  let columns = clusterByRange(dataRows, currentGap);
  const initialColumnCount = columns.length;

  let widenAttempts = 0;
  while (columns.length > MAX_PLAUSIBLE_COLUMNS && widenAttempts < MAX_WIDEN_ATTEMPTS) {
    currentGap *= WIDEN_FACTOR;
    columns = clusterByRange(dataRows, currentGap);
    widenAttempts += 1;
  }
  if (widenAttempts > 0) {
    console.info(
      `[detectColumns] too many columns (${initialColumnCount}) at ${gapX}px gap — widened to ${Math.round(currentGap)}px over ${widenAttempts} attempt(s), settled on ${columns.length} columns.`,
    );
  }

  // Opposite failure mode from the above: columns merged together (Date
  // absorbing Description, etc). Shrink the gap and retry rather than
  // trusting a threshold that's clearly wider than this statement's real
  // column gutters.
  let shrinkAttempts = 0;
  while (
    dateColumnLooksOverMerged(dataRows, columns) &&
    currentGap > MIN_SHRINK_GAP &&
    shrinkAttempts < MAX_SHRINK_ATTEMPTS
  ) {
    currentGap = Math.max(MIN_SHRINK_GAP, currentGap * SHRINK_FACTOR);
    columns = clusterByRange(dataRows, currentGap);
    shrinkAttempts += 1;
  }
  if (shrinkAttempts > 0) {
    console.info(
      `[detectColumns] Date column looked merged with neighboring text at ${gapX}px gap — shrank to ${Math.round(currentGap)}px over ${shrinkAttempts} attempt(s), settled on ${columns.length} columns.`,
    );
  }

  if (headerRow) {
    const headerColumnCount = headerRow.items.length;
    if (headerColumnCount !== columns.length) {
      console.info(
        `[detectColumns] header row suggests ${headerColumnCount} columns, projection found ${columns.length} — keeping the projection result.`,
      );
    }
  }

  return columns;
}
