import { waitForMermaidDiagrams } from './mermaid-wait';

// =========================================================================
// Smart Print Layout Optimization
//
// Analyzes content structure before PDF export and applies targeted
// DOM mutations + dynamic CSS.  Runs entirely client-side — no AI API calls.
// =========================================================================

/** Metrics gathered from content analysis to drive optimization decisions. */
interface ContentMetrics {
  sectionCount: number;
  isAssignment: boolean;
  codeBlockCount: number;
  longCodeBlockCount: number;
  diagramCount: number;
  largeDiagramCount: number;
  wideTableCount: number;
  estimatedWordCount: number;
}

/** Scan the cloned DOM and collect structural metrics. */
function analyzeContent(content: HTMLElement): ContentMetrics {
  const text = content.textContent ?? '';

  const h2s = content.querySelectorAll('h2');
  const pres = content.querySelectorAll('pre');
  const tables = content.querySelectorAll('table');
  const diagrams = content.querySelectorAll(
    '.mermaid-container, [data-mermaid]',
  );

  let longCodeBlockCount = 0;
  pres.forEach((pre) => {
    if ((pre.textContent ?? '').split('\n').length > 35) longCodeBlockCount++;
  });

  let largeDiagramCount = 0;
  diagrams.forEach((d) => {
    const svg = d.querySelector('svg');
    if (!svg) return;
    const vb = svg.getAttribute('viewBox');
    if (vb) {
      const width = parseFloat(vb.split(/[\s,]+/)[2] ?? '0');
      if (width > 600) largeDiagramCount++;
    }
  });

  let wideTableCount = 0;
  tables.forEach((t) => {
    const firstRow = t.querySelector('tr');
    if (firstRow && firstRow.querySelectorAll('th, td').length > 4) {
      wideTableCount++;
    }
  });

  return {
    sectionCount: h2s.length,
    isAssignment: (text.match(/\bQ\d+[\.\)]/g) ?? []).length >= 3,
    codeBlockCount: pres.length,
    longCodeBlockCount,
    diagramCount: diagrams.length,
    largeDiagramCount,
    wideTableCount,
    estimatedWordCount: text.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Wrap each h3/h4 heading together with its first following content element
 * so the pair never splits across a page break.
 *
 * Processes in reverse DOM order so earlier indices stay stable while
 * later elements are moved into wrapper divs.
 */
function groupHeadingsWithContent(content: HTMLElement): void {
  const headings = Array.from(content.querySelectorAll('h3, h4')).reverse();

  for (const heading of headings) {
    const next = heading.nextElementSibling;
    if (!next) continue;
    // Don't group two consecutive headings
    if (/^H[1-6]$/i.test(next.tagName)) continue;
    // Already wrapped
    if (heading.parentElement?.classList.contains('heading-group')) continue;
    // Don't trap a long code block inside a break-inside:avoid wrapper —
    // that would defeat the long-code optimisation (see markLongCodeBlocks).
    if (
      next.classList.contains('long-code') ||
      next.querySelector?.('pre.long-code')
    ) continue;

    const wrapper = document.createElement('div');
    wrapper.className = 'heading-group';
    heading.parentNode!.insertBefore(wrapper, heading);
    wrapper.appendChild(heading);
    wrapper.appendChild(next);
  }
}

/**
 * Detect assignment question boundaries (Q1., Q2. …) and wrap each question
 * together with its options + answer/explanation so they stay on one page.
 */
function groupQuestionBlocks(content: HTMLElement): void {
  const body =
    content.querySelector('.markdown-body') ??
    content.querySelector('.print-content') ??
    content;
  const children = Array.from(body.children);

  let blockStart = -1;
  const blocks: { start: number; end: number }[] = [];

  for (let i = 0; i < children.length; i++) {
    const el = children[i];
    const text = el.textContent?.trim() ?? '';

    // Detect question start: text beginning with Q<digit>
    const strong = el.querySelector('strong');
    const isQStart =
      /^Q\d+[\.\)]/.test(text) ||
      (strong != null && /^Q\d+[\.\)]/.test(strong.textContent?.trim() ?? ''));

    // Section headers end a question block
    const isHeader = /^H[23]$/i.test(el.tagName);

    if (isQStart) {
      if (blockStart >= 0) blocks.push({ start: blockStart, end: i - 1 });
      blockStart = i;
    } else if (isHeader && blockStart >= 0) {
      blocks.push({ start: blockStart, end: i - 1 });
      blockStart = -1;
    }
  }

  // Close final block
  if (blockStart >= 0) {
    blocks.push({ start: blockStart, end: children.length - 1 });
  }

  // Wrap in reverse order so earlier indices stay valid
  for (let b = blocks.length - 1; b >= 0; b--) {
    const { start, end } = blocks[b];
    if (start >= end) continue; // single element — nothing to group

    const wrapper = document.createElement('div');
    wrapper.className = 'question-block';
    children[start].parentNode!.insertBefore(wrapper, children[start]);
    for (let i = start; i <= end; i++) {
      wrapper.appendChild(children[i]);
    }
  }
}

/** Mark code blocks with > 35 lines so they can split across pages. */
function markLongCodeBlocks(content: HTMLElement): void {
  content.querySelectorAll('pre').forEach((pre) => {
    if ((pre.textContent ?? '').split('\n').length > 35) {
      pre.classList.add('long-code');
    }
  });
}

/** Add isolation class to large diagrams (viewBox width > 600). */
function isolateLargeDiagrams(content: HTMLElement): void {
  content
    .querySelectorAll('.mermaid-container, [data-mermaid]')
    .forEach((d) => {
      const svg = d.querySelector('svg');
      if (!svg) return;
      const vb = svg.getAttribute('viewBox');
      if (!vb) return;
      const width = parseFloat(vb.split(/[\s,]+/)[2] ?? '0');
      if (width > 600) {
        (d as HTMLElement).classList.add('diagram-full-page');
      }
    });
}

/** Add compact class to tables with more than 4 columns. */
function markWideTables(content: HTMLElement): void {
  content.querySelectorAll('table').forEach((t) => {
    const firstRow = t.querySelector('tr');
    if (firstRow && firstRow.querySelectorAll('th, td').length > 4) {
      (t as HTMLElement).classList.add('wide-table');
    }
  });
}

/**
 * Main optimisation entry point.
 *
 * 1. Analyses the cloned content to gather structural metrics.
 * 2. Applies targeted DOM mutations (class additions, wrapper divs).
 * 3. Returns dynamic CSS rules that the print template should include.
 *
 * The optimisations are *content-aware* — they adapt to document length,
 * content type (assignment vs lecture), code density, diagram size, and
 * table width rather than applying one-size-fits-all rules.
 */
function optimizePrintLayout(content: HTMLElement): string {
  const m = analyzeContent(content);
  const rules: string[] = [];

  // ── 1. Short documents: skip forced h2 page breaks ──────────────────
  if (m.estimatedWordCount < 1500 || m.sectionCount <= 2) {
    rules.push(
      'h2 { page-break-before: auto !important; break-before: auto !important; }',
    );
  }

  // ── 2. Assignment question grouping ─────────────────────────────────
  if (m.isAssignment) {
    groupQuestionBlocks(content);
    rules.push(
      '.question-block { page-break-inside: avoid; break-inside: avoid; padding: 4px 0; }',
    );
  }

  // ── 3. Long code blocks: allow splitting ────────────────────────────
  if (m.longCodeBlockCount > 0) {
    markLongCodeBlocks(content);
    rules.push(
      'pre.long-code { page-break-inside: auto !important; break-inside: auto !important; }',
    );
  }

  // ── 4. Large diagrams: full-page isolation (only when few diagrams) ─
  if (m.largeDiagramCount > 0 && m.diagramCount <= 4) {
    isolateLargeDiagrams(content);
    rules.push(
      '.diagram-full-page { page-break-before: always; break-before: always; page-break-inside: avoid; break-inside: avoid; padding: 30px 0; text-align: center; }',
    );
  }

  // ── 5. Wide tables: compact styling ─────────────────────────────────
  if (m.wideTableCount > 0) {
    markWideTables(content);
    rules.push('table.wide-table { font-size: 10px; }');
    rules.push(
      'table.wide-table th, table.wide-table td { padding: 6px 8px; }',
    );
  }

  // ── 6. Heading grouping (always applied) ────────────────────────────
  groupHeadingsWithContent(content);
  rules.push(
    '.heading-group { page-break-inside: avoid; break-inside: avoid; }',
  );

  return rules.join('\n');
}

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

  // Wait for all Mermaid diagrams to finish rendering before cloning the DOM
  await waitForMermaidDiagrams(originalElement);

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
  // 1b. Content-aware print optimizations
  // ---------------------------------------------------------------------------
  const dynamicCSS = optimizePrintLayout(clonedContent);

  // ---------------------------------------------------------------------------
  // 2. Build the print document
  // ---------------------------------------------------------------------------
  const displayTitle = filename
    .replace(/_/g, ' ')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

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

/* ================================================================
   Content-aware optimizations (generated per-export)
   ================================================================ */
${dynamicCSS}
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
