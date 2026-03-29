'use client';

import { useCallback, useState } from 'react';
import { parseFile } from '@/lib/parsers/file';
import { SourceFile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onFilesLoaded: (files: SourceFile[]) => void;
  maxFiles?: number;
}

const ACCEPTED = '.pdf,.pptx,.md,.markdown,.txt,.js,.ts,.jsx,.tsx,.py,.java,.cpp,.c,.h,.css,.html';

export function FileUpload({ onFilesLoaded, maxFiles = 5 }: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const processFiles = useCallback(async (fileList: FileList) => {
    setLoading(true);
    setErrors([]);
    const newFiles = Array.from(fileList).slice(0, maxFiles);
    const sourceFiles: SourceFile[] = [];
    const errs: string[] = [];

    for (const file of newFiles) {
      try {
        const parsed = await parseFile(file);
        sourceFiles.push(parsed);
      } catch (err) {
        errs.push(`${file.name}: ${(err as Error).message}`);
      }
    }

    setFiles(newFiles);
    setErrors(errs);
    onFilesLoaded(sourceFiles);
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
        <label className="cursor-pointer">
          <input
            type="file"
            multiple
            accept={ACCEPTED}
            onChange={handleFileInput}
            className="hidden"
            disabled={loading}
          />
          <span className={cn(
            'inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-white text-text-primary hover:bg-sidebar transition-colors',
            loading && 'opacity-50 cursor-not-allowed'
          )}>
            {loading ? '⏳ Processing...' : '📂 Browse Files'}
          </span>
        </label>
      </div>

      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="text-xs text-danger bg-red-50 px-3 py-1.5 rounded">{err}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">{files.length} file(s) ready</span>
            <button onClick={clearFiles} className="text-xs text-danger hover:underline">Clear all</button>
          </div>
          {files.map((file) => (
            <div key={file.name} className="flex items-center gap-2 text-sm px-3 py-2 bg-sidebar rounded-md border border-border/50">
              <span className="text-base">
                {file.name.endsWith('.pdf') ? '📄' : file.name.endsWith('.pptx') ? '📊' : '📝'}
              </span>
              <span className="flex-1 text-xs text-text-primary truncate">{file.name}</span>
              <span className="text-xs text-text-secondary shrink-0">{formatSize(file.size)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
