'use client';

import { useEffect, useRef, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import { cn } from '@/lib/utils';

/**
 * Rehype plugin that wraps each line of code in a <span class="code-line">.
 * Must run AFTER rehype-highlight (which splits tokens across spans).
 * Mermaid code blocks are skipped (they don't go through rehype-highlight).
 */
function rehypeWrapLines() {
  return function (tree: Root) {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (!parent || node.tagName !== 'code') return;
      // Skip mermaid blocks
      const classes: string[] = (node.properties?.className as string[]) ?? [];
      if (classes.includes('language-mermaid')) return;

      // Group children into lines: collect until a text node has \n
      const children = node.children;
      let currentLine: typeof children = [];
      const lines: typeof children[] = [currentLine];

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type === 'text') {
          const parts = child.value.split('\n');
          for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            if (j > 0) {
              // Start a new line
              currentLine = [];
              lines.push(currentLine);
            }
            if (part || j < parts.length - 1) {
              currentLine.push({ type: 'text', value: part } as typeof child);
            }
          }
        } else if (child.type === 'element') {
          currentLine.push(child);
        }
        // else (comment, etc.) — skip
      }

      // Wrap each non-empty line in a code-line span
      const wrapped: typeof children = [];
      for (const line of lines) {
        if (line.length === 0) continue;
        wrapped.push({
          type: 'element',
          tagName: 'span',
          properties: { className: ['code-line'] },
          children: line,
        } as Element);
      }

      node.children = wrapped;
    });
  };
}

function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mermaidModule, setMermaidModule] = useState<typeof import('mermaid') | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode and listen for changes
  useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains('dark'));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Lazy-load mermaid on first chart render
  useEffect(() => {
    if (!chart) return;
    if (mermaidModule) return; // already loaded
    setLoading(true);
    import('mermaid').then(m => {
      setMermaidModule(m);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [chart, mermaidModule]);

  // Re-initialize and re-render whenever theme changes
  useEffect(() => {
    let isMounted = true;
    async function renderChart() {
      if (!mermaidModule) return;
      try {
        setError(null);
        // Re-initialize mermaid with correct theme each render
        mermaidModule.default.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          themeVariables: isDark ? {
            // Dark mode: muted gray nodes, white text
            darkMode: true,
            background: '#2D2D2D',
            primaryColor: '#484848',
            primaryTextColor: '#FFFFFF',
            primaryBorderColor: '#5A5A5A',
            secondaryColor: '#525252',
            secondaryTextColor: '#FFFFFF',
            secondaryBorderColor: '#636363',
            tertiaryColor: '#3E3E3E',
            tertiaryTextColor: '#FFFFFF',
            tertiaryBorderColor: '#555555',
            lineColor: '#777777',
            textColor: '#E8E8E8',
            fontSize: '14px',
            nodeBorder: '#5A5A5A',
            mainBkg: '#484848',
            nodeTextColor: '#FFFFFF',
            clusterBkg: '#363636',
            clusterBorder: '#4A4A4A',
            titleColor: '#E8E8E8',
            edgeLabelBackground: '#2D2D2D',
            noteBkgColor: '#484848',
            noteTextColor: '#FFFFFF',
            noteBorderColor: '#5A5A5A',
          } : {
            // Light mode: soft neutral pastels, dark text
            darkMode: false,
            background: '#FFFFFF',
            primaryColor: '#DBEAFE',
            primaryTextColor: '#1E293B',
            primaryBorderColor: '#93C5FD',
            secondaryColor: '#E0F2FE',
            secondaryTextColor: '#1E293B',
            secondaryBorderColor: '#7DD3FC',
            tertiaryColor: '#F0F9FF',
            tertiaryTextColor: '#1E293B',
            tertiaryBorderColor: '#BAE6FD',
            lineColor: '#94A3B8',
            textColor: '#1E293B',
            fontSize: '14px',
            nodeBorder: '#93C5FD',
            mainBkg: '#DBEAFE',
            nodeTextColor: '#1E293B',
            clusterBkg: '#F8FAFC',
            clusterBorder: '#CBD5E1',
            titleColor: '#1E293B',
            edgeLabelBackground: '#FFFFFF',
            noteBkgColor: '#FEF9C3',
            noteTextColor: '#1E293B',
            noteBorderColor: '#FDE68A',
          },
        });
        const id = `mermaid-chart-${Date.now()}-${crypto.randomUUID()}`;
        const { svg: svgCode } = await mermaidModule.default.render(id, chart);
        if (isMounted) {
          setSvg(svgCode);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to render diagram');
        }
      }
    }
    if (chart && mermaidModule) {
      renderChart();
    }
    return () => { isMounted = false; };
  }, [chart, mermaidModule, isDark]);

  if (error) {
    return <div className="my-6 flex justify-center overflow-x-auto">
      <div className="text-xs text-danger border border-danger/20 bg-danger/5 p-3 rounded">⚠ {error} — check Mermaid syntax</div>
    </div>;
  }

  if (loading || !svg) {
    return <div className="my-6 flex justify-center overflow-x-auto">
      <div className="text-xs text-text-secondary p-4">Loading diagram...</div>
    </div>;
  }

  return <div className="mermaid-container my-6 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  id?: string;
  isStreaming?: boolean;
}

export function MarkdownPreview({ content, className, id, isStreaming }: MarkdownPreviewProps) {
  // Stream exactly at the raw network speed without artificial throttling
  const renderedContent = content;
  const [shimmer, setShimmer] = useState(false);
  const prevContentLengthRef = useRef<number>(0);

  useEffect(() => {
    if (isStreaming && content.length > prevContentLengthRef.current + 10) {
      setShimmer(true);
      const t = setTimeout(() => setShimmer(false), 600);
      return () => clearTimeout(t);
    }
    prevContentLengthRef.current = content.length;
  }, [content, isStreaming]);

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
        const text = code.innerText;
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
      });
    });
  }, [content, id, isStreaming]);

  return (
    <div
      className={cn('stream-shimmer', shimmer && 'is-shimmering', className)}
      id={id}
      aria-live={isStreaming ? 'polite' : 'off'}
      aria-label={isStreaming ? 'Generating content...' : undefined}
    >
      <div className={cn('markdown-body', isStreaming && 'is-streaming')}>
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }], rehypeRaw, rehypeWrapLines]}
          components={{
            // Tables
            table: ({ children }) => (
              <div className="overflow-x-auto my-4 w-full border rounded-md border-border">
                <table className="min-w-full text-sm divide-y divide-border m-0 border-collapse">
                  {children}
                </table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-sidebar px-4 py-2 font-semibold text-text-primary text-left border-b border-r last:border-r-0 border-border">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-2 border-b border-r last:border-r-0 border-border">
                {children}
              </td>
            ),
            // Blockquotes styled as callout
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-accent/60 bg-blue-50/50 dark:bg-blue-950/20 pl-4 py-2 my-3 rounded-r text-text-primary/80">
                {children}
              </blockquote>
            ),
            // Custom code rendering for Mermaid support
            code: ({ className, children, ...props }) => {
              const match = /language-(\w+)/.exec(className || '');
              if (match && match[1] === 'mermaid') {
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
                
                // Do not render mermaid chart until streaming completes to avoid infinite syntax errors
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
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {renderedContent}
        </ReactMarkdown>
        {isStreaming && renderedContent.length > 0 && (
          <span className="glow-cursor animate-pulse">|</span>
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
