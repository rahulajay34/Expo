'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';

interface ExportMenuProps {
  onExportMarkdown: () => void;
  onExportPDF: () => void;
  onExportCSV?: () => void;
  onExportAICSV?: () => void;
  showCSV?: boolean;
  isExportingAI?: boolean;
}

export function ExportMenu({ onExportMarkdown, onExportPDF, onExportCSV, onExportAICSV, showCSV, isExportingAI }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleItemClick = (action: () => void) => {
    setClosing(true);
    setTimeout(() => {
      action();
      setClosing(false);
      setOpen(false);
    }, 100);
  };

  const exportOptions = [
    {
      icon: '📄',
      label: 'Markdown (.md)',
      desc: 'Raw markdown file',
      action: () => { onExportMarkdown(); },
    },
    {
      icon: '📕',
      label: 'PDF (.pdf)',
      desc: 'Print-ready document',
      action: () => { onExportPDF(); },
    },
    ...(showCSV && onExportCSV ? [{
      icon: '📊',
      label: 'CSV (.csv)',
      desc: 'For LMS import',
      action: () => { onExportCSV!(); },
    }] : []),
    ...(showCSV && onExportAICSV ? [{
      icon: '✨',
      label: 'CSV via AI (.csv)',
      desc: 'Smart, robust parsing',
      action: () => { onExportAICSV!(); },
    }] : []),
  ];

  return (
    <div ref={menuRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => isExportingAI ? null : setOpen(!open)} disabled={isExportingAI}>
        {isExportingAI ? (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Exporting...
          </span>
        ) : (
          <>
            Export
            <svg className="ml-1.5 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </>
        )}
      </Button>

      {open && (
        <div className={closing ? 'absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-border shadow-lg z-20 overflow-hidden dropdown-closing' : 'absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-border shadow-lg z-20 overflow-hidden dropdown-animate'}>
          {exportOptions.map(({ icon, label, desc, action }, index) => (
            <button
              key={label}
              onClick={() => handleItemClick(action)}
              className="export-item w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sidebar transition-colors border-b border-border last:border-0"
              style={{ animationDelay: `${index * 30}ms` }}
            >
              <span className="export-icon text-lg leading-none">{icon}</span>
              <div>
                <div className="text-sm font-medium text-text-primary">{label}</div>
                <div className="text-xs text-text-secondary">{desc}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
