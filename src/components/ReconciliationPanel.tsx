import { useEffect, useState } from 'react';
import type { ReconciliationResult, SeverityTier } from '../lib/validation/types';

interface ReconciliationPanelProps {
  rowCount: number;
  result: ReconciliationResult;
  onOpeningChange: (value: string) => void;
  onClosingChange: (value: string) => void;
}

const SEVERITY_BOX: Record<SeverityTier, string> = {
  balanced: 'border-accent bg-accent-soft text-ink',
  minor: 'border-line bg-surface text-ink-muted',
  moderate: 'border-warn-line bg-warn-soft text-ink',
  significant: 'border-danger-line bg-danger-soft text-ink',
};

function formatMoney(value: number): string {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function BalanceField({
  label,
  value,
  source,
  onCommit,
}: {
  label: string;
  value: number | null;
  source: 'summary' | 'manual' | null;
  onCommit: (value: string) => void;
}) {
  const [text, setText] = useState(value !== null ? String(value) : '');

  useEffect(() => {
    setText(value !== null ? String(value) : '');
  }, [value]);

  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-ink-muted">
        {label}
        {source === 'summary' && (
          <span className="ml-1.5 text-xs text-ink-muted">(from statement)</span>
        )}
      </span>
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onCommit(text)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onCommit(text);
            (e.target as HTMLInputElement).blur();
          }
        }}
        placeholder="Not entered"
        className="w-36 rounded-md border border-line-strong bg-surface px-2 py-1.5 font-mono text-sm text-ink"
      />
    </label>
  );
}

export function ReconciliationPanel({
  rowCount,
  result,
  onOpeningChange,
  onClosingChange,
}: ReconciliationPanelProps) {
  const {
    openingBalance,
    openingSource,
    closingBalance,
    closingSource,
    difference,
    severity,
    balanceBreaks,
    duplicates,
    dateIssues,
  } = result;

  let headline: string;
  let tone: SeverityTier = 'minor';

  if (openingBalance === null || closingBalance === null) {
    headline = 'Enter opening and closing balance to check this statement.';
  } else if (severity === 'balanced') {
    tone = 'balanced';
    headline =
      balanceBreaks.length > 0
        ? `Balanced overall, but ${balanceBreaks.length} row${balanceBreaks.length === 1 ? '' : 's'} don't chain correctly — worth a check.`
        : `Balanced — ${rowCount} transaction${rowCount === 1 ? '' : 's'} reconciled.`;
    if (balanceBreaks.length > 0) tone = 'moderate';
  } else {
    tone = severity ?? 'moderate';
    const diffText = `$${formatMoney(difference ?? 0)}`;
    headline =
      balanceBreaks.length > 0
        ? `Off by ${diffText} — ${balanceBreaks.length} row${balanceBreaks.length === 1 ? '' : 's'} flagged for review.`
        : `Off by ${diffText} — check for a missing or incorrect transaction.`;
  }

  const showBox = openingBalance !== null && closingBalance !== null;

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
      <p
        className={`rounded-md border px-3 py-2 text-sm font-medium ${
          showBox ? SEVERITY_BOX[tone] : 'border-line-strong bg-canvas text-ink-muted'
        }`}
      >
        {headline}
      </p>

      <div className="flex flex-wrap gap-6">
        <BalanceField
          label="Opening balance"
          value={openingBalance}
          source={openingSource}
          onCommit={onOpeningChange}
        />
        <BalanceField
          label="Closing balance"
          value={closingBalance}
          source={closingSource}
          onCommit={onClosingChange}
        />
      </div>

      {(duplicates.length > 0 || dateIssues.length > 0) && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line pt-3 text-sm text-ink-muted">
          {duplicates.length > 0 && (
            <span>
              {duplicates.length} possible duplicate group
              {duplicates.length === 1 ? '' : 's'}
            </span>
          )}
          {dateIssues.length > 0 && (
            <span>
              {dateIssues.length} date issue{dateIssues.length === 1 ? '' : 's'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
