import { describe, expect, it } from 'vitest';
import { computeDocumentCleanup, computeDocumentTransactions } from './documentPipeline';
import type { PageExtraction, TextItem } from './types';
import { checkBalances } from '../validation/balanceChecks';
import type { ValidatableRow } from '../validation/types';

// End-to-end regression coverage for the three statement layouts described
// in the sample-us-statement-3 date-shape bug report, run through the exact
// same pipeline the app uses (computeDocumentCleanup + computeDocument
// Transactions — the pure core extracted from usePdfExtraction). There are
// no real sample PDFs checked into this repo, so each statement is modeled
// as synthetic pdf.js-shaped TextItems at hand-picked x/y positions —
// enough to exercise row grouping, column-boundary projection, role
// detection, and date parsing exactly as a real extraction would.
//
// Default tuning values, matching usePdfExtraction's DEFAULT_TOLERANCE_Y /
// DEFAULT_GAP_X.
const TOLERANCE_Y = 2;
const GAP_X = 6;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function makeItem(text: string, x: number, y: number): TextItem {
  return { text, x, y, width: text.length * 6, height: 10, fontSize: 10 };
}

function runPipeline(page: PageExtraction) {
  const cleanup = computeDocumentCleanup([page], TOLERANCE_Y, GAP_X);
  if (!cleanup.data) throw cleanup.error ?? new Error('cleanup produced no data');
  const transactions = computeDocumentTransactions(cleanup.data, {}, null);
  if (!transactions.data) throw transactions.error ?? new Error('transactions produced no data');
  return transactions.data;
}

// Distributes `count - 1` amounts across a plausible range, then sets the
// last one so the total lands exactly on `target` — gives every test a
// statement whose transactions reconcile exactly, without hand-picking 46
// numbers.
function buildSignedAmounts(count: number, target: number): number[] {
  const amounts: number[] = [];
  for (let i = 0; i < count - 1; i++) {
    const magnitude = 20 + ((i * 13) % 97);
    const sign = i % 3 === 0 ? -1 : 1;
    amounts.push(round2(sign * magnitude));
  }
  const sumSoFar = amounts.reduce((a, b) => a + b, 0);
  amounts.push(round2(target - sumSoFar));
  return amounts;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

describe('end-to-end: sample-us-statement-1 (MM/DD/YYYY, signed amount, running balance)', () => {
  const OPENING = 4182.55;
  const CLOSING = 9161.26;
  const TX_COUNT = 46;
  const COLS = { date: 0, description: 150, amount: 420, balance: 560 };

  function buildPage(): PageExtraction {
    const amounts = buildSignedAmounts(TX_COUNT, round2(CLOSING - OPENING));
    const items: TextItem[] = [];

    items.push(makeItem('Opening Balance', COLS.description, -20));
    items.push(makeItem(OPENING.toFixed(2), COLS.amount, -20));

    let balance = OPENING;
    let month = 3;
    let day = 1;
    let lastY = -20;
    for (let i = 0; i < TX_COUNT; i++) {
      const y = i * 20;
      lastY = y;
      balance = round2(balance + amounts[i]);
      const date = `${pad2(month)}/${pad2(day)}/2026`;
      const amountText =
        amounts[i] < 0 ? `-${Math.abs(amounts[i]).toFixed(2)}` : amounts[i].toFixed(2);

      items.push(makeItem(date, COLS.date, y));
      items.push(makeItem(`Transaction ${i + 1} merchant purchase`, COLS.description, y));
      items.push(makeItem(amountText, COLS.amount, y));
      items.push(makeItem(balance.toFixed(2), COLS.balance, y));

      day += 3;
      if (day > 28) {
        day -= 28;
        month += 1;
        if (month > 6) month = 3;
      }
    }

    const closingY = lastY + 20;
    items.push(makeItem('Closing Balance', COLS.description, closingY));
    items.push(makeItem(CLOSING.toFixed(2), COLS.amount, closingY));

    return { pageNumber: 1, pageWidth: 800, pageHeight: closingY + 40, items };
  }

  it('extracts 46 transactions, dates populated on every row, and reconciles 4182.55 to 9161.26', () => {
    const result = runPipeline(buildPage());

    expect(result.transactions.length).toBe(TX_COUNT);
    for (const t of result.transactions) {
      expect(t.date).not.toBe('');
      expect(t.confidence.date).not.toBe('low');
    }

    const opening = result.statementSummary.items.find((i) => i.kind === 'opening-balance');
    const closing = [...result.statementSummary.items]
      .reverse()
      .find((i) => i.kind === 'closing-balance');
    expect(opening?.value).toBeCloseTo(OPENING, 2);
    expect(closing?.value).toBeCloseTo(CLOSING, 2);

    const rows: ValidatableRow[] = result.transactions.map((t, i) => ({
      id: String(i),
      date: t.date,
      description: t.description,
      amount: t.amount,
      balance: t.balance,
    }));
    const { difference, balanceBreaks } = checkBalances(rows, opening!.value, closing!.value);
    expect(Math.abs(difference ?? 1)).toBeLessThan(0.01);
    expect(balanceBreaks).toEqual([]);
  });
});

describe('end-to-end: sample-us-statement-2 (MM/DD/YY, split debit/credit, running balance)', () => {
  const OPENING = 12904.18;
  const CLOSING = 16249.11;
  const TX_COUNT = 38;
  // A genuine debit/credit-only layout (no running balance at all) hits a
  // separate, pre-existing role-assignment limitation unrelated to this
  // bug (detectColumnRoles has no way to tell "two amount columns are
  // debit+credit with no balance" apart from "one of them actually is the
  // balance"). Real debit/credit statements carry a running balance too,
  // so this fixture includes one — keeping this test focused on what the
  // ticket is actually about (date-shape recognition + column-boundary
  // safety), not that separate issue.
  const COLS = { date: 0, description: 150, debit: 420, credit: 520, balance: 660 };

  function buildPage(): PageExtraction {
    const amounts = buildSignedAmounts(TX_COUNT, round2(CLOSING - OPENING));
    const items: TextItem[] = [];

    items.push(makeItem('Opening Balance', COLS.description, -20));
    items.push(makeItem(OPENING.toFixed(2), COLS.credit, -20));

    let balance = OPENING;
    let month = 3;
    let day = 1;
    let lastY = -20;
    for (let i = 0; i < TX_COUNT; i++) {
      const y = i * 20;
      lastY = y;
      balance = round2(balance + amounts[i]);
      const date = `${pad2(month)}/${pad2(day)}/26`;

      items.push(makeItem(date, COLS.date, y));
      items.push(makeItem(`Payment ${i + 1} to vendor`, COLS.description, y));
      if (amounts[i] < 0) {
        items.push(makeItem(Math.abs(amounts[i]).toFixed(2), COLS.debit, y));
      } else {
        items.push(makeItem(amounts[i].toFixed(2), COLS.credit, y));
      }
      items.push(makeItem(balance.toFixed(2), COLS.balance, y));

      day += 3;
      if (day > 28) {
        day -= 28;
        month += 1;
        if (month > 6) month = 3;
      }
    }

    const closingY = lastY + 20;
    items.push(makeItem('Closing Balance', COLS.description, closingY));
    items.push(makeItem(CLOSING.toFixed(2), COLS.credit, closingY));

    return { pageNumber: 1, pageWidth: 900, pageHeight: closingY + 40, items };
  }

  it('extracts 38 transactions, dates populated on every row, and reconciles 12904.18 to 16249.11', () => {
    const result = runPipeline(buildPage());

    expect(result.transactions.length).toBe(TX_COUNT);
    for (const t of result.transactions) {
      expect(t.date).not.toBe('');
    }
    expect(result.columnShape.kind).toBe('debit-credit');

    const opening = result.statementSummary.items.find((i) => i.kind === 'opening-balance');
    const closing = [...result.statementSummary.items]
      .reverse()
      .find((i) => i.kind === 'closing-balance');
    expect(opening?.value).toBeCloseTo(OPENING, 2);
    expect(closing?.value).toBeCloseTo(CLOSING, 2);

    const rows: ValidatableRow[] = result.transactions.map((t, i) => ({
      id: String(i),
      date: t.date,
      description: t.description,
      amount: t.amount,
      balance: t.balance,
    }));
    const { difference } = checkBalances(rows, opening!.value, closing!.value);
    expect(Math.abs(difference ?? 1)).toBeLessThan(0.01);
  });
});

describe('end-to-end: sample-us-statement-3 (DD-MMM-YYYY, DR/CR suffix, no balance column)', () => {
  const TX_COUNT = 29;
  const COLS = { date: 0, description: 150, amount: 420 };
  const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'];

  function buildPage(): PageExtraction {
    const items: TextItem[] = [
      // The exact bridging preamble from the bug report: a single wide
      // text run per line (not per-word), spanning across where the
      // Date/Description gap needs to land. Before the date-shape fix,
      // zero rows qualified as strict transaction rows, so these ended up
      // in the projection sample and merged the two columns together.
      makeItem('Period: 01-Mar-2026 through 30-Jun-2026', 0, -40),
      makeItem('Member: M. R. CARTER', 0, -20),
    ];

    let lastY = -20;
    for (let i = 0; i < TX_COUNT; i++) {
      const y = i * 20;
      lastY = y;
      const day = (i % 27) + 1;
      const month = MONTHS[i % MONTHS.length];
      const date = `${pad2(day)}-${month}-2026`;
      const amount = round2(20 + ((i * 17) % 130));
      const suffix = i % 4 === 0 ? 'CR' : 'DR';

      items.push(makeItem(date, COLS.date, y));
      items.push(makeItem(`CVS/PHARMACY #0${8871 + i} AUSTIN TX`, COLS.description, y));
      items.push(makeItem(`${amount.toFixed(2)} ${suffix}`, COLS.amount, y));
    }

    return { pageNumber: 1, pageWidth: 800, pageHeight: lastY + 40, items };
  }

  it('populates the Date column on every one of the 29 transactions instead of leaving it in Description', () => {
    const result = runPipeline(buildPage());

    expect(result.transactions.length).toBe(TX_COUNT);
    for (const t of result.transactions) {
      expect(t.date).not.toBe('');
      expect(t.description).not.toMatch(/^\d{1,2}-[A-Za-z]{3}-\d{4}/);
    }
    expect(result.columnShape.kind).toBe('single-amount');
  });
});
