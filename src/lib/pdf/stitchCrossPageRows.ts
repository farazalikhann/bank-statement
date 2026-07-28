import type { CleanedRow } from './types';
import { bestMergeTargetIndex, rowHasAmount } from './mergeMultiLineRows';
import { looksLikeSummaryLine } from './textPatterns';

// Runs after each page has been through pattern-furniture-strip + within
// -page merge. A wrapped description can end on one page and continue at
// the top of the next; by this point the next page's own header/footer
// furniture is already gone, so if its first surviving row still has no
// amount, it's a genuine continuation of the previous page's last
// transaction rather than page furniture that slipped through. Requiring
// the *previous* page's last row to itself be a genuine, amount-bearing
// transaction (not itself a summary line or some other non-transaction
// row that merely survived furniture-stripping) keeps this from folding
// unrelated leftover text — e.g. a differently-worded header on a page
// whose column count doesn't match the rest, which won't have deduped
// against the document's normal repeated header — into something like a
// "Total Withdrawals" line.
export function stitchCrossPageRows(
  perPageMerged: CleanedRow[][],
): CleanedRow[][] {
  const result = perPageMerged.map((page) =>
    page.map((row) => ({ ...row, cells: [...row.cells] })),
  );

  for (let i = 0; i < result.length - 1; i++) {
    const currentPage = result[i];
    const nextPage = result[i + 1];
    if (currentPage.length === 0 || nextPage.length === 0) continue;

    const lastRow = currentPage[currentPage.length - 1];
    const firstRow = nextPage[0];
    if (!rowHasAmount(lastRow.cells) || looksLikeSummaryLine(lastRow.cells)) {
      continue;
    }
    if (rowHasAmount(firstRow.cells) || looksLikeSummaryLine(firstRow.cells)) {
      continue;
    }
    // A no-amount first row only counts as a wrapped continuation if the
    // rest of that page actually contains transactions — otherwise (e.g. a
    // page that's pure disclosure text with zero real rows) it's page
    // furniture that just didn't match the repeated-header/footer check,
    // and folding it into the previous page's last transaction would
    // corrupt that transaction's description instead of dropping the text
    // as furniture like it should be.
    if (!nextPage.some((row) => rowHasAmount(row.cells))) {
      continue;
    }

    const extraText = firstRow.cells
      .filter((cell) => cell.trim())
      .join(' ')
      .trim();
    if (!extraText) continue;

    const targetIndex = bestMergeTargetIndex(lastRow.cells);
    lastRow.cells[targetIndex] = lastRow.cells[targetIndex]
      ? `${lastRow.cells[targetIndex]}\n${extraText}`
      : extraText;
    lastRow.mergedLineCount += 1;
    lastRow.mergedIntoIndex = targetIndex;
    lastRow.mergedFromNextPage = true;

    nextPage.shift();
  }

  return result;
}
