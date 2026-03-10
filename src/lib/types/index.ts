// =============================================================================
// GCCP — Generated Course Content Platform
// TypeScript Type Definitions
// =============================================================================

// -----------------------------------------------------------------------------
// Content Generation Types
// -----------------------------------------------------------------------------

/** The three content types the platform can generate. */
export type ContentType = 'lecture' | 'pre-read' | 'assignment';

/** Content length / word count target for generated content. */
export type ContentLength = 'brief' | 'standard' | 'detailed' | 'comprehensive';

/** Names of the seven pipeline agents, in execution order. */
export type AgentName =
  | 'CourseDetector'
  | 'Analyzer'
  | 'Creator'
  | 'Sanitizer'
  | 'Reviewer'
  | 'Refiner'
  | 'Formatter';

/** Lifecycle status of a pipeline agent. */
export type AgentStatus = 'pending' | 'working' | 'complete' | 'error' | 'skipped';

// -----------------------------------------------------------------------------
// Pipeline
// -----------------------------------------------------------------------------

/** Retry status for a pipeline step currently being retried. */
export interface RetryStatus {
  attempt: number;
  maxAttempts: number;
  delay: number;
}

/** A single step in the 7-agent pipeline. */
export interface PipelineStep {
  agent: AgentName;
  status: AgentStatus;
  action: string;
  startTime?: number;
  endTime?: number;
  estimatedTime?: number;
  tokenUsage?: { input: number; output: number };
  cost?: number;
  retry?: RetryStatus | null;
}

// -----------------------------------------------------------------------------
// Analysis Types
// -----------------------------------------------------------------------------

/** Result of the Analyzer agent's transcript-vs-subtopics gap analysis. */
export interface GapAnalysis {
  /** Subtopics fully covered by the transcript. */
  covered: string[];
  /** Subtopics only partially addressed. */
  partial: string[];
  /** Subtopics not mentioned in the transcript at all. */
  missing: string[];
}

/** Instructor quality evaluation produced by the Analyzer agent. */
export interface InstructorQuality {
  clarity: number;
  examples: number;
  depth: number;
  engagement: number;
  overall: number;
  summary: string;
  suggestions: string[];
}

// -----------------------------------------------------------------------------
// Assignment Types
// -----------------------------------------------------------------------------

/** Question type codes for assignment questions. */
export type QuestionType = 'MCSC' | 'MCMC' | 'Subjective';

/** A single question in an assignment. */
export interface AssignmentQuestion {
  id: string;
  type: QuestionType;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  /** "1" for MCSC, "1,3" for MCMC, model answer for Subjective. */
  correctAnswer: string;
  explanation: string;
}

// -----------------------------------------------------------------------------
// Storage Types
// -----------------------------------------------------------------------------

/** A generation record persisted to IndexedDB. */
export interface GenerationRecord {
  /** Auto-incremented primary key (undefined before first save). */
  id?: number;
  topic: string;
  subtopics: string[];
  contentType: ContentType;
  /** Raw markdown for lecture/pre-read; JSON string for assignments. */
  content: string;
  formattedContent?: string;
  questions?: AssignmentQuestion[];
  gapAnalysis?: GapAnalysis;
  instructorQuality?: InstructorQuality;
  transcript?: string;
  costDetails: CostDetails;
  createdAt: Date;
  updatedAt: Date;
}

// -----------------------------------------------------------------------------
// Cost Tracking
// -----------------------------------------------------------------------------

/** Per-agent and aggregate cost breakdown for a single generation. */
export interface CostDetails {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  perAgent: Record<
    AgentName,
    { inputTokens: number; outputTokens: number; cost: number }
  >;
}

// -----------------------------------------------------------------------------
// Generation Config (User Inputs)
// -----------------------------------------------------------------------------

/** The set of user-provided inputs that drive a generation run. */
export interface GenerationConfig {
  topic: string;
  subtopics: string[];
  contentType: ContentType;
  transcript?: string;
  mcscCount: number;
  mcmcCount: number;
  subjectiveCount: number;
}

// -----------------------------------------------------------------------------
// Pipeline State
// -----------------------------------------------------------------------------

/** Full runtime state of the generation pipeline (used by Zustand store). */
export interface PipelineState {
  isGenerating: boolean;
  currentAgent?: AgentName;
  steps: PipelineStep[];
  content: string;
  error?: string;
  gapAnalysis?: GapAnalysis;
  instructorQuality?: InstructorQuality;
  questions?: AssignmentQuestion[];
  costDetails: CostDetails;
  cacheHit?: boolean;
}

// -----------------------------------------------------------------------------
// Navigation
// -----------------------------------------------------------------------------

/** A single item in the sidebar / top navigation. */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
