import type { CleanedRow, DroppedRow, DropReason } from './types';
import { isDateLike, isPageNumberText, normalizeRowText } from './textPatterns';
import { rowHasAmount } from './mergeMultiLineRows';

export function buildRepeatedRowFrequency(
  pagesOfCells: string[][][],
): Map<string, Set<number>> {
  const frequency = new Map<string, Set<number>>();

  pagesOfCells.forEach((rowsOfCells, pageIndex) => {
    for (const cells of rowsOfCells) {
      const normalized = normalizeRowText(cells);
      if (!normalized) continue;
      const pages = frequency.get(normalized) ?? new Set<number>();
      pages.add(pageIndex);
      frequency.set(normalized, pages);
    }
  });

  return frequency;
}

export function filterJunkRows(
  rows: CleanedRow[],
  frequency: Map<string, Set<number>>,
): { kept: CleanedRow[]; dropped: DroppedRow[] } {
  const kept: CleanedRow[] = [];
  const dropped: DroppedRow[] = [];

  const firstDateIndex = rows.findIndex((row) =>
    row.cells.some((cell) => isDateLike(cell)),
  );

  rows.forEach((row, index) => {
    const fullText = row.cells
      .filter((cell) => cell.trim())
      .join(' ')
      .trim();
    const normalized = normalizeRowText(row.cells);
    const nonEmptyCells = row.cells.filter((cell) => cell.trim());

    let reason: DropReason | null = null;

    if (firstDateIndex >= 0 && index < firstDateIndex) {
      reason = 'above-first-date';
    } else if (isPageNumberText(fullText)) {
      reason = 'page-number';
    } else if ((frequency.get(normalized)?.size ?? 0) > 1) {
      reason = 'repeated-across-pages';
    } else if (nonEmptyCells.length <= 1 && !rowHasAmount(row.cells)) {
      reason = 'single-cell-no-amount';
    }

    if (reason) {
      dropped.push({ cells: row.cells, reason });
    } else {
      kept.push(row);
    }
  });

  return { kept, dropped };
}
