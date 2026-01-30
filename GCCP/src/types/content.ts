export type ContentMode = "pre-read" | "lecture" | "assignment";

export type AgentStatus = "idle" | "working" | "completed" | "error";

/**
 * Task types for model routing - determines which model to use based on task complexity
 */
export type TaskType = "creative" | "analytical" | "mechanical";

/**
 * Model routing configuration for cost optimization
 */
export interface ModelRoutingConfig {
  model: string;
  fallback: string;
}

/**
 * Critic agent category score
 */
export interface CriticCategoryScore {
  score: number; // 1-10
  weight: number; // 0-1
  feedback: string;
}

/**
 * Critic agent feedback structure
 */
export interface CriticFeedback {
  overall_score: number; // 1-10
  category_scores: {
    theoretical_practical_balance: CriticCategoryScore;
    clarity_structure: CriticCategoryScore;
    accuracy_depth: CriticCategoryScore;
    engagement_level: CriticCategoryScore;
  };
  feedback_summary: string;
  actionable_improvements: string[];
  meets_threshold: boolean;
  recommended_action: "publish" | "refine" | "regenerate";
}

export interface GapAnalysisResult {
  covered: string[];
  notCovered: string[];
  partiallyCovered: string[];
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
