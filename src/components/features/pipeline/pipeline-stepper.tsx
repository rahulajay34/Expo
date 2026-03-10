'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  BarChart3,
  PenTool,
  Shield,
  CheckCircle,
  Sparkles,
  FileText,
  Loader2,
  Check,
  X,
  SlashIcon,
  ChevronDown,
  Timer,
  RotateCw,
  Pause,
  Play,
  SkipForward,
  HelpCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedCheckmark } from '@/components/ui/animated-checkmark';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { usePipeline } from '@/lib/hooks/use-pipeline';
import { AGENT_COLORS, AGENT_DESCRIPTIONS } from '@/lib/constants';
import type { AgentName, AgentStatus } from '@/lib/types';

const AGENT_ICON_MAP: Record<AgentName, React.ComponentType<{ className?: string }>> = {
  CourseDetector: Search,
  Analyzer: BarChart3,
  Creator: PenTool,
  Sanitizer: Shield,
  Reviewer: CheckCircle,
  Refiner: Sparkles,
  Formatter: FileText,
};

const ESTIMATED_TIMES: Record<AgentName, number> = {
  CourseDetector: 5,
  Analyzer: 15,
  Creator: 40,
  Sanitizer: 10,
  Reviewer: 8,
  Refiner: 10,
  Formatter: 5,
};

const AGENT_TOOLTIPS: Record<AgentName, string> = {
  CourseDetector: 'Identifies the academic domain and prerequisites',
  Analyzer: 'Evaluates transcript coverage of subtopics',
  Creator: 'Generates the main content using AI',
  Sanitizer: 'Removes hallucinations and validates accuracy',
  Reviewer: 'Scores content quality across 6 dimensions',
  Refiner: 'Improves content based on review feedback',
  Formatter: 'Applies clean markdown formatting',
};

/** Raw CSS color values for agent progress bars (not Tailwind classes). */
const AGENT_BAR_COLORS: Record<AgentName, string> = {
  CourseDetector: 'oklch(0.60 0.18 250)',
  Analyzer: 'oklch(0.55 0.20 300)',
  Creator: 'oklch(0.60 0.17 155)',
  Sanitizer: 'oklch(0.72 0.17 85)',
  Reviewer: 'oklch(0.60 0.20 15)',
  Refiner: 'oklch(0.62 0.15 200)',
  Formatter: 'oklch(0.55 0.22 270)',
};

function LiveTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime]);

  return (
    <span className="tabular-nums text-xs text-muted-foreground">
      {elapsed}s
    </span>
  );
}

function AgentProgressBar({
  agent,
  startTime,
}: {
  agent: AgentName;
  startTime: number;
}) {
  const [progress, setProgress] = useState(0);
  const estimatedMs = (ESTIMATED_TIMES[agent] || 10) * 1000;
  const barColor = AGENT_BAR_COLORS[agent];
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Asymptotic curve: approaches 95% but never reaches 100%
      const pct = Math.min(95, (elapsed / estimatedMs) * 80);
      setProgress(pct);
    }, 200);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startTime, estimatedMs]);

  // If we can't give a meaningful estimate (progress still near 0), show indeterminate shimmer
  const isIndeterminate = progress < 2;

  return (
    <div
      className="relative h-[2px] w-full overflow-hidden rounded-full"
      style={{ backgroundColor: `color-mix(in oklch, ${barColor} 15%, transparent)` }}
    >
      {isIndeterminate ? (
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${barColor} 50%, transparent 100%)`,
            animation: 'agent-progress-shimmer 1.5s ease-in-out infinite',
          }}
        />
      ) : (
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3, ease: 'linear' }}
        />
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: AgentStatus }) {
  switch (status) {
    case 'working':
      return <Loader2 className="size-4 animate-spin text-amber-500" />;
    case 'complete':
      return <Check className="size-4 text-emerald-500" />;
    case 'error':
      return <X className="size-4 text-destructive" />;
    case 'skipped':
      return <SlashIcon className="size-4 text-muted-foreground" />;
    default:
      return <div className="size-4 rounded-full border-2 border-muted-foreground/30" />;
  }
}

// ---------------------------------------------------------------------------
// Pipeline Skeleton — shown when generation is starting but steps haven't
// been populated yet (isGenerating === true, steps.length === 0)
// ---------------------------------------------------------------------------

const SKELETON_AGENT_NAMES = [
  'CourseDetector',
  'Analyzer',
  'Creator',
  'Sanitizer',
  'Reviewer',
  'Refiner',
  'Formatter',
];

function PipelineStepperSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        {/* Skeleton header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="size-6 rounded-full border-2 border-card" />
              ))}
            </div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-10 rounded-full" />
          </div>
          <Skeleton className="size-4" />
        </div>

        {/* Skeleton steps */}
        <CardContent className="space-y-1 border-t pt-3">
          {SKELETON_AGENT_NAMES.map((name, i) => (
            <div
              key={name}
              className="flex items-center gap-3 rounded-md px-3 py-2"
            >
              <Skeleton className="size-8 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-4 w-24" style={{ width: `${60 + (i % 3) * 16}px` }} />
                <Skeleton className="h-3 w-40" style={{ width: `${100 + (i % 4) * 20}px` }} />
              </div>
              <Skeleton className="size-4 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/** Which agents mark the end of each pause-point phase. */
const PHASE_BOUNDARY_AGENTS: AgentName[] = ['Creator', 'Reviewer'];

function PipelinePauseBar() {
  const pauseMessage = useAppStore((s) => s.pauseMessage);
  const pauseReason = useAppStore((s) => s.pauseReason);
  const { resumePipeline, skipRemainingAgents } = usePipeline();

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.25 }}
      className="border-t border-amber-500/30 bg-amber-500/5 px-4 py-3 dark:bg-amber-500/10"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
          <Pause className="size-3.5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
            Pipeline Paused
          </p>
          <p className="mt-0.5 text-xs text-amber-600/80 dark:text-amber-400/80">
            {pauseMessage ?? 'Review the generated content. Edit if needed, then continue.'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={resumePipeline}
              className="h-7 gap-1.5 bg-amber-600 px-3 text-xs text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              <Play className="size-3" />
              {pauseReason === 'after-creator' ? 'Continue to Review' : 'Continue to Refinement'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={skipRemainingAgents}
              className="h-7 gap-1.5 border-amber-500/30 px-3 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
            >
              <SkipForward className="size-3" />
              Skip &amp; Keep Current
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function PipelineStepper() {
  const isGenerating = useAppStore((s) => s.isGenerating);
  const pipelinePaused = useAppStore((s) => s.pipelinePaused);
  const pauseReason = useAppStore((s) => s.pauseReason);
  const steps = useAppStore((s) => s.steps);
  const pipelineExpanded = useAppStore((s) => s.pipelineExpanded);
  const setPipelineExpanded = useAppStore((s) => s.setPipelineExpanded);

  // Calculate estimated time remaining
  const activeStepIndex = steps.findIndex((s) => s.status === 'working');
  const remainingEstimate = steps
    .slice(activeStepIndex >= 0 ? activeStepIndex : steps.length)
    .reduce((acc, step) => {
      if (step.status === 'pending' || step.status === 'working') {
        return acc + (ESTIMATED_TIMES[step.agent] || 10);
      }
      return acc;
    }, 0);

  const completedCount = steps.filter((s) => s.status === 'complete').length;

  // Show skeleton when generation is starting but steps haven't been populated
  if (isGenerating && steps.length === 0) {
    return <PipelineStepperSkeleton />;
  }

  if (!isGenerating && steps.length === 0) return null;
  if (steps.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="card-lift overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          {/* Header - always visible */}
          <Button
            variant="ghost"
            onClick={() => setPipelineExpanded(!pipelineExpanded)}
            className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <div className="flex -space-x-1">
                {steps.map((step) => (
                  <div
                    key={step.agent}
                    className={`flex size-6 items-center justify-center rounded-full border-2 border-card text-[10px] ${
                      step.status === 'complete'
                        ? 'bg-emerald-500/20 text-emerald-500'
                        : step.status === 'working'
                          ? 'bg-amber-500/20 text-amber-500'
                          : step.status === 'error'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {step.status === 'complete' ? (
                      <Check className="size-3" />
                    ) : step.status === 'working' ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <span>{steps.indexOf(step) + 1}</span>
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm font-medium">
                Pipeline {pipelinePaused ? 'Paused' : isGenerating ? 'Running' : completedCount === steps.length ? 'Complete' : 'Stopped'}
              </span>
              <Badge variant="secondary" className="text-[10px]">
                {completedCount}/{steps.length}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isGenerating && remainingEstimate > 0 && (
                <Badge variant="outline" className="gap-1 text-[10px]">
                  <Timer className="size-3" />
                  ~{remainingEstimate}s remaining
                </Badge>
              )}
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-200 ${
                  pipelineExpanded ? 'rotate-180' : ''
                }`}
              />
            </div>
          </Button>

          {/* Steps - collapsible */}
          <AnimatePresence>
            {pipelineExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="space-y-1 border-t pt-3">
                  {steps.map((step, index) => {
                    const Icon = AGENT_ICON_MAP[step.agent];
                    const colors = AGENT_COLORS[step.agent];
                    const isActive = step.status === 'working';
                    const isComplete = step.status === 'complete';

                    return (
                      <div key={step.agent}>
                        <motion.div
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className={`flex items-center gap-3 rounded-md px-3 py-2 transition-colors ${
                            isActive
                              ? 'bg-amber-500/5 dark:bg-amber-500/10'
                              : isComplete
                                ? 'bg-emerald-500/5 dark:bg-emerald-500/10'
                                : ''
                          }`}
                        >
                          {/* Agent icon */}
                          <div
                            className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${colors.bg}`}
                          >
                            <Icon className={`size-4 ${colors.text}`} />
                          </div>

                          {/* Agent info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-sm font-medium ${
                                  step.status === 'pending'
                                    ? 'text-muted-foreground'
                                    : 'text-foreground'
                                }`}
                              >
                                {step.agent}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="size-3.5 shrink-0 cursor-help text-muted-foreground/50 transition-colors hover:text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {AGENT_TOOLTIPS[step.agent]}
                                </TooltipContent>
                              </Tooltip>
                              {isActive && !step.retry && (
                                <Badge
                                  className="h-4 animate-pulse bg-amber-500/10 px-1.5 text-[10px] text-amber-600 dark:text-amber-400"
                                >
                                  Active
                                </Badge>
                              )}
                              {isActive && step.retry && (
                                <Badge
                                  className="h-4 animate-pulse bg-orange-500/10 px-1.5 text-[10px] text-orange-600 dark:text-orange-400"
                                >
                                  <RotateCw className="mr-0.5 size-2.5" />
                                  Retrying
                                </Badge>
                              )}
                            </div>
                            <p className="truncate text-xs text-muted-foreground">
                              {step.action || AGENT_DESCRIPTIONS[step.agent]}
                            </p>
                            {isActive && step.retry && (
                              <p className="mt-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                                Retrying... attempt {step.retry.attempt}/{step.retry.maxAttempts} (waiting {step.retry.delay}s)
                              </p>
                            )}
                          </div>

                          {/* Timer */}
                          <div className="flex shrink-0 items-center gap-2">
                            {isActive && step.startTime && (
                              <LiveTimer startTime={step.startTime} />
                            )}
                            {isComplete && step.startTime && step.endTime && (
                              <span className="tabular-nums text-xs text-muted-foreground">
                                {((step.endTime - step.startTime) / 1000).toFixed(1)}s
                              </span>
                            )}
                            <StatusIcon status={step.status} />
                          </div>
                        </motion.div>

                        {/* Agent progress bar — shown under the active agent row */}
                        {isActive && step.startTime && (
                          <div className="px-3 pb-1">
                            <AgentProgressBar
                              agent={step.agent}
                              startTime={step.startTime}
                            />
                          </div>
                        )}

                        {/* Visual pause-point divider between phases */}
                        {pipelinePaused &&
                          PHASE_BOUNDARY_AGENTS.includes(step.agent) &&
                          ((pauseReason === 'after-creator' && step.agent === 'Creator') ||
                            (pauseReason === 'after-reviewer' && step.agent === 'Reviewer')) && (
                          <div className="mx-3 my-1 flex items-center gap-2">
                            <div className="h-px flex-1 bg-amber-500/40" />
                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                              PAUSED
                            </span>
                            <div className="h-px flex-1 bg-amber-500/40" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pipeline pause action bar */}
          <AnimatePresence>
            {pipelinePaused && <PipelinePauseBar />}
          </AnimatePresence>

          {/* Success banner with animated checkmark — shown when all agents complete */}
          <AnimatePresence>
            {!isGenerating && !pipelinePaused && completedCount === steps.length && steps.length > 0 && (
              <motion.div
                key="pipeline-success"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 border-t border-emerald-500/30 bg-emerald-500/5 px-4 py-3 dark:bg-emerald-500/10"
              >
                <AnimatedCheckmark size={32} duration={1} />
                <div>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Pipeline Complete
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    All {steps.length} agents finished successfully.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
