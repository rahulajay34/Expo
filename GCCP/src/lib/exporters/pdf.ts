/**
 * PDF Export utility using browser's print API
 * Generates a properly styled PDF from markdown content
 * Supports: Markdown, HTML, LaTeX math, code highlighting
 */

interface PDFExportOptions {
    title?: string;
    author?: string;
    filename?: string;
}

/**
 * Creates a print-friendly HTML document and opens print dialog
 */
export async function exportToPDF(content: string, options: PDFExportOptions = {}) {
    const {
        title = 'Document',
    } = options;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
    }

    // Process content: Markdown -> HTML with LaTeX support
    const processedHTML = await parseMarkdownToHTML(content);

    // Build HTML with proper styling - includes KaTeX CSS for math
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
      <style>
        @page {
          size: A4;
          margin: 2cm;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.7;
          color: #1a1a1a;
          max-width: 100%;
          padding: 0;
          margin: 0;
          font-size: 11pt;
        }
        
        h1 {
          font-size: 24pt;
          color: #1a365d;
          border-bottom: 2px solid #3182ce;
          padding-bottom: 0.5em;
          margin-top: 0;
          margin-bottom: 1em;
        }
        
        h2 {
          font-size: 18pt;
          color: #2c5282;
          margin-top: 1.5em;
          margin-bottom: 0.5em;
          page-break-after: avoid;
        }
        
        h3 {
          font-size: 14pt;
          color: #2d3748;
          margin-top: 1.2em;
          margin-bottom: 0.5em;
          page-break-after: avoid;
        }
        
        h4, h5, h6 {
          font-size: 12pt;
          color: #4a5568;
          margin-top: 1em;
          margin-bottom: 0.3em;
        }
        
        p {
          margin: 0.8em 0;
          text-align: justify;
          orphans: 3;
          widows: 3;
        }
        
        /* Inline code */
        code {
          background: #edf2f7;
          padding: 0.15em 0.4em;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 0.9em;
          color: #1a202c;
        }
        
        /* Code blocks */
        pre {
          background: #1e293b;
          color: #e2e8f0;
          padding: 1em 1.2em;
          border-radius: 8px;
          overflow-x: auto;
          page-break-inside: avoid;
          font-size: 9pt;
          line-height: 1.5;
          margin: 1em 0;
          border-left: 4px solid #3182ce;
        }
        
        pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: inherit;
        }
        
        /* Lists */
        ul, ol {
          margin: 0.8em 0;
          padding-left: 1.5em;
        }
        
        li {
          margin: 0.4em 0;
        }
        
        li > ul, li > ol {
          margin: 0.2em 0;
        }
        
        /* Blockquotes */
        blockquote {
          border-left: 4px solid #3182ce;
          margin: 1em 0;
          padding: 0.5em 1em;
          background: #ebf8ff;
          font-style: italic;
          page-break-inside: avoid;
        }
        
        blockquote p {
          margin: 0.5em 0;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          page-break-inside: avoid;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #e2e8f0;
          padding: 0.6em 0.8em;
          text-align: left;
        }
        
        th {
          background: #edf2f7;
          font-weight: 600;
          color: #2d3748;
        }
        
        tr:nth-child(even) {
          background: #f7fafc;
        }
        
        /* Math (KaTeX) */
        .katex-display {
          margin: 1em 0;
          overflow-x: auto;
          overflow-y: hidden;
        }
        
        .katex {
          font-size: 1.1em;
        }
        
        /* Styling */
        strong, b {
          font-weight: 700;
          color: #1a202c;
        }
        
        em, i {
          font-style: italic;
        }
        
        mark {
          background: #fef3c7;
          padding: 0.1em 0.2em;
        }
        
        /* Horizontal rules */
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 2em 0;
        }
        
        /* Links */
        a {
          color: #3182ce;
          text-decoration: underline;
        }
        
        /* Images */
        img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }
        
        /* Summary/Details */
        details {
          margin: 1em 0;
          padding: 0.5em;
          background: #f7fafc;
          border-radius: 4px;
        }
        
        summary {
          cursor: pointer;
          font-weight: 600;
          color: #2d3748;
        }
        
        /* Callout boxes */
        .callout, .note, .warning, .tip {
          padding: 1em;
          margin: 1em 0;
          border-radius: 6px;
          page-break-inside: avoid;
        }
        
        .note {
          background: #ebf8ff;
          border-left: 4px solid #3182ce;
        }
        
        .warning {
          background: #fef3c7;
          border-left: 4px solid #d97706;
        }
        
        .tip {
          background: #d1fae5;
          border-left: 4px solid #10b981;
        }
        
        /* Print-specific */
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          pre {
            background: #1e293b !important;
            color: #e2e8f0 !important;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }
          
          pre, blockquote, table, img {
            page-break-inside: avoid;
          }
          
          p {
            orphans: 3;
            widows: 3;
          }
        }
      </style>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
    </head>
    <body>
      <div class="content">
        ${processedHTML}
      </div>
      <script>
        // Render LaTeX math expressions
        document.addEventListener("DOMContentLoaded", function() {
          renderMathInElement(document.body, {
            delimiters: [
              {left: '$$', right: '$$', display: true},
              {left: '$', right: '$', display: false},
              {left: '\\\\[', right: '\\\\]', display: true},
              {left: '\\\\(', right: '\\\\)', display: false}
            ],
            throwOnError: false,
            trust: true
          });
          
          // Trigger print after math is rendered
          setTimeout(function() {
            window.focus();
            window.print();
          }, 500);
        });
      </script>
    </body>
    </html>
  `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Close window after printing (with delay for print dialog)
    printWindow.onafterprint = () => {
        setTimeout(() => printWindow.close(), 500);
    };
}

/**
 * Comprehensive markdown to HTML converter for PDF export
 * Handles: Markdown syntax, HTML tags, code blocks, tables, LaTeX (preserved for KaTeX)
 */
async function parseMarkdownToHTML(markdown: string): Promise<string> {
    let html = markdown;

    // Don't escape HTML entities - we want to preserve HTML tags
    // Only escape < > when they're not part of HTML tags
    
    // First, extract and protect code blocks
    const codeBlocks: string[] = [];
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        const index = codeBlocks.length;
        // Escape HTML in code blocks
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim();
        codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${escapedCode}</code></pre>`);
        return `__CODE_BLOCK_${index}__`;
    });

    // Protect inline code
    const inlineCodes: string[] = [];
    html = html.replace(/`([^`]+)`/g, (_, code) => {
        const index = inlineCodes.length;
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        inlineCodes.push(`<code>${escapedCode}</code>`);
        return `__INLINE_CODE_${index}__`;
    });

    // Protect LaTeX display math ($$...$$)
    const displayMath: string[] = [];
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
        const index = displayMath.length;
        displayMath.push(`<div class="math-display">$$${math.trim()}$$</div>`);
        return `__DISPLAY_MATH_${index}__`;
    });

    // Protect LaTeX inline math ($...$)
    const inlineMath: string[] = [];
    html = html.replace(/\$([^$\n]+)\$/g, (_, math) => {
        const index = inlineMath.length;
        inlineMath.push(`<span class="math-inline">$${math}$</span>`);
        return `__INLINE_MATH_${index}__`;
    });

    // Headers (must be at start of line)
    html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold, italic, strikethrough
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

    // Blockquotes (can be multiline)
    html = html.replace(/^> (.+)$/gm, '<blockquote><p>$1</p></blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');

    // Tables
    html = parseMarkdownTables(html);

    // Unordered lists
    html = parseMarkdownLists(html);

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

    // Paragraphs - wrap lines that aren't already wrapped
    const lines = html.split('\n\n');
    html = lines.map(block => {
        const trimmed = block.trim();
        if (!trimmed) return '';
        // Don't wrap if already an HTML block element
        if (/^<(h[1-6]|p|ul|ol|li|pre|blockquote|hr|table|div|details|figure)/i.test(trimmed)) {
            return trimmed;
        }
        // Don't wrap placeholders
        if (trimmed.startsWith('__')) {
            return trimmed;
        }
        // Wrap in paragraph
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }).join('\n\n');

    // Restore protected content
    displayMath.forEach((code, i) => {
        html = html.replace(`__DISPLAY_MATH_${i}__`, code);
    });
    inlineMath.forEach((code, i) => {
        html = html.replace(`__INLINE_MATH_${i}__`, code);
    });
    codeBlocks.forEach((code, i) => {
        html = html.replace(`__CODE_BLOCK_${i}__`, code);
    });
    inlineCodes.forEach((code, i) => {
        html = html.replace(`__INLINE_CODE_${i}__`, code);
    });

    // Clean up empty paragraphs and excessive whitespace
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
}

/**
 * Parse markdown tables to HTML
 */
function parseMarkdownTables(html: string): string {
    // Match table pattern: header row, separator row, data rows
    const tableRegex = /^(\|.+\|)\n(\|[-:\s|]+\|)\n((?:\|.+\|\n?)+)/gm;
    
    return html.replace(tableRegex, (match, header, separator, body) => {
        // Parse header
        const headerCells = header.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim());
        
        // Parse alignment from separator
        const alignments = separator.split('|').filter((c: string) => c.trim()).map((c: string) => {
            const cell = c.trim();
            if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
            if (cell.endsWith(':')) return 'right';
            return 'left';
        });
        
        // Build header HTML
        let tableHTML = '<table>\n<thead>\n<tr>\n';
        headerCells.forEach((cell: string, i: number) => {
            const align = alignments[i] || 'left';
            tableHTML += `<th style="text-align: ${align}">${cell}</th>\n`;
        });
        tableHTML += '</tr>\n</thead>\n<tbody>\n';
        
        // Parse body rows
        const rows = body.trim().split('\n');
        rows.forEach((row: string) => {
            const cells = row.split('|').filter((c: string) => c.trim()).map((c: string) => c.trim());
            tableHTML += '<tr>\n';
            cells.forEach((cell: string, i: number) => {
                const align = alignments[i] || 'left';
                tableHTML += `<td style="text-align: ${align}">${cell}</td>\n`;
            });
            tableHTML += '</tr>\n';
        });
        
        tableHTML += '</tbody>\n</table>';
        return tableHTML;
    });
}

/**
 * Parse markdown lists (unordered and ordered)
 */
function parseMarkdownLists(html: string): string {
    // Unordered lists
    html = html.replace(/^(\s*)[*-] (.+)$/gm, (match, indent, content) => {
        return `${indent}<li>${content}</li>`;
    });
    
    // Ordered lists
    html = html.replace(/^(\s*)\d+\. (.+)$/gm, (match, indent, content) => {
        return `${indent}<li>${content}</li>`;
    });
    
    // Wrap consecutive <li> elements in <ul> or <ol>
    // This is a simplified approach - for complex nested lists, a proper parser would be needed
    html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
        // Check if it looks like ordered list (has numbers nearby in original)
        return `<ul>\n${match}</ul>\n`;
    });
    
    return html;
}
