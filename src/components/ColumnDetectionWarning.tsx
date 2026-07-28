interface ColumnDetectionWarningProps {
  message: string;
}

export function ColumnDetectionWarning({ message }: ColumnDetectionWarningProps) {
  return (
    <div className="rounded-md border border-danger-line bg-danger-soft px-4 py-3 text-sm font-medium text-ink">
      {message}
    </div>
  );
}
