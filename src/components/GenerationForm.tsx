'use client';

import { useState, useEffect, useRef } from 'react';
import { GenerationInput, ContentType, AIProvider, SourceFile, PipelineStage } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { FileUpload } from './FileUpload';
import { cn } from '@/lib/utils';

interface GenerationFormProps {
  onGenerate: (input: GenerationInput) => void;
  isGenerating: boolean;
  stages?: PipelineStage[];
}

const DEFAULT_QUESTION_COUNTS = { mcq: 4, msq: 4, subjective: 1 };

const CONTENT_TYPES = [
  {
    type: 'lecture' as ContentType,
    label: 'Lecture Notes',
    desc: 'Comprehensive notes from transcript',
    icon: '📖',
    color: 'blue',
  },
  {
    type: 'pre-lecture' as ContentType,
    label: 'Pre-Lecture Notes',
    desc: 'Introductory pre-read material',
    icon: '🔍',
    color: 'green',
  },
  {
    type: 'assignment' as ContentType,
    label: 'Assignment',
    desc: 'MCQ, MSQ and subjective questions',
    icon: '📝',
    color: 'purple',
  },
];

const PROVIDERS: { id: AIProvider; name: string; defaultModel: string }[] = [
  { id: 'openai',  name: 'OpenAI',         defaultModel: 'gpt-4o'             },
  { id: 'minimax', name: 'MiniMax',         defaultModel: 'MiniMax-Text-01'    },
  { id: 'gemini',  name: 'Gemini',          defaultModel: 'gemini-2.0-flash'   },
  { id: 'xai',     name: 'xAI (Grok)',      defaultModel: 'grok-3'             },
];

function getSavedModel(provider: AIProvider): string {
  if (typeof window === 'undefined') return '';
  const defaults: Record<AIProvider, string> = {
    openai: 'gpt-5.4', minimax: 'MiniMax-M2.7', gemini: 'gemini-2.0-flash', xai: 'grok-3',
  };
  return localStorage.getItem(`news13n_model_${provider}`) ?? defaults[provider];
}

const STAGE_LABELS: Record<string, string> = {
  creator: 'Generating content',
  reviewer: 'Reviewing quality',
  refiner: 'Refining issues',
  formatter: 'Final formatting',
  'csv-converter': 'Converting to CSV',
};

function StageIndicator({ stages }: { stages: PipelineStage[] }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {stages.map((stage) => (
        <div key={stage.name} className="flex items-center gap-1.5">
          <div className={cn(
            'w-2 h-2 rounded-full transition-all',
            stage.status === 'running' && 'bg-accent animate-pulse',
            stage.status === 'done' && 'bg-success',
            stage.status === 'error' && 'bg-danger',
            stage.status === 'skipped' && 'bg-border',
            stage.status === 'pending' && 'bg-border',
          )} />
          <span className={cn(
            'text-xs',
            stage.status === 'running' && 'text-accent font-medium',
            stage.status === 'done' && 'text-success',
            stage.status === 'error' && 'text-danger',
            (stage.status === 'pending' || stage.status === 'skipped') && 'text-text-secondary',
          )}>
            {STAGE_LABELS[stage.name] ?? stage.name}
          </span>
        </div>
      ))}
    </div>
  );
}

export function GenerationForm({ onGenerate, isGenerating, stages }: GenerationFormProps) {
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [provider, setProvider] = useState<AIProvider>('openai');
  const [savedModels, setSavedModels] = useState<Record<AIProvider, string>>({
    openai: 'gpt-5.4', minimax: 'MiniMax-M2.7', gemini: 'gemini-2.0-flash', xai: 'grok-3',
  });
  const [topic, setTopic] = useState('');
  const [subtopics, setSubtopics] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [transcript, setTranscript] = useState('');
  const [sources, setSources] = useState<SourceFile[]>([]);
  const [questionCounts, setQuestionCounts] = useState(DEFAULT_QUESTION_COUNTS);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');

  // Refresh saved models from localStorage whenever the form becomes visible
  useEffect(() => {
    const updated: Record<AIProvider, string> = { ...savedModels };
    for (const p of PROVIDERS) {
      updated[p.id] = getSavedModel(p.id);
    }
    setSavedModels(updated);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = () => {
    if (!contentType || !topic.trim()) return;

    onGenerate({
      type: contentType,
      topic: topic.trim(),
      sources,
      transcript: transcript.trim() || undefined,
      subtopics: subtopics.trim() ? subtopics.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      prerequisites: prerequisites.trim() ? prerequisites.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      questionCounts: contentType === 'assignment' ? questionCounts : undefined,
      provider,
    });
  };

  const canSubmit = !isGenerating && contentType && topic.trim();

  return (
    <div className="space-y-8">
      {/* Step 1: Content Type */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-1">Step 1 — What do you want to create?</h2>
        <p className="text-xs text-text-secondary mb-3">Select the type of educational content to generate.</p>
        <div className="grid grid-cols-3 gap-3">
          {CONTENT_TYPES.map(({ type, label, desc, icon }) => (
            <button
              key={type}
              onClick={() => setContentType(type)}
              disabled={isGenerating}
              className={cn(
                'p-4 rounded-lg border text-left transition-all duration-150',
                contentType === type
                  ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-sm'
                  : 'border-border hover:border-accent/40 hover:bg-sidebar/50',
                isGenerating && 'opacity-50 cursor-not-allowed'
              )}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className="font-medium text-sm text-text-primary">{label}</div>
              <div className="text-xs text-text-secondary mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Type-specific inputs */}
      {contentType && (
        <div className="space-y-5 animate-fade-in">
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-3">Step 2 — Configure inputs</h2>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">
              Topic <span className="text-danger">*</span>
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                contentType === 'lecture' ? 'e.g., Introduction to React Hooks' :
                contentType === 'pre-lecture' ? 'e.g., Machine Learning Fundamentals' :
                'e.g., Python Data Structures'
              }
              disabled={isGenerating}
            />
          </div>

          {contentType === 'pre-lecture' && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Subtopics <span className="text-text-secondary font-normal">(comma-separated)</span>
                </label>
                <Input
                  value={subtopics}
                  onChange={(e) => setSubtopics(e.target.value)}
                  placeholder="e.g., Lists, Dictionaries, Tuples, Sets"
                  disabled={isGenerating}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Prerequisites <span className="text-text-secondary font-normal">(comma-separated)</span>
                </label>
                <Input
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  placeholder="e.g., Basic Python syntax, Variables, Functions"
                  disabled={isGenerating}
                />
              </div>
            </>
          )}

          {(contentType === 'lecture' || contentType === 'assignment') && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-2">Input Source</label>
              <div className="flex gap-4 mb-3">
                {(['upload', 'paste'] as const).map((mode) => (
                  <label key={mode} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      checked={inputMode === mode}
                      onChange={() => setInputMode(mode)}
                      disabled={isGenerating}
                      className="accent-accent"
                    />
                    <span className="text-xs text-text-primary">
                      {mode === 'upload' ? '📁 Upload Files' : '📋 Paste Text'}
                    </span>
                  </label>
                ))}
              </div>

              {inputMode === 'upload' ? (
                <FileUpload onFilesLoaded={setSources} />
              ) : (
                <textarea
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder="Paste your transcript or notes here..."
                  disabled={isGenerating}
                  className="w-full h-36 px-3 py-2.5 text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-white text-text-primary placeholder:text-text-secondary"
                />
              )}
            </div>
          )}

          {contentType === 'assignment' && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-2">Question Distribution</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'mcq', label: 'MCQ (Single Correct)', max: 20 },
                  { key: 'msq', label: 'MSQ (Multi-Select)', max: 20 },
                  { key: 'subjective', label: 'Subjective (Open-ended)', max: 10 },
                ].map(({ key, label, max }) => (
                  <div key={key}>
                    <label className="block text-xs text-text-secondary mb-1">{label}</label>
                    <Input
                      type="number"
                      min={0}
                      max={max}
                      value={questionCounts[key as keyof typeof questionCounts]}
                      onChange={(e) => setQuestionCounts(c => ({
                        ...c,
                        [key]: Math.max(0, parseInt(e.target.value) || 0)
                      }))}
                      disabled={isGenerating}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Provider */}
      {contentType && (
        <div className="animate-fade-in">
          <h2 className="text-sm font-semibold text-text-primary mb-3">Step 3 — Choose AI Provider</h2>
          <Select
            value={provider}
            onChange={(e) => setProvider(e.target.value as AIProvider)}
            disabled={isGenerating}
          >
            {PROVIDERS.map(({ id, name }) => (
              <option key={id} value={id}>{name} ({savedModels[id]})</option>
            ))}
          </Select>
          <p className="text-xs text-text-secondary mt-1.5">
            Make sure your API key for this provider is configured in{' '}
            <a href="/settings" className="text-accent hover:underline">Settings</a>.
          </p>
        </div>
      )}

      {/* Step 4: Generate */}
      {contentType && (
        <div className="animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              {isGenerating && stages && stages.length > 0 && (
                <StageIndicator stages={stages} />
              )}
              {!isGenerating && !topic.trim() && (
                <p className="text-xs text-text-secondary">Enter a topic to continue.</p>
              )}
            </div>
            <div className="relative overflow-hidden rounded-lg">
              {/* Progress bar fills from left as stages complete */}
              {isGenerating && stages && stages.length > 0 && (
                <div
                  className="absolute inset-0 top-0 left-0 bg-indigo-500"
                  style={{
                    transform: `scaleX(${
                      stages.filter(s => s.status === 'done').length /
                      (stages.filter(s => s.status !== 'skipped').length || 1)
                    })`,
                    transformOrigin: 'left',
                    transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />
              )}
              {/* Done state: green bar */}
              {!isGenerating && stages && stages.length > 0 && stages.every(s => s.status === 'done') && (
                <div
                  className="absolute inset-0 top-0 left-0 bg-success animate-bounce-done"
                  style={{ transform: 'scaleX(1)', transformOrigin: 'left' }}
                />
              )}
              {/* Error state: red bar */}
              {!isGenerating && stages && stages.some(s => s.status === 'error') && (
                <div
                  className="absolute inset-0 top-0 left-0 bg-danger"
                  style={{ transform: 'scaleX(1)', transformOrigin: 'left' }}
                />
              )}
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                size="lg"
                className={cn(
                  'shrink-0 relative z-10 transition-colors',
                  isGenerating && 'text-white bg-indigo-500/80',
                  !isGenerating && stages && stages.length > 0 && stages.every(s => s.status === 'done') && 'text-white bg-success/80 animate-bounce-done',
                  !isGenerating && stages && stages.some(s => s.status === 'error') && 'text-white bg-danger/80',
                )}
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating content...
                  </span>
                ) : stages && stages.length > 0 && stages.every(s => s.status === 'done') ? (
                  <span className="flex items-center gap-2">✓ Done</span>
                ) : stages && stages.some(s => s.status === 'error') ? (
                  <span className="flex items-center gap-2">Try again →</span>
                ) : (
                  '✦ Generate'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
