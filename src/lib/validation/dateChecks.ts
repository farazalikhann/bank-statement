import type { DateIssue, ValidatableRow } from './types';

const OUTLIER_DAYS = 45;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a: string, b: string): number {
  return Math.abs(new Date(a).getTime() - new Date(b).getTime()) / MS_PER_DAY;
}

// Bank statements don't state an authoritative period boundary anywhere we
// can extract, so this uses the median transaction date as a stand-in: a
// date more than ~45 days from the median is almost always a parse error
// (wrong year, swapped day/month) rather than a legitimately early/late
// transaction, since real statements run about a month.
function findPeriodOutliers(rows: ValidatableRow[]): DateIssue[] {
  const dated = rows.filter((row) => row.date).map((row) => row.date).sort();
  if (dated.length === 0) return [];

  const median = dated[Math.floor(dated.length / 2)];
  const issues: DateIssue[] = [];
  for (const row of rows) {
    if (!row.date) continue;
    if (daysBetween(row.date, median) > OUTLIER_DAYS) {
      issues.push({ rowId: row.id, kind: 'outside-period' });
    }
  }
  return issues;
}

// Majority-vote the dominant direction (same idea as detectTransactionOrder
// in lib/transactions/detectOrder.ts, reimplemented locally since this
// needs to flag *specific* break points in current row order, not just
// report the aggregate direction).
function findOrderingBreaks(rows: ValidatableRow[]): DateIssue[] {
  const dated = rows.filter((row) => row.date);
  if (dated.length < 2) return [];

  let ascending = 0;
  let descending = 0;
  for (let i = 1; i < dated.length; i++) {
    if (dated[i].date > dated[i - 1].date) ascending++;
    else if (dated[i].date < dated[i - 1].date) descending++;
  }
  const expectAscending = ascending >= descending;

  const issues: DateIssue[] = [];
  for (let i = 1; i < dated.length; i++) {
    const prev = dated[i - 1];
    const curr = dated[i];
    const isAscendingPair = curr.date >= prev.date;
    if (expectAscending !== isAscendingPair && curr.date !== prev.date) {
      issues.push({ rowId: curr.id, kind: 'ordering-break' });
    }
  }
  return issues;
}

export function checkDates(rows: ValidatableRow[]): DateIssue[] {
  return [...findPeriodOutliers(rows), ...findOrderingBreaks(rows)];
}
