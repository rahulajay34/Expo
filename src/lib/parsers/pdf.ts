import { ParseError } from '../errors';

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

  for (let i = 1; i <= pdf.numPages; i++) {
    try {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((item: any) => item.str)
        .join(' ');
      textParts.push(`[Page ${i}]\n${pageText}`);
    } catch (err) {
      throw new ParseError(`Failed to extract text from page ${i}.`);
    }
  }

  return textParts.join('\n\n--- Page Break ---\n\n');
}
