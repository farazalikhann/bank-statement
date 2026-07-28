export type PdfErrorKind =
  | 'password-protected'
  | 'no-text-layer'
  | 'invalid-file'
  | 'load-failed'
  | 'text-extraction-failed'
  | 'row-grouping-failed'
  | 'column-detection-failed'
  | 'role-assignment-failed'
  | 'typing-failed';

export class PdfProcessingError extends Error {
  readonly kind: PdfErrorKind;

  constructor(kind: PdfErrorKind, message: string) {
    super(message);
    this.name = 'PdfProcessingError';
    this.kind = kind;
  }
}

// Every internal-pipeline stage boundary uses this to turn an unexpected
// throw into a user-facing error that names the stage and carries the real
// underlying reason, instead of a bucketed generic message — and to log the
// full original error (stack included) so it's not lost.
export function wrapStageError(
  kind: PdfErrorKind,
  context: string,
  err: unknown,
): PdfProcessingError {
  console.error(`[StatementKit] ${context}:`, err);
  const detail = err instanceof Error ? err.message : String(err);
  return new PdfProcessingError(kind, `${context}: ${detail}`);
}
