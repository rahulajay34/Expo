'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { cn, countWords } from '@/lib/utils';
import { AIProvider } from '@/lib/types';
import { InlineAIPopover } from './InlineAIPopover';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  provider?: AIProvider;
  contentType?: string;
  topic?: string;
  onScroll?: (scrollTop: number, scrollHeight: number, clientHeight: number) => void;
  scrollRef?: React.RefObject<HTMLTextAreaElement | null>;
}

interface PopoverState {
  visible: boolean;
  text: string;
  selectionStart: number;
  selectionEnd: number;
  position: { top: number; left: number };
}

const INSERT_TABLE = 'insert-table';

interface ToolbarAction {
  label: string;
  title: string;
  prefix?: string;
  suffix?: string;
  action?: (() => void) | string;
}

const TOOLBAR_GROUPS: ToolbarAction[][] = [
  // Group 1: Text formatting
  [
    { label: 'B', title: 'Bold', prefix: '**', suffix: '**' },
    { label: 'I', title: 'Italic', prefix: '_', suffix: '_' },
  ],
  // Group 2: Headings
  [
    { label: 'H2', title: 'Heading 2', prefix: '## ', suffix: '' },
    { label: 'H3', title: 'Heading 3', prefix: '### ', suffix: '' },
  ],
  // Group 3: Code
  [
    { label: '`', title: 'Inline Code', prefix: '`', suffix: '`' },
    { label: '```', title: 'Code Block', prefix: '```\n', suffix: '\n```' },
  ],
  // Group 4: Lists
  [
    { label: '\u2014', title: 'List Item', prefix: '- ', suffix: '' },
    { label: '1.', title: 'Numbered List', prefix: '1. ', suffix: '' },
  ],
  // Group 5: Blocks / Insert
  [
    { label: '>', title: 'Blockquote', prefix: '> ', suffix: '' },
    { label: '[L]', title: 'Link', prefix: '[', suffix: '](url)' },
    { label: 'TBL', title: 'Insert Table', action: INSERT_TABLE },
  ],
];

function extractDocumentOutline(fullText: string): string {
  const headings = fullText.split('\n')
    .filter(line => /^#{1,4}\s+/.test(line))
    .slice(0, 15); // Cap at 15 headings to avoid bloating the prompt
  return headings.join('\n');
}

function extractSurroundingSections(
  fullText: string,
  selStart: number,
  selEnd: number,
): { sectionBefore: string; sectionAfter: string } {
  // Split into sections by heading boundaries
  const headingRegex = /^#{1,6}\s+/m;
  const lines = fullText.split('\n');

  // Find section boundaries (line indices where headings start)
  const boundaries: number[] = [0];
  let charPos = 0;
  for (let i = 0; i < lines.length; i++) {
    if (i > 0 && headingRegex.test(lines[i])) {
      boundaries.push(charPos);
    }
    charPos += lines[i].length + 1; // +1 for newline
  }
  boundaries.push(fullText.length);

  // Find which section the selection starts in
  let selSectionIdx = 0;
  for (let i = 0; i < boundaries.length - 1; i++) {
    if (selStart >= boundaries[i] && selStart < boundaries[i + 1]) {
      selSectionIdx = i;
      break;
    }
  }

  // Get one section before and one section after
  const sectionBefore = selSectionIdx > 0
    ? fullText.slice(boundaries[selSectionIdx - 1], boundaries[selSectionIdx]).trim()
    : '';

  const afterIdx = selSectionIdx + 1;
  const sectionAfter = afterIdx < boundaries.length - 1
    ? fullText.slice(boundaries[afterIdx], boundaries[afterIdx + 1]).trim()
    : '';

  // Cap each section at 1000 chars to avoid prompt bloat
  return {
    sectionBefore: sectionBefore.slice(-1000),
    sectionAfter: sectionAfter.slice(0, 1000),
  };
}

/**
 * Ensures the AI replacement text preserves key markdown structural elements
 * from the original selection. If the original had headers, code blocks, or
 * list prefixes that the replacement dropped, re-add them.
 */
function preserveMarkdownStructure(original: string, replacement: string): string {
  let result = replacement;

  // 1. Preserve leading markdown headers (##, ###, ####)
  // If original starts with a header line but replacement doesn't, prepend it
  const headerMatch = original.match(/^(#{1,6}\s+[^\n]*)\n/);
  if (headerMatch) {
    const headerLine = headerMatch[1];
    // Check if replacement already starts with a similar header
    const replacementHasHeader = /^#{1,6}\s+/.test(result.trim());
    if (!replacementHasHeader) {
      result = headerLine + '\n\n' + result.trimStart();
    }
  }

  // 2. Preserve code block fencing
  // If original starts with ```<lang> and ends with ```, but replacement doesn't have them
  const codeBlockStart = original.match(/^(```\w*)\n/);
  const codeBlockEnd = original.match(/\n```\s*$/);
  if (codeBlockStart && codeBlockEnd) {
    const hasStartFence = /^```\w*\n/.test(result.trim());
    const hasEndFence = /\n```\s*$/.test(result.trim());
    if (!hasStartFence && !hasEndFence) {
      // Replacement is just the code content — re-wrap it
      result = codeBlockStart[1] + '\n' + result.trim() + '\n```';
    }
  }

  // 3. Preserve mermaid block fencing
  const mermaidStart = original.match(/^(```mermaid)\n/);
  const mermaidEnd = original.match(/\n```\s*$/);
  if (mermaidStart && mermaidEnd) {
    const hasMermaidFence = /^```mermaid\n/.test(result.trim());
    if (!hasMermaidFence) {
      result = '```mermaid\n' + result.trim() + '\n```';
    }
  }

  // 4. Preserve blockquote structure
  // If every non-empty line in original starts with "> " but replacement doesn't
  const originalLines = original.split('\n').filter(l => l.trim());
  const allBlockquote = originalLines.length > 0 && originalLines.every(l => l.startsWith('> '));
  if (allBlockquote) {
    const resultLines = result.split('\n');
    const needsBlockquote = !resultLines.some(l => l.startsWith('> '));
    if (needsBlockquote) {
      result = resultLines.map(l => l.trim() ? `> ${l}` : l).join('\n');
    }
  }

  // 5. Preserve list structure prefix
  // If original is entirely a list (every non-empty line starts with "- " or "N. "),
  // and replacement dropped the list markers, re-add them
  const allBulletList = originalLines.length > 0 && originalLines.every(l => /^[-*]\s/.test(l));
  if (allBulletList) {
    const resultLines = result.split('\n').filter(l => l.trim());
    const hasBullets = resultLines.some(l => /^[-*]\s/.test(l));
    if (!hasBullets && resultLines.length > 0) {
      result = resultLines.map(l => `- ${l.trim()}`).join('\n');
    }
  }

  const allNumberedList = originalLines.length > 0 && originalLines.every(l => /^\d+\.\s/.test(l));
  if (allNumberedList) {
    const resultLines = result.split('\n').filter(l => l.trim());
    const hasNumbers = resultLines.some(l => /^\d+\.\s/.test(l));
    if (!hasNumbers && resultLines.length > 0) {
      result = resultLines.map((l, i) => `${i + 1}. ${l.trim()}`).join('\n');
    }
  }

  return result;
}

function resolveProvider(preferred?: AIProvider): AIProvider {
  return 'minimax';
}

export function MarkdownEditor({ value, onChange, className, provider: providerProp, contentType, topic, onScroll, scrollRef }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Callback ref to assign both internal textareaRef and external scrollRef
  const setTextareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    if (scrollRef) {
      (scrollRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    }
  }, [scrollRef]);
  const detectActiveButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoChipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [popover, setPopover] = useState<PopoverState>({
    visible: false,
    text: '',
    selectionStart: 0,
    selectionEnd: 0,
    position: { top: 0, left: 0 },
  });

  const [activeProvider, setActiveProvider] = useState<AIProvider>('minimax');
  const [activeButton, setActiveButton] = useState<string | null>(null);
  const [rippleButton, setRippleButton] = useState<string | null>(null);
  const [showUndoChip, setShowUndoChip] = useState(false);
  const lastReplaceRef = useRef<{ original: string; start: number; end: number; newText: string } | null>(null);

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
    const POPOVER_WIDTH = 400;
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
    const POPOVER_ESTIMATE_HEIGHT = 220;
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
    const originalText = value.slice(selectionStart, selectionEnd);
    // Preserve markdown structure that the AI may have stripped
    const processedText = preserveMarkdownStructure(originalText, newText);
    // Track for undo
    lastReplaceRef.current = {
      original: originalText,
      start: selectionStart,
      end: selectionEnd,
      newText: processedText,
    };
    const newValue = value.slice(0, selectionStart) + processedText + value.slice(selectionEnd);
    onChange(newValue);

    // Restore cursor after the inserted text
    const newCursorPos = selectionStart + processedText.length;
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);

    setPopover((prev) => ({ ...prev, visible: false }));

    // Show undo chip for 10s
    setShowUndoChip(true);
    if (undoChipTimeoutRef.current) clearTimeout(undoChipTimeoutRef.current);
    undoChipTimeoutRef.current = setTimeout(() => setShowUndoChip(false), 10000);
  }, [popover, value, onChange]);

  const handleUndoReplace = useCallback(() => {
    const last = lastReplaceRef.current;
    if (!last) return;
    const replacementEnd = last.start + last.newText.length;
    const newValue = value.slice(0, last.start) + last.original + value.slice(replacementEnd);
    onChange(newValue);
    lastReplaceRef.current = null;
    setShowUndoChip(false);
    if (undoChipTimeoutRef.current) clearTimeout(undoChipTimeoutRef.current);
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();
      textarea.setSelectionRange(last.start, last.start + last.original.length);
    }, 0);
  }, [value, onChange]);

  const handleClose = useCallback(() => {
    setPopover((prev) => ({ ...prev, visible: false }));
  }, []);

  return (
    <div className={cn('relative flex flex-col border border-border rounded-md overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-sidebar flex-wrap">
        {TOOLBAR_GROUPS.map((group, gi) => (
          <div key={gi} className="flex items-center gap-0.5">
            {group.map(({ label, title, prefix, suffix, action }) => {
              if (action === INSERT_TABLE) {
                return (
                  <button
                    key={label}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const textarea = textareaRef.current;
                      if (!textarea) return;
                      const start = textarea.selectionStart;
                      const end = textarea.selectionEnd;
                      const snippet = '| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |';
                      const newValue = value.slice(0, start) + snippet + value.slice(end);
                      onChange(newValue);
                      setTimeout(() => {
                        textarea.focus();
                        textarea.setSelectionRange(start + snippet.length, start + snippet.length);
                      }, 0);
                    }}
                    title={title}
                    className={cn(
                      'toolbar-btn px-2.5 py-1.5 text-sm font-mono rounded transition-colors',
                      'text-text-secondary hover:text-text-primary hover:bg-accent/10'
                    )}
                  >
                    {label}
                  </button>
                );
              }
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => applyFormat(prefix ?? '', suffix ?? '', label)}
                  title={title}
                  className={cn(
                    'toolbar-btn px-2.5 py-1.5 text-sm font-mono rounded transition-colors',
                    activeButton === label
                      ? 'bg-accent/15 border border-accent/40 text-accent'
                      : 'text-text-secondary hover:text-text-primary hover:bg-accent/10',
                    rippleButton === label ? 'ripple' : ''
                  )}
                >
                  {label}
                </button>
              );
            })}
            {/* Vertical divider between groups (not after the last group) */}
            {gi < TOOLBAR_GROUPS.length - 1 && (
              <div className="w-px h-5 bg-border mx-1 shrink-0" aria-hidden="true" />
            )}
          </div>
        ))}

        {/* Word count with divider and document icon */}
        <div className="ms-auto flex items-center gap-2">
          <div className="w-px h-5 bg-border shrink-0" aria-hidden="true" />
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            {countWords(value).toLocaleString()} words
          </span>
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={setTextareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onMouseUp={handleMouseUp}
        onKeyUp={() => {
          clearTimeout(detectActiveButtonTimeoutRef.current ?? undefined);
          detectActiveButtonTimeoutRef.current = setTimeout(() => {
            detectActiveButton();
          }, 150);
        }}
        onScroll={(e) => {
          if (onScroll) {
            const el = e.currentTarget;
            onScroll(el.scrollTop, el.scrollHeight, el.clientHeight);
          }
        }}
        className="flex-1 w-full p-4 text-sm font-mono resize-none focus:outline-none bg-background text-text-primary leading-relaxed min-h-[200px]"
        placeholder="Start writing in markdown..."
        spellCheck={false}
      />

      {/* Inline AI Popover */}
      {popover.visible && (
        <InlineAIPopover
          selectedText={popover.text}
          position={popover.position}
          provider={activeProvider}
          contentType={contentType}
          topic={topic}
          documentOutline={extractDocumentOutline(value)}
          {...extractSurroundingSections(value, popover.selectionStart, popover.selectionEnd)}
          onReplace={handleReplace}
          onClose={handleClose}
        />
      )}

      {/* Undo chip — appears after AI replacement, disappears after 10s or on next edit */}
      {showUndoChip && (
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2 bg-background border border-border rounded-md shadow-md px-3 py-2 text-xs">
          <span className="text-text-secondary">AI replacement applied</span>
          <button
            type="button"
            onClick={handleUndoReplace}
            className="text-accent hover:text-accent/80 font-medium underline underline-offset-2"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setShowUndoChip(false)}
            className="text-text-secondary hover:text-text-primary ml-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
