import type { CleanedRow } from './types';
import { isDateLike, looksLikeSummaryLine, parseCurrencyAmount } from './textPatterns';

export function rowHasAmount(cells: string[]): boolean {
  return cells.some((cell) => parseCurrencyAmount(cell) !== null);
}

// Picks which cell wrapped continuation text should fold into. Prefers the
// longest cell that doesn't itself look like a date or an amount — plain
// character count alone can pick the date column over a short description
// like "Interest" (8 chars) next to a 10-character date.
export function bestMergeTargetIndex(cells: string[]): number {
  const proseIndices = cells
    .map((cell, index) => ({ cell, index }))
    .filter(
      ({ cell }) =>
        cell.trim() && !isDateLike(cell) && parseCurrencyAmount(cell) === null,
    );
  const candidates = proseIndices.length > 0
    ? proseIndices
    : cells.map((cell, index) => ({ cell, index }));

  return candidates.reduce((best, current) =>
    current.cell.length > best.cell.length ? current : best,
  ).index;
}

// Input is expected to already be furniture-free (stripPatternFurniture runs
// first) so this only has to decide, for each row, whether it's a wrapped
// continuation of the previous one (no amount of its own) or a transaction
// in its own right.
export function mergeMultiLineRows(cellsList: string[][]): CleanedRow[] {
  const result: CleanedRow[] = [];

  for (const cells of cellsList) {
    const previous = result[result.length - 1];

    if (!rowHasAmount(cells) && previous && !looksLikeSummaryLine(cells)) {
      const extraText = cells
        .filter((cell) => cell.trim())
        .join(' ')
        .trim();
      if (extraText) {
        const targetIndex = bestMergeTargetIndex(previous.cells);
        previous.cells[targetIndex] = previous.cells[targetIndex]
          ? `${previous.cells[targetIndex]}\n${extraText}`
          : extraText;
        previous.mergedLineCount += 1;
        previous.mergedIntoIndex = targetIndex;
      }
      continue;
    }

    result.push({
      cells: [...cells],
      mergedLineCount: 0,
      mergedIntoIndex: bestMergeTargetIndex(cells),
      mergedFromNextPage: false,
    });
  }

  return result;
}
