import type { Row, ColumnCluster, ColumnDetectionOptions } from './types';
import { isDateLike, parseCurrencyAmount } from './textPatterns';
import { mapRowToColumns } from './mapRowToColumns';

const MAX_PLAUSIBLE_COLUMNS = 8;
const MAX_WIDEN_ATTEMPTS = 6;
const WIDEN_FACTOR = 1.6;

const MIN_SHRINK_GAP = 1;
const MAX_SHRINK_ATTEMPTS = 5;
const SHRINK_FACTOR = 0.5;

// Below this many qualifying rows, there isn't enough of a sample to trust
// for the whitespace projection — silently projecting over every row
// (including header/preamble furniture) is what let those furniture lines
// bridge real column gaps in the first place.
const MIN_QUALIFYING_ROWS = 5;
// How much of page 1's vertical span to treat as "the header block" once
// even the loosened currency-only rule can't find enough rows — account
// summary lines (statement period, account holder, etc.) cluster at the
// top of the first page.
const HEADER_BLOCK_FRACTION = 0.25;

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

function hasCurrencyToken(row: Row): boolean {
  return row.items.some((item) => parseCurrencyAmount(item.text.trim()) !== null);
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
  return hasDate && hasCurrencyToken(row);
}

// Excludes rows sitting in the top HEADER_BLOCK_FRACTION of the page's own
// vertical span (measured from `referenceRows`, the full unfiltered set of
// rows on the page) — that's where a statement's account-summary furniture
// (statement period, account holder, address block) lives, and it's the
// last thing standing between "still too few qualifying rows" and handing
// the projection a real column boundary to find.
function excludeHeaderBlock(rows: Row[], referenceRows: Row[]): Row[] {
  if (referenceRows.length === 0) return rows;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const row of referenceRows) {
    if (row.y < minY) minY = row.y;
    if (row.y > maxY) maxY = row.y;
  }
  const cutoff = minY + (maxY - minY) * HEADER_BLOCK_FRACTION;
  return rows.filter((row) => row.y > cutoff);
}

type RowSelectionPath =
  | 'strict-transaction-rows'
  | 'currency-only'
  | 'currency-only-minus-header-block'
  | 'currency-only-fallback'
  | 'strict-fallback'
  | 'all-non-header-rows';

// Picks which rows to hand to the whitespace projection. Never silently
// falls back to "every row" the moment the strict (date + currency)
// qualifier comes up short — that's exactly how a preamble line like
// "Period: 01-Mar-2026 through 30-Jun-2026" (which has dates but no
// currency) or "Member: M. R. CARTER" (neither) used to end up bridging the
// Date/Description gap in the projection. Instead this escalates through
// progressively looser rules, and only actually widens the candidate set
// when doing so grows it — degrading gracefully instead of guessing.
function selectDataRows(
  allRows: Row[],
  nonHeaderRows: Row[],
  isFirstPage: boolean,
): { dataRows: Row[]; path: RowSelectionPath } {
  const strict = nonHeaderRows.filter(isTransactionRow);
  if (strict.length >= MIN_QUALIFYING_ROWS) {
    return { dataRows: strict, path: 'strict-transaction-rows' };
  }

  const looser = nonHeaderRows.filter(hasCurrencyToken);
  if (looser.length >= MIN_QUALIFYING_ROWS) {
    return { dataRows: looser, path: 'currency-only' };
  }

  if (isFirstPage) {
    const base = looser.length > 0 ? looser : nonHeaderRows;
    const trimmed = excludeHeaderBlock(base, allRows);
    if (trimmed.length > 0 && trimmed.length > strict.length) {
      return { dataRows: trimmed, path: 'currency-only-minus-header-block' };
    }
  }

  // Nothing cleared the bar — use whatever's largest rather than handing
  // the projection an empty sample.
  if (looser.length > strict.length) {
    return { dataRows: looser, path: 'currency-only-fallback' };
  }
  if (strict.length > 0) {
    return { dataRows: strict, path: 'strict-fallback' };
  }
  return { dataRows: nonHeaderRows, path: 'all-non-header-rows' };
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
  isFirstPage: boolean,
): ColumnCluster[] {
  const headerRow = rows.find(isLikelyHeaderRow) ?? null;
  const nonHeaderRows = rows.filter((row) => row !== headerRow);
  const { dataRows, path } = selectDataRows(rows, nonHeaderRows, isFirstPage);
  if (path !== 'strict-transaction-rows') {
    console.info(
      `[detectColumns] only ${nonHeaderRows.filter(isTransactionRow).length} row(s) qualified as strict transaction rows (need ${MIN_QUALIFYING_ROWS}) — used fallback path "${path}" with ${dataRows.length} row(s) for the column projection.`,
    );
  }

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
