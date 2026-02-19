import { useRef, useEffect, useMemo } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';

interface Props {
  content: string;
  isGenerating: boolean;
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export function StreamingView({ content, isGenerating }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  const words = useMemo(() => wordCount(content), [content]);

  // Auto-scroll when new content arrives, but respect manual scroll-up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !shouldAutoScroll.current) return;
    el.scrollTop = el.scrollHeight;
  }, [content]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    shouldAutoScroll.current = atBottom;
  };

  if (!content && !isGenerating) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
          </div>
          <p className="text-base font-medium text-foreground">Ready to generate</p>
          <p className="mt-1.5 text-sm leading-relaxed">
            Configure your content on the left panel, then press <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium">⌘ Enter</kbd> to generate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Toolbar */}
      {content && (
        <div className="flex items-center justify-between border-b border-border px-5 py-2 bg-card/50">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{words.toLocaleString()} words</span>
            <span className="text-border">|</span>
            <span>{content.length.toLocaleString()} chars</span>
          </div>
          {isGenerating && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-blink" />
              <span>Generating…</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        <div className="mx-auto max-w-3xl px-8 py-6">
          <MarkdownRenderer content={content} />

          {/* Blinking cursor */}
          {isGenerating && (
            <span className="inline-block w-[2px] h-[1.1em] bg-primary animate-blink ml-0.5 align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
}
