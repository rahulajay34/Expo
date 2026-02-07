export type ContentMode = "pre-read" | "lecture" | "assignment";

export type AgentStatus = "idle" | "working" | "completed" | "error";

export interface GapAnalysisResult {
  covered: string[];
  notCovered: string[];
  partiallyCovered: string[];
  /** 
   * Specific elements missing for each partiallyCovered topic.
   * Key: exact subtopic string, Value: array of missing concepts/elements.
   * This makes feedback actionable for downstream agents.
   */
  missingElements?: Record<string, string[]>;
  transcriptTopics: string[]; // Topics mentioned in the transcript
  timestamp: string;
}

/**
 * Instructor Teaching Quality Assessment Result
 * Evaluates transcript for pedagogical effectiveness across 8 dimensions
 */
export interface InstructorQualityResult {
  /** Overall teaching quality score (1-10) */
  overallScore: number;

  /** Brief pedagogical summary */
  summary: string;

  /** Simple key-value map for UI display */
  dimensions?: Record<string, number>;

  /** Detailed breakdown by criterion */
  breakdown: {
    criterion: string;
    score: number; // 1-10
    weight: number; // Percentage (e.g., 15 for 15%)
    evidence: string; // Quote or observation from transcript
    suggestion?: string; // How to improve
  }[];

  /** Top strengths observed in the teaching */
  strengths: string[];

  /** Areas that could be improved */
  improvementAreas: string[];

  /** Alias for improvementAreas for UI compatibility */
  improvements?: string[];

  /** Learning continuity analysis */
  continuityAnalysis?: {
    previousSessionRef: boolean;
    nextSessionPreview: boolean;
    details: string;
  };

  /** When the analysis was performed */
  timestamp: string;
}

/**
 * Course context automatically detected by CourseDetector agent
 * Used to tailor content for specific educational domains
 */
export interface CourseContext {
  domain: string;
  confidence: number;
  characteristics: {
    exampleTypes: string[];
    formats: string[];
    vocabulary: string[];
    styleHints: string[];
    relatableExamples: string[];
  };
  contentGuidelines: string;
  qualityCriteria: string;



  /**
   * Voice model for consistent tone - prevents AI-sounding phrases at source
   * rather than catching them in Reviewer
   */
  voiceModel?: {
    tone: string;                      // e.g., "confident_practitioner", "curious_explorer"
    exemplarPhrases: string[];         // Good phrases to emulate
  };
}

export interface GenerationParams {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  additionalInstructions?: string;
  assignmentCounts?: {
    mcsc: number;
    mcmc: number;
    subjective: number;
  };
  /** Generation ID for tracking meta-analysis */
  generationId?: string;
}

export interface GenerationLog {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'step';
  agent?: string;
  timestamp: number;
}

export interface GenerationState {
  id?: string | number;
  topic: string;
  subtopics: string;
  mode: ContentMode;
  status: "idle" | "generating" | "complete" | "error" | "mismatch";
  currentAgent: string | null;
  currentAction: string | null;
  agentProgress: Record<string, AgentStatus>;
  gapAnalysis: GapAnalysisResult | null;
  finalContent: string | null;
  formattedContent?: string | null;
  logs: GenerationLog[];
  createdAt: number;
  updatedAt: number;
}
