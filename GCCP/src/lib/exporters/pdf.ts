/**
 * PDF Export utility using browser's print API
 * Generates a properly styled PDF from markdown content
 */

interface PDFExportOptions {
    title?: string;
    author?: string;
    filename?: string;
}

/**
 * Creates a print-friendly HTML document and opens print dialog
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

    // Build HTML with proper styling - NO header/footer, starts directly with content
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
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
        }
        
        h2 {
          font-size: 18pt;
          color: #2c5282;
          margin-top: 1.5em;
          page-break-after: avoid;
        }
        
        h3 {
          font-size: 14pt;
          color: #2d3748;
          margin-top: 1.2em;
          page-break-after: avoid;
        }
        
        h4 {
          font-size: 12pt;
          color: #4a5568;
          margin-top: 1em;
        }
        
        p {
          margin: 0.8em 0;
          text-align: justify;
        }
        
        code {
          background: #edf2f7;
          padding: 0.2em 0.4em;
          border-radius: 3px;
          font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
          font-size: 10pt;
          color: #1a202c;
        }
        
        pre {
          background: #2d3748;
          color: #f7fafc;
          padding: 1em;
          border-radius: 8px;
          overflow-x: auto;
          page-break-inside: avoid;
          font-size: 10pt;
          line-height: 1.5;
        }
        
        pre code {
          background: none;
          padding: 0;
          color: #f7fafc;
          font-size: 10pt;
        }
        
        /* Ensure ALL text in code blocks is visible - white text */
        pre * {
          color: #f7fafc !important;
        }
        
        ul, ol {
          margin: 0.8em 0;
          padding-left: 1.5em;
        }
        
        li {
          margin: 0.4em 0;
        }
        
        blockquote {
          border-left: 4px solid #3182ce;
          margin: 1em 0;
          padding: 0.5em 1em;
          background: #ebf8ff;
          font-style: italic;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
          page-break-inside: avoid;
        }
        
        th, td {
          border: 1px solid #e2e8f0;
          padding: 0.6em;
          text-align: left;
        }
        
        th {
          background: #edf2f7;
          font-weight: 600;
        }
        
        strong {
          font-weight: 700;
        }
        
        em {
          font-style: italic;
        }
        
        hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 2em 0;
        }
        
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          pre {
            background: #2d3748 !important;
            color: #f7fafc !important;
          }
          
          pre code, pre * {
            color: #f7fafc !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="content">
        ${parseMarkdownToHTML(content)}
      </div>
    </body>
    </html>
  `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
        // Give time for print dialog before closing
        setTimeout(() => {
            printWindow.close();
        }, 1000);
    };
}

/**
 * Simple markdown to HTML converter for PDF export
 * Handles basic markdown syntax
 */
function parseMarkdownToHTML(markdown: string): string {
    let html = markdown;

    // Escape HTML entities first
    html = html
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Code blocks (must be before inline code)
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang || 'text'}">${code.trim()}</code></pre>`;
    });

    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Blockquotes
    html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

    // Unordered lists
    html = html.replace(/^\* (.+)$/gm, '<li>$1</li>');
    html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    // Ordered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Horizontal rules
    html = html.replace(/^---$/gm, '<hr>');

    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

    // Paragraphs (wrap remaining text)
    html = html.split('\n\n').map(block => {
        if (block.trim() && !block.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr)/)) {
            return `<p>${block.trim()}</p>`;
        }
        return block;
    }).join('\n');

    // Clean up empty paragraphs
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}
