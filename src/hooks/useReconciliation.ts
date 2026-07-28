import { useCallback, useEffect, useMemo, useState } from 'react';
import { checkBalances, severityFor } from '../lib/validation/balanceChecks';
import { checkDates } from '../lib/validation/dateChecks';
import { findDuplicates } from '../lib/validation/duplicateCheck';
import type { ReconciliationResult } from '../lib/validation/types';
import type { EditableTransaction } from './useEditableTransactions';
import type { StatementSummary } from '../lib/transactions/types';

export function useReconciliation(
  fileName: string | null,
  rows: EditableTransaction[],
  statementSummary: StatementSummary,
) {
  const [manualOpening, setManualOpening] = useState<number | null>(null);
  const [manualClosing, setManualClosing] = useState<number | null>(null);

  useEffect(() => {
    setManualOpening(null);
    setManualClosing(null);
  }, [fileName]);

  // Opening balance: take the *first* occurrence — the document's true
  // starting balance appears on page 1. Closing balance: take the *last*
  // occurrence — a multi-page statement often recaps a running "closing
  // balance" on every page, and only the final page's is the document's
  // actual closing balance.
  const summaryOpening =
    statementSummary.items.find((item) => item.kind === 'opening-balance')?.value ?? null;
  const summaryClosing =
    [...statementSummary.items].reverse().find((item) => item.kind === 'closing-balance')
      ?.value ?? null;

  const openingBalance = manualOpening ?? summaryOpening;
  const openingSource = manualOpening !== null ? 'manual' : summaryOpening !== null ? 'summary' : null;
  const closingBalance = manualClosing ?? summaryClosing;
  const closingSource = manualClosing !== null ? 'manual' : summaryClosing !== null ? 'summary' : null;

  const result: ReconciliationResult = useMemo(() => {
    const { balanceBreaks, sumOfAmounts, expectedClosing, difference } = checkBalances(
      rows,
      openingBalance,
      closingBalance,
    );
    const duplicates = findDuplicates(rows);
    const dateIssues = checkDates(rows);

    return {
      openingBalance,
      openingSource,
      closingBalance,
      closingSource,
      sumOfAmounts,
      expectedClosing,
      difference,
      severity: difference === null ? null : severityFor(difference),
      balanceBreaks,
      duplicates,
      dateIssues,
    };
  }, [rows, openingBalance, openingSource, closingBalance, closingSource]);

  const setOpeningBalanceInput = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      setManualOpening(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) setManualOpening(parsed);
  }, []);

  const setClosingBalanceInput = useCallback((value: string) => {
    const trimmed = value.trim();
    if (trimmed === '') {
      setManualClosing(null);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isNaN(parsed)) setManualClosing(parsed);
  }, []);

  return {
    result,
    setOpeningBalanceInput,
    setClosingBalanceInput,
  };
}
