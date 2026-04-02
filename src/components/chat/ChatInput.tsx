'use client';

import { useState, useRef, useCallback, useEffect, KeyboardEvent, DragEvent } from 'react';
import { ChatAttachment } from '@/lib/chat-types';

interface ChatInputProps {
  onSend: (content: string, attachments?: ChatAttachment[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

const MAX_FILE_SIZE = 512 * 1024; // 512KB for localStorage friendliness
const ACCEPTED_TYPES = [
  'image/png', 'image/jpeg', 'image/gif', 'image/webp',
  'text/plain', 'text/html', 'text/css', 'text/javascript',
  'application/pdf', 'application/json',
];

function fileToAttachment(file: File): Promise<ChatAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: (reader.result as string).split(',')[1], // strip data:...;base64,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ChatInput({ onSend, onStop, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('');
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [previewFile, setPreviewFile] = useState<ChatAttachment | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'; // max ~5 lines
  }, [value]);

  // Focus input on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed && attachments.length === 0) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setValue('');
    setAttachments([]);
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [value, attachments, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (isStreaming) return;
        handleSend();
      }
      if (e.key === 'Escape' && isStreaming) {
        onStop();
      }
    },
    [handleSend, isStreaming, onStop]
  );

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files);
    for (const file of fileArr) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`${file.name} is too large (max 512KB)`);
        continue;
      }
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert(`${file.name} is not a supported file type`);
        continue;
      }
      const att = await fileToAttachment(file);
      setAttachments((prev) => [...prev, att]);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const insertCodeBlock = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const before = value.slice(0, start);
    const after = value.slice(ta.selectionEnd);
    const insert = '```\n\n```';
    setValue(before + insert + after);
    // Position cursor inside the code block
    setTimeout(() => {
      ta.selectionStart = ta.selectionEnd = start + 4;
      ta.focus();
    }, 0);
  }, [value]);

  const removeAttachment = useCallback((idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const hasContent = value.trim().length > 0 || attachments.length > 0;

  return (
    <div className="px-4 pb-4 pt-2">
      {/* File attachment badges */}
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {attachments.map((att, i) => (
            <span
              key={i}
              className="chat-badge-enter inline-flex items-center gap-1 text-xs bg-sidebar border border-border rounded-md px-2 py-1 text-text-secondary"
            >
              <button
                onClick={() => setPreviewFile(att)}
                className="hover:text-text-primary transition-colors truncate max-w-[120px]"
              >
                {att.name}
              </button>
              <button
                onClick={() => removeAttachment(i)}
                className="text-text-secondary hover:text-danger transition-colors ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input area */}
      <div
        className={`chat-input-wrapper flex flex-col rounded-xl border ${
          isDragOver
            ? 'border-accent bg-accent/5'
            : isFocused
            ? 'border-accent/50 shadow-sm'
            : 'border-border'
        } bg-card-bg`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="w-full resize-none bg-transparent px-4 pt-3 pb-1 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
        />

        {/* Toolbar — always visible when focused or has content */}
        {(isFocused || hasContent || attachments.length > 0) && (
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              {/* Attach file */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                title="Attach file"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
              </button>
              {/* Code block */}
              <button
                onClick={insertCodeBlock}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
                title="Insert code block"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </button>
            </div>

            {/* Send / Stop button */}
            {isStreaming ? (
              <button
                onClick={onStop}
                className="p-1.5 rounded-lg bg-danger text-white hover:bg-danger/90 transition-colors"
                title="Stop generation (Esc)"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="1" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={!hasContent}
                className={`p-1.5 rounded-lg transition-all ${
                  hasContent
                    ? 'bg-accent text-white hover:bg-accent/90 active:scale-95'
                    : 'text-text-secondary/40 cursor-not-allowed'
                }`}
                title="Send (Enter)"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        onChange={(e) => {
          if (e.target.files) handleFiles(e.target.files);
          e.target.value = ''; // reset for re-upload
        }}
      />

      {/* File preview modal */}
      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-card-bg border border-border rounded-xl max-w-lg w-full max-h-[70vh] overflow-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-text-primary truncate">
                {previewFile.name}
              </span>
              <button
                onClick={() => setPreviewFile(null)}
                className="text-text-secondary hover:text-text-primary"
              >
                ×
              </button>
            </div>
            {previewFile.type.startsWith('image/') ? (
              <img
                src={`data:${previewFile.type};base64,${previewFile.data}`}
                alt={previewFile.name}
                className="max-w-full rounded-lg"
              />
            ) : (
              <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap bg-code-bg rounded-lg p-3">
                {atob(previewFile.data).slice(0, 5000)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
