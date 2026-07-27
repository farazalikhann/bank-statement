import type { CleanedRow, ColumnRole, ConfidenceLevel } from '../lib/pdf/types';

interface ExtractedTableProps {
  cleanedRows: CleanedRow[];
  columnRoles: ColumnRole[];
  onRoleChange: (index: number, role: ColumnRole) => void;
  confidenceByCell?: (ConfidenceLevel | null)[][];
}

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'amount', label: 'Amount' },
  { value: 'debit', label: 'Debit' },
  { value: 'credit', label: 'Credit' },
  { value: 'balance', label: 'Balance' },
  { value: 'unknown', label: 'Unlabeled' },
];

const ROLE_LABEL: Record<ColumnRole, string> = Object.fromEntries(
  ROLE_OPTIONS.map((option) => [option.value, option.label]),
) as Record<ColumnRole, string>;

function confidenceDecorationClass(confidence: ConfidenceLevel | null): string {
  if (confidence === 'low') return 'underline decoration-dotted decoration-danger underline-offset-4';
  if (confidence === 'medium') return 'underline decoration-dotted decoration-accent underline-offset-4';
  return '';
}

export function ExtractedTable({
  cleanedRows,
  columnRoles,
  onRoleChange,
  confidenceByCell,
}: ExtractedTableProps) {
  if (cleanedRows.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-md border border-line bg-surface p-12 text-sm text-ink-muted">
        No transaction rows found on this page.
      </div>
    );
  }

  return (
    <div className="max-h-[60vh] overflow-auto rounded-md border border-line bg-surface">
      <table className="w-full border-collapse text-left font-mono text-sm">
        <thead className="sticky top-0 bg-canvas">
          <tr>
            {columnRoles.map((role, index) => (
              <th
                key={index}
                scope="col"
                className="border-b border-line px-3 py-2 font-sans font-medium text-ink-muted"
              >
                <select
                  value={role}
                  onChange={(event) =>
                    onRoleChange(index, event.target.value as ColumnRole)
                  }
                  aria-label={`Column ${index + 1} type`}
                  className="rounded border border-line-strong bg-surface px-1.5 py-1 text-xs font-medium text-ink"
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cleanedRows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-canvas/40">
              {row.cells.map((text, cellIndex) => {
                const confidence = confidenceByCell?.[rowIndex]?.[cellIndex] ?? null;
                return (
                  <td
                    key={cellIndex}
                    className="whitespace-pre-line border-b border-line px-3 py-1.5 align-top text-ink"
                  >
                    <span
                      className={confidenceDecorationClass(confidence)}
                      title={
                        confidence && confidence !== 'high'
                          ? `${ROLE_LABEL[columnRoles[cellIndex]]}: ${confidence} confidence`
                          : undefined
                      }
                    >
                      {text || ' '}
                    </span>
                    {row.mergedLineCount > 0 && cellIndex === row.mergedIntoIndex && (
                      <span
                        title={`${row.mergedLineCount} wrapped line${row.mergedLineCount > 1 ? 's' : ''} merged in from the row${row.mergedLineCount > 1 ? 's' : ''} below${row.mergedFromNextPage ? ' (including text from the next page)' : ''}`}
                        className="ml-2 inline-block rounded-full bg-accent-soft px-1.5 py-0.5 align-middle font-sans text-xs font-medium text-accent"
                      >
                        +{row.mergedLineCount}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
