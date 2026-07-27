import type { ConfidenceLevel } from './types';

const MONTH = '(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?';

const DATE_PATTERNS: RegExp[] = [
  /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  /^\d{4}-\d{1,2}-\d{1,2}$/,
  /^\d{1,2}-\d{1,2}-\d{2,4}$/,
  new RegExp(`^${MONTH}\\s+\\d{1,2}(?:,?\\s*\\d{2,4})?$`, 'i'),
  new RegExp(`^\\d{1,2}\\s+${MONTH}(?:,?\\s*\\d{2,4})?$`, 'i'),
];

export function isDateLike(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return DATE_PATTERNS.some((re) => re.test(trimmed));
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

const PAGE_NUMBER_PATTERN = /^page\s+\d+(\s+of\s+\d+)?$/i;

export function isPageNumberText(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return PAGE_NUMBER_PATTERN.test(trimmed);
}

export function normalizeRowText(cells: string[]): string {
  return cells.join(' ').trim().toLowerCase().replace(/\s+/g, ' ');
}
