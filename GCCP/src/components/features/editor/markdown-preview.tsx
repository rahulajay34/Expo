'use client';

import { useRef, useMemo, isValidElement, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Maximize2, Minimize2, Eye, Copy, Check, Focus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
// eslint-disable-next-line @typescript-eslint/no-require-imports -- side-effect CSS import
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAppStore } from '@/lib/store';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { TableOfContents, slugify } from './table-of-contents';
import { MermaidBlock } from './mermaid-block';

// ---------------------------------------------------------------------------
// Heading ID helper — produces a stable slug map so react-markdown rendered
// headings get the same IDs as those parsed by the TOC component.
// ---------------------------------------------------------------------------

function useHeadingSlugger(markdown: string) {
  return useMemo(() => {
    // Pre-compute all heading IDs from the raw markdown so that the
    // react-markdown `components` callbacks can look them up by order
    // of occurrence without needing to keep a mutable counter in
    // render (which would break React rules).
    const counts = new Map<string, number>();
    const ids: string[] = [];
    const regex = /^(#{2,3})\s+(.+)$/gm;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(markdown)) !== null) {
      const rawText = match[2]
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/__(.+?)__/g, '$1')
        .replace(/_(.+?)_/g, '$1')
        .replace(/`(.+?)`/g, '$1')
        .replace(/\[(.+?)\]\(.+?\)/g, '$1')
        .trim();
      ids.push(slugify(rawText, counts));
    }

    return ids;
  }, [markdown]);
}

// ---------------------------------------------------------------------------
// Mermaid detection helper — checks if a <pre> wraps a mermaid code block
// ---------------------------------------------------------------------------

function isMermaidPreBlock(children: ReactNode): boolean {
  if (!isValidElement(children)) return false;
  const props = children.props as Record<string, unknown> | undefined;
  const className = typeof props?.className === 'string' ? props.className : '';
  return /language-mermaid/.test(className);
}

// ---------------------------------------------------------------------------
// CodeBlockCopyButton
// ---------------------------------------------------------------------------

function CodeBlockCopyButton({ code }: { code: string }) {
  const { copied, copy } = useCopyToClipboard();

  return (
    <Button
      size="icon-xs"
      variant="ghost"
      onClick={() => copy(code)}
      className={`btn-press opacity-50 transition-opacity hover:opacity-100 ${copied ? 'success-flash' : ''}`}
      aria-label="Copy code"
    >
      {copied ? (
        <Check className="size-3 text-green-500" />
      ) : (
        <Copy className="size-3" />
      )}
    </Button>
  );
}

// ---------------------------------------------------------------------------
// MarkdownPreview
// ---------------------------------------------------------------------------

export function MarkdownPreview() {
  const content = useAppStore((s) => s.content);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const previewFullscreen = useAppStore((s) => s.previewFullscreen);
  const setPreviewFullscreen = useAppStore((s) => s.setPreviewFullscreen);
  const { copied: previewCopied, copy: copyPreview } = useCopyToClipboard();

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const headingIds = useHeadingSlugger(content ?? '');

  const showCursor = isGenerating && !!content;

  // Mutable counter that resets on every render so each h2/h3 callback
  // can pull the next pre-computed id from `headingIds`.
  const headingIndexRef = useRef(0);
  // Reset counter every render
  headingIndexRef.current = 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="flex h-full flex-col overflow-hidden rounded-lg border border-border/50 bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Eye className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Preview
          </span>
        </div>
        <div className="flex items-center gap-1">
          {content && (
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => copyPreview(content)}
              className="opacity-100 transition-opacity"
              aria-label="Copy preview content"
            >
              {previewCopied ? (
                <Check className="size-3 text-green-500" />
              ) : (
                <Copy className="size-3" />
              )}
            </Button>
          )}
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => useAppStore.getState().toggleFocusMode()}
            className="text-muted-foreground hover:text-foreground"
            title="Focus mode — distraction-free editing"
          >
            <Focus className="size-3.5" />
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => setPreviewFullscreen(!previewFullscreen)}
            className="text-muted-foreground hover:text-foreground"
          >
            {previewFullscreen ? (
              <Minimize2 className="size-3.5" />
            ) : (
              <Maximize2 className="size-3.5" />
            )}
          </Button>
        </div>
      </div>

      {/* Preview content */}
      <ScrollArea className="flex-1" ref={scrollAreaRef}>
        <div className="p-6">
          {content ? (
            <>
              {/* Table of Contents */}
              <TableOfContents
                markdown={content}
                scrollContainerRef={scrollAreaRef}
              />

              <article className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-semibold prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-code:rounded-md prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-xs prose-code:font-medium prose-code:text-accent-foreground prose-code:before:content-none prose-code:after:content-none prose-pre:rounded-lg prose-pre:border prose-pre:border-border prose-pre:bg-muted/50 dark:prose-pre:bg-[oklch(0.17_0.015_265)] prose-pre:p-4 prose-img:rounded-lg prose-table:text-sm prose-th:border prose-th:border-border prose-th:bg-muted/50 prose-th:px-3 prose-th:py-2 prose-th:font-semibold prose-td:border prose-td:border-border prose-td:px-3 prose-td:py-2 even:prose-tr:bg-muted/30 prose-hr:border-border">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkMath]}
                  rehypePlugins={[rehypeKatex, rehypeHighlight]}
                  components={{
                    // ---------- Headings with auto-generated IDs ----------
                    h2({ children, ...props }) {
                      const idx = headingIndexRef.current++;
                      const id = headingIds[idx] ?? `heading-${idx}`;
                      return (
                        <h2 id={id} {...props}>
                          {children}
                        </h2>
                      );
                    },
                    h3({ children, ...props }) {
                      const idx = headingIndexRef.current++;
                      const id = headingIds[idx] ?? `heading-${idx}`;
                      return (
                        <h3 id={id} {...props}>
                          {children}
                        </h3>
                      );
                    },
                    // Strip <pre> wrapper for mermaid blocks so MermaidBlock
                    // renders outside a preformatted context.
                    pre({ children, ...props }) {
                      if (isMermaidPreBlock(children as ReactNode)) {
                        return <>{children}</>;
                      }
                      return <pre {...props}>{children}</pre>;
                    },
                    // Custom code block rendering
                    code({ className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || '');
                      const isInline = !match;
                      if (isInline) {
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                      // Mermaid diagram — render as SVG instead of code
                      if (match[1] === 'mermaid') {
                        const mermaidCode = String(children).replace(/\n$/, '');
                        return <MermaidBlock code={mermaidCode} />;
                      }
                      // Extract plain text from children for copy
                      const codeText = String(children).replace(/\n$/, '');
                      return (
                        <div className="group relative">
                          <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-70 transition-opacity group-hover:opacity-100 hover:opacity-100">
                            <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground">
                              {match[1]}
                            </span>
                            <CodeBlockCopyButton code={codeText} />
                          </div>
                          <code className={className} {...props}>
                            {children}
                          </code>
                        </div>
                      );
                    },
                    // Paragraphs — render as <div> when containing
                    // block-level children (images) to avoid hydration errors
                    p({ children, ...props }) {
                      const hasImage = Array.isArray(children)
                        ? children.some(
                            (child) => isValidElement(child) && (child as React.ReactElement<{ node?: { tagName?: string } }>).props?.node?.tagName === 'img'
                          )
                        : isValidElement(children) && (children as React.ReactElement<{ node?: { tagName?: string } }>).props?.node?.tagName === 'img';
                      if (hasImage) {
                        return <div {...props}>{children}</div>;
                      }
                      return <p {...props}>{children}</p>;
                    },
                    // Images with proper styling
                    img({ src, alt, ...props }) {
                      return (
                        <figure className="my-4 flex flex-col items-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={alt || ''}
                            loading="lazy"
                            sizes="(max-width: 768px) 100vw, 60vw"
                            className="max-w-full rounded-lg border border-border/50 shadow-sm dark:border-border dark:shadow-md"
                            {...props}
                          />
                          {alt && alt !== 'image' && (
                            <figcaption className="mt-2 text-center text-xs text-muted-foreground italic">
                              {alt}
                            </figcaption>
                          )}
                        </figure>
                      );
                    },
                    // Callout-style blockquotes
                    blockquote({ children, ...props }) {
                      return (
                        <blockquote
                          className="rounded-r-lg border-l-4 border-primary/40 bg-primary/5 py-1 pl-4 italic dark:border-primary/50 dark:bg-primary/10"
                          {...props}
                        >
                          {children}
                        </blockquote>
                      );
                    },
                    // Styled tables
                    table({ children, ...props }) {
                      return (
                        <div className="overflow-x-auto rounded-lg border">
                          <table {...props}>{children}</table>
                        </div>
                      );
                    },
                  }}
                >
                  {content}
                </ReactMarkdown>
                {showCursor && (
                  <span
                    className="inline-block text-primary text-lg font-bold"
                    style={{ animation: 'blink-cursor 1s step-end infinite' }}
                    aria-hidden="true"
                  >
                    &#9612;
                  </span>
                )}
              </article>
            </>
          ) : (
            <div className="flex h-60 flex-col items-center justify-center gap-3 text-center">
              <Eye className="size-10 text-muted-foreground/60" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground/60">
                  Preview
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Generated content will be rendered here in real-time
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </motion.div>
  );
}
