'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GenerationInput, StreamingState, PipelineStage, PIPELINE_STAGES, AIProvider } from '@/lib/types';
import { getContentById } from '@/lib/storage';
import { runPipeline } from '@/lib/ai/pipeline';
import { saveContent, StorageFullError } from '@/lib/storage';
import { GenerationForm } from '@/components/GenerationForm';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn, countWords, getErrorMessage, copyToClipboard } from '@/lib/utils';
import { useGenerationContext } from '@/lib/generation-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AmbientParticles } from '@/components/AmbientParticles';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { StreamSpeedTracker } from '@/lib/stream-speed';
import { motion, useReducedMotion } from 'framer-motion';
import { useScrollHeader } from '@/lib/useScrollHeader';
import { StickyHeader } from '@/components/StickyHeader';

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
};

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
  const { setIsGenerating: setContextGenerating } = useGenerationContext();
  const { showToast } = useToast();
  const [streamState, setStreamState] = useState<StreamingState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInput, setCurrentInput] = useState<GenerationInput | null>(null);
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const finalContentRef = useRef('');
  const previewRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
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
  const prefersReducedMotion = useReducedMotion() ?? false;
  const { isCompact, titleY, subtitleY, headerOpacity, scrollRef: formScrollRef } = useScrollHeader(100, prefersReducedMotion);

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
  }, [isGenerating, setContextGenerating]);

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

  // Abort generation if component unmounts (e.g. user navigates away)
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
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

  const handleGenerate = async (input: GenerationInput) => {
    setCurrentInput(input);
    setIsGenerating(true);
    setView('preview');
    setError(null);
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
    } catch (err: unknown) {
      const msg = getErrorMessage(err);
      if (msg === 'Generation cancelled') {
        setIsGenerating(false);
        return;
      }
      setError(msg);
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

  return (
    <div className="h-full flex flex-col">
      {/* Header — only shown in preview mode; form mode puts it inside the scroll container */}
      {view === 'preview' && (
        <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background shrink-0 gap-2 sm:gap-0">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Generate Content</h1>
            <p className="text-xs text-text-secondary mt-0.5">Create educational materials with AI</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {currentInput && (
              <Badge variant={currentInput.type as 'lecture' | 'pre-lecture' | 'assignment'}>
                {TYPE_LABELS[currentInput.type]}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setView('form')}>
              ← Edit form
            </Button>
          </div>
        </header>
      )}

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'form' ? (
          <div className="h-full overflow-auto" ref={formScrollRef}>
            {/* Sticky compact header — appears after scrolling past the full header */}
            <StickyHeader isVisible={isCompact} className="px-4 sm:px-8">
              <span className="text-sm font-semibold text-text-primary">Generate Content</span>
            </StickyHeader>

            {/* Full header with parallax depth */}
            <header className="px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background overflow-hidden">
              <motion.div style={{ y: titleY, opacity: headerOpacity }}>
                <h1 className="text-lg font-semibold text-text-primary">Generate Content</h1>
                <motion.p className="text-xs text-text-secondary mt-0.5" style={{ y: subtitleY }}>
                  Create educational materials with AI
                </motion.p>
                {savedId && !isGenerating && (
                  <button
                    onClick={() => router.push(`/content/${savedId}`)}
                    className="text-xs text-text-secondary hover:text-accent flex items-center gap-1 mt-1 min-h-[44px] sm:min-h-0"
                  >
                    ← Back to last result
                  </button>
                )}
              </motion.div>
            </header>

            <div className="max-w-3xl mx-auto px-4 sm:px-8 py-6 sm:py-8">
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
                />
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Status bar */}
            <div className={cn(
              'px-4 sm:px-8 py-2.5 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-2 sm:gap-0',
              isGenerating ? 'bg-accent/5' : error ? 'bg-red-50 dark:bg-red-950/30' : 'bg-success/5'
            )} aria-live="polite" role="status">
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs text-accent font-medium">
                      {activeStage ? `${activeStage.name === PIPELINE_STAGES.CREATOR ? 'Generating' : activeStage.name === PIPELINE_STAGES.REVIEWER ? 'Reviewing' : activeStage.name === PIPELINE_STAGES.REFINER ? 'Refining' : 'Processing'} content...` : 'Processing...'}
                      {elapsedSeconds > 0 && ` (${elapsedSeconds}s)`}
                      {retryDisplay && ` — ${retryDisplay}`}
                    </span>
                  </>
                ) : error ? (
                  <span className="text-xs text-danger">Generation failed</span>
                ) : (
                  <span className="text-xs text-success font-medium">Generation complete</span>
                )}
              </div>
              {savedId && !isGenerating && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => router.push(`/content/${savedId}`)}>
                    Open in Library →
                  </Button>
                  <Button variant="secondary" size="sm" onClick={async () => {
                    try {
                      await copyToClipboard(finalContentRef.current);
                      showToast('Content copied to clipboard', 'success');
                    } catch {
                      showToast('Failed to copy', 'error');
                    }
                  }}>
                    Copy
                  </Button>
                </div>
              )}
            </div>

            {/* Pipeline stages */}
            {stages.length > 0 && (
              <div className="px-4 sm:px-8 py-2.5 border-b border-border bg-sidebar/50 flex items-center gap-2 shrink-0 overflow-x-auto" aria-label="Generation pipeline stages">
                {stages.map((stage, i) => {
                  const isDone = stage.status === 'done';
                  const isActive = stage.status === 'running';
                  const isError = stage.status === 'error';
                  const isSkipped = stage.status === 'skipped';

                  return (
                    <div key={stage.name} className="flex items-center shrink-0">
                      <div className="stage-card shrink-0" style={{ animationDelay: `${i * 100}ms` }}>
                        <div
                          role="status"
                          aria-live="assertive"
                          aria-label={`Generation stage: ${stage.name} - ${isSkipped ? 'skipped — no issues found by reviewer' : stage.status}`}
                          title={isSkipped ? 'Skipped — reviewer found no issues to fix' : undefined}
                          className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          isActive && 'bg-accent/10 text-accent shadow-[0_0_0_2px] shadow-accent',
                          isDone && 'bg-success/10 text-success',
                          isError && 'bg-danger/10 text-danger',
                          isSkipped && 'bg-success/5 text-text-secondary',
                          stage.status === 'pending' && 'bg-sidebar text-text-secondary opacity-50',
                        )}>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {isDone && <span className="animate-pop-in">✓</span>}
                          {isError && <span>✗</span>}
                          {isSkipped && <span className="text-success text-[10px]">✓</span>}
                          <span className={cn('capitalize', isSkipped && 'line-through opacity-70')}>{stage.name}</span>
                          {isSkipped && <span className="text-[10px] text-success no-underline font-normal ml-0.5" style={{ textDecoration: 'none' }}>no issues</span>}
                        </div>
                      </div>
                      {i < stages.length - 1 && (() => {
                        const chunkFill = stage.status === 'running' && stage.name === PIPELINE_STAGES.CREATOR && streamState?.activeChunks
                          ? (streamState.activeChunks.filter(c => c.status === 'done').length / streamState.activeChunks.length) * 100
                          : stage.status === 'running' ? 50 : null;
                        const dashOffset = chunkFill !== null ? (100 - chunkFill) : stage.status === 'done' ? 0 : 100;
                        return (
                          <div className="w-8 h-4 shrink-0 mx-0.5 flex items-center justify-center">
                            <svg width="32" height="16" viewBox="0 0 32 16" className="overflow-visible">
                              <line x1="0" y1="8" x2="32" y2="8" stroke="var(--border)" strokeWidth="1.5" strokeLinecap="round" />
                              <line x1="0" y1="8" x2="32" y2="8" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="100" strokeDashoffset={dashOffset} style={{ transition: 'stroke-dashoffset 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)' }} />
                            </svg>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Chunk progress */}
            {streamState?.activeChunks && activeStage?.name === PIPELINE_STAGES.CREATOR && activeStage.status === 'running' && (
              <div className="px-4 sm:px-8 py-4 border-b border-border bg-sidebar/30 flex items-center gap-4 shrink-0 overflow-x-auto" aria-label="Content chunk progress">
                <span className="text-xs text-text-secondary shrink-0">Generating:</span>
                {streamState.activeChunks.map((chunk) => (
                  <div key={chunk.id} className="flex items-center gap-2 shrink-0" role="status" aria-label={`${chunk.label} - ${chunk.status}`}>
                    {chunk.status === 'done' && <span className="text-success animate-pop-in">✓</span>}
                    {chunk.status === 'running' && <span className="w-4 h-4 border-2 border-accent/40 border-t-accent rounded-full animate-spin shrink-0" />}
                    {chunk.status === 'pending' && <span className="w-4 h-4 border-2 border-border rounded-full shrink-0" />}
                    {chunk.status === 'error' && <span className="text-danger">✗</span>}
                    <span className={cn(
                      'text-xs font-medium',
                      chunk.status === 'done' && 'text-success',
                      chunk.status === 'running' && 'text-accent',
                      chunk.status === 'pending' && 'text-text-secondary',
                      chunk.status === 'error' && 'text-danger',
                    )}>
                      {chunk.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

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

            {/* Error display */}
            {error && (
              <div className="mx-4 sm:mx-8 mt-4 p-3 sm:p-4 border border-red-200 rounded-lg shrink-0 bg-red-50 pl-3 sm:pl-4 border-l-4 border-l-red-400 dark:border-red-800 dark:bg-red-950/30 dark:border-l-red-600">
                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                      {error.includes('401') || error.includes('key') || error.includes('API key')
                        ? 'API key issue — check environment configuration'
                        : error.includes('timeout') || error.includes('timed out')
                        ? 'Generation timed out'
                        : error.includes('rate') || error.includes('429')
                        ? 'Rate limit hit — wait a moment and try again'
                        : 'Something went wrong. Any content generated before the error is shown below.'}
                    </p>
                    <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>
                    {failedStage && (
                      <p className="text-xs text-danger font-medium mb-2">
                        Failed at: {STAGE_LABELS[failedStage.name] ?? failedStage.name}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => setView('form')}>Try Again</Button>
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
              <AmbientParticles active={isGenerating} className="absolute inset-0" />
              {currentContent ? (
                <div className="max-w-4xl mx-auto">
                  {error && (
                    <p className="text-xs text-text-secondary mb-4">
                      Partial content (generation failed during {activeStage?.name ?? 'pipeline'})
                    </p>
                  )}
                  <ErrorBoundary label="Failed to render content">
                    <MarkdownPreview content={currentContent} isStreaming={isGenerating} streamSpeed={streamSpeed} />
                  </ErrorBoundary>
                </div>
              ) : !error ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center space-y-3">
                    <Skeleton className="w-48 h-6 mx-auto rounded" />
                    <Skeleton className="w-32 h-4 mx-auto rounded" />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
