import { useState } from 'react';
import type { DroppedRow, DropReason } from '../lib/pdf/types';

interface DroppedRowsPanelProps {
  droppedRows: DroppedRow[];
}

const REASON_LABEL: Record<DropReason, string> = {
  'above-first-date': 'Above first transaction',
  'repeated-across-pages': 'Repeated header/footer',
  'single-cell-no-amount': 'Stray text',
  'page-number': 'Page number',
};

export function DroppedRowsPanel({ droppedRows }: DroppedRowsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (droppedRows.length === 0) return null;

  return (
    <div className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-muted">
          {droppedRows.length} row{droppedRows.length > 1 ? 's' : ''} hidden
          as page furniture
        </p>
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          aria-expanded={isExpanded}
          className="rounded-md border border-line-strong px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          {isExpanded ? 'Hide' : 'Show'} hidden rows
        </button>
      </div>

      {isExpanded && (
        <ul className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
          {droppedRows.map((row, index) => (
            <li
              key={index}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 font-mono text-sm text-ink-muted"
            >
              <span className="truncate">
                {row.cells.filter((cell) => cell.trim()).join('   ') || '(blank row)'}
              </span>
              <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 font-sans text-xs font-medium text-ink-muted">
                {REASON_LABEL[row.reason]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
