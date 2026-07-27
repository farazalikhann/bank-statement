import type { Transaction, TransactionOrder } from './types';

export function detectTransactionOrder(
  transactions: Transaction[],
): TransactionOrder {
  const dates = transactions
    .map((t) => t.date)
    .filter((date): date is string => date !== '');

  let ascending = 0;
  let descending = 0;

  for (let i = 1; i < dates.length; i++) {
    if (dates[i] > dates[i - 1]) ascending += 1;
    else if (dates[i] < dates[i - 1]) descending += 1;
  }

  if (ascending === 0 && descending === 0) return 'unknown';
  if (ascending > descending) return 'oldest-first';
  if (descending > ascending) return 'newest-first';
  return 'unknown';
}
