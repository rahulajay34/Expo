import { create } from 'zustand';

type ContentType = 'lecture' | 'pre-read' | 'assignment';
type ContentLength = 'brief' | 'standard' | 'detailed' | 'comprehensive';
type AgentName = 'CourseDetector' | 'Analyzer' | 'Creator' | 'Sanitizer' | 'Reviewer' | 'Refiner' | 'Formatter';
type AgentStatus = 'pending' | 'working' | 'complete' | 'error' | 'skipped';
type PauseReason = 'after-creator' | 'after-reviewer' | null;
type PipelinePhase = 1 | 2 | 3;

interface RetryStatus {
  attempt: number;
  maxAttempts: number;
  delay: number;
}

interface PipelineStep {
  agent: AgentName;
  status: AgentStatus;
  action: string;
  startTime?: number;
  endTime?: number;
  tokenUsage?: { input: number; output: number };
  cost?: number;
  retry?: RetryStatus | null;
}

interface CostDetails {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  perAgent: Record<string, { inputTokens: number; outputTokens: number; cost: number }>;
}

interface GapAnalysis {
  covered: string[];
  partial: string[];
  missing: string[];
}

interface InstructorQuality {
  clarity: number;
  examples: number;
  depth: number;
  engagement: number;
  overall: number;
  summary: string;
  suggestions: string[];
}

interface Question {
  id: string;
  type: 'MCSC' | 'MCMC' | 'Subjective';
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

/** Context carried between pipeline phases for the phased execution model. */
interface PhaseContext {
  courseContext?: Record<string, unknown>;
  gapAnalysis?: Record<string, unknown>;
  instructorQuality?: Record<string, unknown>;
  reviewFeedback?: string;
  content: string;
  costs: Record<string, unknown>;
}

type AccentColor = 'indigo' | 'blue' | 'emerald' | 'rose' | 'amber';

interface AppState {
  // Generation config
  topic: string;
  subtopics: string;
  contentType: ContentType;
  contentLength: ContentLength;
  transcript: string;
  mcscCount: number;
  mcmcCount: number;
  subjectiveCount: number;

  // Pipeline state
  isGenerating: boolean;
  currentAgent: AgentName | null;
  steps: PipelineStep[];
  content: string;
  previousContent: string | null;
  error: string | null;
  gapAnalysis: GapAnalysis | null;
  instructorQuality: InstructorQuality | null;
  questions: Question[];
  costDetails: CostDetails;
  showAnswers: boolean;

  // Pipeline pause state (human-in-the-loop)
  pipelinePaused: boolean;
  pauseReason: PauseReason;
  currentPhase: PipelinePhase;
  pauseMessage: string | null;
  /** Serialized context carried between pipeline phases. */
  phaseContext: PhaseContext | null;

  // Batch mode state
  batchMode: boolean;
  batchProgress: number;
  batchTotal: number;

  // UI state
  sidebarOpen: boolean;
  pipelineExpanded: boolean;
  gapAnalysisExpanded: boolean;
  previewFullscreen: boolean;
  focusMode: boolean;
  activeGenerationId: number | null;

  // Preferences (persisted to localStorage)
  selectedModel: string;
  accentColor: AccentColor;
  outputLanguage: string;
  customLanguages: string[];

  // Actions
  setTopic: (topic: string) => void;
  setSubtopics: (subtopics: string) => void;
  setContentType: (type: ContentType) => void;
  setTranscript: (transcript: string) => void;
  setMcscCount: (count: number) => void;
  setMcmcCount: (count: number) => void;
  setSubjectiveCount: (count: number) => void;
  setContentLength: (length: ContentLength) => void;
  setContent: (content: string) => void;
  setPreviousContent: (content: string) => void;
  undoToPrevious: () => void;
  setIsGenerating: (isGenerating: boolean) => void;
  setCurrentAgent: (agent: AgentName | null) => void;
  updateStep: (agent: AgentName, update: Partial<PipelineStep>) => void;
  setSteps: (steps: PipelineStep[]) => void;
  setError: (error: string | null) => void;
  setGapAnalysis: (analysis: GapAnalysis | null) => void;
  setInstructorQuality: (quality: InstructorQuality | null) => void;
  setQuestions: (questions: Question[]) => void;
  updateQuestion: (id: string, update: Partial<Question>) => void;
  addQuestion: (question: Question) => void;
  removeQuestion: (id: string) => void;
  setCostDetails: (details: CostDetails) => void;
  setShowAnswers: (show: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setPipelineExpanded: (expanded: boolean) => void;
  setGapAnalysisExpanded: (expanded: boolean) => void;
  setPreviewFullscreen: (fullscreen: boolean) => void;
  setFocusMode: (enabled: boolean) => void;
  toggleFocusMode: () => void;
  setActiveGenerationId: (id: number | null) => void;
  setPipelinePaused: (paused: boolean, reason?: PauseReason, message?: string | null) => void;
  setCurrentPhase: (phase: PipelinePhase) => void;
  setPhaseContext: (ctx: PhaseContext | null) => void;
  setSelectedModel: (model: string) => void;
  setAccentColor: (color: AccentColor) => void;
  setOutputLanguage: (language: string) => void;
  addCustomLanguage: (language: string) => void;
  setBatchMode: (enabled: boolean) => void;
  setBatchProgress: (progress: number, total: number) => void;
  resumePipeline: () => void;
  skipRemainingAgents: () => void;
  resetGeneration: () => void;
  resetAll: () => void;
}

const initialCostDetails: CostDetails = {
  totalCost: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  perAgent: {},
};

// ---------------------------------------------------------------------------
// localStorage helpers for persisted preferences
// ---------------------------------------------------------------------------

function getStoredModel(): string {
  if (typeof window === 'undefined') return 'gemini-2.5-flash';
  try {
    return localStorage.getItem('gccp-model-preference') ?? 'gemini-2.5-flash';
  } catch {
    return 'gemini-2.5-flash';
  }
}

function getStoredOutputLanguage(): string {
  if (typeof window === 'undefined') return 'English';
  try {
    return localStorage.getItem('gccp-output-language') ?? 'English';
  } catch {
    return 'English';
  }
}

function getStoredCustomLanguages(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('gccp-custom-languages');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed.filter((s): s is string => typeof s === 'string');
    }
    return [];
  } catch {
    return [];
  }
}

function getStoredContentLength(): ContentLength {
  if (typeof window === 'undefined') return 'standard';
  try {
    const stored = localStorage.getItem('gccp-content-length');
    const valid: ContentLength[] = ['brief', 'standard', 'detailed', 'comprehensive'];
    if (stored && valid.includes(stored as ContentLength)) return stored as ContentLength;
    return 'standard';
  } catch {
    return 'standard';
  }
}

function getStoredAccentColor(): AccentColor {
  if (typeof window === 'undefined') return 'indigo';
  try {
    const stored = localStorage.getItem('gccp-accent-color');
    const valid: AccentColor[] = ['indigo', 'blue', 'emerald', 'rose', 'amber'];
    if (stored && valid.includes(stored as AccentColor)) return stored as AccentColor;
    return 'indigo';
  } catch {
    return 'indigo';
  }
}

export const useAppStore = create<AppState>((set) => ({
  // Generation config
  topic: '',
  subtopics: '',
  contentType: 'lecture',
  contentLength: getStoredContentLength(),
  transcript: '',
  mcscCount: 4,
  mcmcCount: 4,
  subjectiveCount: 1,

  // Pipeline state
  isGenerating: false,
  currentAgent: null,
  steps: [],
  content: '',
  previousContent: null,
  error: null,
  gapAnalysis: null,
  instructorQuality: null,
  questions: [],
  costDetails: initialCostDetails,
  showAnswers: true,

  // Pipeline pause state
  pipelinePaused: false,
  pauseReason: null,
  currentPhase: 1 as PipelinePhase,
  pauseMessage: null,
  phaseContext: null,

  // Batch mode state
  batchMode: false,
  batchProgress: 0,
  batchTotal: 0,

  // UI state
  sidebarOpen: true,
  pipelineExpanded: true,
  gapAnalysisExpanded: true,
  previewFullscreen: false,
  focusMode: false,
  activeGenerationId: null,

  // Preferences
  selectedModel: getStoredModel(),
  accentColor: getStoredAccentColor(),
  outputLanguage: getStoredOutputLanguage(),
  customLanguages: getStoredCustomLanguages(),

  // Actions
  setTopic: (topic) => set({ topic }),
  setSubtopics: (subtopics) => set({ subtopics }),
  setContentType: (contentType) => set({ contentType }),
  setTranscript: (transcript) => set({ transcript }),
  setMcscCount: (mcscCount) => set({ mcscCount }),
  setMcmcCount: (mcmcCount) => set({ mcmcCount }),
  setSubjectiveCount: (subjectiveCount) => set({ subjectiveCount }),
  setContentLength: (contentLength) => {
    try { localStorage.setItem('gccp-content-length', contentLength); } catch { /* noop */ }
    set({ contentLength });
  },
  setContent: (content) => set({ content }),
  setPreviousContent: (content) => set({ previousContent: content }),
  undoToPrevious: () =>
    set((state) => {
      if (!state.previousContent) return state;
      return { content: state.previousContent, previousContent: null };
    }),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setCurrentAgent: (currentAgent) => set({ currentAgent }),
  updateStep: (agent, update) =>
    set((state) => ({
      steps: state.steps.map((s) => (s.agent === agent ? { ...s, ...update } : s)),
    })),
  setSteps: (steps) => set({ steps }),
  setError: (error) => set({ error }),
  setGapAnalysis: (gapAnalysis) => set({ gapAnalysis }),
  setInstructorQuality: (instructorQuality) => set({ instructorQuality }),
  setQuestions: (questions) => set({ questions }),
  updateQuestion: (id, update) =>
    set((state) => ({
      questions: state.questions.map((q) => (q.id === id ? { ...q, ...update } : q)),
    })),
  addQuestion: (question) =>
    set((state) => ({ questions: [...state.questions, question] })),
  removeQuestion: (id) =>
    set((state) => ({ questions: state.questions.filter((q) => q.id !== id) })),
  setCostDetails: (costDetails) => set({ costDetails }),
  setShowAnswers: (showAnswers) => set({ showAnswers }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setPipelineExpanded: (pipelineExpanded) => set({ pipelineExpanded }),
  setGapAnalysisExpanded: (gapAnalysisExpanded) => set({ gapAnalysisExpanded }),
  setPreviewFullscreen: (previewFullscreen) => set({ previewFullscreen }),
  setFocusMode: (focusMode) => set({ focusMode }),
  toggleFocusMode: () => set((state) => ({ focusMode: !state.focusMode })),
  setActiveGenerationId: (activeGenerationId) => set({ activeGenerationId }),
  setSelectedModel: (selectedModel) => {
    try { localStorage.setItem('gccp-model-preference', selectedModel); } catch { /* noop */ }
    set({ selectedModel });
  },
  setAccentColor: (accentColor) => {
    try { localStorage.setItem('gccp-accent-color', accentColor); } catch { /* noop */ }
    // Apply data-accent attribute to the document
    if (typeof document !== 'undefined') {
      if (accentColor === 'indigo') {
        document.documentElement.removeAttribute('data-accent');
      } else {
        document.documentElement.setAttribute('data-accent', accentColor);
      }
    }
    set({ accentColor });
  },
  setOutputLanguage: (outputLanguage) => {
    try { localStorage.setItem('gccp-output-language', outputLanguage); } catch { /* noop */ }
    set({ outputLanguage });
  },
  addCustomLanguage: (language) => {
    set((state) => {
      const trimmed = language.trim();
      if (!trimmed || state.customLanguages.includes(trimmed)) return state;
      const updated = [...state.customLanguages, trimmed];
      try { localStorage.setItem('gccp-custom-languages', JSON.stringify(updated)); } catch { /* noop */ }
      return { customLanguages: updated };
    });
  },
  setBatchMode: (batchMode) => set({ batchMode }),
  setBatchProgress: (batchProgress, batchTotal) => set({ batchProgress, batchTotal }),
  setPipelinePaused: (pipelinePaused, pauseReason = null, pauseMessage = null) =>
    set({ pipelinePaused, pauseReason, pauseMessage }),
  setCurrentPhase: (currentPhase) => set({ currentPhase }),
  setPhaseContext: (phaseContext) => set({ phaseContext }),
  resumePipeline: () =>
    set({ pipelinePaused: false, pauseReason: null, pauseMessage: null }),
  skipRemainingAgents: () =>
    set((state) => ({
      pipelinePaused: false,
      pauseReason: null,
      pauseMessage: null,
      isGenerating: false,
      currentAgent: null,
      phaseContext: null,
      // Mark remaining pending steps as skipped
      steps: state.steps.map((s) =>
        s.status === 'pending' ? { ...s, status: 'skipped' as const } : s
      ),
    })),
  resetGeneration: () =>
    set({
      isGenerating: false,
      currentAgent: null,
      steps: [],
      content: '',
      previousContent: null,
      error: null,
      gapAnalysis: null,
      instructorQuality: null,
      questions: [],
      costDetails: initialCostDetails,
      pipelineExpanded: true,
      pipelinePaused: false,
      pauseReason: null,
      pauseMessage: null,
      currentPhase: 1 as PipelinePhase,
      phaseContext: null,
      batchProgress: 0,
      batchTotal: 0,
    }),
  resetAll: () =>
    set({
      topic: '',
      subtopics: '',
      contentType: 'lecture',
      contentLength: 'standard',
      transcript: '',
      mcscCount: 4,
      mcmcCount: 4,
      subjectiveCount: 1,
      isGenerating: false,
      currentAgent: null,
      steps: [],
      content: '',
      previousContent: null,
      error: null,
      gapAnalysis: null,
      instructorQuality: null,
      questions: [],
      costDetails: initialCostDetails,
      showAnswers: true,
      pipelineExpanded: true,
      gapAnalysisExpanded: true,
      previewFullscreen: false,
      focusMode: false,
      activeGenerationId: null,
      pipelinePaused: false,
      pauseReason: null,
      pauseMessage: null,
      currentPhase: 1 as PipelinePhase,
      phaseContext: null,
      batchMode: false,
      batchProgress: 0,
      batchTotal: 0,
    }),
}));
