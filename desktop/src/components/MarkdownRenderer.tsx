import { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '../store';

interface Props {
  content: string;
  className?: string;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-400 hover:bg-white/10 hover:text-gray-200 transition-colors"
      title="Copy code"
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Copied</span>
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
          </svg>
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function useIsDark() {
  const theme = useStore((s) => s.theme);
  return (
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );
}

export function MarkdownRenderer({ content, className = '' }: Props) {
  const isDark = useIsDark();

  return (
    <div className={`prose max-w-none select-text ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className: codeClassName, children, ...props }) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const codeString = String(children).replace(/\n$/, '');

            if (match) {
              return (
                <div className="group relative my-4 rounded-[10px] overflow-hidden border border-white/5">
                  {/* Header bar */}
                  <div className="flex items-center justify-between bg-[#2d2d2d] px-4 py-1.5">
                    <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                      {match[1]}
                    </span>
                    <CopyButton text={codeString} />
                  </div>
                  <SyntaxHighlighter
                    style={isDark ? oneDark : oneDark}
                    language={match[1]}
                    PreTag="div"
                    customStyle={{
                      margin: 0,
                      borderRadius: 0,
                      fontSize: '0.8125rem',
                      lineHeight: '1.6',
                      background: '#1e1e1e',
                      padding: '1em 1.25em',
                    }}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              );
            }

            return (
              <code
                className={`rounded bg-muted px-1.5 py-0.5 text-[0.8125em] font-mono text-primary ${codeClassName || ''}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="my-4 overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full">{children}</table>
              </div>
            );
          },
          a({ href, children }) {
            const handleClick = (e: React.MouseEvent) => {
              e.preventDefault();
              if (href) {
                window.open(href, '_blank');
              }
            };
            return (
              <a
                href={href}
                onClick={handleClick}
                className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary cursor-pointer"
              >
                {children}
              </a>
            );
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary bg-muted/50 rounded-r-lg px-4 py-3 my-4 not-italic">
                {children}
              </blockquote>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
