/**
 * PDF Export utility using browser's print API with full markdown support
 * Supports LaTeX, Mermaid diagrams, HTML, code highlighting, and more
 */

interface PDFExportOptions {
    title?: string;
    author?: string;
    filename?: string;
}

/**
 * Creates a print-friendly HTML document with full markdown rendering and opens print dialog
 * Matches the reference view panel rendering with LaTeX, Mermaid, and advanced markdown
 */
export function exportToPDF(content: string, options: PDFExportOptions = {}) {
    const {
        title = 'Document',
    } = options;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to export PDF');
        return;
    }

    // Build HTML with proper styling - includes KaTeX and Mermaid support
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <!-- KaTeX CSS for math rendering -->
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css">
      <!-- Highlight.js CSS for code syntax highlighting -->
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/atom-one-dark.min.css">
      <style>
        @page {
          size: A4;
          margin: 2cm;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;
          line-height: 1.75;
          color: #1a1a1a;
          max-width: 100%;
          padding: 0;
          margin: 0;
          font-size: 11pt;
          background: white;
        }
        
        .content {
          max-width: 100%;
        }
        
        /* Typography */
        h1 {
          font-size: 28pt;
          font-weight: 700;
          color: #0f172a;
          border-bottom: 3px solid #3b82f6;
          padding-bottom: 0.5em;
          margin-top: 0;
          margin-bottom: 1em;
          page-break-after: avoid;
        }
        
        h2 {
          font-size: 20pt;
          font-weight: 700;
          color: #1e293b;
          margin-top: 1.8em;
          margin-bottom: 0.8em;
          page-break-after: avoid;
        }
        
        h3 {
          font-size: 16pt;
          font-weight: 600;
          color: #334155;
          margin-top: 1.5em;
          margin-bottom: 0.6em;
          page-break-after: avoid;
        }
        
        h4 {
          font-size: 13pt;
          font-weight: 600;
          color: #475569;
          margin-top: 1.2em;
          margin-bottom: 0.5em;
          page-break-after: avoid;
        }
        
        h5 {
          font-size: 11.5pt;
          font-weight: 600;
          color: #64748b;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        h6 {
          font-size: 11pt;
          font-weight: 600;
          color: #64748b;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        p {
          margin: 0.85em 0;
          text-align: justify;
          orphans: 3;
          widows: 3;
        }
        
        /* Inline code */
        code {
          background: #f1f5f9;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 9.5pt;
          color: #dc2626;
          border: 1px solid #e2e8f0;
        }
        
        /* Code blocks */
        pre {
          background: #1e293b;
          color: #f8fafc;
          padding: 1.2em;
          border-radius: 8px;
          overflow-x: auto;
          page-break-inside: avoid;
          margin: 1.2em 0;
          border: 1px solid #334155;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        pre code {
          background: none;
          padding: 0;
          color: inherit;
          font-size: 9pt;
          line-height: 1.6;
          border: none;
        }
        
        /* Syntax highlighting support */
        .hljs {
          background: #1e293b !important;
          color: #f8fafc !important;
        }
        
        /* Lists */
        ul, ol {
          margin: 0.8em 0;
          padding-left: 2em;
        }
        
        li {
          margin: 0.5em 0;
          line-height: 1.6;
        }
        
        li > p {
          margin: 0.3em 0;
        }
        
        /* Nested lists */
        ul ul, ol ol, ul ol, ol ul {
          margin: 0.3em 0;
        }
        
        /* Blockquotes */
        blockquote {
          border-left: 4px solid #3b82f6;
          margin: 1.2em 0;
          padding: 0.8em 1.2em;
          background: #eff6ff;
          font-style: italic;
          color: #1e40af;
          page-break-inside: avoid;
          border-radius: 4px;
        }
        
        blockquote p {
          margin: 0.5em 0;
        }
        
        /* Tables */
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.2em 0;
          page-break-inside: avoid;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #cbd5e1;
          padding: 0.7em;
          text-align: left;
          vertical-align: top;
        }
        
        th {
        th {
          background: #f1f5f9;
          font-weight: 700;
          color: #0f172a;
        }
        
        tr:nth-child(even) {
          background: #f8fafc;
        }
        
        /* Text formatting */
        strong {
          font-weight: 700;
          color: #0f172a;
        }
        
        em {
          font-style: italic;
        }
        
        mark {
          background: #fef3c7;
          padding: 0.1em 0.3em;
          border-radius: 3px;
        }
        
        /* Horizontal rules */
        hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 2.5em 0;
        }
        
        /* Links */
        a {
          color: #2563eb;
          text-decoration: none;
          border-bottom: 1px solid #93c5fd;
        }
        
        a:hover {
          color: #1d4ed8;
          border-bottom-color: #60a5fa;
        }
        
        /* KaTeX math rendering */
        .katex {
          font-size: 1.1em;
        }
        
        .katex-display {
          margin: 1.5em 0;
          overflow-x: auto;
          page-break-inside: avoid;
        }
        
        /* Mermaid diagrams */
        .mermaid-diagram {
          margin: 1.5em 0;
          padding: 1em;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          display: flex;
          justify-content: center;
          page-break-inside: avoid;
        }
        
        .mermaid-diagram svg {
          max-width: 100%;
          height: auto;
        }
        
        /* Details/Summary */
        details {
          margin: 1em 0;
          padding: 1em;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          page-break-inside: avoid;
        }
        
        summary {
          font-weight: 600;
          cursor: pointer;
          color: #1e40af;
          margin-bottom: 0.5em;
        }
        
        details[open] summary {
          margin-bottom: 1em;
          border-bottom: 1px solid #cbd5e1;
          padding-bottom: 0.5em;
        }
        
        /* Images */
        img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1em 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          page-break-inside: avoid;
        }
        
        /* Figure elements */
        figure {
          margin: 1.5em 0;
          text-align: center;
          page-break-inside: avoid;
        }
        
        figcaption {
          font-size: 9.5pt;
          color: #64748b;
          font-style: italic;
          margin-top: 0.5em;
        }
        
        /* Task lists */
        input[type="checkbox"] {
          margin-right: 0.5em;
        }
        
        /* Print-specific styles */
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          pre, blockquote, table, figure, .mermaid-diagram {
            page-break-inside: avoid;
          }
          
          h1, h2, h3, h4, h5, h6 {
            page-break-after: avoid;
          }
          
          pre {
            background: #1e293b !important;
            color: #f8fafc !important;
          }
          
          pre code, pre *, .hljs * {
            color: #f8fafc !important;
          }
          
          a {
            color: #2563eb;
            text-decoration: underline;
          }
          
          /* Show URLs for external links */
          a[href^="http"]::after {
            content: " (" attr(href) ")";
            font-size: 8pt;
            color: #64748b;
          }
        }
        
        /* Utility classes */
        .text-center {
          text-align: center;
        }
        
        .text-right {
          text-align: right;
        }
        
        .page-break {
          page-break-after: always;
        }
      </style>
      <!-- Mermaid for diagrams -->
      <script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
      <!-- KaTeX for math rendering -->
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/contrib/auto-render.min.js"></script>
      <!-- Highlight.js for code syntax highlighting -->
      <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/highlight.min.js"></script>
    </head>
    <body>
      <div class="content" id="content">
        ${renderMarkdownToHTML(content)}
      </div>
      
      <script>
        // Initialize Mermaid
        mermaid.initialize({ 
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'loose',
          fontFamily: 'inherit'
        });
        
        // Render all Mermaid diagrams
        async function renderMermaidDiagrams() {
          const mermaidElements = document.querySelectorAll('.language-mermaid');
          for (let i = 0; i < mermaidElements.length; i++) {
            const element = mermaidElements[i];
            const code = element.textContent;
            try {
              const id = 'mermaid-' + i;
              const { svg } = await mermaid.render(id, code);
              const wrapper = document.createElement('div');
              wrapper.className = 'mermaid-diagram';
              wrapper.innerHTML = svg;
              element.parentElement.replaceWith(wrapper);
            } catch (err) {
              console.error('Mermaid rendering failed:', err);
            }
          }
        }
        
        // Render KaTeX math
        function renderMath() {
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
        }
        
        // Apply syntax highlighting
        function highlightCode() {
          document.querySelectorAll('pre code').forEach((block) => {
            if (!block.classList.contains('language-mermaid')) {
              hljs.highlightElement(block);
            }
          });
        }
        
        // Initialize all rendering
        async function initialize() {
          await renderMermaidDiagrams();
          renderMath();
          highlightCode();
          
          // Small delay to ensure everything is rendered before printing
          setTimeout(() => {
            window.print();
          }, 500);
        }
        
        // Start initialization
        initialize();
      </script>
    </body>
    </html>
  `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Auto-close after print or cancel (with delay for user to see the preview)
    printWindow.onafterprint = () => {
        setTimeout(() => {
            printWindow.close();
        }, 500);
    };
}

/**
 * Enhanced markdown to HTML converter with full markdown support
 * Handles GFM, code blocks, tables, lists, and more
 */
function renderMarkdownToHTML(markdown: string): string {
    let html = markdown;

    // First, escape HTML entities (but preserve intentional HTML tags)
    html = html.replace(/&(?!(?:amp|lt|gt|quot|#\d+|#x[\da-fA-F]+);)/g, '&amp;');
    
    // Process code blocks FIRST (before other replacements)
    // Fenced code blocks with language
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        const escapedCode = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .trim();
        return `<pre><code class="language-${lang || 'plaintext'}">${escapedCode}</code></pre>`;
    });
    
    // Inline code (after code blocks)
    html = html.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Headers (with IDs for navigation)
    html = html.replace(/^######\s+(.+)$/gm, '<h6>$1</h6>');
    html = html.replace(/^#####\s+(.+)$/gm, '<h5>$1</h5>');
    html = html.replace(/^####\s+(.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');

    // Bold, italic, strikethrough
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
    html = html.replace(/_(.+?)_/g, '<em>$1</em>');
    html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
    html = html.replace(/==(.+?)==/g, '<mark>$1</mark>');

    // Links - [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    
    // Images - ![alt](url)
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // Blockquotes
    html = html.replace(/^>\s+(.+)$/gm, '<blockquote>$1</blockquote>');
    // Merge consecutive blockquotes
    html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');
    html = html.replace(/^\*\*\*$/gm, '<hr>');
    html = html.replace(/^___$/gm, '<hr>');

    // Tables (GFM style)
    html = html.replace(/(\|.+\|\n)+/g, (match) => {
        const lines = match.trim().split('\n');
        if (lines.length < 2) return match;
        
        const headerLine = lines[0];
        const separatorLine = lines[1];
        const bodyLines = lines.slice(2);
        
        // Check if second line is a separator
        if (!/^\|[\s:-]+\|$/.test(separatorLine)) return match;
        
        const parseRow = (line: string, tag: string) => {
            const cells = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1);
            return '<tr>' + cells.map(cell => `<${tag}>${cell.trim()}</${tag}>`).join('') + '</tr>';
        };
        
        const header = parseRow(headerLine, 'th');
        const body = bodyLines.map(line => parseRow(line, 'td')).join('\n');
        
        return `<table>\n<thead>\n${header}\n</thead>\n<tbody>\n${body}\n</tbody>\n</table>`;
    });

    // Task lists
    html = html.replace(/^- \[([ x])\] (.+)$/gm, (_, checked, text) => {
        const isChecked = checked === 'x' ? 'checked' : '';
        return `<li><input type="checkbox" ${isChecked} disabled> ${text}</li>`;
    });

    // Unordered lists
    html = html.replace(/^[*+-]\s+(.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
    
    // Ordered lists
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
    // This is tricky - we need to avoid matching the list items we already converted
    // So we'll use a more specific pattern
    let listItemMatches = html.match(/<li>(?!.*<\/ul>).*<\/li>/g);
    if (listItemMatches) {
        html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => {
            if (match.includes('<ul>')) return match;
            return '<ol>' + match + '</ol>';
        });
    }

    // Details/Summary (HTML5)
    html = html.replace(/<details>([\s\S]*?)<\/details>/g, (match) => {
        return match; // Keep as-is, already HTML
    });

    // Paragraphs (wrap remaining text that isn't already in a block element)
    const lines = html.split('\n');
    const processedLines = lines.map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        // Check if line is already in a block element
        if (/^<(h[1-6]|ul|ol|li|pre|blockquote|hr|table|thead|tbody|tr|th|td|div|details|summary|figure)/.test(trimmed)) {
            return line;
        }
        if (/^<\/(h[1-6]|ul|ol|li|pre|blockquote|table|thead|tbody|tr|div|details|figure)>/.test(trimmed)) {
            return line;
        }
        if (/<\/(p|li|h[1-6]|pre|blockquote|td|th)>$/.test(trimmed)) {
            return line;
        }
        // Wrap in paragraph
        return `<p>${trimmed}</p>`;
    });
    
    html = processedLines.join('\n');

    // Clean up excessive spacing
    html = html.replace(/<\/p>\s*<p>/g, '</p>\n<p>');
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/\n{3,}/g, '\n\n');

    return html;
}
