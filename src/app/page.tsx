'use client';

import { useState, useRef, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { GenerationInput, StreamingState, PipelineStage, PIPELINE_STAGES, AIProvider, ChunkProgress, ContentLength, ContentType, CSVRow } from '@/lib/types';
import { getContentById } from '@/lib/storage';
import { runPipeline } from '@/lib/ai/pipeline';
import { saveContent } from '@/lib/storage';
import { streamCompletion } from '@/lib/ai/client';
import { loadPrompt, fillPrompt } from '@/lib/ai/prompts';
import { downloadCSV, parseAssignmentMarkdown } from '@/lib/export/csv';
import { AIProviderError, RateLimitError, TimeoutError } from '@/lib/errors';
import { GenerationForm } from '@/components/GenerationForm';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { GenerationSkeleton } from '@/components/GenerationSkeleton';
import { ExportMenu } from '@/components/ExportMenu';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn, countWords, getErrorMessage, copyToClipboard } from '@/lib/utils';
import { navigateWithTransition } from '@/lib/view-transitions';
import { useGenerationContext, VelocityBand } from '@/lib/generation-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AmbientLines } from '@/components/AmbientLines';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { StreamSpeedTracker } from '@/lib/stream-speed';
import { staggerContainer, fadeInUp, springSnappy, reducedMotionTransition } from '@/lib/motion';
import { PhysicsScrollWithRef, useParallaxLayers } from '@/components/PhysicsScroll';
import dynamic from 'next/dynamic';

// S-018: Lazy-load generation-only animation components — not needed until streaming starts
const TokenVelocityPulse = dynamic(
  () => import('@/components/TokenVelocityPulse').then(m => ({ default: m.TokenVelocityPulse })),
  { ssr: false }
);

const STAGE_LABELS: Record<string, string> = {
  [PIPELINE_STAGES.CREATOR]: 'Generating content',
  [PIPELINE_STAGES.REVIEWER]: 'Reviewing quality',
  [PIPELINE_STAGES.REFINER]: 'Refining issues',
  [PIPELINE_STAGES.CSV_CONVERTER]: 'Converting to CSV',
};

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture Notes',
  'pre-lecture': 'Pre-Lecture Notes',
  assignment: 'Assignment',
  'ta-guide': 'TA Session Guide',
};

const LENGTH_TARGETS: Record<ContentLength, { min: number; max: number }> = {
  concise: { min: 300, max: 600 },
  short: { min: 500, max: 1000 },
  normal: { min: 1000, max: 2000 },
  long: { min: 2000, max: 3500 },
  explanatory: { min: 3000, max: 5000 },
};

function countSections(text: string): number {
  const matches = text.match(/^#{1,3}\s+.+$/gm);
  return matches ? matches.length : 0;
}

function estimateReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / 200));
}

type CompactStageId = 'creator' | 'reviewer' | 'refiner';
const COMPACT_STAGES: { id: CompactStageId; label: string }[] = [
  { id: 'creator', label: 'Creator' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'refiner', label: 'Refiner' },
];

type MiniNodeStatus = 'pending' | 'active' | 'complete' | 'skipped';

function MiniStageNode({ status, reducedMotion }: { status: MiniNodeStatus; reducedMotion: boolean }) {
  const size = 14;
  const isActive = status === 'active';
  const isComplete = status === 'complete';
  const isSkipped = status === 'skipped';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {isActive && !reducedMotion && (
        <motion.span
          className="absolute inset-0 rounded-full"
          style={{ border: '1.5px solid var(--accent)' }}
          animate={{ scale: [1, 1.7, 1.9], opacity: [0.5, 0.15, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
          aria-hidden="true"
        />
      )}
      <span
        className="rounded-full block"
        style={{
          width: size,
          height: size,
          border: `1.5px solid ${isActive || isComplete ? 'var(--accent)' : 'var(--border)'}`,
          backgroundColor: isComplete ? 'var(--accent)' : 'transparent',
          opacity: isSkipped ? 0.5 : status === 'pending' ? 0.45 : 1,
        }}
      />
      {isComplete && (
        <svg
          className="absolute"
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="4 12 10 18 20 6" />
        </svg>
      )}
      {isActive && (
        <span
          className="absolute rounded-full"
          style={{ width: 5, height: 5, backgroundColor: 'var(--accent)' }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}

interface CompactGenerationStripProps {
  isGenerating: boolean;
  error: string | null;
  isComplete: boolean;
  activeStage: PipelineStage | undefined;
  pipelineCurrentStage: 'creator' | 'reviewer' | 'refiner' | 'complete' | null;
  pipelineSkippedStages: string[];
  elapsedSeconds: number;
  retryDisplay: string;
  velocityBand: VelocityBand;
  currentInput: GenerationInput | null;
  activeChunks?: ChunkProgress[];
  currentContent: string;
  savedId: string | null;
  onBack: () => void;
  onCopy: () => void;
  onOpen: () => void;
  onExportCSV?: () => void;
  onExportAICSV?: () => void;
  isExportingCSV?: boolean;
  onStop?: () => void;
}

function CompactGenerationStrip({
  isGenerating,
  error,
  isComplete,
  activeStage,
  pipelineCurrentStage,
  pipelineSkippedStages,
  elapsedSeconds,
  retryDisplay,
  velocityBand,
  currentInput,
  activeChunks,
  currentContent,
  savedId,
  onBack,
  onCopy,
  onOpen,
  onExportCSV,
  onExportAICSV,
  isExportingCSV,
  onStop,
}: CompactGenerationStripProps) {
  const reducedMotion = useReducedMotion() ?? false;

  // Derive node status for the mini timeline
  const getNodeStatus = (stageId: CompactStageId): MiniNodeStatus => {
    if (pipelineSkippedStages.includes(stageId)) return 'skipped';
    const order: CompactStageId[] = ['creator', 'reviewer', 'refiner'];
    const idx = order.indexOf(stageId);
    const currentIdx =
      pipelineCurrentStage === 'complete'
        ? 3
        : pipelineCurrentStage
        ? order.indexOf(pipelineCurrentStage)
        : -1;
    if (currentIdx === -1) return 'pending';
    if (idx < currentIdx) return 'complete';
    if (idx === currentIdx) return pipelineCurrentStage === 'complete' ? 'complete' : 'active';
    return 'pending';
  };

  const statusLabel = (() => {
    if (error) return 'Generation failed';
    if (!isGenerating && isComplete) return 'Generation complete';
    if (activeStage) {
      const name = activeStage.name;
      if (name === PIPELINE_STAGES.CREATOR) return 'Generating';
      if (name === PIPELINE_STAGES.REVIEWER) return 'Reviewing';
      if (name === PIPELINE_STAGES.REFINER) return 'Refining';
      return 'Processing';
    }
    return 'Processing';
  })();

  const words = currentContent ? countWords(currentContent) : 0;
  const sections = currentContent ? countSections(currentContent) : 0;
  const minutes = estimateReadingMinutes(words);
  const lengthTarget = currentInput?.contentLength ? LENGTH_TARGETS[currentInput.contentLength] : null;
  const lengthProgress = lengthTarget ? Math.min(1, words / lengthTarget.max) : null;
  const inLengthRange = lengthTarget ? words >= lengthTarget.min && words <= lengthTarget.max : false;
  const overLengthTarget = lengthTarget ? words > lengthTarget.max : false;

  const showChunkPills =
    isGenerating &&
    activeStage?.name === PIPELINE_STAGES.CREATOR &&
    activeStage.status === 'running' &&
    !!activeChunks &&
    activeChunks.length > 0;

  const showMetrics = words > 0;
  const showActions = !!savedId && !isGenerating;

  const tint = error
    ? 'bg-red-50/80 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
    : isGenerating
    ? 'bg-accent/5 border-border'
    : isComplete
    ? 'bg-success/5 border-border'
    : 'bg-background border-border';

  const dot = (
    <span className="text-text-secondary/40 text-xs select-none px-1" aria-hidden="true">
      ·
    </span>
  );

  return (
    <div
      className={cn(
        'shrink-0 border-b backdrop-blur-sm flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-1 px-3 sm:px-6 py-2 min-h-[48px]',
        tint,
      )}
      aria-live="polite"
      role="status"
    >
      {/* Left cluster: back + badge */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to form"
          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-text-secondary hover:text-text-primary hover:bg-sidebar transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        {currentInput && (
          <Badge variant={currentInput.type as 'lecture' | 'pre-lecture' | 'assignment' | 'ta-guide'}>
            {TYPE_LABELS[currentInput.type]}
          </Badge>
        )}
      </div>

      {dot}

      {/* Mini timeline */}
      <div
        className="flex items-center gap-1 shrink-0"
        aria-label="Pipeline progress"
        role="progressbar"
        aria-valuenow={
          pipelineCurrentStage === 'complete'
            ? 3
            : pipelineCurrentStage
            ? COMPACT_STAGES.findIndex(s => s.id === pipelineCurrentStage) + 1
            : 0
        }
        aria-valuemin={0}
        aria-valuemax={3}
      >
        {COMPACT_STAGES.map((stage, i) => {
          const s = getNodeStatus(stage.id);
          const filled = s === 'complete' || s === 'skipped';
          return (
            <div key={stage.id} className="flex items-center" title={stage.label}>
              <MiniStageNode status={s} reducedMotion={reducedMotion} />
              {i < COMPACT_STAGES.length - 1 && (
                <span
                  className="block mx-0.5 h-[1.5px] w-4 rounded-full"
                  style={{
                    backgroundColor: filled ? 'var(--accent)' : 'var(--border)',
                  }}
                  aria-hidden="true"
                />
              )}
            </div>
          );
        })}
      </div>

      {dot}

      {/* Status text */}
      <div className="flex items-center gap-1.5 shrink-0 min-w-0">
        {isGenerating && (
          <TokenVelocityPulse band={velocityBand} active={isGenerating} size={8} />
        )}
        <span
          className={cn(
            'text-xs font-medium tabular-nums truncate',
            error ? 'text-danger' : isGenerating ? 'text-accent' : isComplete ? 'text-success' : 'text-text-secondary',
          )}
        >
          {statusLabel}
          {isGenerating && elapsedSeconds > 0 && ` (${elapsedSeconds}s)`}
          {retryDisplay && ` — ${retryDisplay}`}
        </span>
        {isGenerating && velocityBand === 'stalled' && (
          <span className="text-[11px] text-text-secondary/60 italic shrink-0">thinking</span>
        )}
      </div>

      {/* Chunk pills (creator stage only) */}
      <AnimatePresence initial={false}>
        {showChunkPills && (
          <motion.div
            key="chunks"
            initial={reducedMotion ? false : { opacity: 0, width: 0 }}
            animate={reducedMotion ? undefined : { opacity: 1, width: 'auto' }}
            exit={reducedMotion ? undefined : { opacity: 0, width: 0 }}
            transition={reducedMotion ? reducedMotionTransition : springSnappy}
            className="flex items-center gap-1.5 shrink-0 overflow-hidden"
            aria-label="Content chunks"
          >
            {dot}
            {activeChunks!.map(chunk => (
              <span
                key={chunk.id}
                className={cn(
                  'inline-flex items-center gap-1 text-[11px] font-medium tabular-nums px-1.5 py-0.5 rounded',
                  chunk.status === 'done' && 'text-success bg-success/10',
                  chunk.status === 'running' && 'text-accent bg-accent/10',
                  chunk.status === 'pending' && 'text-text-secondary/70',
                  chunk.status === 'error' && 'text-danger bg-red-500/10',
                )}
                title={`${chunk.label} — ${chunk.status}`}
                aria-label={`${chunk.label} ${chunk.status}`}
              >
                <span>{chunk.label}</span>
                {chunk.status === 'done' && <span aria-hidden="true">✓</span>}
                {chunk.status === 'running' && (
                  <span
                    className="w-2.5 h-2.5 border border-accent/40 border-t-accent rounded-full animate-spin shrink-0"
                    aria-hidden="true"
                  />
                )}
                {chunk.status === 'pending' && <span aria-hidden="true">○</span>}
                {chunk.status === 'error' && <span aria-hidden="true">✗</span>}
              </span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics + actions cluster, pushed right */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <AnimatePresence initial={false}>
          {showMetrics && (
            <motion.div
              key="metrics"
              initial={reducedMotion ? false : { opacity: 0, x: 4 }}
              animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: 4 }}
              transition={reducedMotion ? reducedMotionTransition : springSnappy}
              className="flex items-center gap-1 text-[11px] text-text-secondary tabular-nums whitespace-nowrap"
              aria-label="Content metrics"
            >
              <span className="font-medium text-text-primary/80">{words}</span>
              <span>w</span>
              <span className="text-text-secondary/40 px-0.5">·</span>
              <span className="font-medium text-text-primary/80">{sections}</span>
              <span>s</span>
              <span className="text-text-secondary/40 px-0.5">·</span>
              <span>~{minutes}m</span>
              {lengthProgress !== null && isGenerating && (
                <>
                  <span className="text-text-secondary/40 px-0.5">·</span>
                  <span
                    className="relative w-10 h-1 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'var(--border)' }}
                    aria-label={
                      inLengthRange ? 'In target range' : overLengthTarget ? 'Over target' : `${Math.round(lengthProgress * 100)}% of target`
                    }
                  >
                    <span
                      className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-300"
                      style={{
                        width: `${Math.min(100, lengthProgress * 100)}%`,
                        backgroundColor: overLengthTarget
                          ? 'var(--warning, #f59e0b)'
                          : inLengthRange
                          ? 'var(--success)'
                          : 'var(--accent)',
                      }}
                    />
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* S-095: Stop button — desktop strip */}
        <AnimatePresence initial={false}>
          {isGenerating && onStop && (
            <motion.button
              key="stop"
              type="button"
              onClick={onStop}
              aria-label="Stop generation"
              initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
              animate={reducedMotion ? undefined : { opacity: 1, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
              transition={reducedMotion ? reducedMotionTransition : springSnappy}
              className="hidden sm:inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Stop
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence initial={false}>
          {showActions && (
            <motion.div
              key="actions"
              initial={reducedMotion ? false : { opacity: 0, x: 4 }}
              animate={reducedMotion ? undefined : { opacity: 1, x: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, x: 4 }}
              transition={reducedMotion ? reducedMotionTransition : springSnappy}
              className="flex items-center gap-1.5"
            >
              <Button variant="secondary" size="sm" onClick={onCopy}>
                Copy
              </Button>
              {currentInput?.type === 'assignment' && onExportCSV && onExportAICSV && (
                <ExportMenu
                  onExportCSV={onExportCSV}
                  onExportAICSV={onExportAICSV}
                  showCSV={true}
                  isExportingAI={isExportingCSV}
                />
              )}
              <Button size="sm" onClick={onOpen}>
                Open in Library →
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// S-044: Mobile generation overlay — fixed bottom, above mobile nav, md:hidden
interface MobileGenerationOverlayProps {
  isGenerating: boolean;
  pipelineCurrentStage: 'creator' | 'reviewer' | 'refiner' | 'complete' | null;
  elapsedSeconds: number;
  onStop?: () => void;
}

function MobileGenerationOverlay({
  isGenerating,
  pipelineCurrentStage,
  elapsedSeconds,
  onStop,
}: MobileGenerationOverlayProps) {
  const reducedMotion = useReducedMotion() ?? false;

  const stageName = (() => {
    if (!pipelineCurrentStage || pipelineCurrentStage === 'complete') return null;
    if (pipelineCurrentStage === 'creator') return 'Generating';
    if (pipelineCurrentStage === 'reviewer') return 'Reviewing';
    if (pipelineCurrentStage === 'refiner') return 'Refining';
    return 'Processing';
  })();

  const visible = isGenerating && !!pipelineCurrentStage && pipelineCurrentStage !== 'complete';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // bottom-14 = 56px = height of MobileBottomNav (h-14); safe-area handled by pb
          className="fixed bottom-14 left-0 right-0 z-40 md:hidden"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 8 }}
          transition={reducedMotion ? reducedMotionTransition : { type: 'spring', stiffness: 340, damping: 28 }}
          aria-live="polite"
          role="status"
          aria-label="Generation in progress"
        >
          <div
            className="mx-3 mb-2 rounded-xl border border-border bg-background/90 backdrop-blur-md px-4 py-3 shadow-lg"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center gap-3">
              {/* Animated spinner */}
              <span
                className="w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin shrink-0"
                aria-hidden="true"
              />

              {/* Stage name + elapsed */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary leading-tight truncate">
                  {stageName}
                </p>
                {elapsedSeconds > 0 && (
                  <p className="text-xs text-text-secondary tabular-nums mt-0.5">
                    {elapsedSeconds < 60 ? `${elapsedSeconds}s` : `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`}
                  </p>
                )}
              </div>

              {/* S-095: Stop button — mobile overlay, min 44x44 touch target */}
              {onStop && (
                <button
                  type="button"
                  onClick={onStop}
                  aria-label="Stop generation"
                  className="flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg border border-red-300 text-red-600 hover:bg-red-50 active:bg-red-100 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="4" y="4" width="16" height="16" rx="2" />
                  </svg>
                </button>
              )}
            </div>

            {/* Stage progress dots */}
            <div className="flex items-center gap-1.5 mt-2.5" aria-hidden="true">
              {(['creator', 'reviewer', 'refiner'] as const).map((stage) => {
                const stageOrder = ['creator', 'reviewer', 'refiner'];
                const currentIdx = pipelineCurrentStage ? stageOrder.indexOf(pipelineCurrentStage) : -1;
                const stageIdx = stageOrder.indexOf(stage);
                const isDone = stageIdx < currentIdx;
                const isActive = stageIdx === currentIdx;
                return (
                  <span
                    key={stage}
                    className="block rounded-full transition-all duration-300"
                    style={{
                      width: isActive ? 20 : 6,
                      height: 6,
                      backgroundColor: isDone || isActive ? 'var(--accent)' : 'var(--border)',
                      opacity: isDone ? 0.6 : 1,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center"><Skeleton className="w-64 h-8" /></div>}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setIsGenerating: setContextGenerating, reportTokenVelocity, velocityBand } = useGenerationContext();
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();
  const [streamState, setStreamState] = useState<StreamingState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInput, setCurrentInput] = useState<GenerationInput | null>(null);
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [error, setError] = useState<string | null>(null);
  const errorObjRef = useRef<unknown>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const finalContentRef = useRef('');
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoNavTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generationStartRef = useRef<number | null>(null);
  const elapsedSecondsRef = useRef(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const userScrolledUpRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const [retryDisplay, setRetryDisplay] = useState('');
  const [regenerateValues, setRegenerateValues] = useState<Partial<GenerationInput> | undefined>();
  const [thinkingExpanded, setThinkingExpanded] = useState(false);
  const toastedStageErrorsRef = useRef<Set<string>>(new Set());
  const speedTrackerRef = useRef<StreamSpeedTracker>(new StreamSpeedTracker());
  const [streamSpeed, setStreamSpeed] = useState(150);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);
  const [activeContentType, setActiveContentType] = useState<ContentType | null>(null);
  const formScrollRef = useRef<HTMLDivElement>(null);
  const { decorationY } = useParallaxLayers(formScrollRef, true);

  useEffect(() => {
    const regenId = searchParams.get('regenerate');
    if (regenId) {
      const item = getContentById(regenId);
      if (item) {
        setRegenerateValues({
          type: item.type,
          topic: item.title,
          provider: 'minimax' as AIProvider,
          sources: [],
          subtopics: item.metadata.subtopics,
          prerequisites: item.metadata.prerequisites,
          questionCounts: item.metadata.questionCounts,
        });
        showToast('Regenerating — review settings before creating', 'info');
      }
    }
  }, [searchParams, showToast]);

  useEffect(() => {
    setContextGenerating(isGenerating);
    if (!isGenerating) {
      reportTokenVelocity(0);
    }
  }, [isGenerating, setContextGenerating, reportTokenVelocity]);

  // Sample token velocity every 200ms and report to context (moving average of last 5)
  const velocitySamplesRef = useRef<number[]>([]);
  useEffect(() => {
    if (!isGenerating) {
      velocitySamplesRef.current = [];
      return;
    }
    const interval = setInterval(() => {
      const rate = speedTrackerRef.current.getCurrentRate();
      const samples = velocitySamplesRef.current;
      samples.push(rate);
      if (samples.length > 5) samples.shift();
      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      reportTokenVelocity(avg);
    }, 200);
    return () => clearInterval(interval);
  }, [isGenerating, reportTokenVelocity]);

  useEffect(() => {
    if (!isGenerating) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      (e as unknown as { returnValue: string }).returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isGenerating]);

  useEffect(() => {
    if (isGenerating && previewRef.current && !userScrolledUpRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamState?.content, isGenerating]);

  useEffect(() => {
    if (!isGenerating) userScrolledUpRef.current = false;
  }, [isGenerating]);

  // Cleanup on unmount: abort generation & clear auto-nav timer
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (isGenerating) {
      generationStartRef.current = Date.now();
      elapsedSecondsRef.current = 0;
      setElapsedSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        elapsedSecondsRef.current += 1;
        setElapsedSeconds(elapsedSecondsRef.current);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      generationStartRef.current = null;
    }
    return () => { if (timerIntervalRef.current) clearInterval(timerIntervalRef.current); };
  }, [isGenerating]);

  // Reset thinking to collapsed when a new generation starts
  useEffect(() => {
    if (!isGenerating && streamState?.isComplete) {
      setThinkingExpanded(false);
    }
  }, [isGenerating, streamState?.isComplete]);

  // Show toast when a pipeline stage fails
  useEffect(() => {
    const stages = streamState?.stages ?? [];
    for (const stage of stages) {
      if (stage.status === 'error' && !toastedStageErrorsRef.current.has(stage.name)) {
        toastedStageErrorsRef.current.add(stage.name);
        const label = STAGE_LABELS[stage.name] ?? (stage.name.charAt(0).toUpperCase() + stage.name.slice(1));
        const msg = stage.error ? `${label} stage failed: ${stage.error}` : `${label} stage failed`;
        showToast(msg, 'error');
      }
    }
  }, [streamState?.stages, showToast]);

  // S-039: Rate-limit countdown timer
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;
    const timer = setInterval(() => {
      setRateLimitCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  // S-039: Classify error by type for recovery hints
  const classifiedError = useMemo(() => {
    if (!error) return null;
    const errObj = errorObjRef.current;
    if (errObj instanceof RateLimitError) {
      return {
        title: errObj.retryAfter
          ? `Rate limited — retry in ${rateLimitCountdown > 0 ? rateLimitCountdown : errObj.retryAfter}s`
          : 'Rate limit hit — wait a moment and try again',
        action: rateLimitCountdown > 0 ? null : { label: 'Retry Now', onClick: () => setView('form') },
      };
    }
    if (errObj instanceof TimeoutError) {
      return {
        title: 'Generation timed out — try a shorter topic or fewer subtopics',
        action: { label: 'Try Again', onClick: () => setView('form') },
      };
    }
    if (errObj instanceof AIProviderError) {
      return {
        title: 'AI service error — the provider may be temporarily unavailable',
        action: { label: 'Retry', onClick: () => setView('form') },
      };
    }
    if (error.includes('API key') || error.includes('401') || error.includes('key')) {
      return {
        title: 'API key issue — check environment configuration',
        action: { label: 'Check Settings', onClick: () => router.push('/settings') },
      };
    }
    if (error.includes('timeout') || error.includes('timed out')) {
      return {
        title: 'Generation timed out',
        action: { label: 'Try Again', onClick: () => setView('form') },
      };
    }
    if (error.includes('rate') || error.includes('429')) {
      return {
        title: 'Rate limit hit — wait a moment and try again',
        action: { label: 'Try Again', onClick: () => setView('form') },
      };
    }
    return {
      title: 'Something went wrong. Any content generated before the error is shown below.',
      action: { label: 'Try Again', onClick: () => setView('form') },
    };
  }, [error, rateLimitCountdown, router]);

  const handleGenerate = async (input: GenerationInput) => {
    setCurrentInput(input);
    setIsGenerating(true);
    setView('preview');
    setError(null);
    errorObjRef.current = null;
    setSavedId(null);
    finalContentRef.current = '';
    setStreamState({ content: '', stages: [], isComplete: false });
    retryAttemptRef.current = 0;
    setRetryDisplay('');
    setThinkingExpanded(false);
    toastedStageErrorsRef.current.clear();
    speedTrackerRef.current.reset();
    setStreamSpeed(150);

    abortRef.current = new AbortController();
    let prevContentLen = 0;

    const handleRetry = (attempt: number) => {
      retryAttemptRef.current = attempt;
      setRetryDisplay(`Retrying (attempt ${attempt}/3)...`);
    };

    try {
      const finalContent = await runPipeline(input, (state) => {
        setStreamState(state);
        if (state.content) {
          finalContentRef.current = state.content;
          // Track speed: compute delta of content length for the rate tracker
          const delta = state.content.length - prevContentLen;
          if (delta > 0) {
            speedTrackerRef.current.recordChunk(delta);
            setStreamSpeed(speedTrackerRef.current.getAnimationDuration());
            prevContentLen = state.content.length;
          }
        }
      }, abortRef.current.signal, { onRetry: handleRetry });

      const item = saveContent({
        type: input.type,
        title: input.topic,
        markdown: finalContent || finalContentRef.current,
        provider: input.provider,
        sources: input.sources,
        metadata: {
          topic: input.topic,
          subtopics: input.subtopics,
          prerequisites: input.prerequisites,
          questionCounts: input.questionCounts,
        },
      });

      setSavedId(item.id);

      // Auto-navigate to content viewer after a brief completion moment
      autoNavTimerRef.current = setTimeout(() => {
        showToast('Content generated successfully', 'success');
        navigateWithTransition(() => router.push(`/content/${item.id}`));
      }, 1000);
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg === 'Generation cancelled') {
        // S-095: On user-initiated stop, save partial content and show toast
        const partial = finalContentRef.current;
        if (partial.trim().length > 100) {
          try {
            const item = saveContent({
              type: input.type,
              title: `[Partial] ${input.topic}`,
              markdown: partial,
              provider: input.provider,
              sources: input.sources,
              metadata: {
                topic: input.topic,
                subtopics: input.subtopics,
                prerequisites: input.prerequisites,
                questionCounts: input.questionCounts,
              },
            });
            setSavedId(item.id);
            showToast('Generation stopped — partial content saved', 'info');
          } catch {
            showToast('Generation stopped', 'info');
          }
        } else {
          showToast('Generation stopped', 'info');
        }
        setIsGenerating(false);
        return;
      }
      errorObjRef.current = err;
      setError(msg);
      // S-039: Start countdown for rate-limit errors
      if (err instanceof RateLimitError && err.retryAfter) {
        setRateLimitCountdown(err.retryAfter);
      }
      showToast(`Generation failed: ${msg}`, 'error');
      const partial = finalContentRef.current;
      if (partial.trim().length > 100) {
        try {
          const item = saveContent({
            type: input.type,
            title: `[Partial] ${input.topic}`,
            markdown: partial,
            provider: input.provider,
            sources: input.sources,
            metadata: {
              topic: input.topic,
              subtopics: input.subtopics,
              prerequisites: input.prerequisites,
              questionCounts: input.questionCounts,
            },
          });
          setSavedId(item.id);
        } catch {
          // Partial save failed — ignore
        }
      }
    } finally {
      setIsGenerating(false);
      setRetryDisplay('');
    }
  };

  const stages: PipelineStage[] = streamState?.stages ?? [];
  const currentContent = streamState?.content ?? '';
  const currentThinking = streamState?.thinking ?? '';
  const activeStage = stages.find(s => s.status === 'running');
  const failedStage = stages.find(s => s.status === 'error');
  const showSkeleton = isGenerating && !currentContent && !error;

  // Derive PipelineTimeline props from stages
  const pipelineCurrentStage: 'creator' | 'reviewer' | 'refiner' | 'complete' | null = (() => {
    if (!isGenerating && streamState?.isComplete) return 'complete';
    if (!activeStage) return stages.length > 0 && stages.every(s => s.status === 'done' || s.status === 'skipped') ? 'complete' : null;
    return activeStage.name as 'creator' | 'reviewer' | 'refiner';
  })();
  const pipelineSkippedStages = stages.filter(s => s.status === 'skipped').map(s => s.name);

  // S-095: Stop generation — abort and let the catch block handle partial save + toast
  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleCopyContent = async () => {
    try {
      await copyToClipboard(finalContentRef.current);
      showToast('Content copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy', 'error');
    }
  };

  const handleExportCSV = () => {
    if (!savedId) return;
    const item = getContentById(savedId);
    if (!item) return;
    const rows = parseAssignmentMarkdown(item.markdown);
    if (rows.length === 0) {
      showToast('No parseable questions found — check that the content uses the structured format', 'info');
      return;
    }
    try {
      downloadCSV(rows, item.title || 'assignment');
      showToast(`✓ ${rows.length} question${rows.length !== 1 ? 's' : ''} exported to CSV`, 'success');
    } catch {
      showToast('CSV export failed — try again', 'error');
    }
  };

  const handleExportAICSVWithLoading = async () => {
    if (!savedId) return;
    const item = getContentById(savedId);
    if (!item) return;

    setIsExportingCSV(true);
    showToast('Generating CSV via AI... This may take a few moments.', 'info');

    try {
      const promptTemplate = await loadPrompt('csv_export_prompt.md');
      const content = fillPrompt(promptTemplate, { MARKDOWN_CONTENT: item.markdown });

      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: 'You are an expert data parsing assistant.' },
        { role: 'user', content },
      ];

      let fullResponse = '';
      await streamCompletion('minimax', messages, (chunk) => {
        if (chunk.delta) fullResponse += chunk.delta;
      });

      let jsonStr = fullResponse.trim();
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }

      let rows: unknown[];
      try {
        rows = JSON.parse(jsonStr);
      } catch {
        throw new Error('AI returned malformed JSON — try again or use direct CSV export.');
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('AI produced an empty or invalid CSV array.');
      }

      downloadCSV(rows as CSVRow[], item.title || 'assignment');
      showToast(`AI CSV exported — ${rows.length} questions exported`, 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast('Failed to export CSV via AI: ' + getErrorMessage(err), 'error');
    } finally {
      setIsExportingCSV(false);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {view === 'form' ? (
          <motion.div
            className="contents"
            variants={prefersReducedMotion ? undefined : staggerContainer}
            initial={prefersReducedMotion ? undefined : 'hidden'}
            animate={prefersReducedMotion ? undefined : 'visible'}
          >
            <motion.header
              className="px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background shrink-0"
              variants={prefersReducedMotion ? undefined : fadeInUp}
            >
              <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.02em] leading-[1.15] text-text-primary">Generate Content</h1>
              <p className="text-sm font-normal text-text-secondary mt-0.5">
                Create educational materials with AI
              </p>
              {savedId && !isGenerating && (
                <button
                  onClick={() => router.push(`/content/${savedId}`)}
                  className="text-xs text-text-secondary hover:text-accent flex items-center gap-1 mt-1 min-h-[44px] sm:min-h-0"
                >
                  ← Back to last result
                </button>
              )}
            </motion.header>

            <PhysicsScrollWithRef scrollRef={formScrollRef} className="flex-1 relative">
              {view === 'form' && <AmbientLines contentType={activeContentType} />}
              {/* Parallax decoration layer */}
              {!prefersReducedMotion && (
                <motion.div
                  className="pointer-events-none fixed inset-0 z-0"
                  style={{ y: decorationY, willChange: 'transform' }}
                  aria-hidden="true"
                />
              )}
            <div className="max-w-4xl mx-auto px-4 sm:px-10 py-5 sm:py-6 relative z-10">
              {isGenerating && currentInput && (
                <div className="flex items-center gap-1.5 text-xs text-text-secondary mb-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  Generating with extended thinking
                </div>
              )}
              <ErrorBoundary label="Generation form failed to load">
                <GenerationForm
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  stages={stages}
                  initialValues={regenerateValues}
                  onContentTypeChange={setActiveContentType}
                />
              </ErrorBoundary>
            </div>
          </PhysicsScrollWithRef>
          </motion.div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Compact generation strip — replaces header + status bar + timeline + chunk + metrics */}
            <CompactGenerationStrip
              isGenerating={isGenerating}
              error={error}
              isComplete={streamState?.isComplete ?? false}
              activeStage={activeStage}
              pipelineCurrentStage={pipelineCurrentStage}
              pipelineSkippedStages={pipelineSkippedStages}
              elapsedSeconds={elapsedSeconds}
              retryDisplay={retryDisplay}
              velocityBand={velocityBand}
              currentInput={currentInput}
              activeChunks={streamState?.activeChunks}
              currentContent={currentContent}
              savedId={savedId}
              onBack={() => {
                if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
                setView('form');
              }}
              onCopy={handleCopyContent}
              onOpen={() => {
                if (autoNavTimerRef.current) clearTimeout(autoNavTimerRef.current);
                if (savedId) navigateWithTransition(() => router.push(`/content/${savedId}`));
              }}
              onExportCSV={handleExportCSV}
              onExportAICSV={handleExportAICSVWithLoading}
              isExportingCSV={isExportingCSV}
              onStop={handleStop}
            />

            {/* Thinking display */}
            {currentThinking && (
              <div className="mx-4 sm:mx-8 mt-3 shrink-0">
                <button
                  onClick={() => setThinkingExpanded(!thinkingExpanded)}
                  className="flex items-center gap-2 text-xs text-violet-500 hover:text-violet-400 dark:text-violet-400 dark:hover:text-violet-300 font-medium mb-1"
                >
                  <svg className={cn('w-3 h-3 transition-transform', thinkingExpanded && 'rotate-90')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  Model Thinking
                  {isGenerating && <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />}
                </button>
                {thinkingExpanded && (
                  <div className="thinking-box p-3 rounded-lg border border-violet-200 bg-violet-50/50 max-h-48 overflow-auto text-xs text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-300 leading-relaxed whitespace-pre-wrap font-mono">
                    {currentThinking}
                  </div>
                )}
              </div>
            )}

            {/* Error display — S-039: typed error recovery */}
            {error && classifiedError && (
              <div className="mx-4 sm:mx-8 mt-4 p-3 sm:p-4 border border-red-200 rounded-lg shrink-0 bg-red-50 pl-3 sm:pl-4 border-l-4 border-l-red-400 dark:border-red-800 dark:bg-red-950/30 dark:border-l-red-600">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                      {classifiedError.title}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>
                    {failedStage && (
                      <p className="text-xs text-danger font-medium mb-2">
                        Failed at: {STAGE_LABELS[failedStage.name] ?? failedStage.name}
                      </p>
                    )}
                    <div className="flex gap-2">
                      {classifiedError.action && (
                        <Button variant="secondary" size="sm" onClick={classifiedError.action.onClick}>
                          {classifiedError.action.label}
                        </Button>
                      )}
                      {rateLimitCountdown > 0 && (
                        <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5 tabular-nums">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Retry available in {rateLimitCountdown}s
                        </span>
                      )}
                      {finalContentRef.current.trim() && (
                        <Button variant="secondary" size="sm" onClick={() => {
                          navigator.clipboard.writeText(finalContentRef.current);
                          showToast('Content copied to clipboard', 'success');
                        }}>
                          Copy Content
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preview */}
            <div
              ref={previewRef}
              aria-live="polite"
              aria-label="Content generation output"
              className={cn('relative flex-1 overflow-auto px-4 sm:px-8 py-4 sm:py-6', isGenerating && 'generation-glow')}
              onScroll={(e) => {
                const el = e.currentTarget;
                userScrolledUpRef.current = el.scrollTop < el.scrollHeight - el.clientHeight - 100;
              }}
            >
              <div className="relative">
                <AnimatePresence>
                  {showSkeleton ? (
                    <GenerationSkeleton key="skeleton" />
                  ) : currentContent ? (
                    <motion.div
                      key="content"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: 'easeIn' }}
                      className="max-w-4xl mx-auto"
                    >
                      {error && (
                        <p className="text-xs text-text-secondary mb-4">
                          Partial content (generation failed during {activeStage?.name ?? 'pipeline'})
                        </p>
                      )}
                      <ErrorBoundary label="Failed to render content">
                        <MarkdownPreview content={currentContent} isStreaming={isGenerating} streamSpeed={streamSpeed} />
                      </ErrorBoundary>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </div>

            {/* S-044 + S-095: Mobile generation overlay — fixed bottom, above mobile nav */}
            <MobileGenerationOverlay
              isGenerating={isGenerating}
              pipelineCurrentStage={pipelineCurrentStage}
              elapsedSeconds={elapsedSeconds}
              onStop={handleStop}
            />
          </div>
        )}
      </div>

    </div>
  );
}
