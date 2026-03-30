'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { AIProvider } from '@/lib/types';
import { InlineAIPopover } from './InlineAIPopover';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  provider?: AIProvider;
}

interface PopoverState {
  visible: boolean;
  text: string;
  selectionStart: number;
  selectionEnd: number;
  position: { top: number; left: number };
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

/** Returns the first provider that has a saved API key, or 'openai' as fallback. */
function resolveProvider(preferred?: AIProvider): AIProvider {
  if (typeof window === 'undefined') return preferred ?? 'openai';
  if (preferred) return preferred;
  const providers: AIProvider[] = ['openai', 'minimax', 'gemini', 'xai'];
  for (const p of providers) {
    if (localStorage.getItem(`news13n_apikey_${p}`)) return p;
  }
  return 'openai';
}

export function MarkdownEditor({ value, onChange, className, provider: providerProp }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    text: '',
    selectionStart: 0,
    selectionEnd: 0,
    position: { top: 0, left: 0 },
  });

  const [activeProvider, setActiveProvider] = useState<AIProvider>('openai');
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [rippleButton, setRippleButton] = useState<string | null>(null);

  // Resolve provider once on mount (client-only)
  useEffect(() => {
    setActiveProvider(resolveProvider(providerProp));
  }, [providerProp]);

  // Detect which format button is active based on cursor position
  const detectActiveButton = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const pos = textarea.selectionStart;
    const text = value;

    // Bold: within **...**
    const boldBefore = text.lastIndexOf('**', pos - 1);
    const boldAfter = text.indexOf('**', pos);
    if (boldBefore !== -1 && boldAfter !== -1 && boldBefore < pos && boldAfter >= pos) {
      setActiveButton('B');
      return;
    }

    // Italic: within _..._
    const italicBefore = text.lastIndexOf('_', pos - 1);
    const italicAfter = text.indexOf('_', pos);
    if (italicBefore !== -1 && italicAfter !== -1 && italicBefore < pos && italicAfter >= pos) {
      setActiveButton('I');
      return;
    }

    // Inline code: within `...`
    const codeBefore = text.lastIndexOf('`', pos - 1);
    const codeAfter = text.indexOf('`', pos);
    if (codeBefore !== -1 && codeAfter !== -1 && codeBefore < pos && codeAfter >= pos) {
      setActiveButton('`');
      return;
    }

    // Code block: within ```...```
    const cbBefore = text.lastIndexOf('```', pos - 1);
    const cbAfter = text.indexOf('```', pos);
    if (cbBefore !== -1 && cbAfter !== -1 && cbBefore < pos && cbAfter >= pos) {
      setActiveButton('```');
      return;
    }

    // Link: within [...](...)
    const linkBefore = text.lastIndexOf('[', pos - 1);
    const linkAfter = text.indexOf('](', pos);
    const linkClose = text.indexOf(')', pos);
    if (linkBefore !== -1 && linkAfter !== -1 && linkClose !== -1 &&
        linkBefore < pos && linkAfter < linkClose && linkAfter >= linkBefore) {
      setActiveButton('[L]');
      return;
    }

    // Get current line start
    const lineStart = text.lastIndexOf('\n', pos - 1) + 1;
    const lineEnd = text.indexOf('\n', pos);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);

    if (line.startsWith('### ')) { setActiveButton('H3'); return; }
    if (line.startsWith('## ')) { setActiveButton('H2'); return; }
    if (line.startsWith('- ')) { setActiveButton('—'); return; }
    if (/^\d+\. /.test(line)) { setActiveButton('1.'); return; }
    if (line.startsWith('> ')) { setActiveButton('>'); return; }

    setActiveButton(null);
  }, [value]);

  const applyFormat = useCallback((prefix: string, suffix: string, label: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end);
    const newValue = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(newValue);

    // Trigger ripple effect
    setRippleButton(label);
    setTimeout(() => setRippleButton(null), 300);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 0);
  }, [value, onChange]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.slice(start, end);

    // Detect active button state (cursor inside formatting syntax)
    detectActiveButton();

    if (selectedText.length <= 10) {
      setPopover((prev) => ({ ...prev, visible: false }));
      return;
    }

    // Position the popover near the mouse cursor, but keep it on-screen
    const POPOVER_WIDTH = 360;
    const POPOVER_OFFSET_Y = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = e.clientX;
    let top = e.clientY + POPOVER_OFFSET_Y;

    // Clamp horizontally so popover doesn't overflow viewport
    if (left + POPOVER_WIDTH > viewportWidth - 8) {
      left = viewportWidth - POPOVER_WIDTH - 8;
    }
    if (left < 8) left = 8;

    // If it would overflow bottom, show above cursor instead
    const POPOVER_ESTIMATE_HEIGHT = 180;
    if (top + POPOVER_ESTIMATE_HEIGHT > viewportHeight - 8) {
      top = e.clientY - POPOVER_ESTIMATE_HEIGHT - POPOVER_OFFSET_Y;
    }

    setPopover({
      visible: true,
      text: selectedText,
      selectionStart: start,
      selectionEnd: end,
      position: { top, left },
    });
  }, [value, detectActiveButton]);

  const handleReplace = useCallback((newText: string) => {
    const { selectionStart, selectionEnd } = popover;
    const newValue = value.slice(0, selectionStart) + newText + value.slice(selectionEnd);
    onChange(newValue);

    // Restore cursor after the inserted text
    const newCursorPos = selectionStart + newText.length;
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setPopover((prev) => ({ ...prev, visible: false }));
  }, [popover, value, onChange]);

  const handleClose = useCallback(() => {
    setPopover((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className={cn('flex flex-col border border-border rounded-md overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-sidebar flex-wrap">
        {TOOLBAR_ACTIONS.map(({ label, title, prefix, suffix }) => (
          <button
            key={label}
            type="button"
            onClick={() => applyFormat(prefix, suffix, label)}
            title={title}
            className={cn(
              'toolbar-btn px-2 py-1 text-xs font-mono rounded transition-colors',
              activeButton === label
                ? 'bg-indigo-100 border border-indigo-300 text-indigo-700'
                : 'text-text-secondary hover:text-text-primary hover:bg-border/60',
              rippleButton === label ? 'ripple' : ''
            )}
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
        onMouseUp={handleMouseUp}
        onKeyUp={detectActiveButton}
        className="flex-1 w-full p-4 text-sm font-mono resize-none focus:outline-none bg-white text-text-primary leading-relaxed min-h-0"
        placeholder="Start writing in markdown..."
        spellCheck={false}
      />

      {/* Inline AI Popover */}
      {popover.visible && (
        <InlineAIPopover
          selectedText={popover.text}
          position={popover.position}
          provider={activeProvider}
          onReplace={handleReplace}
          onClose={handleClose}
        />
      )}
    </div>
  );
}
