import type { PDFDocumentProxy } from 'pdfjs-dist';
import { getPdfjs } from './pdfjsLoader';
import { PdfProcessingError } from './errors';

const PDF_MAGIC_BYTES = '%PDF-';

async function looksLikePdf(file: File): Promise<boolean> {
  if (file.type === 'application/pdf') return true;
  const header = await file.slice(0, 5).text();
  return header === PDF_MAGIC_BYTES;
}

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  if (!(await looksLikePdf(file))) {
    throw new PdfProcessingError(
      'invalid-file',
      `"${file.name}" doesn't look like a PDF file.`,
    );
  }

  const data = await file.arrayBuffer();
  const { getDocument, PasswordException, InvalidPDFException } =
    await getPdfjs();

  try {
    const loadingTask = getDocument({ data });
    return await loadingTask.promise;
  } catch (error) {
    if (error instanceof PasswordException) {
      throw new PdfProcessingError(
        'password-protected',
        `"${file.name}" is password-protected.`,
      );
    }
    if (error instanceof InvalidPDFException) {
      throw new PdfProcessingError(
        'invalid-file',
        `"${file.name}" is not a valid PDF file.`,
      );
    }
    throw new PdfProcessingError(
      'load-failed',
      `"${file.name}" could not be loaded.`,
    );
  }
}
