'use client';

import { useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

const TOOLBAR_ACTIONS = [
  { label: 'B', title: 'Bold', prefix: '**', suffix: '**' },
  { label: 'I', title: 'Italic', prefix: '_', suffix: '_' },
  { label: 'H2', title: 'Heading 2', prefix: '## ', suffix: '' },
  { label: 'H3', title: 'Heading 3', prefix: '### ', suffix: '' },
  { label: '`', title: 'Inline Code', prefix: '`', suffix: '`' },
  { label: '```', title: 'Code Block', prefix: '```\n', suffix: '\n```' },
  { label: '—', title: 'List Item', prefix: '- ', suffix: '' },
  { label: '1.', title: 'Numbered List', prefix: '1. ', suffix: '' },
  { label: '>', title: 'Blockquote', prefix: '> ', suffix: '' },
  { label: '[L]', title: 'Link', prefix: '[', suffix: '](url)' },
];

export function MarkdownEditor({ value, onChange, className }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = useCallback((prefix: string, suffix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [value, onChange]);

  return (
    <div className={cn('flex flex-col border border-border rounded-md overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-sidebar flex-wrap">
        {TOOLBAR_ACTIONS.map(({ label, title, prefix, suffix }) => (
          <button
            key={label}
            type="button"
            onClick={() => applyFormat(prefix, suffix)}
            title={title}
            className="px-2 py-1 text-xs font-mono text-text-secondary hover:text-text-primary hover:bg-border/60 rounded transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 w-full p-4 text-sm font-mono resize-none focus:outline-none bg-white text-text-primary leading-relaxed min-h-0"
        placeholder="Start writing in markdown..."
        spellCheck={false}
      />
    </div>
  );
}
