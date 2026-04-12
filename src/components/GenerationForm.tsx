'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { AnimatePresence, motion, useReducedMotion, LayoutGroup } from 'framer-motion';
import { GenerationInput, ContentType, ContentLength, AIProvider, SourceFile, PipelineStage, PIPELINE_STAGES, ContentItem } from '@/lib/types';
import { getAllTemplates, PromptTemplate } from '@/lib/prompt-templates';
import { getAllContent } from '@/lib/storage';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { FileUpload } from './FileUpload';
import { cn } from '@/lib/utils';
import { CustomSelect } from './CustomSelect';
import { streamCompletion } from '@/lib/ai/client';
import { springSnappy, reducedMotionTransition } from '@/lib/motion';

interface GenerationFormProps {
  onGenerate: (input: GenerationInput) => void;
  isGenerating: boolean;
  stages?: PipelineStage[];
  initialValues?: Partial<GenerationInput>;
  /** Fires whenever the in-form contentType changes (incl. clear/restore). */
  onContentTypeChange?: (type: ContentType | null) => void;
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
  contentLength: ContentLength;
  customPrompt: string;
  promptTemplateId: string | null;
  savedAt: number;
}

/* ── Detailed SVG Illustrations for Content Type Cards ── */

/** Lecture Notes: stacked document pages with text lines and a pen accent */
const LectureIllustration = memo(function LectureIllustration({ color }: { color: string }) { return (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Back page */}
    <rect x="18" y="10" width="38" height="48" rx="3" fill={color} opacity="0.08" stroke={color} strokeWidth="1.5" />
    {/* Middle page (offset) */}
    <rect x="14" y="14" width="38" height="48" rx="3" fill={color} opacity="0.12" stroke={color} strokeWidth="1.5" />
    {/* Front page */}
    <rect x="10" y="18" width="38" height="48" rx="3" fill="var(--background)" stroke={color} strokeWidth="1.5" />
    {/* Text lines on front page */}
    <line x1="17" y1="28" x2="40" y2="28" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    <line x1="17" y1="34" x2="36" y2="34" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="17" y1="39" x2="38" y2="39" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="17" y1="44" x2="33" y2="44" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="17" y1="49" x2="37" y2="49" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    {/* Highlight bar */}
    <rect x="17" y="53" width="16" height="3" rx="1.5" fill={color} opacity="0.25" />
    {/* Pen */}
    <g transform="translate(46, 44) rotate(-35)">
      <rect x="0" y="0" width="4" height="20" rx="1" fill={color} opacity="0.7" />
      <polygon points="0,20 4,20 2,25" fill={color} opacity="0.9" />
    </g>
  </svg>
); });

/** Pre-Lecture Notes: open book with a bookmark ribbon */
const PreLectureIllustration = memo(function PreLectureIllustration({ color }: { color: string }) { return (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Left page */}
    <path d="M8 16C8 14.343 9.343 13 11 13H36V59H11C9.343 59 8 57.657 8 56V16Z" fill={color} opacity="0.06" stroke={color} strokeWidth="1.5" />
    {/* Right page */}
    <path d="M36 13H61C62.657 13 64 14.343 64 16V56C64 57.657 62.657 59 61 59H36V13Z" fill={color} opacity="0.06" stroke={color} strokeWidth="1.5" />
    {/* Spine line */}
    <line x1="36" y1="13" x2="36" y2="59" stroke={color} strokeWidth="1.5" opacity="0.4" />
    {/* Left page text lines */}
    <line x1="14" y1="22" x2="30" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="14" y1="27" x2="28" y2="27" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="14" y1="32" x2="30" y2="32" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="14" y1="37" x2="26" y2="37" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="14" y1="42" x2="29" y2="42" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    {/* Right page text lines */}
    <line x1="42" y1="22" x2="58" y2="22" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="42" y1="27" x2="56" y2="27" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="42" y1="32" x2="58" y2="32" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    <line x1="42" y1="37" x2="54" y2="37" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.35" />
    {/* Bookmark ribbon */}
    <path d="M48 10V26L51.5 23L55 26V10" fill={color} opacity="0.5" stroke={color} strokeWidth="1" strokeLinejoin="round" />
    {/* Reading glasses accent */}
    <circle cx="18" cy="52" r="4" stroke={color} strokeWidth="1.5" opacity="0.45" fill="none" />
    <circle cx="28" cy="52" r="4" stroke={color} strokeWidth="1.5" opacity="0.45" fill="none" />
    <path d="M22 52H24" stroke={color} strokeWidth="1.5" opacity="0.45" />
    <path d="M14 52H12" stroke={color} strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
  </svg>
); });

/** Assignment: clipboard with checkboxes (some checked, some empty) */
const AssignmentIllustration = memo(function AssignmentIllustration({ color }: { color: string }) { return (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Clipboard body */}
    <rect x="14" y="14" width="44" height="52" rx="4" fill={color} opacity="0.06" stroke={color} strokeWidth="1.5" />
    {/* Clipboard clip */}
    <rect x="26" y="8" width="20" height="10" rx="3" fill="var(--background)" stroke={color} strokeWidth="1.5" />
    <rect x="30" y="6" width="12" height="6" rx="2" fill={color} opacity="0.2" stroke={color} strokeWidth="1" />
    {/* Checkbox row 1 - checked */}
    <rect x="22" y="26" width="10" height="10" rx="2" stroke={color} strokeWidth="1.5" fill={color} opacity="0.15" />
    <path d="M24.5 31L27 33.5L31 28" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="37" y1="31" x2="50" y2="31" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    {/* Checkbox row 2 - checked */}
    <rect x="22" y="40" width="10" height="10" rx="2" stroke={color} strokeWidth="1.5" fill={color} opacity="0.15" />
    <path d="M24.5 45L27 47.5L31 42" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="37" y1="45" x2="48" y2="45" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    {/* Checkbox row 3 - empty */}
    <rect x="22" y="54" width="10" height="10" rx="2" stroke={color} strokeWidth="1.5" opacity="0.35" fill="none" />
    <line x1="37" y1="59" x2="50" y2="59" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.25" />
  </svg>
); });

/** TA Session Guide: presenter at a board with bullet points and a clock hinting 90 min */
const TaGuideIllustration = memo(function TaGuideIllustration({ color }: { color: string }) { return (
  <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Whiteboard */}
    <rect x="10" y="12" width="44" height="30" rx="2" fill={color} opacity="0.08" stroke={color} strokeWidth="1.5" />
    {/* Board text lines */}
    <line x1="16" y1="20" x2="34" y2="20" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.6" />
    <line x1="16" y1="26" x2="44" y2="26" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
    <line x1="16" y1="31" x2="40" y2="31" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
    <line x1="16" y1="36" x2="36" y2="36" stroke={color} strokeWidth="1.3" strokeLinecap="round" opacity="0.35" />
    {/* Board stand */}
    <line x1="32" y1="42" x2="32" y2="48" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    <line x1="24" y1="48" x2="40" y2="48" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    {/* Presenter silhouette */}
    <circle cx="56" cy="32" r="4" fill={color} opacity="0.8" />
    <path d="M50 48c0-3.3 2.7-6 6-6s6 2.7 6 6v4H50v-4z" fill={color} opacity="0.55" />
    {/* Clock (90 min hint) */}
    <circle cx="20" cy="56" r="7" stroke={color} strokeWidth="1.5" fill={color} fillOpacity="0.08" />
    <line x1="20" y1="56" x2="20" y2="51" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="20" y1="56" x2="23.5" y2="58" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
); });

const CONTENT_TYPES = [
  {
    type: 'lecture' as ContentType,
    label: 'Lecture Notes',
    desc: 'Comprehensive notes from transcript',
    illustration: LectureIllustration,
    color: '#3B82F6',
  },
  {
    type: 'pre-lecture' as ContentType,
    label: 'Pre-Lecture Notes',
    desc: 'Introductory pre-read material',
    illustration: PreLectureIllustration,
    color: '#10B981',
  },
  {
    type: 'assignment' as ContentType,
    label: 'Assignment',
    desc: 'MCQ, MSQ and subjective questions',
    illustration: AssignmentIllustration,
    color: '#8B5CF6',
  },
  {
    type: 'ta-guide' as ContentType,
    label: 'TA Session Guide',
    desc: '90-minute tutorial delivery guide',
    illustration: TaGuideIllustration,
    color: '#F97316',
  },
];

const LENGTH_OPTIONS: { value: ContentLength; label: string }[] = [
  { value: 'concise', label: 'Concise' },
  { value: 'short', label: 'Short' },
  { value: 'normal', label: 'Normal' },
  { value: 'long', label: 'Long' },
  { value: 'explanatory', label: 'Explanatory' },
];

const STAGE_LABELS: Record<string, string> = {
  [PIPELINE_STAGES.CREATOR]: 'Generating content',
  [PIPELINE_STAGES.REVIEWER]: 'Reviewing quality',
  [PIPELINE_STAGES.REFINER]: 'Refining issues',
  [PIPELINE_STAGES.VALIDATOR]: 'Validating diagrams',
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
    if (step === 2 && step1Complete) return true;
    if (step === 3 && !!contentType) return true;
    return false;
  };

  // Compute fill percentage for the progress bar
  // Step 1 active = 0%, Step 2 active = 50%, Step 3 active = 100%
  const progressPercent = ((activeStep - 1) / (steps.length - 1)) * 100;

  return (
    <nav aria-label="Form steps" className="mb-4">
      {/* Compact inline stepper: small circle + label inline, separator between */}
      <div className="flex items-center gap-2 relative">
        {steps.map((step, idx) => {
          const status = getStepStatus(step);
          const clickable = isClickable(step);
          return (
            <div key={step} className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => clickable && onStepClick(step)}
                disabled={!clickable}
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all duration-200 border-[1.5px] shrink-0',
                  status === 'completed' && 'bg-accent border-accent text-white',
                  status === 'active' && 'bg-background border-accent text-accent stepper-active-ring',
                  status === 'pending' && 'bg-background border-border text-text-secondary',
                  clickable && status !== 'active' && 'cursor-pointer hover:scale-110',
                  !clickable && 'cursor-default',
                )}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                {status === 'completed' ? (
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 7.5l2.5 2.5L11 4.5" className="stepper-checkmark" />
                  </svg>
                ) : (
                  step
                )}
              </button>
              <span
                className={cn(
                  'text-xs leading-none whitespace-nowrap pb-0.5',
                  status === 'active' && 'text-accent font-semibold border-b-2 border-accent',
                  status === 'completed' && 'text-accent font-medium',
                  status === 'pending' && 'text-text-secondary/60',
                )}
              >
                {STEP_LABELS[step]}
              </span>
              {idx < steps.length - 1 && (
                <div className="w-8 h-px bg-border mx-1 shrink-0">
                  <div
                    className="h-full bg-accent"
                    style={{
                      width: status === 'completed' ? '100%' : '0%',
                      transition: 'width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
        {/* progressPercent kept available for downstream styling */}
        <span className="sr-only">Step {activeStep} of {steps.length} ({progressPercent}%)</span>
      </div>
    </nav>
  );
});

export function GenerationForm({ onGenerate, isGenerating, stages, initialValues, onContentTypeChange }: GenerationFormProps) {
  const [contentType, setContentType] = useState<ContentType | null>(initialValues?.type ?? null);

  // Notify parent whenever the contentType changes (incl. initial mount + draft restore)
  useEffect(() => {
    onContentTypeChange?.(contentType);
  }, [contentType, onContentTypeChange]);
  const [topic, setTopic] = useState(initialValues?.topic ?? '');
  const [subtopics, setSubtopics] = useState(initialValues?.subtopics?.join('\n') ?? '');
  const [prerequisites, setPrerequisites] = useState(initialValues?.prerequisites?.join('\n') ?? '');
  const [transcript, setTranscript] = useState(initialValues?.transcript ?? '');
  const [sources, setSources] = useState<SourceFile[]>(initialValues?.sources ?? []);
  const [questionCounts, setQuestionCounts] = useState(initialValues?.questionCounts ?? DEFAULT_QUESTION_COUNTS);
  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  // TA guide: library picker state — multi-select existing ContentItems as source material
  const [libraryItems, setLibraryItems] = useState<ContentItem[]>([]);
  const [pickedLibraryIds, setPickedLibraryIds] = useState<Set<string>>(new Set());
  const [librarySearch, setLibrarySearch] = useState('');
  const [contentLength, setContentLength] = useState<ContentLength>('normal');
  const [customPrompt, setCustomPrompt] = useState('');
  const [promptTemplateId, setPromptTemplateId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [showInstructions, setShowInstructions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const suggestionsCache = useRef<Record<string, string[]>>({});

  const [draftRestored, setDraftRestored] = useState(false);

  // S-045: Inline validation errors (only shown after first submit attempt)
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const topicError = submitAttempted
    ? topic.trim().length < 3 ? 'Topic must be at least 3 characters'
    : topic.length > 200 ? 'Topic must be 200 characters or fewer'
    : null
    : null;

  const questionCountsError = submitAttempted && contentType === 'assignment'
    ? questionCounts.mcq < 1 && questionCounts.msq < 1 && questionCounts.subjective < 1
      ? 'At least 1 question required'
      : (questionCounts.mcq > 0 && questionCounts.mcq < 1) || (questionCounts.msq > 0 && questionCounts.msq < 1) || (questionCounts.subjective > 0 && questionCounts.subjective < 1)
        ? 'Each question type count must be at least 1'
        : questionCounts.mcq + questionCounts.msq + questionCounts.subjective < 3
          ? 'Total question count must be at least 3'
          : null
    : null;

  const customPromptError = submitAttempted && customPrompt.length > 2000
    ? 'Custom instructions must be 2000 characters or fewer'
    : null;

  // Load prompt templates on mount
  useEffect(() => {
    setTemplates(getAllTemplates());
  }, []);

  useEffect(() => {
    if (contentType !== 'ta-guide') return;
    setLibraryItems(
      getAllContent().filter(
        (i) => i.type === 'lecture' || i.type === 'pre-lecture' || i.type === 'assignment'
      )
    );
  }, [contentType]);

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
      setContentLength(draft.contentLength ?? 'normal');
      setCustomPrompt(draft.customPrompt ?? '');
      setPromptTemplateId(draft.promptTemplateId ?? null);
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
        questionCounts, inputMode, activeStep,
        contentLength, customPrompt, promptTemplateId,
        savedAt: Date.now(),
      };
      // Only save if there's meaningful content
      if (contentType || topic.trim()) {
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [contentType, topic, subtopics, prerequisites, transcript, questionCounts, inputMode, activeStep, contentLength, customPrompt, promptTemplateId, isGenerating]);

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
    if (isGenerating || !contentType) return;
    setSubmitAttempted(true);
    // Validate fields
    if (!topic.trim() || topic.trim().length < 3 || topic.length > 200) return;
    if (customPrompt.length > 2000) return;
    if (contentType === 'assignment') {
      const total = questionCounts.mcq + questionCounts.msq + questionCounts.subjective;
      if (total < 3) return;
      if (questionCounts.mcq < 0 || questionCounts.msq < 0 || questionCounts.subjective < 0) return;
    }
    sessionStorage.removeItem(DRAFT_KEY); // Clear draft on submit
    setDraftRestored(false);

    // TA guide: fold picked library items into the transcript alongside uploads/paste
    let effectiveTranscript = transcript.trim();
    if (contentType === 'ta-guide' && pickedLibraryIds.size > 0) {
      const pickedMarkdown = libraryItems
        .filter((item) => pickedLibraryIds.has(item.id))
        .map((item) => `# ${item.title} (${item.type})\n\n${item.markdown}`)
        .join('\n\n---\n\n');
      effectiveTranscript = [pickedMarkdown, effectiveTranscript].filter(Boolean).join('\n\n---\n\n');
    }

    // Field visibility per content type — only include values that the
    // corresponding form field is actually shown for (no stale values).
    const subtopicsAllowed = contentType === 'lecture' || contentType === 'pre-lecture' || contentType === 'assignment';
    const prereqAllowed = contentType === 'pre-lecture';
    const lengthAllowed = contentType === 'lecture';

    onGenerate({
      type: contentType,
      topic: topic.trim(),
      sources,
      transcript: effectiveTranscript || undefined,
      subtopics: subtopicsAllowed && subtopics.trim()
        ? subtopics.split('\n').map(s => s.trim()).filter(Boolean)
        : undefined,
      prerequisites: prereqAllowed && prerequisites.trim()
        ? prerequisites.split('\n').map(s => s.trim()).filter(Boolean)
        : undefined,
      questionCounts: contentType === 'assignment' ? questionCounts : undefined,
      provider: 'minimax' as AIProvider,
      contentLength: lengthAllowed && contentLength !== 'normal' ? contentLength : undefined,
      customPrompt: customPrompt.trim() || undefined,
      promptTemplateId: promptTemplateId || undefined,
    });
  }, [isGenerating, contentType, topic, sources, transcript, subtopics, prerequisites, questionCounts, contentLength, customPrompt, promptTemplateId, onGenerate, pickedLibraryIds, libraryItems]);

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Keep submit always enabled (S-045: show errors on click instead of blocking button)
  const canSubmit = !isGenerating && !!contentType;

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
    <LayoutGroup>
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
              setContentLength('normal');
              setCustomPrompt('');
              setPromptTemplateId(null);
              setShowInstructions(false);
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
      <AnimatePresence mode="popLayout" custom={stepDirection}>
        {/* Step 1: Content Type */}
        {activeStep === 1 && (
          <motion.div
            key="step-1"
            layout
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              {CONTENT_TYPES.map(({ type, label, desc, illustration: Illustration, color }) => {
                const isSelected = contentType === type;
                return (
                  <motion.button
                    key={type}
                    onClick={() => {
                      setContentType(type);
                      goToStep(2);
                    }}
                    disabled={isGenerating}
                    transition={prefersReducedMotion ? reducedMotionTransition : springSnappy}
                    className={cn(
                      'relative rounded-xl border text-left transition-all duration-200 group overflow-hidden',
                      'min-h-[200px] p-5 sm:p-6 flex flex-col items-center',
                      'hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]',
                      'backdrop-blur-xl shadow-md',
                      'bg-white/55 dark:bg-white/[0.06] dark:border-white/[0.08] dark:shadow-[0_2px_16px_rgba(0,0,0,0.4)]',
                      isSelected
                        ? 'ring-1 shadow-lg'
                        : 'border-border/60 hover:border-opacity-80',
                      isGenerating && 'opacity-50 cursor-not-allowed pointer-events-none'
                    )}
                    style={{
                      touchAction: 'manipulation',
                      borderColor: isSelected ? color : undefined,
                      borderLeftWidth: '3px',
                      borderLeftColor: isSelected ? color : 'var(--border)',
                      backgroundColor: isSelected ? `${color}08` : undefined,
                      // @ts-expect-error CSS custom properties
                      '--card-color': color,
                    }}
                  >
                    {/* Subtle background tint on hover */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                      style={{ backgroundColor: `${color}08` }}
                    />
                    {/* Illustration */}
                    <div className="relative mb-4 mt-1">
                      <Illustration color={color} />
                    </div>
                    {/* Title */}
                    <div
                      className="text-lg font-semibold text-text-primary text-center relative"
                      style={{ fontSize: '18px' }}
                    >
                      {label}
                    </div>
                    {/* Description */}
                    <div className="text-sm text-text-secondary mt-2 leading-relaxed text-center relative" style={{ fontSize: '14px' }}>
                      {desc}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Step 2: Type-specific inputs */}
        {contentType && activeStep === 2 && (
          <motion.div
            key="step-2"
            layout
            custom={stepDirection}
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: stepDirection * -24 }}
            transition={prefersReducedMotion ? reducedMotionTransition : { ...springSnappy, opacity: { duration: 0.15 } }}
            className="space-y-3"
          >
          <h2 className="text-sm font-semibold text-text-primary">What should it cover?</h2>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-text-primary">
              Topic <span className="text-danger">*</span>
            </label>
            <Input
              value={topic}
              onChange={(e) => { setTopic(e.target.value); }}
              placeholder="e.g., Photosynthesis, Data Structures, Machine Learning"
              disabled={isGenerating}
              maxLength={200}
              className={topicError ? 'border-danger focus:ring-danger' : undefined}
            />
            {topicError ? (
              <p className="text-xs text-danger">{topicError}</p>
            ) : (
              <div className="flex items-center justify-end">
                <span className={cn(
                  'text-xs',
                  topic.length >= 190 ? 'text-danger font-medium' :
                  topic.length >= 160 ? 'text-warning' :
                  'text-text-secondary'
                )}>
                  {topic.length}/200
                </span>
              </div>
            )}
            <div className="flex items-center gap-2">
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

          {/* Content Length Slider — only meaningful for lecture (pre-lecture prompt does not use length) */}
          {contentType === 'lecture' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-primary">Content Length</label>
            <div className="pt-2 pb-4 px-1">
              <div
                className="length-slider-track"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  const idx = Math.round(pct * (LENGTH_OPTIONS.length - 1));
                  setContentLength(LENGTH_OPTIONS[Math.max(0, Math.min(idx, LENGTH_OPTIONS.length - 1))].value);
                }}
              >
                <div
                  className="length-slider-fill"
                  style={{ width: `${(LENGTH_OPTIONS.findIndex(o => o.value === contentLength) / (LENGTH_OPTIONS.length - 1)) * 100}%` }}
                />
                {LENGTH_OPTIONS.map((opt, i) => (
                  <div
                    key={opt.value}
                    className={`length-slider-tick ${LENGTH_OPTIONS.findIndex(o => o.value === contentLength) >= i ? 'active' : ''}`}
                    style={{ left: `${(i / (LENGTH_OPTIONS.length - 1)) * 100}%` }}
                  />
                ))}
                <div
                  className="length-slider-thumb"
                  style={{ left: `${(LENGTH_OPTIONS.findIndex(o => o.value === contentLength) / (LENGTH_OPTIONS.length - 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-3">
                {LENGTH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setContentLength(opt.value)}
                    className={cn(
                      'text-xs transition-all duration-200',
                      contentLength === opt.value
                        ? 'text-accent font-bold'
                        : 'text-text-secondary hover:text-text-primary font-normal'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          )}

          {/* AI Instructions (collapsible) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowInstructions(!showInstructions)}
              className="flex items-center gap-1.5 text-sm font-medium text-text-primary hover:text-accent transition-colors"
            >
              <svg
                width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                className={cn('transition-transform', showInstructions && 'rotate-90')}
              >
                <path d="M4.5 2.5L8 6L4.5 9.5" />
              </svg>
              AI Instructions
              {(promptTemplateId || customPrompt.trim()) && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
              )}
            </button>

            {showInstructions && (
              <div className="space-y-3 pl-0.5">
                {templates.length > 0 && (
                  <div>
                    <label className="block text-xs text-text-secondary mb-1">Saved template</label>
                    <CustomSelect
                      value={promptTemplateId ?? ''}
                      onChange={(v) => setPromptTemplateId(v || null)}
                      placeholder="None"
                      options={[
                        { value: '', label: 'None' },
                        ...templates.map(t => ({ value: t.id, label: t.name })),
                      ]}
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="block text-xs text-text-secondary">
                    {templates.length > 0 ? 'Additional instructions (one-time)' : 'Custom instructions (one-time)'}
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., Use Indian English spellings, target MBA students, include real-world business examples..."
                    rows={3}
                    maxLength={2100}
                    className={cn(
                      'w-full px-3 py-2 text-sm border rounded-md bg-background text-text-primary placeholder:text-text-secondary resize-none',
                      customPromptError ? 'border-danger focus:ring-danger' : 'border-border'
                    )}
                  />
                  {customPromptError ? (
                    <p className="text-xs text-danger">{customPromptError}</p>
                  ) : (
                    <p className="text-xs text-text-secondary text-right">{customPrompt.length}/2000</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subtopics — lecture, pre-lecture, assignment (skipped for ta-guide) */}
          {(contentType === 'lecture' || contentType === 'pre-lecture' || contentType === 'assignment') && (
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
          )}

          {/* Prerequisites — pre-lecture only */}
          {contentType === 'pre-lecture' && (
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
          )}

          {contentType === 'ta-guide' && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-2">
                Pick from library
                <span className="ml-1 text-text-secondary font-normal">
                  (select existing lecture, pre-lecture, or assignment items as source material)
                </span>
              </label>
              {libraryItems.length === 0 ? (
                <div className="text-xs text-text-secondary italic rounded-md border border-dashed border-border px-3 py-3">
                  No saved lecture, pre-lecture, or assignment items yet. Generate some first, or upload/paste source material below.
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={librarySearch}
                    onChange={(e) => setLibrarySearch(e.target.value)}
                    placeholder="Search library items..."
                    disabled={isGenerating}
                  />
                  <div
                    className="max-h-60 overflow-y-auto rounded-md border border-border bg-background"
                    role="listbox"
                    aria-multiselectable="true"
                    aria-label="Library items"
                  >
                    {libraryItems
                      .filter((item) => {
                        const q = librarySearch.trim().toLowerCase();
                        if (!q) return true;
                        return (
                          item.title.toLowerCase().includes(q) ||
                          (item.metadata?.topic?.toLowerCase().includes(q) ?? false)
                        );
                      })
                      .map((item) => {
                        const checked = pickedLibraryIds.has(item.id);
                        return (
                          <label
                            key={item.id}
                            className={cn(
                              'flex items-start gap-3 px-3 py-2 text-xs cursor-pointer border-b border-border last:border-b-0',
                              checked ? 'bg-accent/5' : 'hover:bg-sidebar/50'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={isGenerating}
                              onChange={() => {
                                setPickedLibraryIds((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(item.id)) next.delete(item.id);
                                  else next.add(item.id);
                                  return next;
                                });
                              }}
                              className="mt-0.5 accent-accent"
                              data-testid={`library-pick-${item.id}`}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-text-primary truncate">{item.title || 'Untitled'}</div>
                              <div className="text-text-secondary mt-0.5 flex items-center gap-2">
                                <span className="capitalize">{item.type.replace('-', ' ')}</span>
                                <span className="text-text-secondary/40">·</span>
                                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                  </div>
                  <div className="text-xs text-text-secondary">
                    {pickedLibraryIds.size} selected
                    {pickedLibraryIds.size > 0 && (
                      <button
                        type="button"
                        onClick={() => setPickedLibraryIds(new Set())}
                        className="ml-2 text-accent hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {(contentType === 'lecture' || contentType === 'assignment' || contentType === 'ta-guide') && (
            <div>
              <label className="block text-xs font-medium text-text-primary mb-2">
                {contentType === 'ta-guide' ? 'Additional source material' : 'Input Source'}
              </label>
              <div className="flex gap-2 mb-3">
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
            <div className="space-y-2">
              <label className="block text-xs font-medium text-text-primary">Question Distribution</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { key: 'mcq', label: 'MCQ (Single Correct)', max: 20 },
                  { key: 'msq', label: 'MSQ (Multi-Select)', max: 20 },
                  { key: 'subjective', label: 'Subjective (Open-ended)', max: 10 },
                ].map(({ key, label, max }) => (
                  <div key={key} className="space-y-1">
                    <label className="block text-xs text-text-secondary">{label}</label>
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
              <p className="text-xs text-text-secondary">
                Total: {questionCounts.mcq + questionCounts.msq + questionCounts.subjective} questions
              </p>
              {questionCountsError && (
                <p className="text-xs text-danger">{questionCountsError}</p>
              )}
            </div>
          )}

          <div className="pt-2 shrink-0">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setSubmitAttempted(true);
                const topicValid = topic.trim().length >= 3 && topic.length <= 200;
                const customPromptValid = customPrompt.length <= 2000;
                const countsValid = contentType !== 'assignment' ||
                  (questionCounts.mcq + questionCounts.msq + questionCounts.subjective >= 3);
                if (topicValid && customPromptValid && countsValid) goToStep(3);
              }}
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
            layout
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
    </LayoutGroup>
  );
}
