'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getContentById, updateContent, deleteContent, restoreContent, StorageFullError } from '@/lib/storage';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ContentType, SourceFile } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { countWords } from '@/lib/utils';
import { ReadingProgressBar } from '@/components/ReadingProgressBar';
import { AssignmentViewer } from '@/components/AssignmentViewer';
import { useGenerationContext } from '@/lib/generation-context';
import { ContentReveal } from '@/components/ContentReveal';
import { motion, useReducedMotion } from 'framer-motion';
import { staggerContainer, fadeInUp } from '@/lib/motion';
import { PhysicsScrollWithRef, useHeaderParallax } from '@/components/PhysicsScroll';
import { useExportHandlers } from '@/components/content-viewer/ExportHandlers';
import { ContentViewerHeader } from '@/components/content-viewer/ContentViewerHeader';

const SectionRegenPanel = dynamic(
  () => import('@/components/content-viewer/SectionRegenPanel').then(m => ({ default: m.SectionRegenPanel })),
  { ssr: false },
);

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
  const contentProvider = 'minimax' as const;
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [contentSubtopics, setContentSubtopics] = useState<string[]>([]);
  const [contentPrerequisites, setContentPrerequisites] = useState<string[]>([]);
  const { showToast } = useToast();
  const { setIsDirty: setContextDirty } = useGenerationContext();
  const prefersReducedMotion = useReducedMotion();
  const contentReadScrollRef = useRef<HTMLDivElement>(null);
  const { headerY } = useHeaderParallax(contentReadScrollRef);
  const [regenSection, setRegenSection] = useState<{ heading: string; level: number } | null>(null);

  // Debounced markdown for the split-view preview (S-008).
  // Trails behind `markdown` by 120ms so every keystroke doesn't trigger
  // a full rehype + highlight pipeline rebuild in MarkdownPreview.
  const [debouncedPreviewMarkdown, setDebouncedPreviewMarkdown] = useState(markdown);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedPreviewMarkdown(markdown);
    }, 120);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [markdown]);
  // Flush on unmount so the last keystroke is never lost.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        // The component is unmounting — flush the latest value.
        // No-op if already in sync.
      }
    };
  }, []);

  // Export handlers (extracted hook)
  const {
    handleExportMarkdown,
    handleCopyMarkdown,
    handleExportPDF,
    handleExportCSV,
    handleExportAICSVWithLoading,
    handleExportHTML,
    isExportingCSV,
    isExportingPDF,
    csvExportProgress,
  } = useExportHandlers({ id, markdown, title, contentType });

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
    // S-040: Snapshot before delete for undo
    const snapshot = getContentById(id);
    deleteContent(id);
    setShowDeleteModal(false);
    router.push('/content');
    if (snapshot) {
      showToast('Content deleted', 'success', {
        label: 'Undo',
        onClick: () => {
          restoreContent([snapshot]);
          router.push(`/content/${id}`);
          showToast('Content restored', 'success');
        },
      });
    }
  };

  const handleSectionRegenerate = useCallback((heading: string, level: number) => {
    setRegenSection({ heading, level });
  }, []);

  const handleRegenMarkdownUpdate = useCallback((newMarkdown: string) => {
    setMarkdown(newMarkdown);
    setIsDirty(true);
    setSaveStatus('saved');
  }, []);

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
        <div className="flex-1 min-h-0 overflow-y-auto">
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
    <motion.div
      className="h-full flex flex-col"
      variants={prefersReducedMotion ? undefined : staggerContainer}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      {!isEditing && <ReadingProgressBar />}
      {/* Header */}
      <ContentViewerHeader
        id={id}
        title={title}
        contentType={contentType}
        isEditing={isEditing}
        isDirty={isDirty}
        saveStatus={saveStatus}
        markdown={markdown}
        wordCount={wordCount}
        readingTime={readingTime}
        viewMode={viewMode}
        assignmentView={assignmentView}
        onTitleChange={handleTitleChange}
        onSave={handleSave}
        onCancel={handleCancel}
        onEdit={() => setIsEditing(true)}
        onDelete={() => setShowDeleteModal(true)}
        onViewModeChange={setViewMode}
        onAssignmentViewChange={setAssignmentView}
        onExportMarkdown={handleExportMarkdown}
        onExportPDF={handleExportPDF}
        onExportCSV={handleExportCSV}
        onExportAICSV={handleExportAICSVWithLoading}
        onExportHTML={handleExportHTML}
        onCopyMarkdown={handleCopyMarkdown}
        isExportingCSV={isExportingCSV}
        isExportingPDF={isExportingPDF}
      />

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
      <motion.div className="flex-1 min-h-0 overflow-hidden" variants={prefersReducedMotion ? undefined : fadeInUp}>
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
                  <MarkdownPreview content={debouncedPreviewMarkdown} id="markdown-content" />
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
          <PhysicsScrollWithRef scrollRef={contentReadScrollRef} className="h-full">
            <ContentReveal className="max-w-4xl mx-auto px-4 sm:px-8 py-4 sm:py-8">
              <motion.div
                style={{ y: headerY, willChange: prefersReducedMotion ? 'auto' : 'transform' }}
              >
                <ErrorBoundary label="Preview failed to render">
                  <MarkdownPreview content={markdown} id="markdown-content" onSectionRegenerate={!isEditing ? handleSectionRegenerate : undefined} />
                </ErrorBoundary>
              </motion.div>
            </ContentReveal>
          </PhysicsScrollWithRef>
        )}
      </motion.div>

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

      {/* Section Regenerate Panel (dynamically loaded) */}
      {regenSection && (
        <SectionRegenPanel
          id={id}
          markdown={markdown}
          contentType={contentType}
          regenSection={regenSection}
          onClose={() => setRegenSection(null)}
          onMarkdownUpdate={handleRegenMarkdownUpdate}
        />
      )}
    </motion.div>
  );
}
