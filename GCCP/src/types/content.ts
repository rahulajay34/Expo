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
   * Domain-specific structural templates that reshape content organization
   * Different from guidelines which just provide vocabulary/style hints
   */
  structuralTemplate?: {
    preRead: {
      requiredSections: string[];     // e.g., ["curiosity_hook", "vocabulary_to_notice", "essential_question"]
      structuralPattern: string;       // e.g., "problem_first", "contrast_driven"
    };
    lecture: {
      requiredSections: string[];      // e.g., ["synthesis_points", "actionable_bridges"]
      structuralPattern: string;       // e.g., "attack_defense_dialectic" for security
    };
    assignment: {
      scenarioPatterns: string[];      // Domain-specific scenario starters
      constraintTypes: string[];       // e.g., ["time_pressure", "resource_limits", "legacy_code"]
    };
  };

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
