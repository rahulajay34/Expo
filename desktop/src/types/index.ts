export type ContentMode = 'lecture' | 'pre-read' | 'assignment';

export type QuestionType = 'mcsc' | 'mcmc' | 'subjective';
export type DifficultyLevel = 0 | 0.5 | 1;

export interface AssignmentItem {
  questionType: QuestionType;
  contentType: 'markdown';
  contentBody: string;
  intAnswer?: number;
  prepTime?: number;
  floatAnswerMax?: number;
  floatAnswerMin?: number;
  fitbAnswer?: string;
  mcscAnswer?: number;
  subjectiveAnswer?: string;
  options: {
    1: string;
    2: string;
    3: string;
    4: string;
  };
  mcmcAnswer?: string;
  tagRelationships?: string;
  difficultyLevel: DifficultyLevel;
  answerExplanation: string;
}

export interface GapAnalysisResult {
  covered: string[];
  notCovered: string[];
  partiallyCovered: string[];
  missingElements?: Record<string, string[]>;
  transcriptTopics: string[];
  timestamp: string;
}

export interface InstructorQualityResult {
  overallScore: number;
  summary: string;
  dimensions?: Record<string, number>;
  breakdown: {
    criterion: string;
    score: number;
    weight: number;
    evidence: string;
    suggestion?: string;
  }[];
  strengths: string[];
  improvementAreas: string[];
  improvements?: string[];
  continuityAnalysis?: {
    previousSessionRef: boolean;
    nextSessionPreview: boolean;
    details: string;
  };
  timestamp: string;
}

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
  voiceModel?: {
    tone: string;
    exemplarPhrases: string[];
  };
}

export interface ReviewResult {
  needsPolish: boolean;
  feedback: string;
  score: number;
  detailedFeedback?: string[];
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
  generationId?: string;
}

export interface PipelineStep {
  agent: string;
  status: 'working' | 'success' | 'error' | 'skipped';
  message: string;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface ApiKey {
  id: string;
  provider: string;
  api_key: string;
  label?: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface Model {
  id: string;
  provider: string;
  model_id: string;
  display_name: string;
  is_custom: number;
  is_default: number;
  max_tokens: number;
  temperature: number;
  top_p: number;
  created_at: string;
}

export interface AgentPrompt {
  id: string;
  agent_name: string;
  display_name: string;
  category: string;
  description?: string;
  prompt_text: string;
  is_custom: number;
  updated_at: string;
}

export interface Generation {
  id: string;
  title: string;
  topic: string;
  subject?: string;
  grade_level?: string;
  mode: ContentMode;
  provider: string;
  model: string;
  final_content?: string;
  pipeline_log?: string;
  is_favorite: number;
  created_at: string;
}
