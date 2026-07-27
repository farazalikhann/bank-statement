import type { CleanedRow } from '../pdf/types';
import { isDateLike } from '../pdf/textPatterns';
import { extractTrailingAmount, parseAmountWithConfidence } from './parseAmount';
import type { SummaryItem, SummaryItemKind } from './types';

const KEYWORD_PATTERNS: { pattern: RegExp; kind: SummaryItemKind }[] = [
  { pattern: /\b(opening|beginning|previous)\s+balance\b/i, kind: 'opening-balance' },
  { pattern: /\b(closing|ending|new|current)\s+balance\b/i, kind: 'closing-balance' },
  { pattern: /\btotal\s+(deposits|credits)\b/i, kind: 'total-deposits' },
  { pattern: /\btotal\s+(withdrawals|debits)\b/i, kind: 'total-withdrawals' },
];

// A row counts as a summary line (opening/closing balance, totals) rather
// than a transaction only if its date-column cell doesn't actually look
// like a date — real transactions have one, totals don't — AND matches a
// label keyword AND carries a parseable amount. Checking the cell's shape
// (not just whether it's non-empty) matters because a summary line's
// label+amount often lands in the date column's x-position as one
// combined string (e.g. "Opening Balance 5,000.00"), which is non-empty
// but isn't a date. Requiring a real date is what keeps an actual
// transaction like "Balance Transfer Fee" from being misfiled just for
// containing the word "balance".
export function extractSummaryBlocks(
  rows: CleanedRow[],
  pageNumber: number,
  dateColumnIndex: number,
): { items: SummaryItem[]; remainingRows: CleanedRow[]; remainingIndices: number[] } {
  const items: SummaryItem[] = [];
  const remainingRows: CleanedRow[] = [];
  const remainingIndices: number[] = [];

  rows.forEach((row, index) => {
    const dateCell = dateColumnIndex >= 0 ? row.cells[dateColumnIndex] : '';
    if (isDateLike(dateCell)) {
      remainingRows.push(row);
      remainingIndices.push(index);
      return;
    }

    const fullText = row.cells.filter((cell) => cell.trim()).join(' ').trim();
    const match = KEYWORD_PATTERNS.find(({ pattern }) => pattern.test(fullText));
    if (!match) {
      remainingRows.push(row);
      remainingIndices.push(index);
      return;
    }

    const amountCell = row.cells.find(
      (cell) => cell.trim() && parseAmountWithConfidence(cell) !== null,
    );
    const cellParsed = amountCell ? parseAmountWithConfidence(amountCell) : null;
    const trailingParsed = cellParsed ? null : extractTrailingAmount(fullText);

    if (cellParsed) {
      items.push({
        kind: match.kind,
        label: fullText,
        value: cellParsed.value,
        pageNumber,
        raw: amountCell ?? '',
      });
    } else if (trailingParsed) {
      items.push({
        kind: match.kind,
        label: fullText,
        value: trailingParsed.value,
        pageNumber,
        raw: trailingParsed.matchedText,
      });
    } else {
      remainingRows.push(row);
      remainingIndices.push(index);
    }
  });

  return { items, remainingRows, remainingIndices };
}
