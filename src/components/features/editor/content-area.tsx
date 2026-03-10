'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { MarkdownEditor } from './markdown-editor';
import { MarkdownPreview } from './markdown-preview';
import { AssignmentWorkspace } from './assignment-workspace';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { Pencil } from 'lucide-react';

// ---------------------------------------------------------------------------
// Pipeline Pause Banner — shown above the content area when the pipeline
// is paused, indicating the user can freely edit the content.
// ---------------------------------------------------------------------------

function PipelinePauseBanner() {
  const pauseReason = useAppStore((s) => s.pauseReason);

  const message =
    pauseReason === 'after-creator'
      ? 'Pipeline paused — edit content freely, then continue.'
      : 'Pipeline paused — review feedback applied, then continue to refinement.';

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300"
    >
      <Pencil className="size-3.5 shrink-0" />
      <span>{message}</span>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Content Streaming Skeleton — pulsing line placeholders shown while waiting
// for the first content to arrive from the AI pipeline
// ---------------------------------------------------------------------------

function ContentStreamingSkeleton() {
  return (
    <motion.div
      key="streaming-skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="flex h-full min-h-[500px] flex-col rounded-lg border-2 border-border/50 bg-card"
    >
      {/* Simulated editor header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Skeleton className="size-4" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-md" />
      </div>

      {/* Pulsing line skeletons simulating content appearing */}
      <div className="flex-1 p-4 space-y-3">
        {/* Title-like skeleton */}
        <Skeleton className="h-6 w-[45%]" />
        <div className="h-2" />

        {/* Paragraph-like skeletons */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[94%]" />
        <Skeleton className="h-4 w-[88%]" />
        <Skeleton className="h-4 w-[97%]" />
        <Skeleton className="h-4 w-[72%]" />

        <div className="h-2" />

        {/* Subheading-like skeleton */}
        <Skeleton className="h-5 w-[35%]" />
        <div className="h-1" />

        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[91%]" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-4 w-[78%]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-[65%]" />
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// LiveContentStats — real-time word/character count shown below content area
// ---------------------------------------------------------------------------

function LiveContentStats({ content }: { content: string }) {
  const stats = useMemo(() => {
    if (!content) return { words: 0, characters: 0 };
    const trimmed = content.trim();
    const words = trimmed ? trimmed.split(/\s+/).length : 0;
    return { words, characters: content.length };
  }, [content]);

  return (
    <div className="flex items-center justify-end gap-3 px-3 py-1.5">
      <span className="text-xs text-muted-foreground">
        {stats.words.toLocaleString()} words &middot; {stats.characters.toLocaleString()} characters
      </span>
    </div>
  );
}

// Tab index map for directional slide animation
const TAB_INDEX: Record<string, number> = {
  lecture: 0,
  'pre-read': 1,
  assignment: 2,
};

export function ContentArea() {
  const contentType = useAppStore((s) => s.contentType);
  const previewFullscreen = useAppStore((s) => s.previewFullscreen);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const content = useAppStore((s) => s.content);
  const pipelinePaused = useAppStore((s) => s.pipelinePaused);

  // Track slide direction based on tab order changes.
  // We use the React "derived state from props" pattern:
  // store the previous type alongside the computed direction,
  // updating them during render when the type changes.
  const [slideState, setSlideState] = useState({
    prevType: contentType,
    direction: 1,
  });

  if (contentType !== slideState.prevType) {
    const newDir =
      (TAB_INDEX[contentType] ?? 0) >= (TAB_INDEX[slideState.prevType] ?? 0) ? 1 : -1;
    setSlideState({ prevType: contentType, direction: newDir });
  }

  const direction = slideState.direction;

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir * 20,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir * -20,
      opacity: 0,
    }),
  };

  // Show streaming skeleton when generating but no content has arrived yet
  if (isGenerating && !content) {
    return <ContentStreamingSkeleton />;
  }

  // Pulse border class when generating
  const pulseBorderClass = isGenerating
    ? 'border-2 rounded-lg animate-pulse-border'
    : '';

  return (
    <AnimatePresence mode="wait" custom={direction}>
      {contentType === 'assignment' ? (
        <motion.div
          key="assignment"
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="h-full min-h-[500px]"
        >
          <AnimatePresence>
            {pipelinePaused && <PipelinePauseBanner />}
          </AnimatePresence>
          <AssignmentWorkspace />
        </motion.div>
      ) : (
        <motion.div
          key={`markdown-${contentType}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`h-full min-h-[500px] flex flex-col ${pulseBorderClass}`}
          style={
            isGenerating
              ? { animation: 'pulse-border 2s ease-in-out infinite' }
              : undefined
          }
        >
          <AnimatePresence>
            {pipelinePaused && <PipelinePauseBanner />}
          </AnimatePresence>
          <div className="flex-1 min-h-0">
            <AnimatePresence mode="wait">
              {previewFullscreen ? (
                <motion.div
                  key="fullscreen-preview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <MarkdownPreview />
                </motion.div>
              ) : (
                <motion.div
                  key="split-view"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full"
                >
                  <ResizablePanelGroup orientation="horizontal" className="rounded-lg">
                    <ResizablePanel defaultSize={50} minSize={30} className="markdown-editor-panel">
                      <MarkdownEditor />
                    </ResizablePanel>
                    <ResizableHandle withHandle />
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <MarkdownPreview />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live word/character count stats bar */}
          {content && <LiveContentStats content={content} />}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
