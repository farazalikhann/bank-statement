interface PageSelectorProps {
  currentPage: number;
  numPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

export function PageSelector({
  currentPage,
  numPages,
  onChange,
  disabled,
}: PageSelectorProps) {
  if (numPages <= 1) return null;

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(currentPage - 1)}
        disabled={disabled || currentPage <= 1}
        aria-label="Previous page"
        className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong"
      >
        ‹
      </button>

      <label className="flex items-center gap-2 text-sm text-ink-muted">
        Page
        <select
          value={currentPage}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value))}
          className="rounded-md border border-line-strong bg-surface px-2 py-1.5 font-mono text-sm text-ink disabled:opacity-40"
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map((page) => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
        of {numPages}
      </label>

      <button
        type="button"
        onClick={() => onChange(currentPage + 1)}
        disabled={disabled || currentPage >= numPages}
        aria-label="Next page"
        className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-line-strong"
      >
        ›
      </button>
    </div>
  );
}
