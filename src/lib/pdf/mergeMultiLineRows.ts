import type { CleanedRow } from './types';
import { isPageNumberText, normalizeRowText, parseCurrencyAmount } from './textPatterns';

export function rowHasAmount(cells: string[]): boolean {
  return cells.some((cell) => parseCurrencyAmount(cell) !== null);
}

function longestCellIndex(cells: string[]): number {
  let bestIndex = 0;
  let bestLength = -1;
  cells.forEach((cell, index) => {
    if (cell.length > bestLength) {
      bestLength = cell.length;
      bestIndex = index;
    }
  });
  return bestIndex;
}

// A no-amount row that's actually page furniture (a page number, or text
// repeated on other pages) must never be folded into the previous
// transaction's description — it needs to stay its own row so
// filterJunkRows can drop it visibly instead of silently corrupting a
// real transaction.
function isFurnitureRow(
  cells: string[],
  frequency: Map<string, Set<number>>,
): boolean {
  const fullText = cells
    .filter((cell) => cell.trim())
    .join(' ')
    .trim();
  if (isPageNumberText(fullText)) return true;
  const normalized = normalizeRowText(cells);
  return (frequency.get(normalized)?.size ?? 0) > 1;
}

export function mergeMultiLineRows(
  cellsList: string[][],
  frequency: Map<string, Set<number>>,
): CleanedRow[] {
  const result: CleanedRow[] = [];

  for (const cells of cellsList) {
    const previous = result[result.length - 1];

    if (
      !rowHasAmount(cells) &&
      previous &&
      !isFurnitureRow(cells, frequency)
    ) {
      const extraText = cells
        .filter((cell) => cell.trim())
        .join(' ')
        .trim();
      if (extraText) {
        const targetIndex = longestCellIndex(previous.cells);
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
      mergedIntoIndex: longestCellIndex(cells),
    });
  }

  return result;
}
