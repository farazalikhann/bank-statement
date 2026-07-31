import { describe, expect, it } from 'vitest';
import {
  computeFallbackYear,
  parseDateValue,
  resolveDateFormat,
} from './parseDate';
import type { DateFormatInfo } from './types';

const MDY_RESOLVED: DateFormatInfo = { order: 'MDY', resolved: true };
const DMY_RESOLVED: DateFormatInfo = { order: 'DMY', resolved: true };

describe('parseDateValue', () => {
  it('parses MM/DD/YYYY under MDY order', () => {
    expect(parseDateValue('03/25/2026', MDY_RESOLVED, null)?.iso).toBe('2026-03-25');
  });

  it('parses DD/MM/YYYY under DMY order', () => {
    expect(parseDateValue('25/03/2026', DMY_RESOLVED, null)?.iso).toBe('2026-03-25');
  });

  it('parses MM/DD/YY, expanding the two-digit year', () => {
    expect(parseDateValue('03/25/26', MDY_RESOLVED, null)?.iso).toBe('2026-03-25');
  });

  it('parses ISO dates regardless of format order', () => {
    expect(parseDateValue('2026-03-25', MDY_RESOLVED, null)?.iso).toBe('2026-03-25');
  });

  it('parses DD-MMM-YYYY (the sample-3 bug case)', () => {
    const result = parseDateValue('04-MAR-2026', MDY_RESOLVED, null);
    expect(result?.iso).toBe('2026-03-04');
    expect(result?.confidence).toBe('high');
  });

  it('parses D-Mon-YY', () => {
    expect(parseDateValue('4-Mar-26', MDY_RESOLVED, null)?.iso).toBe('2026-03-04');
  });

  it('parses "Mon DD YYYY" and "Month D, YYYY"', () => {
    expect(parseDateValue('Mar 04 2026', MDY_RESOLVED, null)?.iso).toBe('2026-03-04');
    expect(parseDateValue('March 4, 2026', MDY_RESOLVED, null)?.iso).toBe('2026-03-04');
  });

  it('parses "DD Mon" using a supplied fallback year, at medium confidence', () => {
    const result = parseDateValue('15 Jan', MDY_RESOLVED, 2026);
    expect(result?.iso).toBe('2026-01-15');
    expect(result?.confidence).toBe('medium');
  });

  it('returns null for text that is not a date', () => {
    expect(parseDateValue('CVS/PHARMACY #08871 AUSTIN TX', MDY_RESOLVED, null)).toBeNull();
    expect(parseDateValue('', MDY_RESOLVED, null)).toBeNull();
  });
});

describe('resolveDateFormat', () => {
  it('detects DMY when a first field exceeds 12', () => {
    expect(resolveDateFormat(['25/03/2026', '01/04/2026'])).toEqual({
      order: 'DMY',
      resolved: true,
    });
  });

  it('detects MDY when a second field exceeds 12', () => {
    expect(resolveDateFormat(['03/25/2026', '04/01/2026'])).toEqual({
      order: 'MDY',
      resolved: true,
    });
  });

  it('treats month-name-only documents as resolved (the question never comes up)', () => {
    expect(resolveDateFormat(['04-MAR-2026', '05-APR-2026'])).toEqual({
      order: 'MDY',
      resolved: true,
    });
  });

  it('is unresolved when every date is ambiguous both ways', () => {
    expect(resolveDateFormat(['03/04/2026', '01/02/2026'])).toEqual({
      order: 'MDY',
      resolved: false,
    });
  });
});

describe('computeFallbackYear', () => {
  it('picks the most common year among high/medium-confidence dates', () => {
    const year = computeFallbackYear(
      ['04-MAR-2026', '05-APR-2026', '06-MAY-2027'],
      MDY_RESOLVED,
    );
    expect(year).toBe(2026);
  });
});
