interface ControlsPanelProps {
  toleranceY: number;
  onToleranceYChange: (value: number) => void;
  gapX: number;
  onGapXChange: (value: number) => void;
}

export function ControlsPanel({
  toleranceY,
  onToleranceYChange,
  gapX,
  onGapXChange,
}: ControlsPanelProps) {
  return (
    <div className="grid gap-6 rounded-md border border-line bg-surface p-5 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="tolerance-y" className="text-sm font-medium text-ink">
            Row grouping tolerance
          </label>
          <span className="font-mono text-sm text-ink-muted">{toleranceY}px</span>
        </div>
        <input
          id="tolerance-y"
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={toleranceY}
          onChange={(event) => onToleranceYChange(Number(event.target.value))}
          className="accent-accent"
        />
        <p className="text-sm text-ink-muted">
          How close two lines of text must be, vertically, to count as the
          same row.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <label htmlFor="gap-x" className="text-sm font-medium text-ink">
            Column gap threshold
          </label>
          <span className="font-mono text-sm text-ink-muted">{gapX}px</span>
        </div>
        <input
          id="gap-x"
          type="range"
          min={0}
          max={50}
          step={1}
          value={gapX}
          onChange={(event) => onGapXChange(Number(event.target.value))}
          className="accent-accent"
        />
        <p className="text-sm text-ink-muted">
          How much horizontal space marks a new column, instead of the same
          column continuing.
        </p>
      </div>
    </div>
  );
}
