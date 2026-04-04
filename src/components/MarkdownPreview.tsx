'use client';

import { useEffect, useRef, useState, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import { visit } from 'unist-util-visit';
import type { Root, Element } from 'hast';
import { cn, copyToClipboard } from '@/lib/utils';

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

/**
 * Muted crayon palette — always uses white/off-white background with
 * soft pastel node fills and high-contrast dark text so every diagram
 * is readable regardless of the page theme.
 */
const MERMAID_THEME_VARS = {
  darkMode: false,
  background: 'transparent',
  // Primary nodes — muted lavender
  primaryColor: '#E8E0F0',
  primaryTextColor: '#2D2235',
  primaryBorderColor: '#C4B5D4',
  // Secondary nodes — muted sage
  secondaryColor: '#DDE8D8',
  secondaryTextColor: '#2A3328',
  secondaryBorderColor: '#B5C9AD',
  // Tertiary nodes — muted peach
  tertiaryColor: '#F0E4D8',
  tertiaryTextColor: '#3A2E24',
  tertiaryBorderColor: '#D4C0AB',
  // Edges & text
  lineColor: '#8E8E93',
  textColor: '#1D1D1F',
  fontSize: '14px',
  // Node defaults
  nodeBorder: '#C4B5D4',
  mainBkg: '#E8E0F0',
  nodeTextColor: '#1D1D1F',
  // Clusters
  clusterBkg: '#F5F5F7',
  clusterBorder: '#D1D1D6',
  // Misc
  titleColor: '#1D1D1F',
  edgeLabelBackground: 'transparent',
  noteBkgColor: '#FFF8E1',
  noteTextColor: '#33302B',
  noteBorderColor: '#E8D5A3',
};

function downloadSvgAsPng(svgHtml: string, filename: string) {
  // Parse SVG, force white background and extract dimensions
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return;

  // Ensure white background rect exists
  const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#FFFFFF');
  svgEl.insertBefore(bgRect, svgEl.firstChild);

  // Read dimensions
  const vb = svgEl.getAttribute('viewBox');
  let width = parseFloat(svgEl.getAttribute('width') || '800');
  let height = parseFloat(svgEl.getAttribute('height') || '600');
  if (vb) {
    const parts = vb.split(/[\s,]+/).map(Number);
    if (parts.length === 4) { width = parts[2]; height = parts[3]; }
  }

  const scale = 2; // retina
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  // Use a data URI instead of blob URL to avoid tainting the canvas
  const dataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((pngBlob) => {
      if (!pngBlob) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(pngBlob);
      a.download = `${filename}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    }, 'image/png');
  };
  img.src = dataUri;
}

function downloadSvgFile(svgHtml: string, filename: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgHtml, 'image/svg+xml');
  const svgEl = doc.querySelector('svg');
  if (!svgEl) return;

  // Force white background
  const bgRect = doc.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('width', '100%');
  bgRect.setAttribute('height', '100%');
  bgRect.setAttribute('fill', '#FFFFFF');
  svgEl.insertBefore(bgRect, svgEl.firstChild);

  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svgEl);
  const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mermaidModule, setMermaidModule] = useState<typeof import('mermaid') | null>(null);

  // Lazy-load mermaid on first chart render
  useEffect(() => {
    if (!chart) return;
    if (mermaidModule) return;
    setLoading(true);
    import('mermaid').then(m => {
      setMermaidModule(m);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });
  }, [chart, mermaidModule]);

  // Render with consistent crayon palette
  useEffect(() => {
    let isMounted = true;
    async function renderChart() {
      if (!mermaidModule) return;
      const id = `mermaid-chart-${Date.now()}-${crypto.randomUUID()}`;
      try {
        setError(null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mermaidModule.default.initialize({
          startOnLoad: false,
          theme: 'base',
          securityLevel: 'loose',
          fontFamily: 'Inter, sans-serif',
          themeVariables: MERMAID_THEME_VARS,
          ...(({ suppressErrors: true }) as Record<string, unknown>),
        });
        const { svg: svgCode } = await mermaidModule.default.render(id, chart);
        if (isMounted) {
          // Trim excessive padding mermaid bakes into the SVG:
          // 1. Strip inline max-width/height so CSS controls sizing
          // 2. Tighten viewBox padding (mermaid adds ~50px on each side)
          const trimmed = svgCode
            .replace(/style="[^"]*"/i, (match) =>
              match.replace(/max-width:\s*[\d.]+px;?\s*/g, '').replace(/height:\s*[\d.]+px;?\s*/g, '')
            )
            .replace(/viewBox="([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)"/, (_m, x, y, w, h) => {
              const pad = 8;
              const nx = parseFloat(x) + pad;
              const ny = parseFloat(y) + pad;
              const nw = Math.max(0, parseFloat(w) - pad * 2);
              const nh = Math.max(0, parseFloat(h) - pad * 2);
              return `viewBox="${nx} ${ny} ${nw} ${nh}"`;
            });
          setSvg(trimmed);
        }
      } catch (err) {
        // Remove any leftover mermaid error elements injected into the DOM
        document.getElementById(id)?.remove();
        document.querySelectorAll('.error-icon').forEach(el => el.closest('div')?.remove());
        if (isMounted) {
          const msg = err instanceof Error ? err.message : 'Failed to render diagram';
          // Strip mermaid's verbose prefixes, keep the useful part
          const cleaned = msg.replace(/^(Parse error|Syntax error) on line \d+.*\n?/i, '').trim() || msg;
          setError(cleaned);
        }
      }
    }
    if (chart && mermaidModule) {
      renderChart();
    }
    return () => { isMounted = false; };
  }, [chart, mermaidModule]);

  if (error) {
    return (
      <div className="my-6 overflow-x-auto">
        <div className="text-xs text-danger border border-danger/20 bg-danger/5 px-3 py-2 rounded-t font-medium">
          ⚠ Diagram error — {error}
        </div>
        <pre className="text-xs p-3 bg-sidebar rounded-b border border-t-0 border-border overflow-x-auto max-h-48">
          <code className="text-text-secondary whitespace-pre-wrap">{chart}</code>
        </pre>
      </div>
    );
  }

  if (loading || !svg) {
    return <div className="my-6 flex justify-center overflow-x-auto">
      <div className="text-xs text-text-secondary p-4">Loading diagram...</div>
    </div>;
  }

  const filenameSlug = chart.slice(0, 40).replace(/[^a-zA-Z0-9]+/g, '-').replace(/-+$/, '') || 'diagram';

  return (
    <div className="mermaid-container my-4 relative group/mermaid">
      <div className="overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />
      {/* Download toolbar */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover/mermaid:opacity-100 transition-opacity">
        <button
          onClick={() => downloadSvgAsPng(svg, filenameSlug)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors"
          title="Download as PNG"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          PNG
        </button>
        <button
          onClick={() => downloadSvgFile(svg, filenameSlug)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900 shadow-sm transition-colors"
          title="Download as SVG"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          SVG
        </button>
      </div>
    </div>
  );
}

/**
 * Custom sanitization schema extending GitHub's defaults.
 * Allows safe HTML elements (details, tables, KaTeX spans, etc.)
 * while stripping dangerous ones (script, iframe, form, etc.).
 */
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    'details', 'summary',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'div', 'span', 'br', 'hr',
    'code', 'pre', 'blockquote',
    'sup', 'sub', 'mark',
    // SVG elements
    'svg', 'path',
    // MathML elements (KaTeX / remark-math)
    'math', 'semantics', 'annotation', 'mrow', 'mi', 'mo', 'mn',
    'msup', 'msub', 'mfrac', 'mtext',
  ],
  attributes: {
    ...defaultSchema.attributes,
    // Allow class/className and data-* on all elements (syntax highlighting hljs-* + KaTeX katex* classes)
    '*': [...(defaultSchema.attributes?.['*'] ?? []), 'className', 'class', 'data*'],
    code: [...(defaultSchema.attributes?.['code'] ?? []), 'className', 'class'],
    // KaTeX uses inline styles on span/div
    span: [...(defaultSchema.attributes?.['span'] ?? []), 'className', 'class', 'style'],
    div: [...(defaultSchema.attributes?.['div'] ?? []), 'className', 'class', 'style'],
    td: [...(defaultSchema.attributes?.['td'] ?? []), 'align', 'valign'],
    th: [...(defaultSchema.attributes?.['th'] ?? []), 'align', 'valign'],
  },
  strip: ['script', 'iframe', 'object', 'embed', 'form', 'input'],
};

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  id?: string;
  isStreaming?: boolean;
  /** Adaptive animation duration in ms, driven by StreamSpeedTracker. */
  streamSpeed?: number;
}

export function MarkdownPreview({ content, className, id, isStreaming, streamSpeed }: MarkdownPreviewProps) {
  const renderedContent = content;
  const [caretVisible, setCaretVisible] = useState(false);
  const [caretExiting, setCaretExiting] = useState(false);
  const prevStreamingRef = useRef(false);

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
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true, plainText: ['mermaid'] }], rehypeRaw, rehypeKatex, [rehypeSanitize, sanitizeSchema], rehypeWrapLines]}
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
            // External links open in new tab safely
            a: ({ href, children, ...props }) => {
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
