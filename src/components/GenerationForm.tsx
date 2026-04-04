'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { GenerationInput, ContentType, AIProvider, SourceFile, PipelineStage, PIPELINE_STAGES } from '@/lib/types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileUpload } from './FileUpload';
import { cn } from '@/lib/utils';
import { streamCompletion } from '@/lib/ai/client';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';

interface GenerationFormProps {
  onGenerate: (input: GenerationInput) => void;
  isGenerating: boolean;
  stages?: PipelineStage[];
  initialValues?: Partial<GenerationInput>;
}

const DEFAULT_QUESTION_COUNTS = { mcq: 4, msq: 4, subjective: 1 };

const DRAFT_KEY = 'news13n_generation_draft';
interface FormDraft {
  contentType: ContentType | null;
  topic: string;
  subtopics: string;
  prerequisites: string;
  transcript: string;
  questionCounts: { mcq: number; msq: number; subjective: number };
  inputMode: 'upload' | 'paste';
  activeStep: number;
  savedAt: number;
}

/* ── SVG Icons for Content Type Cards ── */
const BookIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
    <path d="M8 7h6" />
    <path d="M8 11h4" />
  </svg>
);

const SearchDocIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
    <path d="M14 2v6h6" />
    <circle cx="11.5" cy="14.5" r="2.5" />
    <path d="M13.3 16.3 15 18" />
  </svg>
);

const ClipboardPencilIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M9 14l1.5 1.5L14 12" />
  </svg>
);

const CONTENT_TYPES = [
  {
    type: 'lecture' as ContentType,
    label: 'Lecture Notes',
    desc: 'Comprehensive notes from transcript',
    icon: BookIcon,
  },
  {
    type: 'pre-lecture' as ContentType,
    label: 'Pre-Lecture Notes',
    desc: 'Introductory pre-read material',
    icon: SearchDocIcon,
  },
  {
    type: 'assignment' as ContentType,
    label: 'Assignment',
    desc: 'MCQ, MSQ and subjective questions',
    icon: ClipboardPencilIcon,
  },
];

const STAGE_LABELS: Record<string, string> = {
  [PIPELINE_STAGES.CREATOR]: 'Generating content',
  [PIPELINE_STAGES.REVIEWER]: 'Reviewing quality',
  [PIPELINE_STAGES.REFINER]: 'Refining issues',
  [PIPELINE_STAGES.CSV_CONVERTER]: 'Converting to CSV',
};

const StageIndicator = memo(function StageIndicator({ stages }: { stages: PipelineStage[] }) {
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
}, (prev, next) => JSON.stringify(prev.stages) === JSON.stringify(next.stages));

/* ── Stepper Component ── */
const STEP_LABELS: Record<number, string> = {
  1: 'Content type',
  2: 'Configure inputs',
  3: 'Generate',
};

const StepperNav = memo(function StepperNav({
  activeStep,
  step1Complete,
  contentType,
  isGenerating,
  onStepClick,
}: {
  activeStep: number;
  step1Complete: boolean;
  contentType: ContentType | null;
  isGenerating: boolean;
  onStepClick: (step: number) => void;
}) {
  const steps = [1, 2, 3];

  const getStepStatus = (step: number): 'completed' | 'active' | 'pending' => {
    if (step < activeStep) return 'completed';
    if (step === activeStep) return 'active';
    return 'pending';
  };

  const isClickable = (step: number): boolean => {
    if (isGenerating) return false;
    const status = getStepStatus(step);
    if (status === 'completed') return true;
    // Can go to step 2 only if step 1 is complete
    if (step === 2 && step1Complete) return true;
    // Can go to step 3 only if contentType is set
    if (step === 3 && !!contentType) return true;
    return false;
  };

  return (
    <nav aria-label="Form steps" className="mb-6">
      <div className="flex items-start justify-between relative">
        {steps.map((step, idx) => {
          const status = getStepStatus(step);
          const clickable = isClickable(step);
          return (
            <div key={step} className="flex flex-col items-center relative z-10 flex-1">
              {/* Circle */}
              <button
                type="button"
                onClick={() => clickable && onStepClick(step)}
                disabled={!clickable}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-200 border-2 shrink-0',
                  status === 'completed' && 'bg-success border-success text-white',
                  status === 'active' && 'bg-accent border-accent text-white',
                  status === 'pending' && 'bg-background border-border text-text-secondary',
                  clickable && status !== 'active' && 'cursor-pointer hover:scale-110',
                  !clickable && 'cursor-default',
                )}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {status === 'completed' ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.5l2.5 2.5L11 4.5" />
                  </svg>
                ) : (
                  step
                )}
              </button>

              {/* Label */}
              <span
                className={cn(
                  'text-xs mt-1.5 text-center leading-tight',
                  status === 'active' && 'text-accent font-medium',
                  status === 'completed' && 'text-success font-medium',
                  status === 'pending' && 'text-text-secondary',
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </div>
          );
        })}

        {/* Background connector lines — positioned between circle edges */}
        {[0, 1].map((i) => {
          const fromStatus = getStepStatus(i + 1);
          const toStatus = getStepStatus(i + 2);
          const isCompleted = fromStatus === 'completed';
          const isActive = toStatus === 'active' && fromStatus === 'completed';
          // Each step occupies 33.33%. Circle center is at 16.67% + i*33.33%.
          // Half circle = 14px. Line starts 14px after from-center, ends 14px before to-center.
          const fromCenter = 16.67 + i * 33.33;
          const toCenter = fromCenter + 33.33;
          return (
            <div
              key={i}
              className="absolute top-[14px] h-[2px]"
              style={{
                left: `calc(${fromCenter}% + 14px)`,
                right: `calc(${100 - toCenter}% + 14px)`,
              }}
            >
              {isCompleted || isActive ? (
                <div className={cn('h-full w-full', isCompleted && toStatus !== 'pending' ? 'bg-success' : 'bg-accent')} />
              ) : (
                <div className="h-0 w-full border-t-2 border-dashed border-border" />
              )}
            </div>
          );
        })}
      </div>
    </nav>
  );
});

export function GenerationForm({ onGenerate, isGenerating, stages, initialValues }: GenerationFormProps) {
  const [contentType, setContentType] = useState<ContentType | null>(initialValues?.type ?? null);
  const [topic, setTopic] = useState(initialValues?.topic ?? '');
  const [subtopics, setSubtopics] = useState(initialValues?.subtopics?.join('\n') ?? '');
  const [prerequisites, setPrerequisites] = useState(initialValues?.prerequisites?.join('\n') ?? '');
  const [transcript, setTranscript] = useState(initialValues?.transcript ?? '');
  const [sources, setSources] = useState<SourceFile[]>(initialValues?.sources ?? []);
  const [questionCounts, setQuestionCounts] = useState(initialValues?.questionCounts ?? DEFAULT_QUESTION_COUNTS);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsCache = useRef<Record<string, string[]>>({});

  const [draftRestored, setDraftRestored] = useState(false);

  // Morphing form state
  const [activeStep, setActiveStep] = useState<number>(1);
  const [stepDirection, setStepDirection] = useState<1 | -1>(1);
  const [pulseKey, setPulseKey] = useState(0);
  const prevStagesLengthRef = useRef(stages?.length ?? 0);
  const prefersReducedMotion = useReducedMotion();

  /** Change step with direction tracking */
  const goToStep = useCallback((newStep: number) => {
    setStepDirection(newStep > activeStep ? 1 : -1);
    setActiveStep(newStep);
  }, [activeStep]);

  // Restore draft on mount
  useEffect(() => {
    if (initialValues?.type) return; // regenerate flow takes priority
    try {
      const saved = sessionStorage.getItem(DRAFT_KEY);
      if (!saved) return;
      const draft: FormDraft = JSON.parse(saved);
      // Only restore if draft is less than 24 hours old
      if (Date.now() - draft.savedAt > 24 * 60 * 60 * 1000) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      setContentType(draft.contentType);
      setTopic(draft.topic);
      setSubtopics(draft.subtopics);
      setPrerequisites(draft.prerequisites);
      setTranscript(draft.transcript);
      setQuestionCounts(draft.questionCounts);
      setInputMode(draft.inputMode);
      setActiveStep(draft.activeStep);
      setDraftRestored(true);
    } catch {
      // Silently fail
    }
  }, []);

  // Auto-save draft on field changes (debounced 500ms)
  useEffect(() => {
    if (isGenerating) return; // Don't save while generating
    const timer = setTimeout(() => {
      const draft: FormDraft = {
        contentType, topic, subtopics, prerequisites, transcript,
        questionCounts, inputMode, activeStep, savedAt: Date.now(),
      };
      // Only save if there's meaningful content
      if (contentType || topic.trim()) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [contentType, topic, subtopics, prerequisites, transcript, questionCounts, inputMode, activeStep, isGenerating]);

  useEffect(() => {
    if (stages && stages.length > prevStagesLengthRef.current) {
      setPulseKey(k => k + 1);
    }
    prevStagesLengthRef.current = stages?.length ?? 0;
  }, [stages]);

  useEffect(() => {
    if (isGenerating) {
      setActiveStep(3);
      setDraftRestored(false);
    }
  }, [isGenerating]);

  useEffect(() => {
    if (!topic.trim()) setSuggestions([]);
  }, [topic]);

  useEffect(() => {
    if (initialValues?.type) setActiveStep(2);
  }, [initialValues]);

  const handleSubmit = useCallback(() => {
    if (isGenerating || !contentType || !topic.trim()) return;
    if (contentType === 'assignment' && questionCounts.mcq + questionCounts.msq + questionCounts.subjective === 0) return;
    sessionStorage.removeItem(DRAFT_KEY); // Clear draft on submit
    setDraftRestored(false);

    onGenerate({
      type: contentType,
      topic: topic.trim(),
      sources,
      transcript: transcript.trim() || undefined,
      subtopics: subtopics.trim() ? subtopics.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
      prerequisites: prerequisites.trim() ? prerequisites.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
      questionCounts: contentType === 'assignment' ? questionCounts : undefined,
      provider: 'minimax' as AIProvider,
    });
  }, [isGenerating, contentType, topic, sources, transcript, subtopics, prerequisites, questionCounts, onGenerate]);

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  const canSubmit = !isGenerating && contentType && topic.trim();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSuggestSubtopics = async () => {
    const cacheKey = `suggestions:${contentType}:${topic}:${(transcript || '').slice(0, 100)}`;
    if (!topic.trim() || suggestionsCache.current[cacheKey]) return;
    setIsLoadingSuggestions(true);
    try {
      // Build the system prompt based on content type
      let systemPrompt: string;
      if (contentType === 'assignment') {
        systemPrompt = `You are an expert curriculum designer. Given a topic and optional source material, suggest 4-5 specific, assessable subtopics suitable for creating exam questions.

Each subtopic should be:
- Specific enough to write 2-3 meaningful questions about
- A concrete concept, technique, or principle (not a broad category)
- Distinct from other subtopics (minimal overlap)
- At an appropriate Bloom's taxonomy level for assessment (Apply, Analyze, Evaluate)

Bad examples: "Introduction to X", "Overview of Y", "Basics of Z"
Good examples: "Binary search tree insertion and deletion", "Race conditions in multi-threaded applications", "Trade-offs between normalization and denormalization"

Respond with ONLY the subtopics, one per line, no numbering, no explanations.`;
      } else if (contentType === 'pre-lecture') {
        systemPrompt = `You are an expert educator. Given a topic and optional source material, suggest 3-4 introductory subtopics for a beginner-friendly pre-read that builds foundational awareness.

Each subtopic should be:
- Accessible to complete beginners with no prior knowledge of this specific topic
- Oriented toward building curiosity and basic understanding (not mastery)
- Something that can be explained with everyday analogies
- A stepping stone that prepares students for deeper learning in the lecture

Respond with ONLY the subtopics, one per line, no numbering, no explanations.`;
      } else {
        systemPrompt = `You are an expert educator. Given a topic and optional source material, suggest 4-5 teachable subtopics for a comprehensive lecture aimed at building student mastery.

Each subtopic should be:
- A distinct, teachable unit that can be explained with examples
- Ordered from foundational concepts to more advanced applications
- Concrete enough for detailed explanation (not too broad or too narrow)
- Progressive — later subtopics should build on earlier ones

Respond with ONLY the subtopics, one per line, no numbering, no explanations.`;
      }

      // Build user message with topic + optional transcript context
      let userContent = `Topic: ${topic}`;

      // Add transcript/source context if available (truncated to first 800 chars to keep prompt lean)
      const sourceContent = sources.map(s => s.content ?? '').filter(Boolean).join('\n');
      const transcriptContent = transcript.trim();
      const contextText = sourceContent || transcriptContent;

      if (contextText) {
        const truncated = contextText.slice(0, 800);
        const suffix = contextText.length > 800 ? '...[truncated]' : '';
        userContent += `\n\nSource material excerpt (use this to ground your subtopic suggestions in the actual content):\n${truncated}${suffix}`;
      }

      // Also include prerequisites if available
      const prereqText = prerequisites.trim();
      if (prereqText) {
        userContent += `\n\nStudent prerequisites: ${prereqText}`;
      }

      const messages = [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userContent }
      ];
      let response = '';
      await streamCompletion('minimax' as AIProvider, messages, (chunk) => {
        if (chunk.delta) response += chunk.delta;
      });
      const parsed = response.split(/[\n;]/).map(s => s.trim()).filter(Boolean);
      suggestionsCache.current[cacheKey] = parsed;
      setSuggestions(parsed);
    } catch {
      // silently fail - suggestions are optional
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const step1Complete = !!contentType;

  const handleBreadcrumbClick = (step: number) => {
    if (isGenerating) return;
    goToStep(step);
  };

  return (
    <div
      key={pulseKey}
      className={cn(
        'space-y-4 border border-transparent rounded-lg p-1',
        pulseKey > 0 && 'animate-border-pulse'
      )}
    >
      {/* Draft restored banner */}
      {draftRestored && (
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-accent/5 border border-accent/20 mb-4">
          <span className="text-xs text-accent flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Draft restored from previous session
          </span>
          <button
            onClick={() => {
              sessionStorage.removeItem(DRAFT_KEY);
              setContentType(null);
              setTopic('');
              setSubtopics('');
              setPrerequisites('');
              setTranscript('');
              setQuestionCounts(DEFAULT_QUESTION_COUNTS);
              setInputMode('upload');
              setActiveStep(1);
              setDraftRestored(false);
            }}
            className="text-xs text-text-secondary hover:text-text-primary"
          >
            Clear draft
          </button>
        </div>
      )}

      {/* Horizontal Stepper Navigation */}
      <StepperNav
        activeStep={activeStep}
        step1Complete={step1Complete}
        contentType={contentType}
        isGenerating={isGenerating}
        onStepClick={handleBreadcrumbClick}
      />

      {/* Animated step transitions */}
      <AnimatePresence mode="wait" custom={stepDirection}>
        {/* Step 1: Content Type */}
        {activeStep === 1 && (
          <motion.div
            key="step-1"
            custom={stepDirection}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * -24 }}
            transition={prefersReducedMotion ? reducedMotionTransition : { ...springSnappy, opacity: { duration: 0.15 } }}
            className="space-y-4"
          >
            <div>
              <h2 className="text-sm font-semibold text-text-primary mb-1">Choose content type</h2>
              <p className="text-xs text-text-secondary">Select the type of educational content to generate.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {CONTENT_TYPES.map(({ type, label, desc, icon: Icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    setContentType(type);
                    goToStep(2);
                  }}
                  disabled={isGenerating}
                  className={cn(
                    'p-4 sm:p-6 rounded-xl border text-left transition-all duration-200 group min-h-[44px]',
                    'hover:scale-[1.02] hover:border-accent hover:shadow-sm active:scale-[0.98]',
                    contentType === type
                      ? 'border-accent bg-accent/5 ring-1 ring-accent shadow-sm'
                      : 'border-border hover:bg-sidebar/50',
                    isGenerating && 'opacity-50 cursor-not-allowed pointer-events-none'
                  )}
                  style={{ touchAction: 'manipulation' }}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-colors duration-200',
                      contentType === type
                        ? 'bg-accent/10 text-accent'
                        : 'bg-sidebar text-text-secondary group-hover:bg-accent/10 group-hover:text-accent',
                    )}
                  >
                    <Icon />
                  </div>
                  <div className="font-medium text-sm text-text-primary">{label}</div>
                  <div className="text-xs text-text-secondary mt-1 leading-relaxed">{desc}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2: Type-specific inputs */}
        {contentType && activeStep === 2 && (
          <motion.div
            key="step-2"
            custom={stepDirection}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * -24 }}
            transition={prefersReducedMotion ? reducedMotionTransition : { ...springSnappy, opacity: { duration: 0.15 } }}
            className="space-y-5"
          >
          <h2 className="text-sm font-semibold text-text-primary mb-3">What should it cover?</h2>

          <div>
            <label className="block text-xs font-medium text-text-primary mb-1.5">
              Topic <span className="text-danger">*</span>
            </label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Photosynthesis, Data Structures, Machine Learning"
              disabled={isGenerating}
              maxLength={200}
            />
            <div className="flex items-center justify-end mt-1">
              <span className={cn(
                'text-xs',
                topic.length >= 190 ? 'text-danger font-medium' :
                topic.length >= 160 ? 'text-warning' :
                'text-text-secondary'
              )}>
                {topic.length}/200
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <button
                type="button"
                onClick={handleSuggestSubtopics}
                disabled={!topic.trim() || isLoadingSuggestions}
                className="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 disabled:opacity-50"
              >
                {isLoadingSuggestions ? 'Getting suggestions...' : 'Suggest subtopics'}
              </button>
            </div>
            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      const current = subtopics.trim();
                      setSubtopics(current ? `${current}\n${s}` : s);
                      setSuggestions(prev => prev.filter(suggestion => suggestion !== s));
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent/10 text-accent text-xs hover:bg-accent/20 border border-accent/20 transition-colors group"
                    title="Add to Subtopics"
                  >
                    {s}
                    <span className="text-accent/50 group-hover:text-accent ml-1 font-medium">+</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {contentType && (
            <>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Subtopics <span className="text-text-secondary font-normal">(one per line)</span>
                </label>
                <textarea
                  value={subtopics}
                  onChange={(e) => setSubtopics(e.target.value)}
                  placeholder={"Lists\nDictionaries\nTuples\nSets"}
                  disabled={isGenerating}
                  rows={4}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-y"
                />
                <span className="text-xs text-text-secondary ml-auto">
                  {subtopics.trim() ? subtopics.split('\n').filter(s => s.trim()).length : 0} item(s)
                </span>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-primary mb-1.5">
                  Prerequisites <span className="text-text-secondary font-normal">(one per line)</span>
                </label>
                <textarea
                  value={prerequisites}
                  onChange={(e) => setPrerequisites(e.target.value)}
                  placeholder={"Basic Python syntax\nVariables\nFunctions"}
                  disabled={isGenerating}
                  rows={3}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-y"
                />
                <span className="text-xs text-text-secondary ml-auto">
                  {prerequisites.trim() ? prerequisites.split('\n').filter(s => s.trim()).length : 0} item(s)
                </span>
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
                      {mode === 'upload' ? 'Upload Files' : 'Paste Text'}
                    </span>
                  </label>
                ))}
              </div>

              {inputMode === 'upload' ? (
                <FileUpload onFilesLoaded={setSources} />
              ) : (
                <>
                  <textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Paste your transcript or notes here..."
                    disabled={isGenerating}
                    className="w-full h-36 px-3 py-2.5 text-sm border border-border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-accent bg-background text-text-primary placeholder:text-text-secondary"
                  />
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-text-secondary">
                      {transcript.trim().split(/\s+/).filter(Boolean).length.toLocaleString()} words
                      · {transcript.length.toLocaleString()} chars
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {contentType === 'assignment' && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-2">Question Distribution</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <p className="mt-2 text-xs text-text-secondary">
                Total: {questionCounts.mcq + questionCounts.msq + questionCounts.subjective} questions
              </p>
              {questionCounts.mcq + questionCounts.msq + questionCounts.subjective === 0 && (
                <p className="mt-1 text-xs text-danger">At least 1 question required</p>
              )}
            </div>
          )}

          <div className="pt-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!topic.trim() || topic.length > 200 || (contentType === 'assignment' && questionCounts.mcq + questionCounts.msq + questionCounts.subjective === 0)}
              onClick={() => goToStep(3)}
            >
              Continue to Generate
            </Button>
          </div>
        </motion.div>
        )}

        {/* Step 3: Generate */}
        {contentType && (activeStep === 3 || isGenerating) && (
          <motion.div
            key="step-3"
            custom={stepDirection}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * -24 }}
            transition={prefersReducedMotion ? reducedMotionTransition : { ...springSnappy, opacity: { duration: 0.15 } }}
          >
          <div className="flex items-center justify-between">
            <div>
              {isGenerating && stages && stages.length > 0 && (
                <StageIndicator stages={stages} />
              )}
              {!isGenerating && !topic.trim() && (
                <p className="text-xs text-text-secondary">Enter a topic above to get started.</p>
              )}
            </div>
            <div className="relative overflow-hidden rounded-lg">
              {isGenerating && stages && stages.length > 0 && (
                <div
                  role="progressbar"
                  aria-label="Generation progress"
                  aria-valuenow={Math.round(
                    stages.filter(s => s.status === 'done').length /
                    (stages.filter(s => s.status !== 'skipped').length || 1) * 100
                  ) || 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="absolute inset-0 top-0 left-0 bg-accent"
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
              {!isGenerating && stages && stages.length > 0 && stages.every(s => s.status === 'done') && (
                <div
                  className="absolute inset-0 top-0 left-0 bg-success animate-bounce-done"
                  style={{ transform: 'scaleX(1)', transformOrigin: 'left' }}
                />
              )}
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
                  isGenerating && 'text-white bg-accent/80',
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
                  <span className="flex items-center gap-2">Done</span>
                ) : stages && stages.some(s => s.status === 'error') ? (
                  <span className="flex items-center gap-2">Try again</span>
                ) : (
                  'Create content'
                )}
              </Button>
              {!isGenerating && canSubmit && (
                <p className="text-xs text-text-secondary/50 text-center mt-1.5">Cmd + Enter</p>
              )}
            </div>
          </div>
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
