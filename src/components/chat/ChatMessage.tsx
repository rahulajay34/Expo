'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { ChatMessage as ChatMessageType } from '@/lib/chat-types';
import { ThinkingBlock } from './ThinkingBlock';
import { HtmlPreview } from './HtmlPreview';
import { useToast } from '@/components/ui/Toast';

function MermaidBlock({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        const isDark = document.documentElement.classList.contains('dark');
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
        });
        const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, content);
        if (!cancelled) setSvg(renderedSvg);
      } catch (e) {
        if (!cancelled) setError('Failed to render diagram');
      }
    })();
    return () => { cancelled = true; };
  }, [content]);

  if (error) {
    return <p className="text-xs text-danger italic">{error}</p>;
  }
  if (!svg) {
    return <p className="text-xs text-text-secondary italic">Rendering diagram…</p>;
  }
  return (
    <div
      ref={containerRef}
      className="my-3 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

interface ChatMessageProps {
  message: ChatMessageType;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  conversationId: string;
}

export function ChatMessage({
  message,
  isStreaming,
  onRegenerate,
  conversationId,
}: ChatMessageProps) {
  const { showToast } = useToast();
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const isUser = message.role === 'user';

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyState('copied');
      showToast('Copied to clipboard', 'success');
      setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      showToast('Failed to copy', 'error');
    }
  }, [message.content, showToast]);

  // Extract HTML code blocks for preview
  const htmlBlocks: string[] = [];
  const htmlBlockRegex = /```html\n([\s\S]*?)```/g;
  let match;
  while ((match = htmlBlockRegex.exec(message.content)) !== null) {
    htmlBlocks.push(match[1]);
  }

  return (
    <div
      className={`group flex ${isUser ? 'justify-end' : 'justify-start'} ${
        isUser ? 'chat-msg-user-enter' : 'chat-msg-ai-enter'
      }`}
    >
      <div
        className={`relative max-w-[85%] ${
          isUser
            ? 'bg-accent/10 rounded-2xl rounded-br-md px-4 py-2.5'
            : 'rounded-2xl rounded-bl-md px-1 py-1'
        }`}
      >
        {/* Thinking block for AI messages */}
        {!isUser && message.thinking && (
          <ThinkingBlock thinking={message.thinking} isStreaming={isStreaming} />
        )}

        {/* Attachments for user messages */}
        {isUser && message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.attachments.map((att, i) => (
              <span
                key={i}
                className="text-xs bg-accent/5 border border-accent/20 rounded px-2 py-0.5 text-text-secondary"
              >
                {att.name}
              </span>
            ))}
          </div>
        )}

        {/* Message content */}
        {isUser ? (
          <div className="text-sm text-text-primary whitespace-pre-wrap">
            {message.content}
          </div>
        ) : (
          <div className="markdown-body text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeHighlight, rehypeRaw, rehypeKatex]}
              components={{
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse border border-border rounded-md text-sm">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-border bg-sidebar px-3 py-2 text-left text-xs font-semibold text-text-primary">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-border px-3 py-2 text-text-secondary">
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-3 border-accent/40 bg-accent/5 pl-4 py-2 my-3 rounded-r text-text-secondary">
                    {children}
                  </blockquote>
                ),
                code: ({ className, children, ...props }) => {
                  const lang = className?.replace('language-', '');

                  if (lang === 'mermaid') {
                    return <MermaidBlock content={String(children).trim()} />;
                  }

                  const isBlock = className?.includes('language-');
                  if (isBlock) {
                    return (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="bg-code-bg border border-border rounded px-1.5 py-0.5 text-xs font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => (
                  <pre className="bg-code-bg border border-border rounded-md p-4 my-3 overflow-x-auto text-xs chat-code-expand">
                    {children}
                  </pre>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>

            {/* Streaming cursor */}
            {isStreaming && (
              <span className="chat-streaming-cursor" />
            )}
          </div>
        )}

        {/* HTML previews */}
        {!isUser &&
          !isStreaming &&
          htmlBlocks.map((html, i) => (
            <HtmlPreview
              key={`${message.id}-html-${i}`}
              html={html}
              conversationId={conversationId}
            />
          ))}

        {/* Action buttons (hover) */}
        {!isStreaming && (
          <div className="chat-actions absolute -top-3 right-2 flex gap-1">
            <button
              onClick={handleCopy}
              className="p-1 rounded bg-card-bg border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
              title="Copy"
            >
              {copyState === 'copied' ? (
                <svg className="w-3.5 h-3.5 text-success chat-copy-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            {!isUser && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="p-1 rounded bg-card-bg border border-border shadow-sm text-text-secondary hover:text-text-primary transition-colors"
                title="Regenerate"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
