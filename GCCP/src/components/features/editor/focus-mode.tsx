'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileText, FileDown, Keyboard, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { exportToPDF } from '@/lib/utils/index';

// ---------------------------------------------------------------------------
// FocusModeOverlay — fullscreen zen mode wrapper for the content area.
// Renders its children (the content area) inside a fixed full-viewport overlay
// with a minimal floating toolbar at the top.
// ---------------------------------------------------------------------------

export function FocusModeOverlay({ children }: { children: React.ReactNode }) {
  const focusMode = useAppStore((s) => s.focusMode);
  const setFocusMode = useAppStore((s) => s.setFocusMode);
  const content = useAppStore((s) => s.content);
  const topic = useAppStore((s) => s.topic);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [serifFont, setSerifFont] = useState(false);

  const exitFocusMode = useCallback(() => {
    setFocusMode(false);
    setShowShortcuts(false);
  }, [setFocusMode]);

  // Escape key exits focus mode
  useEffect(() => {
    if (!focusMode) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          exitFocusMode();
        }
      }
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusMode, exitFocusMode]);

  // Toggle body overflow when focus mode changes
  useEffect(() => {
    if (focusMode) {
      document.body.classList.add('focus-mode-active');
    } else {
      document.body.classList.remove('focus-mode-active');
    }

    return () => {
      document.body.classList.remove('focus-mode-active');
    };
  }, [focusMode]);

  // Word count
  const wordCount = useMemo(() => {
    if (!content) return 0;
    const trimmed = content.trim();
    return trimmed ? trimmed.split(/\s+/).length : 0;
  }, [content]);

  const handleSaveMarkdown = useCallback(() => {
    if (!content) return;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'content'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, topic]);

  const handleExportPdf = useCallback(() => {
    exportToPDF();
  }, []);

  return (
    <AnimatePresence>
      {focusMode && (
        <motion.div
          key="focus-mode-overlay"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] as const }}
          className="fixed inset-0 z-50 flex flex-col bg-background"
        >
          {/* Floating toolbar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
            className="flex items-center justify-between border-b border-border/50 bg-background/95 px-4 py-2 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={exitFocusMode}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                    <span className="hidden sm:inline">Exit Focus Mode</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Exit focus mode (Escape)</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-3">
              {/* Word count */}
              <span className="text-xs text-muted-foreground">
                {wordCount.toLocaleString()} words
              </span>

              {/* Reading font toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSerifFont((prev) => !prev)}
                    className={`gap-1.5 text-muted-foreground hover:text-foreground ${serifFont ? 'bg-muted' : ''}`}
                  >
                    <Type className="size-3.5" />
                    <span className="hidden sm:inline text-xs">
                      {serifFont ? 'Serif' : 'Sans'}
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle reading font</TooltipContent>
              </Tooltip>

              {/* Keyboard shortcuts help */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowShortcuts((prev) => !prev)}
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Keyboard className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Keyboard shortcuts (?)</TooltipContent>
              </Tooltip>

              {/* Export dropdown */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-muted-foreground hover:text-foreground"
                        disabled={!content}
                      >
                        <Download className="size-3.5" />
                        <span className="hidden sm:inline">Export</span>
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Export generated content</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleSaveMarkdown} disabled={!content}>
                    <FileText className="size-4" />
                    Save as .md
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} disabled={!content}>
                    <FileDown className="size-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>

          {/* Content area fills remaining space */}
          <div className={`flex-1 overflow-auto p-4 md:p-6 ${serifFont ? 'focus-mode-serif' : ''}`}>
            <div className="mx-auto h-full max-w-7xl">
              {children}
            </div>
          </div>

          {/* Keyboard shortcuts overlay */}
          <AnimatePresence>
            {showShortcuts && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm"
                onClick={() => setShowShortcuts(false)}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-lg"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="mb-4 text-sm font-semibold">Keyboard Shortcuts</h3>
                  <div className="space-y-2">
                    {[
                      ['Esc', 'Exit focus mode'],
                      ['?', 'Toggle this help'],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{desc}</span>
                        <kbd className="rounded border bg-muted px-2 py-0.5 text-[11px] font-mono">
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                  <p className="mt-4 text-[11px] text-muted-foreground">
                    Press Esc to close
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
