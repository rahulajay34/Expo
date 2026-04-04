'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentById, updateContent, deleteContent, StorageFullError } from '@/lib/storage';
import { downloadMarkdown } from '@/lib/export/markdown';
import { downloadPDF } from '@/lib/export/pdf';
import { downloadCSV, parseAssignmentMarkdown } from '@/lib/export/csv';
import { downloadHTML } from '@/lib/export/html';
import { streamCompletion } from '@/lib/ai/client';
import { loadPrompt, fillPrompt } from '@/lib/ai/prompts';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { ExportMenu } from '@/components/ExportMenu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { ContentType, SourceFile, CSVRow } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { countWords, getErrorMessage, copyToClipboard } from '@/lib/utils';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';
import { AssignmentViewer } from '@/components/AssignmentViewer';
import { useGenerationContext } from '@/lib/generation-context';
import { vtName, navigateWithTransition } from '@/lib/view-transitions';
import { useReducedMotion } from 'framer-motion';
import { ContentReveal } from '@/components/ContentReveal';
import { useScrollHeader } from '@/lib/useScrollHeader';
import { StickyHeader } from '@/components/StickyHeader';

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture Notes',
  'pre-lecture': 'Pre-Lecture Notes',
  assignment: 'Assignment',
};

export default function ContentViewerPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [markdown, setMarkdown] = useState('');
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'unsaved' | 'saving' | 'saved'>('idle');
  const initialMarkdownRef = useRef('');
  const initialTitleRef = useRef('');
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const editorTextareaRef = useRef<HTMLTextAreaElement>(null);
  const isSyncingRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSaveRef = useRef<() => void>(() => {});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('lecture');
  const [viewMode, setViewMode] = useState<'preview' | 'split'>('preview');
  const [assignmentView, setAssignmentView] = useState<'preview' | 'interactive'>('interactive');
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const contentProvider = 'minimax' as const;
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [contentSubtopics, setContentSubtopics] = useState<string[]>([]);
  const [contentPrerequisites, setContentPrerequisites] = useState<string[]>([]);
  const { showToast } = useToast();
  const { setIsDirty: setContextDirty } = useGenerationContext();
  const [csvExportProgress, setCsvExportProgress] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { isCompact, titleY, subtitleY, headerOpacity, scrollRef: parallaxScrollRef } = useScrollHeader(100, prefersReducedMotion);

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

  useEffect(() => {
    const item = getContentById(id);
    if (!item) {
      router.push('/content');
      return;
    }
    setMarkdown(item.markdown);
    setTitle(item.title);
    setContentType(item.type);
    setSources(item.sources ?? []);
    setContentSubtopics(item.metadata.subtopics ?? []);
    setContentPrerequisites(item.metadata.prerequisites ?? []);
    initialMarkdownRef.current = item.markdown;
    initialTitleRef.current = item.title;
    setIsLoading(false);
  }, [id, router]);

  // Debounced autosave
  useEffect(() => {
    if (!isDirty || !isEditing) return;
    if (markdown === initialMarkdownRef.current && title === initialTitleRef.current) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    saveTimerRef.current = setTimeout(() => {
      updateContent(id, { markdown, title });
      initialMarkdownRef.current = markdown;
      initialTitleRef.current = title;
      setIsDirty(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 1500);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, isEditing, markdown, title, id]);

  // Sync isDirty to generation context for sidebar nav guard
  useEffect(() => {
    setContextDirty(isDirty);
    return () => setContextDirty(false);
  }, [isDirty, setContextDirty]);

  // beforeunload warning when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Cmd/Ctrl+S to save
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSaveRef.current();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing]);

  // Escape to exit edit mode (auto-saves unsaved changes)
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDirty) {
          handleSaveRef.current();
        }
        setIsEditing(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, isDirty]);

  const handleMarkdownChange = (val: string) => {
    setMarkdown(val);
    if (!isDirty) { setIsDirty(true); setSaveStatus('unsaved'); }
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!isDirty) { setIsDirty(true); setSaveStatus('unsaved'); }
  };

  const handleSave = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setSaveStatus('saving');
    try {
      updateContent(id, { markdown, title });
      initialMarkdownRef.current = markdown;
      initialTitleRef.current = title;
      setIsDirty(false);
      setSaveStatus('saved');
      showToast('Changes saved', 'success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      if (err instanceof StorageFullError) {
        showToast('Storage is full — free up space and try again', 'error');
      } else {
        showToast('Failed to save changes', 'error');
      }
      setSaveStatus('unsaved');
    }
  };

  // Keep ref in sync so keyboard handlers always call the latest closure
  handleSaveRef.current = handleSave;

  const handleCancel = () => {
    const item = getContentById(id);
    if (item) {
      setMarkdown(item.markdown);
      setTitle(item.title);
    }
    setIsEditing(false);
    setIsDirty(false);
  };

  const handleDelete = () => {
    deleteContent(id);
    router.push('/content');
  };

  const handleExportMarkdown = () => {
    try {
      downloadMarkdown(title || 'content', markdown);
      showToast('Markdown file downloaded', 'success');
    } catch {
      showToast('Failed to download Markdown', 'error');
    }
  };
  const handleCopyMarkdown = async () => {
    try {
      await copyToClipboard(markdown);
      showToast('Markdown copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  };
  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      await downloadPDF('markdown-content', title || 'content');
      showToast('PDF exported — check your Downloads folder', 'success');
    } catch {
      showToast('PDF export failed — try again', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };
  const handleExportCSV = () => {
    const rows = parseAssignmentMarkdown(markdown);
    if (rows.length === 0) {
      showToast('No parseable questions found — check that the content uses the structured format', 'info');
      return;
    }
    try {
      downloadCSV(rows, title || 'assignment');
      showToast(`✓ ${rows.length} question${rows.length !== 1 ? 's' : ''} exported to CSV`, 'success');
    } catch {
      showToast('CSV export failed — try again', 'error');
    }
  };

  const handleExportAICSV = async () => {
    const item = getContentById(id);
    if (!item) return;

    showToast('Generating CSV via AI... This may take a few moments.', 'info');

    try {
      const promptTemplate = await loadPrompt('csv_export_prompt.md');
      const content = fillPrompt(promptTemplate, { MARKDOWN_CONTENT: markdown });

      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: 'You are an expert data parsing assistant.' },
        { role: 'user', content }
      ];

      // Request completion
      let fullResponse = '';
      setCsvExportProgress(0);
      await streamCompletion('minimax', messages, (chunk) => {
        if (chunk.delta) {
          fullResponse += chunk.delta;
          setCsvExportProgress(fullResponse.length);
        }
      });

      // Extract JSON array from LLM response
      let jsonStr = fullResponse.trim();
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }

      let rows: unknown[];
      try {
        rows = JSON.parse(jsonStr);
      } catch {
        throw new Error('AI returned malformed JSON — try again or use direct CSV export.');
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('AI produced an empty or invalid CSV array.');
      }

      downloadCSV(rows as CSVRow[], title || 'assignment');
      showToast(`AI CSV exported — ${rows.length} questions exported`, 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast('Failed to export CSV via AI: ' + getErrorMessage(err), 'error');
    }
  };

  const handleExportAICSVWithLoading = async () => {
    setIsExportingCSV(true);
    setCsvExportProgress(0);
    try {
      await handleExportAICSV();
    } finally {
      setIsExportingCSV(false);
      setCsvExportProgress(0);
    }
  };

  const handleExportHTML = async () => {
    try {
      await downloadHTML(title || 'content');
      showToast('HTML file downloaded', 'success');
    } catch {
      showToast('Failed to download HTML', 'error');
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        {/* Skeleton header */}
        <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border shrink-0">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-4 w-28 ml-auto" />
        </div>
        {/* Skeleton body */}
        <div className="flex-1 overflow-hidden">
          <div className="max-w-4xl mx-auto px-8 py-8 space-y-6">
            {/* Title */}
            <Skeleton className="h-8 w-3/4" />
            {/* Metadata badges */}
            <div className="flex gap-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-full" />
            </div>
            {/* Paragraph lines */}
            <div className="space-y-3 pt-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-11/12" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            {/* Code/diagram block */}
            <Skeleton className="h-36 w-full rounded-lg" />
            {/* More paragraph lines */}
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = countWords(markdown);
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <div className="h-full flex flex-col">
      {!isEditing && <ReadingProgressBar />}
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-border bg-background shrink-0 gap-2 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <Link
            href="/content"
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
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-base sm:text-lg font-semibold bg-transparent border-b border-accent/40 focus:outline-none focus:border-accent pb-0.5 text-text-primary"
                placeholder="Untitled"
                autoFocus
              />
            ) : (
              <h1 className="text-base sm:text-lg font-semibold text-text-primary truncate" style={{ viewTransitionName: vtName('title', id) }}>{title || 'Untitled'}</h1>
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
          <Badge variant={contentType as 'lecture' | 'pre-lecture' | 'assignment'} style={{ viewTransitionName: vtName('badge', id) }}>
            {TYPE_LABELS[contentType] ?? contentType}
          </Badge>
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
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1.5 text-xs transition-colors ${viewMode === 'preview' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setViewMode('split')}
                  className={`px-2.5 py-1.5 text-xs transition-colors border-l border-border ${viewMode === 'split' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
                >
                  Split
                </button>
              </div>
              <Button variant="secondary" size="sm" onClick={handleCancel}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!isDirty}>
                {isDirty ? 'Save Changes' : 'Saved'}
              </Button>
            </>
          ) : (
            <>
              {/* Assignment view switcher */}
              {contentType === 'assignment' && (
                <div className="hidden sm:flex items-center border border-border rounded-md overflow-hidden">
                  <button
                    onClick={() => setAssignmentView('interactive')}
                    className={`px-2.5 py-1.5 text-xs transition-colors ${assignmentView === 'interactive' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
                  >
                    Interactive
                  </button>
                  <button
                    onClick={() => setAssignmentView('preview')}
                    className={`px-2.5 py-1.5 text-xs transition-colors border-l border-border ${assignmentView === 'preview' ? 'bg-sidebar text-text-primary' : 'text-text-secondary hover:bg-sidebar/50'}`}
                  >
                    Preview
                  </button>
                </div>
              )}
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} aria-label="Edit content">
                ✏ Edit
              </Button>
              <ExportMenu
                onExportMarkdown={handleExportMarkdown}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onExportAICSV={handleExportAICSVWithLoading}
                onExportHTML={handleExportHTML}
                onCopyMarkdown={handleCopyMarkdown}
                isExportingAI={isExportingCSV}
                isExportingPDF={isExportingPDF}
                showCSV={contentType === 'assignment'}
              />
              {/* More actions overflow menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setMoreMenuOpen((prev) => !prev)}
                  className="p-1.5 text-text-secondary hover:text-text-primary rounded border border-border hover:border-accent/40 transition-colors"
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
                  <div className="absolute right-0 top-full mt-1 w-44 bg-background border border-border rounded-lg shadow-lg py-1 z-20">
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
                        setShowDeleteModal(true);
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
      </header>

      {/* AI CSV export progress banner */}
      {isExportingCSV && (
        <div className="px-6 py-2 border-b border-border bg-purple-50 dark:bg-purple-950/20 flex items-center gap-3 shrink-0">
          <span className="w-3 h-3 border-2 border-purple-500 border-t-transparent rounded-full animate-spin shrink-0" />
          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">
            AI parsing content{csvExportProgress > 0 ? ` — ${csvExportProgress.toLocaleString()} chars processed` : '...'}
          </span>
          <div className="flex-1 h-1 bg-purple-200 dark:bg-purple-900/40 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full animate-progress-pulse-origin" />
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isEditing ? (
          viewMode === 'split' ? (
            <div className="h-full flex gap-0 divide-x divide-border">
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary label="Editor failed to load">
                  <MarkdownEditor
                    value={markdown}
                    onChange={handleMarkdownChange}
                    className="h-full rounded-none border-0"
                    provider={contentProvider}
                    contentType={contentType}
                    topic={title}
                    scrollRef={editorTextareaRef}
                    onScroll={(scrollTop, scrollHeight, clientHeight) => {
                      if (isSyncingRef.current) return;
                      isSyncingRef.current = true;
                      const el = previewScrollRef.current;
                      if (el) {
                        const pct = scrollTop / (scrollHeight - clientHeight || 1);
                        el.scrollTop = pct * (el.scrollHeight - el.clientHeight);
                      }
                      requestAnimationFrame(() => { isSyncingRef.current = false; });
                    }}
                  />
                </ErrorBoundary>
              </div>
              <div
                ref={previewScrollRef}
                className="flex-1 overflow-auto p-4"
                onScroll={(e) => {
                  if (isSyncingRef.current) return;
                  isSyncingRef.current = true;
                  const src = e.currentTarget;
                  const el = editorTextareaRef.current;
                  if (el) {
                    const pct = src.scrollTop / (src.scrollHeight - src.clientHeight || 1);
                    el.scrollTop = pct * (el.scrollHeight - el.clientHeight);
                  }
                  requestAnimationFrame(() => { isSyncingRef.current = false; });
                }}
              >
                <ErrorBoundary label="Preview failed to render">
                  <MarkdownPreview content={markdown} id="markdown-content" />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <ErrorBoundary label="Editor failed to load">
              <MarkdownEditor value={markdown} onChange={handleMarkdownChange} className="h-full" provider={contentProvider} contentType={contentType} topic={title} />
            </ErrorBoundary>
          )
        ) : contentType === 'assignment' && assignmentView === 'interactive' ? (
          <ContentReveal className="h-full">
            <ErrorBoundary label="Assignment viewer failed to render">
              <AssignmentViewer markdown={markdown} />
            </ErrorBoundary>
          </ContentReveal>
        ) : (
          <div className="h-full overflow-auto" ref={parallaxScrollRef}>
            {/* Sticky compact header for preview scroll */}
            <StickyHeader isVisible={isCompact} className="px-4 sm:px-6">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2 min-w-0">
                  <Link
                    href="/content"
                    className="text-text-secondary hover:text-text-primary shrink-0"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateWithTransition(() => router.push('/content'));
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </Link>
                  <span className="text-sm font-semibold text-text-primary truncate max-w-[200px] sm:max-w-md">{title || 'Untitled'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} aria-label="Edit content">
                    ✏ Edit
                  </Button>
                  <ExportMenu
                    onExportMarkdown={handleExportMarkdown}
                    onExportPDF={handleExportPDF}
                    onExportCSV={handleExportCSV}
                    onExportAICSV={handleExportAICSVWithLoading}
                    onExportHTML={handleExportHTML}
                    onCopyMarkdown={handleCopyMarkdown}
                    isExportingAI={isExportingCSV}
                    isExportingPDF={isExportingPDF}
                    showCSV={contentType === 'assignment'}
                  />
                </div>
              </div>
            </StickyHeader>

            <ContentReveal className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
              <ErrorBoundary label="Preview failed to render">
                <MarkdownPreview content={markdown} id="markdown-content" />
              </ErrorBoundary>
            </ContentReveal>
          </div>
        )}
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Content"
      >
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete <strong>&ldquo;{title || 'Untitled'}&rdquo;</strong>?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
