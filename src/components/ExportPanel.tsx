import type { ExportColumns, ExportDateFormat, ExportOptions } from '../lib/export/types';
import { formatExportSummary, type ExportFormat, type ExportSummary } from '../hooks/useExport';

interface ExportPanelProps {
  options: ExportOptions;
  onOptionsChange: (options: ExportOptions) => void;
  onExport: (format: ExportFormat) => void;
  lastExport: ExportSummary | null;
}

const COLUMN_LABELS: { key: keyof ExportColumns; label: string }[] = [
  { key: 'date', label: 'Date' },
  { key: 'description', label: 'Description' },
  { key: 'amount', label: 'Amount' },
  { key: 'balance', label: 'Balance' },
  { key: 'pageNumber', label: 'Page number' },
];

const DATE_FORMAT_OPTIONS: { value: ExportDateFormat; label: string }[] = [
  { value: 'MDY', label: 'MM/DD/YYYY (US)' },
  { value: 'DMY', label: 'DD/MM/YYYY' },
  { value: 'ISO', label: 'YYYY-MM-DD (ISO)' },
];

export function ExportPanel({ options, onOptionsChange, onExport, lastExport }: ExportPanelProps) {
  const setColumn = (key: keyof ExportColumns, value: boolean) => {
    onOptionsChange({ ...options, columns: { ...options.columns, [key]: value } });
  };

  return (
    <div className="flex flex-col gap-4 rounded-md border border-line bg-surface p-4">
      {lastExport && (
        <p className="flex items-center gap-2 rounded-md border border-accent bg-accent-soft px-3 py-2 text-sm font-medium text-ink">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-5 w-5 shrink-0 text-accent"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="9" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.5 12.5 2.5 2.5 4.5-5" />
          </svg>
          {formatExportSummary(lastExport)}
        </p>
      )}

      <div className="flex flex-wrap gap-6">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-0.5 text-sm text-ink-muted">Columns</legend>
          {COLUMN_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={options.columns[key]}
                onChange={(e) => setColumn(key, e.target.checked)}
                className="accent-accent"
              />
              {label}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="export-date-format" className="text-sm text-ink-muted">
            Date format
          </label>
          <select
            id="export-date-format"
            value={options.dateFormat}
            onChange={(e) =>
              onOptionsChange({ ...options, dateFormat: e.target.value as ExportDateFormat })
            }
            className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm text-ink"
          >
            {DATE_FORMAT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-0.5 text-sm text-ink-muted">Amount</legend>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="amount-mode"
              checked={options.amountMode === 'signed'}
              onChange={() => onOptionsChange({ ...options, amountMode: 'signed' })}
              className="accent-accent"
            />
            Single signed column
          </label>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="radio"
              name="amount-mode"
              checked={options.amountMode === 'split'}
              onChange={() => onOptionsChange({ ...options, amountMode: 'split' })}
              className="accent-accent"
            />
            Split Debit / Credit
          </label>
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-ink-muted">Rows</span>
          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={options.includeFlagged}
              onChange={(e) => onOptionsChange({ ...options, includeFlagged: e.target.checked })}
              className="accent-accent"
            />
            Include rows still flagged for review
          </label>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => onExport('xlsx')}
          className="min-h-11 md:min-h-0 rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          Export Excel (.xlsx)
        </button>
        <button
          type="button"
          onClick={() => onExport('csv')}
          className="min-h-11 md:min-h-0 rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => onExport('quickbooks')}
          className="min-h-11 md:min-h-0 rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          Export QuickBooks CSV
        </button>
        <button
          type="button"
          onClick={() => onExport('xero')}
          className="min-h-11 md:min-h-0 rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          Export Xero CSV
        </button>
      </div>
    </div>
  );
}
