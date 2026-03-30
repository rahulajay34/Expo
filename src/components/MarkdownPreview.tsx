'use client';

import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';

// Initialize mermaid
// We do this outside the component so it runs once
if (typeof window !== 'undefined') {
  mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'Inter, sans-serif'
  });
}

function MermaidChart({ chart }: { chart: string }) {
  const [svg, setSvg] = useState<string>('');
  
  useEffect(() => {
    let isMounted = true;
    async function renderChart() {
      try {
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        const { svg: svgCode } = await mermaid.render(id, chart);
        if (isMounted) {
          setSvg(svgCode);
        }
      } catch (err) {
        console.error('Mermaid error', err);
        if (isMounted) {
          setSvg(`<div class="text-xs text-danger border border-danger/20 bg-danger/5 p-3 rounded">Failed to render diagram</div>`);
        }
      }
    }
    if (chart) {
      renderChart();
    }
    return () => { isMounted = false; };
  }, [chart]);

  return <div className="my-6 flex justify-center overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

interface MarkdownPreviewProps {
  content: string;
  className?: string;
  id?: string;
  isStreaming?: boolean;
}

export function MarkdownPreview({ content, className, id, isStreaming }: MarkdownPreviewProps) {
  const [displayQueue, setDisplayQueue] = useState('');
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Handle typewriter effect when streaming
  useEffect(() => {
    if (!isStreaming) {
      // Not streaming — show full content immediately, cancel any pending interval
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      setDisplayQueue(content);
      return;
    }

    // Streaming just started — reset queue
    if (displayQueue === '' && content === '') return;

    // If content jumps ahead (skipping characters), reset and type from new position
    if (!content.startsWith(displayQueue) && displayQueue !== '') {
      setDisplayQueue('');
    }

    // Start typing new characters that aren't in displayQueue yet
    const targetIndex = displayQueue.length;

    // If displayQueue already matches content, nothing to type
    if (displayQueue === content) {
      return;
    }

    // If displayQueue is behind content, type the next character
    if (content.length > displayQueue.length) {
      typewriterRef.current = setInterval(() => {
        setDisplayQueue(prev => {
          if (prev === content) {
            if (typewriterRef.current) clearInterval(typewriterRef.current);
            return prev;
          }
          const nextIndex = prev.length;
          if (nextIndex < content.length) {
            return prev + content[nextIndex];
          }
          return prev;
        });
      }, 3);
    }

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    };
  }, [content, isStreaming]);

  // When not streaming, show full content
  const renderedContent = isStreaming ? displayQueue : content;

  return (
    <div className={cn('typewriter-wrapper', className)} id={id}>
      <div className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkMath, remarkGfm]}
          rehypePlugins={[[rehypeHighlight, { ignoreMissing: true }], rehypeRaw]}
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
              <blockquote className="border-l-4 border-accent/60 bg-blue-50/50 pl-4 py-2 my-3 rounded-r text-text-primary/80">
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
                return <MermaidChart chart={extractText(children).replace(/\n$/, '')} />;
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
      </div>
      <div className={cn('typewriter-gradient', !isStreaming && 'hidden')} />
    </div>
  );
}
