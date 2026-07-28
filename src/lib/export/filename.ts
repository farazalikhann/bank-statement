function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// `kind` distinguishes QuickBooks/Xero/generic CSV exports, which would
// otherwise all collide on the same "name_transactions_date.csv" filename.
export function generateFilename(
  sourceFileName: string,
  extension: string,
  kind: string = 'transactions',
): string {
  const base = sourceFileName.replace(/\.pdf$/i, '') || 'statement';
  return `${base}_${kind}_${todayIso()}.${extension}`;
}
