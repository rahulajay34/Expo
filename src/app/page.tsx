'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GenerationInput, StreamingState, PipelineStage } from '@/lib/types';
import { runPipeline } from '@/lib/ai/pipeline';
import { saveContent } from '@/lib/storage';
import { GenerationForm } from '@/components/GenerationForm';
import { MarkdownPreview } from '@/components/MarkdownPreview';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils';
import { useGenerationContext } from '@/lib/generation-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AmbientParticles } from '@/components/AmbientParticles';

const TYPE_LABELS: Record<string, string> = {
  lecture: 'Lecture Notes',
  'pre-lecture': 'Pre-Lecture Notes',
  assignment: 'Assignment',
};

export default function HomePage() {
  const router = useRouter();
  const { setIsGenerating: setContextGenerating } = useGenerationContext();
  const [streamState, setStreamState] = useState<StreamingState | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentInput, setCurrentInput] = useState<GenerationInput | null>(null);
  const [view, setView] = useState<'form' | 'preview'>('form');
  const [error, setError] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const finalContentRef = useRef('');
  const previewRef = useRef<HTMLDivElement>(null);

  // Sync local isGenerating state into context so Sidebar can read it
  useEffect(() => {
    setContextGenerating(isGenerating);
  }, [isGenerating, setContextGenerating]);

  // Warn on browser tab close / page refresh while generating
  useEffect(() => {
    if (!isGenerating) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isGenerating]);

  // Auto-scroll preview as content streams in
  useEffect(() => {
    if (isGenerating && previewRef.current) {
      previewRef.current.scrollTop = previewRef.current.scrollHeight;
    }
  }, [streamState?.content, isGenerating]);

  const handleGenerate = async (input: GenerationInput) => {
    setCurrentInput(input);
    setIsGenerating(true);
    setView('preview');
    setError(null);
    setSavedId(null);
    finalContentRef.current = '';
    setStreamState({ content: '', stages: [], isComplete: false });

    try {
      const finalContent = await runPipeline(input, (state) => {
        setStreamState(state);
        if (state.content) finalContentRef.current = state.content;
      });

      // Save to library
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };

  const stages: PipelineStage[] = streamState?.stages ?? [];
  const currentContent = streamState?.content ?? '';
  const activeStage = stages.find(s => s.status === 'running');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Generate Content</h1>
          <p className="text-xs text-text-secondary mt-0.5">Create educational materials with AI</p>
        </div>
        {view === 'preview' && (
          <div className="flex items-center gap-3">
            {currentInput && (
              <Badge variant={currentInput.type as 'lecture' | 'pre-lecture' | 'assignment'}>
                {TYPE_LABELS[currentInput.type]}
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={() => setView('form')}>
              ← Back to Form
            </Button>
          </div>
        )}
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {view === 'form' ? (
          <div className="h-full overflow-auto">
            <div className="max-w-3xl mx-auto px-8 py-8">
              <ErrorBoundary label="Generation form failed to load">
                <GenerationForm
                  onGenerate={handleGenerate}
                  isGenerating={isGenerating}
                  stages={stages}
                />
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {/* Status bar */}
            <div className={cn(
              'px-8 py-2.5 border-b border-border flex items-center justify-between shrink-0',
              isGenerating ? 'bg-accent/5' : error ? 'bg-red-50' : 'bg-success/5'
            )}>
              <div className="flex items-center gap-2">
                {isGenerating ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-xs text-accent font-medium">
                      {activeStage ? `${activeStage.name === 'creator' ? 'Generating' : activeStage.name === 'reviewer' ? 'Reviewing' : activeStage.name === 'refiner' ? 'Refining' : 'Formatting'} content...` : 'Processing...'}
                    </span>
                  </>
                ) : error ? (
                  <>
                    <span className="text-xs text-danger">⚠ Generation failed</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-success font-medium">✓ Generation complete</span>
                  </>
                )}
              </div>
              {savedId && !isGenerating && (
                <Button size="sm" onClick={() => router.push(`/content/${savedId}`)}>
                  View in Library →
                </Button>
              )}
            </div>

            {/* Pipeline stages */}
            {stages.length > 0 && (
              <div className="px-8 py-2.5 border-b border-border bg-sidebar/50 flex items-center gap-2 shrink-0 overflow-x-auto">
                {stages.map((stage, i) => {
                  const isDone = stage.status === 'done';
                  const isActive = stage.status === 'running';
                  const isError = stage.status === 'error';
                  const doneCount = stages.filter(s => s.status === 'done').length;
                  const totalActive = stages.filter(s => s.status !== 'skipped').length;
                  const lineProgress = totalActive > 0 ? (doneCount / (totalActive)) : 0;

                  return (
                    <div key={stage.name} className="flex items-center shrink-0">
                      {/* Stage card with cascade animation */}
                      <div
                        className="stage-card shrink-0"
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        <div className={cn(
                          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                          isActive && 'bg-accent/10 text-accent box-shadow-[0_0_0_2px_#6366F1]',
                          isDone && 'bg-success/10 text-success',
                          isError && 'bg-danger/10 text-danger',
                          stage.status === 'skipped' && 'bg-sidebar text-text-secondary line-through opacity-60',
                          stage.status === 'pending' && 'bg-sidebar text-text-secondary opacity-50',
                          isActive && 'shadow-[0_0_0_2px_#6366F1]',
                        )}>
                          {isActive && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
                          {isDone && (
                            <span className="relative flex items-center justify-center">
                              <span className="animate-pop-in">✓</span>
                              {/* Particle burst: 4 dots in cardinal directions */}
                              <span className="absolute w-1 h-1 rounded-full bg-success particle-particle-up" style={{ animationDelay: '0ms' }} />
                              <span className="absolute w-1 h-1 rounded-full bg-success particle-particle-right" style={{ animationDelay: '50ms' }} />
                              <span className="absolute w-1 h-1 rounded-full bg-success particle-particle-down" style={{ animationDelay: '100ms' }} />
                              <span className="absolute w-1 h-1 rounded-full bg-success particle-particle-left" style={{ animationDelay: '150ms' }} />
                            </span>
                          )}
                          {isError && <span>✗</span>}
                          <span className="capitalize">{stage.name}</span>
                        </div>
                      </div>

                      {/* SVG connector line between stages */}
                      {i < stages.length - 1 && (
                        <div className="w-8 h-4 shrink-0 mx-0.5 flex items-center justify-center">
                          <svg width="32" height="16" viewBox="0 0 32 16" className="overflow-visible">
                            {/* Background track */}
                            <line x1="0" y1="8" x2="32" y2="8" stroke="#E8E8E8" strokeWidth="1.5" strokeLinecap="round" />
                            {/* Fill that animates based on progress */}
                            <line
                              x1="0"
                              y1="8"
                              x2="32"
                              y2="8"
                              stroke="#6366F1"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeDasharray="100"
                              strokeDashoffset={lineProgress >= 1 ? 0 : 100 - (lineProgress * 100)}
                              style={{
                                transition: 'stroke-dashoffset 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                              }}
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mx-8 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg shrink-0">
                <p className="text-sm font-medium text-danger mb-1">Generation Failed</p>
                <p className="text-xs text-red-700">{error}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-3"
                  onClick={() => setView('form')}
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Preview */}
            <div ref={previewRef} className="relative flex-1 overflow-auto px-8 py-6">
              <AmbientParticles active={isGenerating} className="absolute inset-0" />
              {currentContent ? (
                <div className="max-w-4xl mx-auto">
                  <MarkdownPreview content={currentContent} isStreaming={isGenerating} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-40">
                  <div className="text-center">
                    <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-sm text-text-secondary">Waiting for content...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
