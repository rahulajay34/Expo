'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { CountUp } from '@/components/CountUp';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';
import type { ContentLength } from '@/lib/types';

interface LiveContentMetricsProps {
  /** Raw markdown content being streamed */
  content: string;
  /** Whether generation is currently active */
  isStreaming: boolean;
  /** Whether generation has completed at least once */
  isComplete: boolean;
  /** Requested content length setting */
  contentLength?: ContentLength;
}

/** Expected word count ranges per content length setting */
const LENGTH_TARGETS: Record<ContentLength, { min: number; max: number }> = {
  concise: { min: 300, max: 600 },
  short: { min: 500, max: 1000 },
  normal: { min: 1000, max: 2000 },
  long: { min: 2000, max: 3500 },
  explanatory: { min: 3000, max: 5000 },
};

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countSections(text: string): number {
  const matches = text.match(/^#{1,3}\s+.+$/gm);
  return matches ? matches.length : 0;
}

function estimateReadingTime(wordCount: number): string {
  const minutes = Math.ceil(wordCount / 200);
  if (minutes < 1) return '<1 min';
  return `~${minutes} min`;
}

/**
 * Thin metrics bar showing live content statistics during generation.
 * Updates every 500ms via debounced content analysis.
 */
export function LiveContentMetrics({ content, isStreaming, isComplete, contentLength }: LiveContentMetricsProps) {
  const prefersReducedMotion = useReducedMotion();
  const transition = prefersReducedMotion ? reducedMotionTransition : springSnappy;

  // Debounce content analysis to every 500ms
  const [metrics, setMetrics] = useState({ words: 0, sections: 0 });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastContentRef = useRef('');

  useEffect(() => {
    // Skip if content hasn't changed
    if (content === lastContentRef.current) return;
    lastContentRef.current = content;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      setMetrics({
        words: countWords(content),
        sections: countSections(content),
      });
    }, isStreaming ? 500 : 0); // Immediate update when streaming stops

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [content, isStreaming]);

  const readingTime = useMemo(() => estimateReadingTime(metrics.words), [metrics.words]);

  // Length progress (only shown if contentLength is specified)
  const lengthProgress = useMemo(() => {
    if (!contentLength) return null;
    const target = LENGTH_TARGETS[contentLength];
    if (!target) return null;
    const progress = Math.min(1, metrics.words / target.max);
    const inRange = metrics.words >= target.min && metrics.words <= target.max;
    const overTarget = metrics.words > target.max;
    return { progress, inRange, overTarget, target };
  }, [contentLength, metrics.words]);

  const visible = isStreaming || isComplete;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={transition}
          className="px-4 sm:px-8 py-1.5 border-b border-border bg-background/50 flex items-center gap-3 shrink-0 overflow-x-auto"
          aria-label="Content metrics"
          role="status"
        >
          {/* Word count */}
          <span className="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
            <CountUp value={metrics.words} duration={300} className="font-medium tabular-nums" />
            <span>{metrics.words === 1 ? 'word' : 'words'}</span>
          </span>

          <span className="text-text-secondary/30 text-xs select-none" aria-hidden="true">·</span>

          {/* Section count */}
          <span className="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
            <CountUp value={metrics.sections} duration={300} className="font-medium tabular-nums" />
            <span>{metrics.sections === 1 ? 'section' : 'sections'}</span>
          </span>

          <span className="text-text-secondary/30 text-xs select-none" aria-hidden="true">·</span>

          {/* Reading time */}
          <span className="text-xs text-text-secondary whitespace-nowrap">
            {readingTime} read
          </span>

          {/* Length progress */}
          {lengthProgress && isStreaming && (
            <>
              <span className="text-text-secondary/30 text-xs select-none" aria-hidden="true">·</span>
              <span className="flex items-center gap-1.5 text-xs text-text-secondary whitespace-nowrap">
                <span className="relative w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      backgroundColor: lengthProgress.overTarget
                        ? 'var(--warning, #f59e0b)'
                        : lengthProgress.inRange
                        ? 'var(--success)'
                        : 'var(--accent)',
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${Math.min(100, lengthProgress.progress * 100)}%` }}
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  />
                </span>
                <span className="tabular-nums">
                  {lengthProgress.inRange ? 'in range' : lengthProgress.overTarget ? 'over target' : `${Math.round(lengthProgress.progress * 100)}%`}
                </span>
              </span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
