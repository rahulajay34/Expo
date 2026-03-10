'use client';

import { useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Save, Code2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { AGENT_COLORS } from '@/lib/constants';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import type { AgentName } from '@/lib/types';

const REVIEW_AGENTS: AgentName[] = ['Sanitizer', 'Reviewer', 'Refiner'];

export function MarkdownEditor() {
  const content = useAppStore((s) => s.content);
  const setContent = useAppStore((s) => s.setContent);
  const topic = useAppStore((s) => s.topic);
  const currentAgent = useAppStore((s) => s.currentAgent);
  const steps = useAppStore((s) => s.steps);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const lineCount = useMemo(() => (content ?? '').split('\n').length, [content]);
  const { copied, copy } = useCopyToClipboard();

  // Sync scroll between line numbers and textarea
  const handleScroll = useCallback(() => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const handleSaveMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'content'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Determine active review agent for border color
  const activeReviewAgent = REVIEW_AGENTS.find((a) => a === currentAgent);
  const borderColor = activeReviewAgent
    ? AGENT_COLORS[activeReviewAgent].border
    : 'border-border/50';

  // Get active review agent badges
  const activeReviewSteps = steps.filter(
    (s) =>
      REVIEW_AGENTS.includes(s.agent) &&
      (s.status === 'working' || s.status === 'complete')
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`flex h-full flex-col overflow-hidden rounded-lg border-2 bg-card transition-colors duration-500 ${borderColor}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Code2 className="size-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">
            Markdown Editor
          </span>
          {activeReviewSteps.map((step) => (
            <Badge
              key={step.agent}
              className={`h-4 px-1.5 text-[10px] ${AGENT_COLORS[step.agent].bg} ${AGENT_COLORS[step.agent].text}`}
            >
              {step.agent}
              {step.status === 'working' && (
                <span className="ml-1 animate-pulse">...</span>
              )}
            </Badge>
          ))}
        </div>
        <Button
          size="xs"
          variant="ghost"
          onClick={handleSaveMarkdown}
          disabled={!content}
          className="gap-1 text-xs"
        >
          <Save className="size-3" />
          Save .md
        </Button>
      </div>

      {/* Editor body with line numbers */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Copy button */}
        {content && (
          <Button
            size="icon-xs"
            variant="ghost"
            onClick={() => copy(content)}
            className="absolute right-2 top-2 z-10 opacity-100 transition-opacity"
            aria-label="Copy markdown"
          >
            {copied ? (
              <Check className="size-3 text-green-500" />
            ) : (
              <Copy className="size-3" />
            )}
          </Button>
        )}

        {/* Line numbers */}
        <div
          ref={lineNumbersRef}
          className="pointer-events-none w-12 shrink-0 overflow-hidden border-r bg-muted/30 py-3 text-right"
          aria-hidden="true"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div
              key={i}
              className="px-2 font-mono text-xs leading-[1.625rem] text-muted-foreground/50"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onScroll={handleScroll}
          placeholder="Generated content will appear here..."
          spellCheck={false}
          className="flex-1 resize-none bg-transparent px-4 py-3 font-mono text-sm leading-[1.625rem] text-foreground outline-none placeholder:text-muted-foreground/50 dark:bg-transparent"
          style={{ tabSize: 2 }}
        />
      </div>
    </motion.div>
  );
}
