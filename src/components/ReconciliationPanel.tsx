import { useEffect, useState } from 'react';
import type { ReconciliationResult, SeverityTier } from '../lib/validation/types';

interface ReconciliationPanelProps {
  rowCount: number;
  result: ReconciliationResult;
  onOpeningChange: (value: string) => void;
  onClosingChange: (value: string) => void;
}

// A bigger, bolder version of the same severity tones used elsewhere —
// this panel is deliberately the loudest thing on the page after the
// table, since "does this statement balance" is the single most valuable
// thing the product says.
const SEVERITY_HERO: Record<SeverityTier, string> = {
  balanced: 'border-accent bg-accent-soft text-ink',
  minor: 'border-line-strong bg-canvas text-ink-muted',
  moderate: 'border-warn-line bg-warn-soft text-ink',
  significant: 'border-danger-line bg-danger-soft text-ink',
};

const SEVERITY_ICON_COLOR: Record<SeverityTier, string> = {
  balanced: 'text-accent',
  minor: 'text-ink-muted',
  moderate: 'text-warn',
  significant: 'text-danger',
};

function formatMoney(value: number): string {
  return Math.abs(value).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.5 2.5 4.5-5" />
    </svg>
  );
}

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" d="M12 7.5v5.5" />
      <path strokeLinecap="round" d="M12 16.5h.01" />
    </svg>
  );
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
  const Icon = tone === 'balanced' ? CheckCircleIcon : AlertCircleIcon;

  return (
    <div
      className={`flex flex-col gap-5 rounded-lg border-2 p-5 sm:p-7 ${
        showBox ? SEVERITY_HERO[tone] : 'border-line-strong bg-canvas text-ink-muted'
      }`}
    >
      <div className="flex items-center gap-3 sm:gap-4">
        {showBox && (
          <Icon
            className={`h-8 w-8 shrink-0 sm:h-10 sm:w-10 ${SEVERITY_ICON_COLOR[tone]}`}
          />
        )}
        <p className="font-heading text-xl font-semibold leading-snug sm:text-2xl">
          {headline}
        </p>
      </div>

      <div className="flex flex-wrap gap-6 border-t border-line/60 pt-4">
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
        <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line/60 pt-3 text-sm text-ink-muted">
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
