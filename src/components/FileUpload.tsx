'use client';

import { useCallback, useState } from 'react';
import { parseFile } from '@/lib/parsers/file';
import { SourceFile } from '@/lib/types';
import { cn, getErrorMessage } from '@/lib/utils';

interface FileUploadProps {
  onFilesLoaded: (files: SourceFile[]) => void;
  maxFiles?: number;
}

type FileStatus = 'pending' | 'processing' | 'done' | 'error';

interface FileState {
  file: File;
  status: FileStatus;
  error?: string;
  parsed: SourceFile | null;
}

const ACCEPTED = '.pdf,.pptx,.md,.markdown,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html';

export function FileUpload({ onFilesLoaded, maxFiles = 5 }: FileUploadProps) {
  const [fileStates, setFileStates] = useState<FileState[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const loading = fileStates.some((fs) => fs.status === 'pending' || fs.status === 'processing');

  const processFiles = useCallback(async (fileList: FileList) => {
    const newFiles = Array.from(fileList).slice(0, maxFiles);

    // Initialize all files as pending
    const initialStates: FileState[] = newFiles.map((file) => ({
      file,
      status: 'pending',
      parsed: null,
    }));
    setFileStates(initialStates);

    const resultStates: FileState[] = [...initialStates];

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];

      // Mark as processing
      resultStates[i] = { ...resultStates[i], status: 'processing' };
      setFileStates([...resultStates]);

      // Item 17: Check file size limit (2MB)
      if (file.size > 2 * 1024 * 1024) {
        resultStates[i] = {
          ...resultStates[i],
          status: 'error',
          error: `${file.name} is too large — max file size is 2 MB`,
          parsed: null,
        };
        setFileStates([...resultStates]);
        continue;
      }

      try {
        const parsed = await parseFile(file);
        resultStates[i] = { ...resultStates[i], status: 'done', parsed };
        setFileStates([...resultStates]);
      } catch (err) {
        resultStates[i] = {
          ...resultStates[i],
          status: 'error',
          error: getErrorMessage(err),
          parsed: null,
        };
        setFileStates([...resultStates]);
      }
    }

    onFilesLoaded(resultStates.map((s) => s.parsed).filter((s): s is SourceFile => s !== null));
  }, [maxFiles, onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
  }, [processFiles]);

  const clearFiles = () => {
    setFileStates([]);
    onFilesLoaded([]);
  };

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-all duration-150',
          dragOver ? 'border-accent bg-accent/5 scale-[1.01]' : 'border-border hover:border-accent/40 hover:bg-sidebar/50'
        )}
      >
        <div className="text-2xl mb-2">📁</div>
        <p className="text-sm text-text-secondary mb-1">
          {loading ? 'Processing files...' : 'Drop files here or click to browse'}
        </p>
        <p className="text-xs text-text-secondary mb-3">PDF, PPTX, Markdown, text, and code files</p>
        <label className={cn('cursor-pointer', loading && 'pointer-events-none select-none')}>
          <input
            type="file"
            multiple
            accept={ACCEPTED}
            onChange={handleFileInput}
            className="hidden"
            disabled={loading}
          />
          <span className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background text-text-primary hover:bg-sidebar transition-colors',
            loading && 'opacity-50 cursor-not-allowed'
          )}>
            {loading && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                className="animate-spin"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            )}
            {loading ? 'Processing...' : '📂 Browse Files'}
          </span>
        </label>
      </div>

      {fileStates.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              {fileStates.filter((fs) => fs.status === 'done').length}/{fileStates.length} file(s) ready
            </span>
            <button onClick={clearFiles} className="text-xs text-danger hover:underline">Clear all</button>
          </div>
          {fileStates.map((fs, fileIndex) => (
            <div
              key={fs.file.name + fileIndex}
              className={cn(
                'group flex flex-col gap-1 px-3 py-2 rounded-md border',
                fs.status === 'error'
                  ? 'bg-red-50 dark:bg-red-950/20 border-danger/30'
                  : 'bg-sidebar border-border/50'
              )}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="text-base">
                  {fs.file.name.endsWith('.pdf') ? '📄' : fs.file.name.endsWith('.pptx') ? '📊' : '📝'}
                </span>
                <span className="flex-1 text-xs text-text-primary truncate">{fs.file.name}</span>
                <span className="text-xs text-text-secondary shrink-0">{formatSize(fs.file.size)}</span>
                {/* Per-file status icon */}
                {fs.status === 'pending' && (
                  <span className="shrink-0 w-4 h-4 rounded-full border border-border bg-border/30" aria-label="Pending" />
                )}
                {fs.status === 'processing' && (
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round"
                    className="shrink-0 animate-spin text-accent"
                    aria-label="Processing"
                  >
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                )}
                {fs.status === 'done' && (
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 text-success"
                    aria-label="Done"
                  >
                    <path d="M3 7.5l2.5 2.5L11 4.5" />
                  </svg>
                )}
                {fs.status === 'error' && (
                  <svg
                    width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
                    strokeWidth="2.5" strokeLinecap="round"
                    className="shrink-0 text-danger"
                    aria-label="Error"
                  >
                    <path d="M3 3l8 8M11 3l-8 8" />
                  </svg>
                )}
                {(fs.status === 'done' || fs.status === 'error') && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = fileStates.filter((_, i) => i !== fileIndex);
                      setFileStates(next);
                      onFilesLoaded(next.map((s) => s.parsed).filter((s): s is SourceFile => s !== null));
                    }}
                    className="shrink-0 opacity-0 group-hover:opacity-100 ml-1 text-text-secondary hover:text-danger transition-all"
                    aria-label={`Remove ${fs.file.name}`}
                  >
                    ×
                  </button>
                )}
              </div>
              {fs.status === 'error' && fs.error && (
                <p className="text-xs text-danger pl-6">{fs.error}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
