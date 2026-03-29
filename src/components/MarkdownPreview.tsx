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
}

export function MarkdownPreview({ content, className, id }: MarkdownPreviewProps) {
  return (
    <div id={id} className={cn('markdown-body', className)}>
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
              return <MermaidChart chart={String(children).replace(/\n$/, '')} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
