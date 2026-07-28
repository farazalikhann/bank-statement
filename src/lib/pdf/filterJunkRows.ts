import type { CleanedRow, DroppedRow, DropReason, RawRow } from './types';
import {
  isDateLike,
  isPageNumberText,
  looksLikeSummaryLine,
  normalizeRowText,
} from './textPatterns';
import { rowHasAmount } from './mergeMultiLineRows';

interface FrequencyEntry {
  pageIndex: number;
  relativeY: number;
}

// How close (as a fraction of page height) a repeated row's position has to
// stay across pages to count as furniture rather than a coincidentally
// identical transaction elsewhere on the page.
const POSITION_TOLERANCE = 0.15;

export function buildRepeatedRowFrequency(
  pagesOfRawRows: RawRow[][],
): Map<string, FrequencyEntry[]> {
  const frequency = new Map<string, FrequencyEntry[]>();

  pagesOfRawRows.forEach((rows, pageIndex) => {
    for (const row of rows) {
      const normalized = normalizeRowText(row.cells);
      if (!normalized) continue;
      const entries = frequency.get(normalized) ?? [];
      entries.push({ pageIndex, relativeY: row.relativeY });
      frequency.set(normalized, entries);
    }
  });

  return frequency;
}

function isRepeatedAcrossPages(
  normalized: string,
  frequency: Map<string, FrequencyEntry[]>,
): boolean {
  const entries = frequency.get(normalized);
  if (!entries || entries.length <= 1) return false;
  if (new Set(entries.map((entry) => entry.pageIndex)).size <= 1) return false;
  const positions = entries.map((entry) => entry.relativeY);
  return Math.max(...positions) - Math.min(...positions) <= POSITION_TOLERANCE;
}

// Phase 1: position/pattern-based furniture — safe to remove before any
// merging happens, since none of these checks depend on merge outcomes.
//
// The above-first-date cutoff only applies to the document's first page.
// On later pages, a row sitting before that page's own first dated row is
// indistinguishable, from the page's content alone, from a wrapped
// description continuing off the bottom of the previous page — both are
// "no date, no amount, sitting at the top of the page." Real bank
// statements essentially never open a continuation page with fresh
// disclosure text, so it's a safe trade to leave those rows as merge/
// stitch candidates here and let stitchCrossPageRows claim genuine
// continuations, with dropOrphanRows catching whatever's left unclaimed.
export function stripPatternFurniture(
  rows: RawRow[],
  frequency: Map<string, FrequencyEntry[]>,
  isFirstPage: boolean,
): { candidates: string[][]; dropped: DroppedRow[] } {
  const candidates: string[][] = [];
  const dropped: DroppedRow[] = [];

  const firstDateIndex = isFirstPage
    ? rows.findIndex((row) => row.cells.some((cell) => isDateLike(cell)))
    : -1;

  rows.forEach((row, index) => {
    const fullText = row.cells
      .filter((cell) => cell.trim())
      .join(' ')
      .trim();
    const normalized = normalizeRowText(row.cells);

    let reason: DropReason | null = null;

    if (
      firstDateIndex >= 0 &&
      index < firstDateIndex &&
      !looksLikeSummaryLine(row.cells)
    ) {
      reason = 'above-first-date';
    } else if (isPageNumberText(fullText)) {
      reason = 'page-number';
    } else if (isRepeatedAcrossPages(normalized, frequency)) {
      reason = 'repeated-across-pages';
    }

    if (reason) {
      dropped.push({ cells: row.cells, reason });
    } else {
      candidates.push(row.cells);
    }
  });

  return { candidates, dropped };
}

// Phase 2 (runs after merge, both within-page and cross-page): whatever
// still has neither a date nor an amount never found a transaction to
// attach to, so it's stray text rather than page furniture. This also
// catches a page-specific header row that stripPatternFurniture's
// repeated-across-pages check can miss — e.g. a page whose column count
// doesn't match the rest of the document has its own differently-shaped
// header text, which never repeats anywhere else and so never matches
// that check — since a real transaction always has a date or an amount,
// checking cell count alone (the previous rule) wasn't enough.
export function dropOrphanRows(
  rows: CleanedRow[],
): { kept: CleanedRow[]; dropped: DroppedRow[] } {
  const kept: CleanedRow[] = [];
  const dropped: DroppedRow[] = [];

  for (const row of rows) {
    const hasDate = row.cells.some((cell) => isDateLike(cell));
    const isOrphan =
      !hasDate && !rowHasAmount(row.cells) && !looksLikeSummaryLine(row.cells);
    if (isOrphan) {
      dropped.push({ cells: row.cells, reason: 'single-cell-no-amount' });
    } else {
      kept.push(row);
    }
  }

  return { kept, dropped };
}
