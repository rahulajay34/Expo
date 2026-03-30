'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getContentById, updateContent, deleteContent } from '@/lib/storage';
import { downloadMarkdown } from '@/lib/export/markdown';
import { downloadPDF } from '@/lib/export/pdf';
import { downloadCSV, parseAssignmentMarkdown } from '@/lib/export/csv';
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
import { ContentType, AIProvider } from '@/lib/types';
import { Skeleton } from '@/components/ui/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contentType, setContentType] = useState<ContentType>('lecture');
  const [viewMode, setViewMode] = useState<'preview' | 'split'>('preview');
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [contentProvider, setContentProvider] = useState<AIProvider>('openai');
  const { showToast } = useToast();

  useEffect(() => {
    const item = getContentById(id);
    if (!item) {
      router.push('/content');
      return;
    }
    setMarkdown(item.markdown);
    setTitle(item.title);
    setContentType(item.type);
    setContentProvider(item.provider);
  }, [id, router]);

  const handleMarkdownChange = (val: string) => {
    setMarkdown(val);
    setIsDirty(true);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    setIsDirty(true);
  };

  const handleSave = () => {
    updateContent(id, { markdown, title });
    setIsDirty(false);
    showToast('Changes saved', 'success');
  };

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

  const handleExportMarkdown = () => downloadMarkdown(title || 'content', markdown);
  const handleExportPDF = () => downloadPDF('markdown-content', title || 'content');
  const handleExportCSV = () => {
    const rows = parseAssignmentMarkdown(markdown);
    if (rows.length === 0) {
      alert('No parseable questions found. Make sure the content uses the structured format (e.g., **Question 1 (MCQ)**).');
      return;
    }
    downloadCSV(rows, title || 'assignment');
  };

  const handleExportAICSV = async () => {
    const item = getContentById(id);
    if (!item) return;

    setIsExportingCSV(true);
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
      await streamCompletion(item.provider, messages, (chunk) => {
        if (chunk.delta) fullResponse += chunk.delta;
      });

      // Extract JSON array from LLM response
      let jsonStr = fullResponse.trim();
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }

      const rows = JSON.parse(jsonStr);
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('AI produced an empty or invalid CSV array.');
      }
      
      downloadCSV(rows, title || 'assignment');
      showToast('AI CSV Exported successfully!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Failed to export CSV via AI: ' + err.message, 'error');
    } finally {
      setIsExportingCSV(false);
    }
  };

  if (!markdown && !title) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6">
        <div className="space-y-4 w-64">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
        <div className="space-y-3 w-80">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
        <p className="text-sm text-text-secondary">Loading...</p>
      </div>
    );
  }

  const wordCount = markdown.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-white shrink-0 gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link href="/content" className="text-text-secondary hover:text-text-primary shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-lg font-semibold bg-transparent border-b border-accent/40 focus:outline-none focus:border-accent pb-0.5 text-text-primary"
                placeholder="Untitled"
                autoFocus
              />
            ) : (
              <h1 className="text-lg font-semibold text-text-primary truncate">{title || 'Untitled'}</h1>
            )}
          </div>
          <Badge variant={contentType as 'lecture' | 'pre-lecture' | 'assignment'}>
            {TYPE_LABELS[contentType] ?? contentType}
          </Badge>
          <span className="text-xs text-text-secondary shrink-0 hidden sm:block">
            {wordCount.toLocaleString()} words
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isEditing ? (
            <>
              {/* View mode toggle */}
              <div className="flex items-center border border-border rounded-md overflow-hidden">
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
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                ✏ Edit
              </Button>
              <ExportMenu
                onExportMarkdown={handleExportMarkdown}
                onExportPDF={handleExportPDF}
                onExportCSV={handleExportCSV}
                onExportAICSV={isExportingCSV ? undefined : handleExportAICSV}
                showCSV={contentType === 'assignment'}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="text-danger hover:bg-red-50 hover:text-danger"
              >
                Delete
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isEditing ? (
          viewMode === 'split' ? (
            <div className="h-full flex gap-0 divide-x divide-border">
              <div className="flex-1 overflow-hidden">
                <ErrorBoundary label="Editor failed to load">
                  <MarkdownEditor value={markdown} onChange={handleMarkdownChange} className="h-full rounded-none border-0" provider={contentProvider} />
                </ErrorBoundary>
              </div>
              <div className="flex-1 overflow-auto p-6">
                <ErrorBoundary label="Preview failed to render">
                  <MarkdownPreview content={markdown} id="markdown-content" />
                </ErrorBoundary>
              </div>
            </div>
          ) : (
            <div className="h-full p-6">
              <ErrorBoundary label="Editor failed to load">
                <MarkdownEditor value={markdown} onChange={handleMarkdownChange} className="h-full" provider={contentProvider} />
              </ErrorBoundary>
            </div>
          )
        ) : (
          <div className="h-full overflow-auto">
            <div className="max-w-4xl mx-auto px-8 py-8">
              <ErrorBoundary label="Preview failed to render">
                <MarkdownPreview content={markdown} id="markdown-content" />
              </ErrorBoundary>
            </div>
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
