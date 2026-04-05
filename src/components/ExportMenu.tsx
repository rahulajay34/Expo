'use client';

import { useState, useRef, useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from './ui/Button';
import {
  dropdownVariants,
  staggerContainer,
  staggerItem,
  reducedMotionTransition,
} from '@/lib/motion';

interface ExportMenuProps {
  onExportMarkdown: () => void;
  onExportPDF: () => void;
  onExportCSV?: () => void;
  onExportAICSV?: () => void;
  onExportHTML?: () => void;
  onCopyMarkdown?: () => void;
  showCSV?: boolean;
  isExportingAI?: boolean;
  isExportingPDF?: boolean;
}

/* ── Inline SVG file-type icons (18x18, stroke-based) ── */

const MarkdownIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 shrink-0">
    <rect x="2" y="1.5" width="14" height="15" rx="2" />
    <path d="M5.5 12V6l2.5 3 2.5-3v6" />
    <line x1="13" y1="9.5" x2="13" y2="12" />
    <polyline points="11.5 10.5 13 12 14.5 10.5" />
  </svg>
);

const PDFIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 shrink-0">
    <path d="M11 1.5H4a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 4 16.5h10a1.5 1.5 0 0 0 1.5-1.5V6L11 1.5Z" />
    <polyline points="11 1.5 11 6 15.5 6" />
    <text x="9" y="13" textAnchor="middle" fill="currentColor" stroke="none" fontSize="5" fontWeight="700" fontFamily="system-ui">PDF</text>
  </svg>
);

const PDFSpinnerIcon = () => (
  <span className="w-[18px] h-[18px] flex items-center justify-center shrink-0">
    <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
  </span>
);

const CSVIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-green-500 shrink-0">
    <rect x="2" y="1.5" width="14" height="15" rx="2" />
    <line x1="2" y1="6" x2="16" y2="6" />
    <line x1="2" y1="10.5" x2="16" y2="10.5" />
    <line x1="7" y1="1.5" x2="7" y2="16.5" />
    <line x1="11.5" y1="1.5" x2="11.5" y2="16.5" />
  </svg>
);

const AICSVIcon = () => (
  <span className="relative shrink-0" style={{ width: 18, height: 18 }}>
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
      <rect x="2" y="1.5" width="14" height="15" rx="2" />
      <line x1="2" y1="6" x2="16" y2="6" />
      <line x1="2" y1="10.5" x2="16" y2="10.5" />
      <line x1="7" y1="1.5" x2="7" y2="16.5" />
      <line x1="11.5" y1="1.5" x2="11.5" y2="16.5" />
    </svg>
    {/* sparkle overlay */}
    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" className="absolute -top-1 -right-1 text-purple-400">
      <path d="M5 0l1.1 3.1L9.2 3.5 7 5.8l.7 3.2L5 7.4 2.3 9l.7-3.2L.8 3.5l3.1-.4z" />
    </svg>
  </span>
);

const HTMLIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500 shrink-0">
    <polyline points="5.5 4.5 2 9 5.5 13.5" />
    <polyline points="12.5 4.5 16 9 12.5 13.5" />
    <line x1="10" y1="3" x2="8" y2="15" />
  </svg>
);

const ClipboardIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary shrink-0">
    <rect x="5" y="3" width="10" height="13" rx="1.5" />
    <path d="M3 14.5V4.5A1.5 1.5 0 0 1 4.5 3" />
    <rect x="3" y="2" width="10" height="13" rx="1.5" />
    <line x1="6" y1="7" x2="10" y2="7" />
    <line x1="6" y1="10" x2="10" y2="10" />
  </svg>
);

export function ExportMenu({ onExportMarkdown, onExportPDF, onExportCSV, onExportAICSV, onExportHTML, onCopyMarkdown, showCSV, isExportingAI, isExportingPDF }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

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
    action();
    setOpen(false);
  };

  const exportOptions: { icon: React.ReactNode; label: string; desc: string; action: () => void }[] = [
    {
      icon: <MarkdownIcon />,
      label: 'Markdown (.md)',
      desc: 'Raw markdown file',
      action: () => { onExportMarkdown(); },
    },
    {
      icon: isExportingPDF ? <PDFSpinnerIcon /> : <PDFIcon />,
      label: isExportingPDF ? 'PDF — exporting...' : 'PDF (.pdf)',
      desc: 'Print-ready document',
      action: () => { if (!isExportingPDF) onExportPDF(); },
    },
    ...(showCSV && onExportCSV ? [{
      icon: <CSVIcon />,
      label: 'CSV (.csv)',
      desc: 'For LMS import',
      action: () => { onExportCSV!(); },
    }] : []),
    ...(showCSV && onExportAICSV ? [{
      icon: <AICSVIcon />,
      label: 'CSV via AI (.csv)',
      desc: 'Smart, robust parsing',
      action: () => { onExportAICSV!(); },
    }] : []),
    ...(onExportHTML ? [{
      icon: <HTMLIcon />,
      label: 'HTML (.html)',
      desc: 'Web-ready document',
      action: () => { onExportHTML!(); },
    }] : []),
    ...(onCopyMarkdown ? [{
      icon: <ClipboardIcon />,
      label: 'Copy as Markdown',
      desc: 'Copy to clipboard',
      action: () => { onCopyMarkdown!(); },
    }] : []),
  ];

  const motionOverrides = prefersReducedMotion ? { transition: reducedMotionTransition } : {};

  return (
    <div ref={menuRef} className="relative">
      <Button variant="secondary" size="sm" onClick={() => isExportingAI ? null : setOpen(!open)} disabled={isExportingAI} aria-label="Export content" aria-haspopup="true" aria-expanded={open}>
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

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-full mt-1 w-52 glass-panel rounded-lg z-20 overflow-hidden"
            style={{ transformOrigin: 'top center' }}
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            {...motionOverrides}
          >
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
            >
              {exportOptions.map(({ icon, label, desc, action }) => (
                <motion.button
                  key={label}
                  variants={staggerItem}
                  onClick={() => handleItemClick(action)}
                  className="export-item w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-sidebar dark:hover:bg-[rgba(255,255,255,0.04)] transition-colors border-b border-border last:border-0"
                >
                  <span className="export-icon flex items-center justify-center w-[18px] h-[18px]">{icon}</span>
                  <div>
                    <div className="text-sm font-medium text-text-primary">{label}</div>
                    <div className="text-xs text-text-secondary">{desc}</div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
