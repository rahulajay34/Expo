'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

/**
 * Seeded pseudo-random number generator (mulberry32).
 * Produces deterministic widths so the skeleton doesn't re-randomize on re-render.
 */
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SkeletonBarProps {
  height: number;
  width: string;
  className?: string;
  reducedMotion: boolean | null;
}

function SkeletonBar({ height, width, className, reducedMotion }: SkeletonBarProps) {
  return (
    <div
      className={cn(
        'rounded-md',
        reducedMotion ? 'bg-[var(--border)]' : 'skeleton-shimmer',
        className
      )}
      style={{ height, width }}
    />
  );
}

interface ParagraphBlockProps {
  lineCount: number;
  lastLineWidth: string;
  reducedMotion: boolean | null;
}

function ParagraphBlock({ lineCount, lastLineWidth, reducedMotion }: ParagraphBlockProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lineCount - 1 }, (_, i) => (
        <SkeletonBar key={i} height={14} width="100%" reducedMotion={reducedMotion} />
      ))}
      <SkeletonBar height={14} width={lastLineWidth} reducedMotion={reducedMotion} />
    </div>
  );
}

export function GenerationSkeleton() {
  const reducedMotion = useReducedMotion();

  const sections = useMemo(() => {
    const rng = mulberry32(42);

    // Generate 3 sections with slightly varied last-line widths
    return [
      {
        headingWidth: '60%',
        headingHeight: 28,
        lineCount: 3,
        lastLineWidth: `${Math.round(50 + rng() * 30)}%`, // 50-80%
      },
      {
        headingWidth: '40%',
        headingHeight: 20,
        lineCount: 4,
        lastLineWidth: `${Math.round(50 + rng() * 30)}%`,
      },
      {
        headingWidth: '35%',
        headingHeight: 20,
        lineCount: 3,
        lastLineWidth: `${Math.round(50 + rng() * 30)}%`,
      },
    ];
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, position: 'absolute' as any, width: '100%', top: 0, left: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
      className="max-w-4xl mx-auto"
      aria-hidden="true"
    >
      <div className="space-y-6">
        {sections.map((section, i) => (
          <div key={i} className="space-y-4">
            {/* Heading bar */}
            <SkeletonBar
              height={section.headingHeight}
              width={section.headingWidth}
              reducedMotion={reducedMotion}
              className={i === 0 ? 'mb-4' : 'mb-4'}
            />

            {/* Paragraph lines */}
            <ParagraphBlock
              lineCount={section.lineCount}
              lastLineWidth={section.lastLineWidth}
              reducedMotion={reducedMotion}
            />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
