import { useState, useRef, useEffect } from 'react';
import { FileDown, ChevronDown, Loader2, Check, AlertCircle } from 'lucide-react';
import { ExportFormat } from '@/lib/mcp/pandoc-service';

interface ExportDropdownProps {
  content: string;
  title: string;
  disabled?: boolean;
  onExportComplete?: () => void;
}

interface FormatOption {
  format: ExportFormat | 'pdf-browser';
  label: string;
  description: string;
  icon: string;
  serverRequired?: boolean;
  browserOnly?: boolean;
}

const FORMATS: FormatOption[] = [
  { format: 'markdown', label: 'Markdown', description: 'Plain text .md file', icon: '📝' },
  { format: 'pdf-browser', label: 'PDF (Browser)', description: 'Client-side PDF generation', icon: '📄', browserOnly: true },
  { format: 'pdf', label: 'PDF (Server)', description: 'High-quality LaTeX PDF', icon: '📄', serverRequired: true },
  { format: 'docx', label: 'Word', description: 'Microsoft Word .docx', icon: '📘', serverRequired: true },
  { format: 'html', label: 'HTML', description: 'Standalone web page', icon: '🌐', serverRequired: true },
  { format: 'latex', label: 'LaTeX', description: 'Academic typesetting', icon: '📐', serverRequired: true },
];

export function ExportDropdown({ content, title, disabled, onExportComplete }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check server availability on mount
  useEffect(() => {
    fetch('/api/export')
      .then(res => res.json())
      .then(data => setServerAvailable(data.pandocInstalled))
      .catch(() => setServerAvailable(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset status after a delay
  useEffect(() => {
    if (exportStatus !== 'idle') {
      const timer = setTimeout(() => {
        setExportStatus('idle');
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportStatus]);

  /**
   * Client-side PDF generation using browser print dialog
   * Most reliable approach - works on Vercel and all browsers
   */
  const exportPDFBrowser = async () => {
    const { marked } = await import('marked');
    
    // Configure marked
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
    
    // Convert markdown to HTML
    let htmlBody = await marked.parse(content);
    
    // Convert mermaid code blocks to proper mermaid div format
    // marked outputs: <pre><code class="language-mermaid">...</code></pre>
    // mermaid.js expects: <div class="mermaid">...</div>
    htmlBody = htmlBody.replace(
      /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
      '<div class="mermaid">$1</div>'
    );
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      throw new Error('Please allow popups to export PDF');
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <!-- KaTeX for LaTeX rendering -->
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
        <!-- Mermaid for diagrams -->
        <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
        <style>
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
          body {
            font-family: Georgia, 'Times New Roman', serif;
            line-height: 1.7;
            color: #222;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
          }
          h1, h2, h3, h4, h5 { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            color: #111;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            page-break-after: avoid;
          }
          h1 { font-size: 28px; border-bottom: 2px solid #333; padding-bottom: 8px; }
          h2 { font-size: 22px; border-bottom: 1px solid #ddd; padding-bottom: 6px; }
          h3 { font-size: 18px; }
          h4 { font-size: 16px; }
          p { margin: 1em 0; orphans: 3; widows: 3; }
          code { 
            background: #f5f5f5; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'SF Mono', Monaco, Menlo, Consolas, monospace; 
            font-size: 0.9em; 
          }
          pre { 
            background: #f5f5f5; 
            padding: 16px; 
            border-radius: 6px; 
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
            page-break-inside: avoid;
          }
          pre code { background: none; padding: 0; }
          blockquote { 
            border-left: 4px solid #0066cc; 
            margin: 1em 0;
            padding-left: 16px; 
            color: #555;
            font-style: italic;
          }
          ul, ol { padding-left: 24px; margin: 1em 0; }
          li { margin: 0.35em 0; }
          table { border-collapse: collapse; width: 100%; margin: 1em 0; page-break-inside: avoid; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #f5f5f5; font-weight: 600; }
          hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
          a { color: #0066cc; text-decoration: none; }
          strong { font-weight: 600; }
          em { font-style: italic; }
          img { max-width: 100%; height: auto; }
          .mermaid { background: white; text-align: center; margin: 1em 0; }
        </style>
      </head>
      <body>
        ${htmlBody}
        <script>
          // Initialize Mermaid
          mermaid.initialize({ startOnLoad: true, theme: 'default' });
          
          // Render KaTeX after content loads
          document.addEventListener('DOMContentLoaded', function() {
            if (typeof renderMathInElement !== 'undefined') {
              renderMathInElement(document.body, {
                delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false},
                  {left: '\\\\[', right: '\\\\]', display: true},
                  {left: '\\\\(', right: '\\\\)', display: false}
                ],
                throwOnError: false
              });
            }
          });
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content and scripts to render (KaTeX, Mermaid)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Trigger print dialog (user can "Save as PDF")
    printWindow.print();
    
    // Close window after print dialog
    printWindow.onafterprint = () => printWindow.close();
  };

  const handleExport = async (format: ExportFormat | 'pdf-browser') => {
    if (!content || isExporting) return;
    
    setIsExporting(true);
    setIsOpen(false);
    setErrorMessage(null);

    try {
      if (format === 'markdown') {
        // Client-side markdown export
        const blob = new Blob([content], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportStatus('success');
      } else if (format === 'pdf-browser') {
        // Client-side PDF using html2pdf.js - works on Vercel!
        await exportPDFBrowser();
        setExportStatus('success');
      } else {
        // Server-side conversion (requires Pandoc)
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, format, title })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Export failed');
        }

        // Download the file
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Get filename from content-disposition or generate one
        const disposition = response.headers.get('content-disposition');
        const filenameMatch = disposition?.match(/filename="(.+?)"/);
        a.download = filenameMatch?.[1] || `${title.replace(/\s+/g, '_')}.${format}`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportStatus('success');
      }

      onExportComplete?.();
    } catch (error: any) {
      console.error('Export error:', error);
      setExportStatus('error');
      setErrorMessage(error.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || !content}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 transform-gpu active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${exportStatus === 'success' 
            ? 'text-green-700 bg-green-50 border-green-200' 
            : exportStatus === 'error'
            ? 'text-red-700 bg-red-50 border-red-200'
            : 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100'}`}
      >
        {isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : exportStatus === 'success' ? (
          <Check size={14} />
        ) : exportStatus === 'error' ? (
          <AlertCircle size={14} />
        ) : (
          <FileDown size={14} />
        )}
        {isExporting ? 'Exporting...' : exportStatus === 'success' ? 'Downloaded!' : 'Export'}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-60 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Export As</span>
          </div>
          
          {FORMATS.map((opt) => {
            const isDisabled = opt.serverRequired && !serverAvailable;
            const showRecommended = opt.format === 'pdf-browser' && !serverAvailable;
            return (
              <button
                key={opt.format}
                onClick={() => handleExport(opt.format)}
                disabled={isDisabled}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                  ${isDisabled 
                    ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                    : 'hover:bg-blue-50 cursor-pointer'}
                  ${showRecommended ? 'bg-blue-50' : ''}`}
              >
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    {opt.label}
                    {showRecommended && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Recommended</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {isDisabled ? 'Pandoc not available' : opt.description}
                  </div>
                </div>
              </button>
            );
          })}

          {serverAvailable === false && (
            <div className="px-3 py-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                💡 PDF (Browser) works everywhere including Vercel
              </p>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="absolute z-50 mt-1 right-0 w-64 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}

