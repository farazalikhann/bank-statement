export type PdfErrorKind =
  | 'password-protected'
  | 'no-text-layer'
  | 'invalid-file'
  | 'load-failed';

export class PdfProcessingError extends Error {
  readonly kind: PdfErrorKind;

  constructor(kind: PdfErrorKind, message: string) {
    super(message);
    this.name = 'PdfProcessingError';
    this.kind = kind;
  }
}

export const PDF_ERROR_MESSAGES: Record<PdfErrorKind, string> = {
  'password-protected':
    'This PDF is password-protected. Open it in your PDF viewer, enter the password, then save or export an unlocked copy (in Adobe Acrobat: File → Print → Save as PDF; in Preview on Mac: File → Export). Upload that copy instead.',
  'no-text-layer':
    'This PDF has no extractable text — it appears to be a scanned image rather than a digital statement. Scanned PDFs need OCR (optical character recognition) to convert, which is not supported yet.',
  'invalid-file':
    'That file is not a PDF. Please upload a PDF export or download of your bank statement (usually a .pdf file from your bank’s website or app).',
  'load-failed':
    'This PDF could not be read. It may be corrupted or use an unsupported format. Try re-downloading it from your bank and upload again.',
};
