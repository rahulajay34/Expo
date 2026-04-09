'use client';

import { useEffect, useRef, useState, memo, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize from 'rehype-sanitize';
import { motion, useReducedMotion } from 'framer-motion';
import { cn, copyToClipboard } from '@/lib/utils';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';
import { rehypeWrapLines } from '@/lib/rehype/wrap-lines';
import { sanitizeSchema } from '@/lib/rehype/sanitize-schema';
import { MermaidChart } from '@/components/MermaidChart';

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as React.ReactElement).props.children);
  }
  return String(children ?? '');
}

/** Animated horizontal separator that springs into view when a new heading appears */
function SectionSeparator({ isNew, isStreaming }: { isNew: boolean; isStreaming?: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  if (!isNew || !isStreaming) return null;
  return (
    <motion.div
      className="h-px my-2"
      style={{ backgroundColor: 'var(--accent)', opacity: 0.25, transformOrigin: 'left' }}
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 0.25 }}
      transition={prefersReducedMotion ? reducedMotionTransition : springSnappy}
      aria-hidden="true"
    />
  );
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  id?: string;
  isStreaming?: boolean;
  /** Adaptive animation duration in ms, driven by StreamSpeedTracker. */
  streamSpeed?: number;
  onSectionRegenerate?: (heading: string, headingLevel: number) => void;
}

function MarkdownPreviewImpl({ content, className, id, isStreaming, streamSpeed, onSectionRegenerate }: MarkdownPreviewProps) {
  /**
   * Auto-close an unclosed fenced code block during streaming.
   * Without this, remark-parse would treat an in-progress ```lang\n... block
   * as a paragraph containing inline <code>, flattening the code to one line
   * until the closing ``` arrives. Appending a synthetic fence lets
   * react-markdown render it as a real <pre><code> while it's still streaming.
   */
  const renderedContent = useMemo(() => {
    if (!isStreaming) return content;
    const fenceMatches = content.match(/^```/gm);
    if (fenceMatches && fenceMatches.length % 2 === 1) {
      return content + '\n```';
    }
    return content;
  }, [content, isStreaming]);

  const [caretVisible, setCaretVisible] = useState(false);
  const [caretExiting, setCaretExiting] = useState(false);
  const prevStreamingRef = useRef(false);

  // Track headings seen so far to detect newly-appearing ones during streaming
  const seenHeadingsRef = useRef<Set<string>>(new Set());
  const newHeadingsRef = useRef<Set<string>>(new Set());

  // Detect new headings as content streams
  useEffect(() => {
    if (!isStreaming) {
      // Reset on new generation or completion
      seenHeadingsRef.current.clear();
      newHeadingsRef.current.clear();
      return;
    }
    const headingMatches = content.match(/^#{1,3}\s+.+$/gm) ?? [];
    const newSet = new Set<string>();
    for (const h of headingMatches) {
      const key = h.trim();
      if (!seenHeadingsRef.current.has(key)) {
        newSet.add(key);
      }
    }
    // Mark all newly found headings
    newHeadingsRef.current = newSet;
    // Add all to seen
    for (const h of headingMatches) {
      seenHeadingsRef.current.add(h.trim());
    }
  }, [content, isStreaming]);

  /** Check if a heading text is newly appearing */
  const isNewHeading = useCallback((text: string) => {
    if (!isStreaming) return false;
    const keys = Array.from(newHeadingsRef.current);
    return keys.some((key) => key.includes(text));
  }, [isStreaming]);

  // Show caret while streaming, fade it out when streaming ends
  useEffect(() => {
    if (isStreaming) {
      setCaretVisible(true);
      setCaretExiting(false);
    } else if (prevStreamingRef.current && !isStreaming) {
      // Was streaming, now stopped — fade out the caret
      setCaretExiting(true);
      const t = setTimeout(() => {
        setCaretVisible(false);
        setCaretExiting(false);
      }, 400); // matches caret-fade-out duration
      return () => clearTimeout(t);
    }
    prevStreamingRef.current = !!isStreaming;
  }, [isStreaming]);

  // Inject copy buttons into all rendered <pre> code blocks
  useEffect(() => {
    if (!id || isStreaming) return;
    const container = document.getElementById(id);
    if (!container) return;
    const preBlocks = container.querySelectorAll('pre');
    preBlocks.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return; // already injected
      const code = pre.querySelector('code');
      if (!code) return;
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn absolute top-2 right-2 px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity';
      btn.textContent = 'Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      pre.style.position = 'relative';
      pre.classList.add('group');
      pre.insertBefore(btn, pre.firstChild);
      btn.addEventListener('click', async () => {
        try {
          const text = code.innerText;
          await copyToClipboard(text);
          btn.textContent = 'Copied!';
        } catch {
          btn.textContent = 'Failed';
        }
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    });
  }, [content, id, isStreaming]);

  // Compute the CSS custom property for adaptive stream speed
  const speedStyle = isStreaming && streamSpeed
    ? { '--stream-speed': `${streamSpeed}ms` } as React.CSSProperties
    : undefined;

  // Stable plugin arrays so ReactMarkdown doesn't rebuild its pipeline every render.
  const remarkPlugins = useMemo(() => [remarkMath, remarkGfm], []);
  const rehypePlugins = useMemo(
    () => [
      [rehypeHighlight, { ignoreMissing: true, detect: true, plainText: ['mermaid'] }],
      rehypeRaw,
      rehypeKatex,
      [rehypeSanitize, sanitizeSchema],
      rehypeWrapLines,
    ],
    []
    // eslint-disable-next-line react-hooks/exhaustive-deps
  );

  // Memoize the components map — without this, every render creates brand-new
  // component factories, forcing react-markdown to tear down and rebuild the
  // entire output tree on each streaming chunk (visible jitter).
  const components = useMemo(
    () => ({
      h1: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = extractTextFromChildren(children);
        const isNew = isNewHeading(text);
        return (
          <div className="section-heading-wrapper">
            <SectionSeparator isNew={isNew} isStreaming={isStreaming} />
            <h1 {...props}>{children}</h1>
          </div>
        );
      },
      h2: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = extractTextFromChildren(children);
        const isNew = isNewHeading(text);
        return (
          <div className="section-heading-wrapper group">
            <SectionSeparator isNew={isNew} isStreaming={isStreaming} />
            <h2 {...props}>
              {children}
              {onSectionRegenerate && !isStreaming && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSectionRegenerate(text, 2); }}
                  className="section-regen-btn inline-flex items-center justify-center w-6 h-6 ml-2 rounded-md hover:bg-sidebar text-text-secondary hover:text-accent transition-colors align-middle"
                  title="Regenerate this section"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                </button>
              )}
            </h2>
          </div>
        );
      },
      h3: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => {
        const text = extractTextFromChildren(children);
        const isNew = isNewHeading(text);
        return (
          <div className="section-heading-wrapper group">
            <SectionSeparator isNew={isNew} isStreaming={isStreaming} />
            <h3 {...props}>
              {children}
              {onSectionRegenerate && !isStreaming && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSectionRegenerate(text, 3); }}
                  className="section-regen-btn inline-flex items-center justify-center w-6 h-6 ml-2 rounded-md hover:bg-sidebar text-text-secondary hover:text-accent transition-colors align-middle"
                  title="Regenerate this section"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                  </svg>
                </button>
              )}
            </h3>
          </div>
        );
      },
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-4 w-full border rounded-md border-border">
          <table className="min-w-full text-sm divide-y divide-border m-0 border-collapse">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="bg-sidebar px-4 py-2 font-semibold text-text-primary text-left border-b border-r last:border-r-0 border-border">
          {children}
        </th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="px-4 py-2 border-b border-r last:border-r-0 border-border">
          {children}
        </td>
      ),
      // Plain <pre> — no spring animation during streaming (it re-triggered
      // on every chunk and caused visible jitter). The CSS
      // `stream-chunk-fade` on `.markdown-body.is-streaming > *:last-child`
      // still provides a subtle fade-in for the latest block.
      pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
        <pre {...props}>{children}</pre>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-4 border-accent/60 bg-blue-50/50 dark:bg-blue-950/20 pl-4 py-2 my-3 rounded-r text-text-primary/80">
          {children}
        </blockquote>
      ),
      a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
        const isExternal =
          href &&
          (href.startsWith('http://') || href.startsWith('https://')) &&
          !href.startsWith(typeof window !== 'undefined' ? window.location.origin : '');
        if (isExternal) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
              {children}
            </a>
          );
        }
        return (
          <a href={href} {...props}>
            {children}
          </a>
        );
      },
      code: ({ className: codeClassName, children, ...props }: React.HTMLAttributes<HTMLElement>) => {
        const match = /language-(\w+)/.exec(codeClassName || '');
        if (match && match[1] === 'mermaid') {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const extractText = (node: any): string => {
            if (typeof node === 'string') return node;
            if (typeof node === 'number') return String(node);
            if (Array.isArray(node)) return node.map(extractText).join('');
            if (node && typeof node === 'object' && node.props && node.props.children) {
              return extractText(node.props.children);
            }
            return '';
          };

          const chartText = extractText(children).replace(/\n$/, '');

          if (isStreaming) {
            return (
              <div className="w-full bg-sidebar/50 rounded-md p-6 flex flex-col items-center justify-center my-4 border border-border/50 shadow-inner">
                <div className="flex items-center gap-2 text-text-secondary text-sm mb-3">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="font-medium">Drawing Diagram...</span>
                </div>
                <pre className="text-xs text-text-tertiary font-mono max-h-24 overflow-hidden w-full text-center opacity-50 relative pointer-events-none">
                  {chartText}
                  <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-sidebar/50 to-transparent" />
                </pre>
              </div>
            );
          }

          return <MermaidChart chart={chartText} />;
        }
        return (
          <code className={codeClassName} {...props}>
            {children}
          </code>
        );
      },
    }),
    [isStreaming, onSectionRegenerate, isNewHeading]
  );

  return (
    <div
      className={cn('stream-fade-container', className)}
      id={id}
      style={speedStyle}
      aria-live={isStreaming ? 'polite' : 'off'}
      aria-label={isStreaming ? 'Generating content...' : undefined}
    >
      <div className={cn('markdown-body', isStreaming && 'is-streaming')}>
        <ReactMarkdown
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          remarkPlugins={remarkPlugins as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          rehypePlugins={rehypePlugins as any}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          components={components as any}
        >
          {renderedContent}
        </ReactMarkdown>
        {caretVisible && renderedContent.length > 0 && (
          <span
            className={cn('stream-caret', caretExiting && 'stream-caret-exit')}
            aria-hidden="true"
          />
        )}
        {!isStreaming && content.length > 0 && (
          <span className="sr-only" aria-live="assertive" aria-atomic="true">
            Content generation complete.
          </span>
        )}
      </div>
      <div className={cn('typewriter-gradient', !isStreaming && 'hidden')} />
    </div>
  );
}

/**
 * Memoized export — skips re-renders when relevant props haven't changed.
 * Without this, every parent re-render (every SSE chunk, ~every CHAR_BATCH
 * chars) re-ran the entire markdown pipeline + rehype-highlight tokenizer,
 * causing visible jitter during streaming.
 */
export const MarkdownPreview = memo(MarkdownPreviewImpl, (prev, next) => {
  return (
    prev.content === next.content &&
    prev.isStreaming === next.isStreaming &&
    prev.streamSpeed === next.streamSpeed &&
    prev.id === next.id &&
    prev.className === next.className &&
    prev.onSectionRegenerate === next.onSectionRegenerate
  );
});
