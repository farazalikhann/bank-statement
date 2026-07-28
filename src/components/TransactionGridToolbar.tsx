interface TransactionGridToolbarProps {
  rowCount: number;
  flaggedCount: number;
  onJumpNext: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onAddRow: () => void;
}

export function TransactionGridToolbar({
  rowCount,
  flaggedCount,
  onJumpNext,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onAddRow,
}: TransactionGridToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-ink-muted">
          <span className="font-medium text-ink">{rowCount}</span> transaction
          {rowCount === 1 ? '' : 's'}
        </span>
        {flaggedCount > 0 && (
          <>
            <span className="text-warn">
              {flaggedCount} field{flaggedCount === 1 ? '' : 's'} need review
            </span>
            <button
              type="button"
              onClick={onJumpNext}
              className="rounded-md border border-line-strong px-2.5 py-1 text-sm font-medium text-ink transition-colors hover:border-accent"
            >
              Next flagged
            </button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="rounded-md border border-line-strong px-2.5 py-1 text-sm font-medium text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="rounded-md border border-line-strong px-2.5 py-1 text-sm font-medium text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong"
        >
          Redo
        </button>
        <button
          type="button"
          onClick={onAddRow}
          className="rounded-md border border-line-strong px-2.5 py-1 text-sm font-medium text-ink transition-colors hover:border-accent"
        >
          + Add row
        </button>
      </div>
    </div>
  );
}
