import type { ExtractionStats } from '../lib/pdf/types';

interface StatsBarProps {
  stats: ExtractionStats;
}

export function StatsBar({ stats }: StatsBarProps) {
  const entries: { label: string; value: string }[] = [
    { label: 'Text items', value: String(stats.itemCount) },
    { label: 'Rows detected', value: String(stats.rowCount) },
    { label: 'Columns detected', value: String(stats.columnCount) },
    {
      label: 'Column consistency',
      value: `${stats.columnConsistencyPct}%`,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line sm:grid-cols-4">
      {entries.map((entry) => (
        <div key={entry.label} className="flex flex-col gap-1 bg-surface p-4">
          <dt className="text-sm text-ink-muted">{entry.label}</dt>
          <dd className="font-mono text-xl text-ink">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
