import type { ConfidenceLevel } from '../pdf/types';
import { matchDateShape } from '../pdf/textPatterns';
import type { DateFormatInfo } from './types';

const MONTH_NAMES: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

function monthNumber(name: string): number | null {
  return MONTH_NAMES[name.slice(0, 3).toLowerCase()] ?? null;
}

function fullYear(yearText: string): number {
  const year = parseInt(yearText, 10);
  return year < 100 ? 2000 + year : year;
}

function toIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Scans every date-column value in the document for a slash/dash date whose
// first or second number exceeds 12 — that value can only be read one way
// (a month can't be >12), which reveals whether the whole document is
// MDY or DMY. Conflicting evidence means it can't be resolved. If the
// document has no slash/dash dates at all (ISO or month-name only), the
// MDY-vs-DMY question never comes up, so there's nothing to warn about —
// that's treated as resolved too.
export function resolveDateFormat(texts: string[]): DateFormatInfo {
  let dmyRevealed = false;
  let mdyRevealed = false;
  let sawAmbiguousPattern = false;

  for (const text of texts) {
    const shape = matchDateShape(text);
    if (!shape || shape.kind !== 'ambiguous') continue;
    sawAmbiguousPattern = true;
    const part1 = parseInt(shape.part1, 10);
    const part2 = parseInt(shape.part2, 10);
    if (part1 > 12) dmyRevealed = true;
    if (part2 > 12) mdyRevealed = true;
  }

  if (dmyRevealed && !mdyRevealed) return { order: 'DMY', resolved: true };
  if (mdyRevealed && !dmyRevealed) return { order: 'MDY', resolved: true };
  return { order: 'MDY', resolved: !sawAmbiguousPattern };
}

function monthNameResult(
  month: number,
  day: number,
  yearText: string | undefined,
  fallbackYear: number | null,
): { iso: string; confidence: ConfidenceLevel } | null {
  if (yearText) {
    const iso = toIso(fullYear(yearText), month, day);
    return iso ? { iso, confidence: 'high' } : null;
  }
  if (fallbackYear !== null) {
    const iso = toIso(fallbackYear, month, day);
    return iso ? { iso, confidence: 'medium' } : null;
  }
  const iso = toIso(new Date().getFullYear(), month, day);
  return iso ? { iso, confidence: 'low' } : null;
}

// Computed once from every date-column value across the whole document
// (not per page) so a page containing only "15 Jan"-style dates can still
// borrow the year from a different page that spells it out. Values whose
// year had to be guessed (confidence 'low') are excluded from the tally —
// they carry no real year evidence.
export function computeFallbackYear(
  texts: string[],
  formatInfo: DateFormatInfo,
): number | null {
  const counts = new Map<number, number>();
  for (const text of texts) {
    const result = parseDateValue(text, formatInfo, null);
    if (!result || result.confidence === 'low') continue;
    const year = parseInt(result.iso.slice(0, 4), 10);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  let bestYear: number | null = null;
  let bestCount = 0;
  for (const [year, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestYear = year;
    }
  }
  return bestYear;
}

// The actual Date-column parser. Deliberately built on the exact same
// matchDateShape() used for row/column qualification (isDateLike) — a value
// that qualifies a column as "date" is guaranteed to be parseable here too,
// and vice versa, so the two can never drift out of sync the way they used
// to when each kept its own regex list.
export function parseDateValue(
  text: string,
  formatInfo: DateFormatInfo,
  fallbackYear: number | null,
): { iso: string; confidence: ConfidenceLevel } | null {
  const shape = matchDateShape(text);
  if (!shape) return null;

  switch (shape.kind) {
    case 'iso': {
      const iso = toIso(
        parseInt(shape.year, 10),
        parseInt(shape.month, 10),
        parseInt(shape.day, 10),
      );
      return iso ? { iso, confidence: 'high' } : null;
    }

    case 'ambiguous': {
      const part1 = parseInt(shape.part1, 10);
      const part2 = parseInt(shape.part2, 10);
      const year = fullYear(shape.year);
      const [month, day] =
        formatInfo.order === 'MDY' ? [part1, part2] : [part2, part1];
      const iso = toIso(year, month, day);
      if (!iso) return null;
      return { iso, confidence: formatInfo.resolved ? 'high' : 'medium' };
    }

    case 'month-first': {
      const month = monthNumber(shape.month);
      if (!month) return null;
      return monthNameResult(month, parseInt(shape.day, 10), shape.year, fallbackYear);
    }

    case 'day-first': {
      const month = monthNumber(shape.month);
      if (!month) return null;
      return monthNameResult(month, parseInt(shape.day, 10), shape.year, fallbackYear);
    }
  }
}
