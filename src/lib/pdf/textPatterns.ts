import type { ConfidenceLevel } from './types';

// Matches a three-letter month abbreviation or a full month name, with an
// optional trailing period ("Mar." or "March."). Reused verbatim by every
// month-name date shape below, and by transactions/parseDate.ts, so a new
// month spelling only ever needs to be taught here once.
const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

// Dates use either a space or a dash between their parts — "04 Mar 2026" and
// "04-Mar-2026" are the same shape as far as detection is concerned.
const SEP = '[\\s-]+';

const ISO_PATTERN = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
// Covers both slash and dash numeric layouts (03/25/2026, 25-03-2026,
// 03/25/26, ...) — which field is day vs month is genuinely ambiguous from
// shape alone, so it's left as unlabeled parts for the caller to resolve.
const AMBIGUOUS_PATTERN = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;
const MONTH_FIRST_PATTERN = new RegExp(
  `^(${MONTH})${SEP}(\\d{1,2})(?:,?${SEP}(\\d{2,4}))?$`,
  'i',
);
const DAY_FIRST_PATTERN = new RegExp(
  `^(\\d{1,2})${SEP}(${MONTH})(?:,?${SEP}(\\d{2,4}))?$`,
  'i',
);

// The single source of truth for "does this token look like a date, and
// what are its parts" — every caller that needs to know whether something
// is a date (isDateLike, used for row/column qualification) and every
// caller that needs to turn a date token into an actual value
// (transactions/parseDate.ts) goes through this same function, so the two
// can never recognize a different set of shapes.
export type DateShapeMatch =
  | { kind: 'iso'; year: string; month: string; day: string }
  | { kind: 'ambiguous'; part1: string; part2: string; year: string }
  | { kind: 'month-first'; month: string; day: string; year?: string }
  | { kind: 'day-first'; day: string; month: string; year?: string };

export function matchDateShape(text: string): DateShapeMatch | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const isoMatch = ISO_PATTERN.exec(trimmed);
  if (isoMatch) {
    return { kind: 'iso', year: isoMatch[1], month: isoMatch[2], day: isoMatch[3] };
  }

  const ambiguousMatch = AMBIGUOUS_PATTERN.exec(trimmed);
  if (ambiguousMatch) {
    return {
      kind: 'ambiguous',
      part1: ambiguousMatch[1],
      part2: ambiguousMatch[2],
      year: ambiguousMatch[3],
    };
  }

  const monthFirstMatch = MONTH_FIRST_PATTERN.exec(trimmed);
  if (monthFirstMatch) {
    return {
      kind: 'month-first',
      month: monthFirstMatch[1],
      day: monthFirstMatch[2],
      year: monthFirstMatch[3] || undefined,
    };
  }

  const dayFirstMatch = DAY_FIRST_PATTERN.exec(trimmed);
  if (dayFirstMatch) {
    return {
      kind: 'day-first',
      day: dayFirstMatch[1],
      month: dayFirstMatch[2],
      year: dayFirstMatch[3] || undefined,
    };
  }

  return null;
}

export function isDateLike(text: string): boolean {
  return matchDateShape(text) !== null;
}

// Handles $1,234.56 (US), 1.234,56 (EU), 1 234,56 (space-grouped), (45.20) as
// negative, a trailing CR/DR direction indicator, leading +/-, and generic
// currency symbols. When the separator style is genuinely ambiguous (a
// single group of exactly 3 digits, e.g. "1,234") it's resolved as thousands
// grouping — the overwhelmingly common case — but flagged 'medium' rather
// than 'high' so callers that care about certainty can surface it.
export function parseAmountWithConfidence(
  text: string,
): { value: number; confidence: ConfidenceLevel } | null {
  let working = text.trim();
  if (!working) return null;

  let explicitSign: 1 | -1 | null = null;
  const crdrMatch = /\s*(CR|DR)$/i.exec(working);
  if (crdrMatch) {
    explicitSign = /CR$/i.test(crdrMatch[0]) ? 1 : -1;
    working = working.slice(0, crdrMatch.index).trim();
  }

  let parenNegative = false;
  if (/^\(.*\)$/.test(working)) {
    parenNegative = true;
    working = working.slice(1, -1).trim();
  }

  let leadingNegative = false;
  if (/^[-+]/.test(working)) {
    leadingNegative = working.startsWith('-');
    working = working.slice(1).trim();
  }

  // Reject outright rather than strip: text with any character outside an
  // optional currency symbol + digits/separators/spaces is not an amount at
  // all (e.g. a reference number like "ACH0012345" must NOT match just
  // because it contains digits).
  if (!/^\p{Sc}?\s*[\d.,\s]+\s*\p{Sc}?$/u.test(working)) return null;

  const stripped = working.replace(/\p{Sc}/gu, '').trim();
  const noSpaces = stripped.replace(/\s+/g, '');
  if (!/\d/.test(noSpaces)) return null;

  const hasComma = noSpaces.includes(',');
  const hasDot = noSpaces.includes('.');

  let numericString: string;
  let confidence: ConfidenceLevel = 'high';

  if (hasComma && hasDot) {
    const lastComma = noSpaces.lastIndexOf(',');
    const lastDot = noSpaces.lastIndexOf('.');
    const decimalIndex = Math.max(lastComma, lastDot);
    const fraction = noSpaces.slice(decimalIndex + 1);
    const whole =
      lastComma > lastDot
        ? noSpaces.slice(0, decimalIndex).replace(/\./g, '')
        : noSpaces.slice(0, decimalIndex).replace(/,/g, '');
    numericString = `${whole}.${fraction}`;
    if (fraction.length < 1 || fraction.length > 2) confidence = 'medium';
  } else if (hasComma || hasDot) {
    const separator = hasComma ? ',' : '.';
    const parts = noSpaces.split(separator);
    const lastPart = parts[parts.length - 1];

    if (lastPart.length === 2) {
      numericString = `${parts.slice(0, -1).join('')}.${lastPart}`;
    } else if (lastPart.length === 3 && parts.length === 2) {
      numericString = parts.join('');
      confidence = 'medium';
    } else {
      numericString = parts.join('');
    }
  } else {
    numericString = noSpaces;
  }

  const value = parseFloat(numericString);
  if (Number.isNaN(value)) return null;

  const isNegative =
    explicitSign !== null
      ? explicitSign === -1
      : parenNegative || leadingNegative;

  return {
    value: isNegative ? -Math.abs(value) : Math.abs(value),
    confidence,
  };
}

export function parseCurrencyAmount(text: string): number | null {
  return parseAmountWithConfidence(text)?.value ?? null;
}

// Summary lines ("Opening Balance 5,000.00") are often a single text run,
// label and figure together, rather than separate table cells like a real
// transaction row — so unlike parseAmountWithConfidence (which requires the
// *whole* string to be just an amount), this pulls the amount from the end
// of a longer string.
export function extractTrailingAmount(
  text: string,
): { value: number; confidence: ConfidenceLevel; matchedText: string } | null {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;

  let candidate = tokens[tokens.length - 1];
  if (/^(?:CR|DR)$/i.test(candidate) && tokens.length >= 2) {
    candidate = `${tokens[tokens.length - 2]} ${candidate}`;
  }

  const parsed = parseAmountWithConfidence(candidate);
  return parsed ? { ...parsed, matchedText: candidate } : null;
}

const PAGE_NUMBER_PATTERN = /^page\s+\d+(\s+of\s+\d+)?$/i;

export function isPageNumberText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return PAGE_NUMBER_PATTERN.test(trimmed);
}

export function normalizeRowText(cells: string[]): string {
  return cells.join(' ').trim().toLowerCase().replace(/\s+/g, ' ');
}

const SUMMARY_LABEL_PATTERN =
  /\b(?:(?:opening|beginning|previous|closing|ending|new|current)\s+balance|total\s+(?:deposits|credits|withdrawals|debits))\b/i;

// A coarse, role-agnostic check used only to protect summary lines (opening
// balance, totals) from the above-first-date furniture cutoff — they
// legitimately sit before the first transaction, same as real page
// furniture, but shouldn't be silently discarded. The precise,
// role-aware classification into a specific summary kind happens in
// src/lib/transactions/extractSummaryBlocks.ts.
export function isSummaryLabelText(text: string): boolean {
  return SUMMARY_LABEL_PATTERN.test(text);
}

// A summary line (opening balance, totals) must never be treated as a
// wrapped continuation of the previous transaction, or dropped as an
// orphan with nothing to say — it needs both the keyword and an amount
// (whole-cell or trailing a label in one combined cell) to qualify, which
// keeps this narrow.
export function looksLikeSummaryLine(cells: string[]): boolean {
  const fullText = cells.filter((cell) => cell.trim()).join(' ').trim();
  if (!isSummaryLabelText(fullText)) return false;
  return (
    cells.some((cell) => cell.trim() && parseCurrencyAmount(cell) !== null) ||
    extractTrailingAmount(fullText) !== null
  );
}
