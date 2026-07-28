import type { PdfProcessingError } from '../lib/pdf/errors';

interface ErrorMessageProps {
  error: PdfProcessingError;
  onDismiss: () => void;
}

const KIND_LABEL: Record<PdfProcessingError['kind'], string> = {
  'password-protected': 'Password-protected PDF',
  'no-text-layer': 'No text layer found',
  'invalid-file': 'Unsupported file',
  'load-failed': 'Could not open PDF',
  'text-extraction-failed': 'Could not read page text',
  'row-grouping-failed': 'Row grouping failed',
  'column-detection-failed': 'Column detection failed',
  'role-assignment-failed': 'Column role detection failed',
  'typing-failed': 'Could not process transactions',
};

export function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-md border border-danger-line bg-danger-soft p-5"
    >
      <p className="text-sm font-semibold text-danger">
        {KIND_LABEL[error.kind]}
      </p>
      <p className="text-sm leading-relaxed text-ink">{error.message}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="self-start rounded-md border border-line-strong bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-accent"
      >
        Try another file
      </button>
    </div>
  );
}
