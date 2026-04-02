'use client';

import { useState } from 'react';

interface ThinkingBlockProps {
  thinking: string;
  isStreaming?: boolean;
}

export function ThinkingBlock({ thinking, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  if (!thinking) return null;

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span>{isStreaming ? 'Thinking…' : 'Thought process'}</span>
      </button>
      {expanded && (
        <div className="chat-thinking-open mt-1.5 ml-4 pl-3 border-l-2 border-border">
          <pre className="text-xs text-text-secondary font-mono whitespace-pre-wrap leading-relaxed">
            {thinking}
          </pre>
        </div>
      )}
    </div>
  );
}
