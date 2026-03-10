'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Undo2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useAppStore } from '@/lib/store';
import { usePipeline } from '@/lib/hooks/use-pipeline';

// ---------------------------------------------------------------------------
// Score color helpers
// ---------------------------------------------------------------------------

function scoreColor(score: number): string {
  if (score >= 8) return 'text-emerald-500';
  if (score >= 6) return 'text-amber-500';
  return 'text-red-500';
}

function scoreStrokeColor(score: number): string {
  if (score >= 8) return 'stroke-emerald-500';
  if (score >= 6) return 'stroke-amber-500';
  return 'stroke-red-500';
}

function scoreTrackColor(score: number): string {
  if (score >= 8) return 'stroke-emerald-500/20';
  if (score >= 6) return 'stroke-amber-500/20';
  return 'stroke-red-500/20';
}

function scoreBarBg(score: number): string {
  if (score >= 8) return 'bg-emerald-500';
  if (score >= 6) return 'bg-amber-500';
  return 'bg-red-500';
}

// ---------------------------------------------------------------------------
// Circular Progress SVG
// ---------------------------------------------------------------------------

const CIRCLE_RADIUS = 40;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

function CircularScore({ score }: { score: number }) {
  const percentage = (score / 10) * 100;
  const dashOffset =
    CIRCLE_CIRCUMFERENCE - (percentage / 100) * CIRCLE_CIRCUMFERENCE;

  return (
    <div className="relative flex items-center justify-center">
      <svg
        width="100"
        height="100"
        viewBox="0 0 100 100"
        className="-rotate-90"
      >
        {/* Track */}
        <circle
          cx="50"
          cy="50"
          r={CIRCLE_RADIUS}
          fill="none"
          strokeWidth="8"
          className={scoreTrackColor(score)}
        />
        {/* Progress */}
        <motion.circle
          cx="50"
          cy="50"
          r={CIRCLE_RADIUS}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={scoreStrokeColor(score)}
          initial={{ strokeDashoffset: CIRCLE_CIRCUMFERENCE }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ strokeDasharray: CIRCLE_CIRCUMFERENCE }}
        />
      </svg>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold tabular-nums ${scoreColor(score)}`}>
          {score}
        </span>
        <span className="text-[10px] text-muted-foreground">/10</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dimension Score Bar
// ---------------------------------------------------------------------------

function DimensionBar({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className={`text-xs font-medium tabular-nums ${scoreColor(score)}`}>
          {score}/10
        </span>
      </div>
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(score / 10) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${scoreBarBg(score)}`}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function QualityScore() {
  const instructorQuality = useAppStore((s) => s.instructorQuality);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const previousContent = useAppStore((s) => s.previousContent);
  const undoToPrevious = useAppStore((s) => s.undoToPrevious);
  const { refineContent } = usePipeline();

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  if (!instructorQuality) return null;

  const dimensions = [
    { label: 'Clarity', score: instructorQuality.clarity },
    { label: 'Examples', score: instructorQuality.examples },
    { label: 'Depth', score: instructorQuality.depth },
    { label: 'Engagement', score: instructorQuality.engagement },
  ];

  const hasFeedback =
    (instructorQuality.summary && instructorQuality.summary.length > 0) ||
    (instructorQuality.suggestions && instructorQuality.suggestions.length > 0);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="card-lift overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="space-y-4">
            {/* Top row: circular score + dimension bars + actions */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              {/* Circular overall score */}
              <div className="flex shrink-0 flex-col items-center gap-1">
                <CircularScore score={instructorQuality.overall} />
                <span className="text-xs font-medium text-muted-foreground">
                  Overall Quality
                </span>
              </div>

              {/* Dimension bars */}
              <div className="flex-1 space-y-2.5">
                {dimensions.map((d) => (
                  <DimensionBar
                    key={d.label}
                    label={d.label}
                    score={d.score}
                  />
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex shrink-0 flex-col gap-2 sm:self-center">
                <Button
                  size="sm"
                  onClick={refineContent}
                  disabled={isGenerating}
                  className="gap-1.5"
                >
                  {isGenerating ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="size-3.5" />
                  )}
                  Refine Content
                </Button>
                {previousContent !== null && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={undoToPrevious}
                    disabled={isGenerating}
                    className="gap-1.5"
                  >
                    <Undo2 className="size-3.5" />
                    Undo to Previous
                  </Button>
                )}
              </div>
            </div>

            {/* Expandable feedback section */}
            {hasFeedback && (
              <Collapsible open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex w-full items-center justify-between px-2 hover:bg-muted/50"
                  >
                    <span className="text-xs font-medium text-muted-foreground">
                      Review Feedback
                    </span>
                    <ChevronDown
                      className={`size-3.5 text-muted-foreground transition-transform duration-200 ${
                        feedbackOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3 mt-2"
                  >
                    {instructorQuality.summary && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {instructorQuality.summary}
                      </p>
                    )}
                    {instructorQuality.suggestions &&
                      instructorQuality.suggestions.length > 0 && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            Suggestions for improvement:
                          </span>
                          <ul className="space-y-0.5">
                            {instructorQuality.suggestions.map((s, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-muted-foreground"
                              >
                                <span className="mt-0.5 shrink-0 text-muted-foreground/60">
                                  -
                                </span>
                                {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
