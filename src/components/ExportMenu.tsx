'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/Button';

interface ExportMenuProps {
  onExportMarkdown: () => void;
  onExportPDF: () => void;
  onExportCSV?: () => void;
  showCSV?: boolean;
}

export function ExportMenu({ onExportMarkdown, onExportPDF, onExportCSV, showCSV }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
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

  const exportOptions = [
    {
      icon: '📄',
      label: 'Markdown (.md)',
      desc: 'Raw markdown file',
      action: () => { onExportMarkdown(); setOpen(false); },
    },
    {
      icon: '📕',
      label: 'PDF (.pdf)',
      desc: 'Print-ready document',
      action: () => { onExportPDF(); setOpen(false); },
    },
    ...(showCSV && onExportCSV ? [{
      icon: '📊',
      label: 'CSV (.csv)',
      desc: 'For LMS import',
      action: () => { onExportCSV(); setOpen(false); },
    }] : []),
  ];

  return (
    <div ref={menuRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => setOpen(!open)}>
        Export
        <svg className="ml-1.5 w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-lg border border-border shadow-lg z-20 overflow-hidden animate-fade-in">
          {exportOptions.map(({ icon, label, desc, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sidebar transition-colors border-b border-border last:border-0"
            >
              <span className="text-lg leading-none">{icon}</span>
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
