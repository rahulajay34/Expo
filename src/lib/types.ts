// Content types
export type ContentType = 'lecture' | 'pre-lecture' | 'assignment';

export interface SourceFile {
  type: string;  // 'pdf' | 'pptx' | 'md' | 'txt' | 'code'
  name: string;
  content?: string;  // extracted text
}

export interface ContentMetadata {
  topic?: string;
  subtopics?: string[];
  prerequisites?: string[];
  questionCounts?: { mcq: number; msq: number; subjective: number };
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  markdown: string;
  createdAt: string;
  updatedAt: string;
  provider: AIProvider;
  sources: SourceFile[];
  metadata: ContentMetadata;
}

// AI types
export type AIProvider = 'openai' | 'minimax' | 'gemini' | 'xai';

export interface GenerationInput {
  type: ContentType;
  topic: string;
  sources: SourceFile[];
  transcript?: string;
  subtopics?: string[];
  prerequisites?: string[];
  questionCounts?: { mcq: number; msq: number; subjective: number };
  provider: AIProvider;
}

export interface PipelineStage {
  name: 'creator' | 'reviewer' | 'refiner' | 'formatter' | 'csv-converter';
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  error?: string;
}

/** Tracks individual parallel chunk progress during the creator stage */
export interface ChunkProgress {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
}

export interface StreamingState {
  content: string;
  stages: PipelineStage[];
  isComplete: boolean;
  error?: string;
  activeChunks?: ChunkProgress[];
}

// CSV types
export interface CSVRow {
  questionType: string;
  contentType: string;
  contentBody: string;
  intAnswer: string;
  'prepTime(in_seconds)': string;
  'floatAnswer.max': string;
  'floatAnswer.min': string;
  fitbAnswer: string;
  mcscAnswer: string;
  subjectiveAnswer: string;
  'option.1': string;
  'option.2': string;
  'option.3': string;
  'option.4': string;
  mcmcAnswer: string;
  tagRelationships: string;
  difficultyLevel: string;
  answerExplanationType: string;
  answerExplanation: string;
}

// UI types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
}

export interface StorageStats {
  usedBytes: number;
  maxBytes: number;  // 5MB browser limit
  itemCount: number;
}
