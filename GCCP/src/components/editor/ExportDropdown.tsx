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
   * Client-side PDF generation using html2pdf.js
   * Works without any server dependencies - perfect for Vercel
   */
  const exportPDFBrowser = async () => {
    // Dynamically import to avoid SSR issues
    const html2pdf = (await import('html2pdf.js')).default;
    
    // Convert markdown to simple HTML for PDF
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: 'Georgia', serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #333;
    }
    h1, h2, h3, h4 { font-family: 'Helvetica Neue', sans-serif; color: #1a1a1a; margin-top: 1.5em; }
    h1 { font-size: 2em; border-bottom: 2px solid #333; padding-bottom: 0.3em; }
    h2 { font-size: 1.5em; border-bottom: 1px solid #ddd; padding-bottom: 0.2em; }
    h3 { font-size: 1.2em; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: 'Menlo', monospace; font-size: 0.9em; }
    pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 20px; color: #666; }
    ul, ol { padding-left: 25px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background: #f4f4f4; font-weight: 600; }
    hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
  </style>
</head>
<body>
  ${markdownToHtml(content)}
</body>
</html>`;

    const container = document.createElement('div');
    container.innerHTML = htmlContent;
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    document.body.appendChild(container);

    const opt = {
      margin: [15, 15, 15, 15] as [number, number, number, number],
      filename: `${title.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const }
    };

    try {
      await html2pdf().set(opt).from(container).save();
    } finally {
      document.body.removeChild(container);
    }
  };

  /**
   * Simple markdown to HTML converter for PDF export
   */
  const markdownToHtml = (md: string): string => {
    let html = md
      // Headers
      .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Horizontal rules
      .replace(/^---$/gim, '<hr>')
      // Lists (basic)
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Line breaks
      .replace(/\n/g, '<br>');
    
    return `<p>${html}</p>`;
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

