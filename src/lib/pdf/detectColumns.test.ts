import { describe, expect, it } from 'vitest';
import { detectColumns } from './detectColumns';
import { mapRowToColumns } from './mapRowToColumns';
import type { Row, TextItem } from './types';

function item(text: string, x: number, y: number, width: number): TextItem {
  return { text, x, y, width, height: 10, fontSize: 10 };
}

function row(y: number, items: TextItem[]): Row {
  return { y, items };
}

const GAP_X = { gapX: 6 };

describe('detectColumns — regression: DD-MMM-YYYY statement with bridging header lines', () => {
  // Reproduces the sample-us-statement-3 bug: a preamble line spans the
  // full width of the page (bridging the Date/Description gap), and every
  // real transaction row uses a DD-MMM-YYYY date. Before the date-shape fix,
  // isDateLike never recognized "04-MAR-2026", so zero rows qualified as
  // transaction rows and the projection fell back to running over the
  // preamble too — merging Date into Description.
  const periodLine = row(0, [item('Period: 01-Mar-2026 through 30-Jun-2026', 0, 0, 380)]);
  const memberLine = row(20, [item('Member: M. R. CARTER', 0, 20, 180)]);
  const headerRow = row(40, [item('Date', 0, 40, 30), item('Description', 100, 40, 70)]);

  const transactionRows: Row[] = Array.from({ length: 29 }, (_, i) =>
    row(60 + i * 20, [
      item('04-MAR-2026', 0, 60 + i * 20, 60),
      item(`CVS/PHARMACY #0${8871 + i} AUSTIN TX`, 100, 60 + i * 20, 250),
      item(`${(45.2 + i).toFixed(2)} DR`, 380, 60 + i * 20, 50),
    ]),
  );

  const rows = [periodLine, memberLine, headerRow, ...transactionRows];

  it('keeps Date separate from Description instead of merging across the bridging header lines', () => {
    const columns = detectColumns(rows, GAP_X, true);
    expect(columns.length).toBe(3);

    for (const txRow of transactionRows) {
      const cells = mapRowToColumns(txRow, columns);
      expect(cells[0].trim()).toBe('04-MAR-2026');
      expect(cells[1]).toContain('CVS/PHARMACY');
    }
  });
});

describe('detectColumns — tiered fallback when strict transaction rows are scarce', () => {
  it('falls back to a currency-only rule when date and amount never land on the same row', () => {
    // An unusual layout where each transaction's date sits on its own row,
    // one line above the description+amount row — isTransactionRow (which
    // requires both on the SAME row) never matches, but every amount-bearing
    // row still qualifies under the looser currency-only rule.
    const rows: Row[] = [];
    for (let i = 0; i < 10; i++) {
      const y = i * 40;
      rows.push(row(y, [item('04-MAR-2026', 0, y, 60)]));
      rows.push(
        row(y + 20, [
          item('Some description text', 100, y + 20, 200),
          item('45.20', 380, y + 20, 50),
        ]),
      );
    }

    const columns = detectColumns(rows, GAP_X, true);
    // Two real x-clusters among the amount-bearing rows: description (100)
    // and amount (380). The lone date-only rows never bridge that gap.
    expect(columns.length).toBe(2);
  });

  it('excludes the top-of-page header block when even the currency-only rule comes up short', () => {
    // No row anywhere looks date-shaped or currency-shaped (a hypothetical
    // future statement format neither pattern recognizes yet). The header
    // block (top 25% of the page) contains a single row whose text spans
    // the full width, which would otherwise bridge the two real columns
    // used by every row below it.
    const headerBlock = row(0, [item('Some Bank — Account Summary Statement', 0, 0, 380)]);
    const bodyRows: Row[] = Array.from({ length: 10 }, (_, i) =>
      row(100 + i * 30, [
        item(`REF${1000 + i}`, 0, 100 + i * 30, 60),
        item('Some description text', 100, 100 + i * 30, 250),
      ]),
    );

    const rows = [headerBlock, ...bodyRows];
    const columns = detectColumns(rows, GAP_X, true);

    expect(columns.length).toBe(2);
  });
});
