'use client';

import { useCallback, useState } from 'react';
import { parseFile } from '@/lib/parsers/file';
import { SourceFile } from '@/lib/types';
import { cn, getErrorMessage } from '@/lib/utils';

interface FileUploadProps {
  onFilesLoaded: (files: SourceFile[]) => void;
  maxFiles?: number;
}

const ACCEPTED = '.pdf,.pptx,.md,.markdown,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html';

export function FileUpload({ onFilesLoaded, maxFiles = 5 }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  // Parallel array: parsedSources[i] is the parsed result for files[i], or null if parsing failed
  const [parsedSources, setParsedSources] = useState<(SourceFile | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const processFiles = useCallback(async (fileList: FileList) => {
    setLoading(true);
    setErrors([]);
    const newFiles = Array.from(fileList).slice(0, maxFiles);
    const sourceFiles: (SourceFile | null)[] = [];
    const errs: string[] = [];

    for (const file of newFiles) {
      // Item 17: Check file size limit (2MB)
      if (file.size > 2 * 1024 * 1024) {
        errs.push(`${file.name} is too large — max file size is 2 MB`);
        sourceFiles.push(null);
        continue;
      }
      try {
        const parsed = await parseFile(file);
        sourceFiles.push(parsed);
      } catch (err) {
        errs.push(`${file.name}: ${getErrorMessage(err)}`);
        sourceFiles.push(null);
      }
    }

    setFiles(newFiles);
    setParsedSources(sourceFiles);
    setErrors(errs);
    onFilesLoaded(sourceFiles.filter((s): s is SourceFile => s !== null));
    setLoading(false);
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
    setFiles([]);
    setParsedSources([]);
    setErrors([]);
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

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-danger bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded">{err}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">{files.length} file(s) ready</span>
            <button onClick={clearFiles} className="text-xs text-danger hover:underline">Clear all</button>
          </div>
          {files.map((file, fileIndex) => (
            <div key={file.name} className="group flex items-center gap-2 text-sm px-3 py-2 bg-sidebar rounded-md border border-border/50">
              <span className="text-base">
                {file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.pptx') ? '📊' : '📝'}
              </span>
              <span className="flex-1 text-xs text-text-primary truncate">{file.name}</span>
              <span className="text-xs text-text-secondary shrink-0">{formatSize(file.size)}</span>
              <button
                type="button"
                onClick={() => {
                  const newFiles = files.filter((_, i) => i !== fileIndex);
                  const newSources = parsedSources.filter((_, i) => i !== fileIndex);
                  setFiles(newFiles);
                  setParsedSources(newSources);
                  onFilesLoaded(newSources.filter((s): s is SourceFile => s !== null));
                }}
                className="shrink-0 opacity-0 group-hover:opacity-100 ml-1 text-text-secondary hover:text-danger transition-all"
                aria-label={`Remove ${file.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
