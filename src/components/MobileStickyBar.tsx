import type { ReconciliationResult, SeverityTier } from '../lib/validation/types';
import type { ExportFormat } from '../hooks/useExport';

interface MobileStickyBarProps {
  result: ReconciliationResult;
  rowCount: number;
  onExport: (format: ExportFormat) => void;
}

const SEVERITY_TEXT: Record<SeverityTier, string> = {
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

// Condensed version of ReconciliationPanel's headline — just the status,
// no balance inputs, since this bar's only job is to stay visible and
// never scroll away. The full panel (with the actual inputs) stays where
// it already is, above the card list.
function headlineFor(result: ReconciliationResult, rowCount: number): { text: string; tone: SeverityTier } {
  const { openingBalance, closingBalance, severity, difference, balanceBreaks } = result;

  if (openingBalance === null || closingBalance === null) {
    return { text: 'Balance not checked', tone: 'minor' };
  }
  if (severity === 'balanced') {
    return balanceBreaks.length > 0
      ? { text: `${balanceBreaks.length} row${balanceBreaks.length === 1 ? '' : 's'} to check`, tone: 'moderate' }
      : { text: `Balanced (${rowCount})`, tone: 'balanced' };
  }
  return { text: `Off by $${formatMoney(difference ?? 0)}`, tone: severity ?? 'moderate' };
}

export function MobileStickyBar({ result, rowCount, onExport }: MobileStickyBarProps) {
  const { text, tone } = headlineFor(result, rowCount);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 border-t border-line bg-surface px-4 py-2"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <span className={`min-h-11 flex items-center text-sm font-medium ${SEVERITY_TEXT[tone]}`}>
        {text}
      </span>
      <button
        type="button"
        onClick={() => onExport('xlsx')}
        aria-label="Export statement"
        className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-accent-contrast transition-colors hover:bg-accent-hover"
      >
        Export
      </button>
    </div>
  );
}
