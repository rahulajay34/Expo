'use client';

import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatTranscript } from '@/lib/utils/index';

const ACCEPTED_EXTENSIONS = ['.txt', '.srt', '.vtt'];
const ACCEPTED_MIME_TYPES = ['text/plain', 'application/x-subrip', 'text/vtt'];

interface TranscriptDropZoneProps {
  onFileContent: (content: string, fileName: string) => void;
  disabled?: boolean;
}

/**
 * Returns true if the file extension is .srt or .vtt
 */
function isSubtitleFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith('.srt') || lower.endsWith('.vtt');
}

/**
 * Validates that the file has an accepted extension
 */
function isAcceptedFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => lower.endsWith(ext));
}

export function TranscriptDropZone({ onFileContent, disabled }: TranscriptDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      if (!isAcceptedFile(file.name)) {
        setError('Unsupported file type. Please upload a .txt, .srt, or .vtt file.');
        return;
      }

      setError(null);

      const reader = new FileReader();
      reader.onload = (event) => {
        let text = event.target?.result as string;

        // Auto-format subtitle files to extract just the text
        if (isSubtitleFile(file.name)) {
          text = formatTranscript(text);
        }

        setUploadedFileName(file.name);
        onFileContent(text, file.name);
      };
      reader.onerror = () => {
        setError('Failed to read the file. Please try again.');
      };
      reader.readAsText(file);
    },
    [onFileContent]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [disabled, processFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [processFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-all duration-200',
          isDragOver
            ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/30'
            : 'border-muted-foreground/25 bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/50',
          disabled && 'pointer-events-none opacity-50'
        )}
      >
        <Upload
          className={cn(
            'size-6 transition-colors',
            isDragOver
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-muted-foreground'
          )}
        />
        <div>
          <p
            className={cn(
              'text-sm font-medium transition-colors',
              isDragOver
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground'
            )}
          >
            Drop a transcript file here or click to upload
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground/70">
            Supports .txt, .srt, and .vtt files
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME_TYPES].join(',')}
          onChange={handleFileChange}
          className="hidden"
          tabIndex={-1}
        />
      </div>

      {/* Uploaded file indicator */}
      {uploadedFileName && !error && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
        >
          <FileCheck className="size-3" />
          Loaded: {uploadedFileName}
        </motion.div>
      )}

      {/* Error message */}
      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}
