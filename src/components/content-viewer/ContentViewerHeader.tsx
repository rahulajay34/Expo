'use client';

import { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ExportMenu } from '@/components/ExportMenu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { copyToClipboard } from '@/lib/utils';
import { vtName, navigateWithTransition } from '@/lib/view-transitions';
import { motion, useReducedMotion } from 'framer-motion';
import { fadeInUp } from '@/lib/motion';
import { ContentType } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture Notes',
  'pre-lecture': 'Pre-Lecture Notes',
  assignment: 'Assignment',
  'ta-guide': 'TA Session Guide',
};

interface ContentViewerHeaderProps {
  id: string;
  title: string;
  contentType: ContentType;
  isEditing: boolean;
  isDirty: boolean;
  saveStatus: 'idle' | 'unsaved' | 'saving' | 'saved';
  markdown: string;
  wordCount: number;
  readingTime: number;
  viewMode: 'preview' | 'split';
  assignmentView: 'preview' | 'interactive';
  onTitleChange: (val: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onViewModeChange: (mode: 'preview' | 'split') => void;
  onAssignmentViewChange: (mode: 'preview' | 'interactive') => void;
  // Export handlers
  onExportMarkdown: () => void;
  onExportPDF: () => Promise<void>;
  onExportCSV: () => void;
  onExportAICSV: () => Promise<void>;
  onExportHTML: () => Promise<void>;
  onCopyMarkdown: () => Promise<void>;
  isExportingCSV: boolean;
  isExportingPDF: boolean;
}

export function ContentViewerHeader({
  id,
  title,
  contentType,
  isEditing,
  isDirty,
  saveStatus,
  markdown,
  wordCount,
  readingTime,
  viewMode,
  assignmentView,
  onTitleChange,
  onSave,
  onCancel,
  onEdit,
  onDelete,
  onViewModeChange,
  onAssignmentViewChange,
  onExportMarkdown,
  onExportPDF,
  onExportCSV,
  onExportAICSV,
  onExportHTML,
  onCopyMarkdown,
  isExportingCSV,
  isExportingPDF,
}: ContentViewerHeaderProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Close overflow menu on outside click
  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [moreMenuOpen]);

  return (
    <motion.header
      className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-background shrink-0 gap-2 sm:gap-4"
      variants={prefersReducedMotion ? undefined : fadeInUp}
    >
      <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
        <Link
          href="/content"
          title="Back to library"
          className="text-text-secondary hover:text-text-primary shrink-0 min-w-[44px] min-h-[44px] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
          onClick={(e) => {
            e.preventDefault();
            navigateWithTransition(() => router.push('/content'));
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Link>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              className="w-full text-base sm:text-lg font-bold bg-transparent border-b border-accent/40 focus:outline-none focus:border-accent pb-0.5 text-text-primary"
              placeholder="Untitled"
              autoFocus
            />
          ) : (
            <h1 className="text-base sm:text-lg font-bold text-text-primary truncate" style={{ viewTransitionName: vtName('title', id) }}>{title || 'Untitled'}</h1>
          )}
          {isEditing && (
            <div className="flex items-center gap-1 mt-0.5 h-4">
              <span
                className={`text-xs flex items-center gap-1 transition-all duration-300 ease-in-out ${
                  saveStatus === 'idle'
                    ? 'opacity-0'
                    : saveStatus === 'unsaved'
                      ? 'opacity-70 text-text-secondary'
                      : saveStatus === 'saving'
                        ? 'opacity-70 text-text-secondary'
                        : 'opacity-70 text-text-secondary'
                }`}
              >
                {saveStatus === 'saving' && (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-secondary animate-pulse" />
                    Saving...
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-text-secondary" />
                    Editing...
                  </>
                )}
                {saveStatus === 'saved' && (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-secondary">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    All changes saved
                  </>
                )}
              </span>
            </div>
          )}
        </div>
        <Badge variant={contentType as 'lecture' | 'pre-lecture' | 'assignment' | 'ta-guide'} style={{ viewTransitionName: vtName('badge', id) }}>
          {TYPE_LABELS[contentType] ?? contentType}
        </Badge>
        {/* Save status badge */}
        {saveStatus !== 'idle' && (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full shrink-0 transition-all duration-300 ${
              saveStatus === 'saved'
                ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400'
                : saveStatus === 'saving'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
            }`}
          >
            {saveStatus === 'saved' && (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Saved
              </>
            )}
            {saveStatus === 'unsaved' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 dark:bg-amber-400" />
                Unsaved changes
              </>
            )}
            {saveStatus === 'saving' && (
              <>
                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            )}
          </span>
        )}
        <span className="text-xs text-text-secondary shrink-0 hidden sm:block">
          {wordCount.toLocaleString()} words · ~{readingTime} min read
        </span>
      </div>


      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
        {isEditing ? (
          <>
            {/* View mode toggle (hidden on mobile - no split view on small screens) */}
            <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden">
              <button
                onClick={() => onViewModeChange('preview')}
                className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'preview' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
              >
                Preview
              </button>
              <button
                onClick={() => onViewModeChange('split')}
                className={`px-2.5 py-1.5 text-xs transition-colors border-l border-border ${viewMode === 'split' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
              >
                Split
              </button>
            </div>
            <Button variant="secondary" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave} disabled={!isDirty}>
              {isDirty ? 'Save Changes' : 'Saved'}
            </Button>
          </>
        ) : (
          <>
            {/* Assignment view switcher */}
            {contentType === 'assignment' && (
              <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden">
                <button
                  onClick={() => onAssignmentViewChange('interactive')}
                  className={`px-2.5 py-1.5 text-xs transition-colors ${assignmentView === 'interactive' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
                >
                  Interactive
                </button>
                <button
                  onClick={() => onAssignmentViewChange('preview')}
                  className={`px-2.5 py-1.5 text-xs transition-colors border-l border-border ${assignmentView === 'preview' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
                >
                  Preview
                </button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit} aria-label="Edit content">
              ✏ Edit
            </Button>
            <ExportMenu
              onExportMarkdown={onExportMarkdown}
              onExportPDF={onExportPDF}
              onExportCSV={onExportCSV}
              onExportAICSV={onExportAICSV}
              onExportHTML={onExportHTML}
              onCopyMarkdown={onCopyMarkdown}
              isExportingAI={isExportingCSV}
              isExportingPDF={isExportingPDF}
              showCSV={contentType === 'assignment'}
            />
            {/* More actions overflow menu */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setMoreMenuOpen((prev) => !prev)}
                className="p-1.5 text-text-secondary hover:text-text-primary rounded border border-border hover:border-accent/40 transition-colors"
                title="More actions"
                aria-label="More actions"
                aria-expanded={moreMenuOpen}
                aria-haspopup="true"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="12" cy="5" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="19" r="2" />
                </svg>
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-background dark:bg-surface-2 border border-border rounded-lg shadow-lg dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] dark:border-[rgba(255,255,255,0.08)] py-1 z-20">
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar/50 transition-colors"
                    aria-label="Copy content"
                    onClick={async () => {
                      setMoreMenuOpen(false);
                      try {
                        await copyToClipboard(markdown);
                        showToast('Content copied to clipboard', 'success');
                      } catch {
                        showToast('Failed to copy to clipboard', 'error');
                      }
                    }}
                  >
                    📋 Copy
                  </button>
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar/50 transition-colors"
                    aria-label="Regenerate content"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      router.push(`/?regenerate=${id}`);
                    }}
                  >
                    🔄 Regenerate
                  </button>
                  <div className="border-t border-border my-1" />
                  <button
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                    aria-label="Delete content"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      onDelete();
                    }}
                  >
                    🗑 Delete
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </motion.header>
  );
}
