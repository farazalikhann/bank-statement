import type { PDFPageProxy } from 'pdfjs-dist';
import { getPdfjs } from './pdfjsLoader';
import type { TextItem, PageExtraction } from './types';

// pdfjs-dist doesn't publicly export its TextItem type, so we declare the
// shape we rely on from TextContent.items ourselves.
interface PdfjsTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

export async function extractTextItems(
  page: PDFPageProxy,
): Promise<PageExtraction> {
  const { Util } = await getPdfjs();
  const viewport = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();

  const items: TextItem[] = [];

  for (const raw of content.items) {
    // TextMarkedContent entries (e.g. tagged-PDF markers) have no transform/str.
    if (!('transform' in raw)) continue;
    const item = raw as PdfjsTextItem;
    if (!item.str.trim()) continue;

    const tx = Util.transform(viewport.transform, item.transform);
    const fontSize = Math.hypot(tx[2], tx[3]);

    items.push({
      text: item.str,
      x: tx[4],
      y: tx[5],
      width: item.width,
      height: item.height || fontSize,
      fontSize,
    });
  }

  return {
    pageNumber: page.pageNumber,
    pageWidth: viewport.width,
    pageHeight: viewport.height,
    items,
  };
}
