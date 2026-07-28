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

  // Statements using non-embedded base-14 fonts (Helvetica/Times/Courier —
  // extremely common) need these on disk or getDocument() throws entirely.
  // Must be built from BASE_URL, not a leading-slash absolute path — this
  // app deploys under /bank-statement/, and a hardcoded "/standard_fonts/"
  // would 404 there.
  const base = import.meta.env.BASE_URL;

  try {
    const loadingTask = getDocument({
      data,
      standardFontDataUrl: `${base}standard_fonts/`,
      cMapUrl: `${base}cmaps/`,
      cMapPacked: true,
    });
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
