import type { TextItem, TextMarkedContent } from 'pdfjs-dist/types/src/display/api';
import { ParseError } from '../errors';
import { PDF_CHUNK_SIZE } from '../config';

export async function extractPDFText(file: File): Promise<string> {
  let pdfjsLib;
  try {
    pdfjsLib = await import('pdfjs-dist');
  } catch (err) {
    throw new ParseError('Failed to load PDF parser library.');
  }

  // Set worker source using CDN
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await file.arrayBuffer();
  } catch (err) {
    throw new ParseError('Failed to read the PDF file.');
  }

  let pdf;
  try {
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  } catch (err) {
    throw new ParseError('Failed to parse PDF — the file may be corrupted or password-protected.');
  }

  const textParts: string[] = [];
  const failedPages: number[] = [];
  const totalPages = pdf.numPages;

  // S-075: Process pages in batches of PDF_CHUNK_SIZE to prevent OOM on large PDFs
  for (let batchStart = 1; batchStart <= totalPages; batchStart += PDF_CHUNK_SIZE) {
    const batchEnd = Math.min(batchStart + PDF_CHUNK_SIZE - 1, totalPages);

    for (let i = batchStart; i <= batchEnd; i++) {
      // S-071: Per-page try/catch — collect partial results on failure
      try {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item: TextItem | TextMarkedContent) => ('str' in item ? item.str : ''))
          .join(' ');
        textParts.push(`[Page ${i}]\n${pageText}`);
      } catch {
        failedPages.push(i);
        textParts.push(`[Page ${i}: extraction failed]`);
      }
    }

    // Yield to the main thread between batches to avoid blocking
    if (batchEnd < totalPages) {
      await new Promise<void>((r) => setTimeout(r, 0));
    }
  }

  // If every page failed, throw — there's nothing useful to return
  if (failedPages.length === totalPages) {
    throw new ParseError('Failed to extract text from any page in the PDF.');
  }

  let result = textParts.join('\n\n--- Page Break ---\n\n');

  // Append a note about failed pages so downstream consumers are aware
  if (failedPages.length > 0) {
    result += `\n\n[Note: ${failedPages.length} page(s) failed to extract: ${failedPages.join(', ')}]`;
  }

  return result;
}
