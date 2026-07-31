import { describe, expect, it } from 'vitest';
import { isDateLike, matchDateShape } from './textPatterns';

describe('isDateLike', () => {
  it('recognizes numeric slash/dash/ISO formats', () => {
    expect(isDateLike('03/25/2026')).toBe(true);
    expect(isDateLike('25/03/2026')).toBe(true);
    expect(isDateLike('03/25/26')).toBe(true);
    expect(isDateLike('2026-03-25')).toBe(true);
    expect(isDateLike('25-03-2026')).toBe(true);
  });

  it('recognizes DD-MMM-YYYY (dash-separated month-name dates)', () => {
    expect(isDateLike('04-MAR-2026')).toBe(true);
    expect(isDateLike('04-Mar-2026')).toBe(true);
    expect(isDateLike('4-Mar-26')).toBe(true);
  });

  it('recognizes space-separated month-name dates in both orders', () => {
    expect(isDateLike('04 Mar 2026')).toBe(true);
    expect(isDateLike('Mar 04 2026')).toBe(true);
    expect(isDateLike('March 4, 2026')).toBe(true);
    expect(isDateLike('4 Mar')).toBe(true);
  });

  it('recognizes every three-letter month abbreviation, case-insensitively', () => {
    const months = [
      'jan',
      'feb',
      'mar',
      'apr',
      'may',
      'jun',
      'jul',
      'aug',
      'sep',
      'oct',
      'nov',
      'dec',
    ];
    for (const month of months) {
      expect(isDateLike(`04-${month.toUpperCase()}-2026`)).toBe(true);
      expect(isDateLike(`04 ${month} 2026`)).toBe(true);
    }
  });

  it('rejects plain text, amounts, and header words', () => {
    expect(isDateLike('')).toBe(false);
    expect(isDateLike('CVS/PHARMACY #08871 AUSTIN TX')).toBe(false);
    expect(isDateLike('1,234.56')).toBe(false);
    expect(isDateLike('Description')).toBe(false);
    expect(isDateLike('Member: M. R. CARTER')).toBe(false);
  });

  it('rejects a description that merely starts with digits', () => {
    expect(isDateLike('123 Main St')).toBe(false);
  });
});

describe('matchDateShape', () => {
  it('splits a dash-separated day-first date into structured parts', () => {
    const shape = matchDateShape('04-MAR-2026');
    expect(shape).toEqual({ kind: 'day-first', day: '04', month: 'MAR', year: '2026' });
  });

  it('splits an ambiguous numeric date without guessing month/day order', () => {
    const shape = matchDateShape('03/25/2026');
    expect(shape).toEqual({ kind: 'ambiguous', part1: '03', part2: '25', year: '2026' });
  });

  it('returns null for non-dates', () => {
    expect(matchDateShape('Period: 01-Mar-2026 through 30-Jun-2026')).toBeNull();
    expect(matchDateShape('Opening Balance 4,182.55')).toBeNull();
  });
});
