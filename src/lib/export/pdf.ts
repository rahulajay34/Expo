/**
 * Professional print-to-PDF export.
 *
 * Opens a new browser window with styled content and triggers window.print(),
 * letting the browser's native print dialog handle PDF generation.  This avoids
 * the rasterisation artefacts (content cutting, mermaid cropping, inconsistent
 * gaps) caused by html2pdf.js / html2canvas.
 */
export async function downloadPDF(elementId: string, filename: string): Promise<void> {
  const originalElement = document.getElementById(elementId);
  if (!originalElement) throw new Error('Element not found for PDF export');

  // ---------------------------------------------------------------------------
  // 1. Clone & prepare the content
  // ---------------------------------------------------------------------------
  const clonedContent = originalElement.cloneNode(true) as HTMLElement;
  clonedContent.id = '';

  // Fix SVGs (Mermaid hard-codes width/height that break print scaling)
  const svgs = clonedContent.querySelectorAll('svg');
  svgs.forEach((svg) => {
    const w = svg.getAttribute('width');
    const h = svg.getAttribute('height');
    const vb = svg.getAttribute('viewBox');

    if (!vb && w && h) {
      const nw = w.replace(/px|%/g, '');
      const nh = h.replace(/px|%/g, '');
      if (!isNaN(Number(nw)) && !isNaN(Number(nh))) {
        svg.setAttribute('viewBox', `0 0 ${nw} ${nh}`);
      }
    }

    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.style.width = '100%';
    svg.style.maxWidth = '100%';
    svg.style.height = 'auto';
  });

  // ---------------------------------------------------------------------------
  // 2. Build the print document
  // ---------------------------------------------------------------------------
  const displayTitle = filename.replace(/_/g, ' ');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${displayTitle}</title>

<!-- Inter font -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

<style>
/* ================================================================
   @page — A4, comfortable margins, page numbers
   ================================================================ */
@page {
  size: A4 portrait;
  margin: 25mm 20mm 30mm 20mm;

  @bottom-center {
    content: counter(page);
    font-family: 'Inter', system-ui, sans-serif;
    font-size: 10px;
    color: #9CA3AF;
  }
}

/* ================================================================
   Reset & base
   ================================================================ */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}

body {
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 13px;
  line-height: 1.75;
  color: #374151;
  background: #fff;
}

/* ================================================================
   Header
   ================================================================ */
.print-header {
  padding-bottom: 16px;
  margin-bottom: 32px;
  border-bottom: 2px solid #E5E7EB;
}

.print-header h1 {
  font-size: 26px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.02em;
  line-height: 1.25;
  margin: 0;
}

.print-header .subtitle {
  font-size: 11px;
  color: #9CA3AF;
  margin-top: 6px;
}

/* ================================================================
   Footer (rendered as fixed HTML — @page @bottom-center handles
   page numbers; this is the doc-level footer)
   ================================================================ */
.print-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9px;
  color: #D1D5DB;
  padding: 8px 0 4px;
}

/* ================================================================
   Typography
   ================================================================ */
h1, h2, h3, h4, h5, h6 {
  color: #111827;
  font-weight: 700;
  page-break-inside: avoid;
  break-inside: avoid;
  page-break-after: avoid;
  break-after: avoid;
}

h1 { font-size: 24px; margin: 2em 0 0.6em; }

h2 {
  font-size: 20px;
  margin: 1.8em 0 0.6em;
  padding-bottom: 6px;
  border-bottom: 1px solid #F3F4F6;
  page-break-before: always;
  break-before: always;
}

/* First h2 in the content should not force a page break */
.print-content > h2:first-child,
.print-content > *:first-child h2 {
  page-break-before: auto;
  break-before: auto;
}

h3 { font-size: 16px; margin: 1.4em 0 0.5em; }
h4 { font-size: 14px; margin: 1.2em 0 0.4em; }

p {
  margin-bottom: 0.85em;
  orphans: 3;
  widows: 3;
}

a {
  color: #6366F1;
  text-decoration: none;
}

strong { font-weight: 600; color: #111827; }

/* ================================================================
   Lists
   ================================================================ */
ul, ol {
  padding-left: 1.6em;
  margin-bottom: 1em;
}

li {
  margin-bottom: 0.4em;
  page-break-inside: avoid;
  break-inside: avoid;
}

/* ================================================================
   Code blocks
   ================================================================ */
pre {
  page-break-inside: avoid;
  break-inside: avoid;
  background: #F8FAFC;
  border: 1px solid #E2E8F0;
  border-radius: 6px;
  padding: 16px 18px;
  margin: 1.2em 0;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
  overflow: visible;
}

code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace;
  font-size: 0.9em;
}

/* Inline code */
:not(pre) > code {
  background: #F3F4F6;
  padding: 2px 5px;
  border-radius: 4px;
  font-size: 0.88em;
}

/* ================================================================
   Tables
   ================================================================ */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5em 0;
  page-break-inside: avoid;
  break-inside: avoid;
  font-size: 12px;
}

thead {
  display: table-header-group; /* repeat header on new pages */
}

tr {
  page-break-inside: avoid;
  break-inside: avoid;
}

th, td {
  border: 1px solid #E5E7EB;
  padding: 10px 14px;
  text-align: left;
}

th {
  background-color: #F9FAFB;
  font-weight: 600;
  color: #111827;
}

/* Alternating row stripes */
tbody tr:nth-child(even) {
  background-color: #FAFAFA;
}

/* ================================================================
   Blockquotes
   ================================================================ */
blockquote {
  page-break-inside: avoid;
  break-inside: avoid;
  border-left: 4px solid #6366F1;
  background: #EEF2FF;
  padding: 12px 18px;
  margin: 1.5em 0;
  border-radius: 0 6px 6px 0;
  color: #4338CA;
}

blockquote p {
  margin-bottom: 0.4em;
}

blockquote p:last-child {
  margin-bottom: 0;
}

/* ================================================================
   Horizontal rules
   ================================================================ */
hr {
  border: none;
  border-top: 1px solid #E5E7EB;
  margin: 2em 0;
}

/* ================================================================
   Images
   ================================================================ */
img {
  max-width: 100%;
  height: auto;
  page-break-inside: avoid;
  break-inside: avoid;
}

/* ================================================================
   SVG / Mermaid diagrams
   ================================================================ */
svg {
  max-width: 100% !important;
  height: auto !important;
  page-break-inside: avoid;
  break-inside: avoid;
  display: block;
  margin: 1em auto;
}

/* Mermaid wrapper (MarkdownPreview uses this class pattern) */
.my-6.flex.justify-center,
.mermaid,
[data-mermaid] {
  page-break-inside: avoid;
  break-inside: avoid;
  text-align: center;
  margin: 1.5em 0;
  background: #fff;
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 20px;
}

/* ================================================================
   Utility: keep together
   ================================================================ */
.keep-together {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* ================================================================
   Hide things that make no sense in print
   ================================================================ */
button, .no-print, [data-no-print] {
  display: none !important;
}

/* ================================================================
   @media print overrides (belt-and-suspenders)
   ================================================================ */
@media print {
  body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  .print-footer {
    position: fixed;
    bottom: 0;
  }
}

/* ================================================================
   @media screen — for the brief moment the window is visible
   ================================================================ */
@media screen {
  body {
    max-width: 800px;
    margin: 0 auto;
    padding: 40px 32px;
  }
}
</style>
</head>
<body>

<div class="print-header">
  <h1>${displayTitle}</h1>
  <div class="subtitle">Exported on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
</div>

<div class="print-content">
  ${clonedContent.innerHTML}
</div>

<div class="print-footer">Generated by New-S13n</div>

</body>
</html>`;

  // ---------------------------------------------------------------------------
  // 3. Open window, write content, trigger print
  // ---------------------------------------------------------------------------
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Could not open print window — please allow popups for this site');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  // Wait for fonts & images to load before printing
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      // Safety net: print even if onload never fires
      resolve();
    }, 5000);

    printWindow.onload = () => {
      clearTimeout(timeout);
      resolve();
    };

    // If the window is closed before loading, reject gracefully
    const closedCheck = setInterval(() => {
      if (printWindow.closed) {
        clearInterval(closedCheck);
        clearTimeout(timeout);
        reject(new Error('Print window was closed before loading'));
      }
    }, 200);

    // Clear interval once resolved
    const origResolve = resolve;
    resolve = (() => {
      clearInterval(closedCheck);
      origResolve();
    }) as () => void;
  });

  // Small delay to let fonts render
  await new Promise((r) => setTimeout(r, 300));

  printWindow.focus();
  printWindow.print();

  // Close the window after a brief delay (gives time for the print dialog)
  // Some browsers close immediately, others keep the dialog open
  setTimeout(() => {
    if (!printWindow.closed) {
      printWindow.close();
    }
  }, 1000);
}
