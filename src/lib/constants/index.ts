// =============================================================================
// GCCP — Generated Course Content Platform
// Application Constants
// =============================================================================

import type { AgentName, ContentType } from '@/lib/types';

// -----------------------------------------------------------------------------
// App Metadata
// -----------------------------------------------------------------------------

export const APP_NAME = 'GCCP';
export const APP_DESCRIPTION = 'Generated Course Content Platform';
export const APP_VERSION = '1.0.0';

// -----------------------------------------------------------------------------
// Storage Limits
// -----------------------------------------------------------------------------

/** Maximum number of generations kept in IndexedDB before auto-pruning. */
export const MAX_GENERATIONS = 50;

// -----------------------------------------------------------------------------
// Default Question Counts (Assignments)
// -----------------------------------------------------------------------------

export const DEFAULT_MCSC_COUNT = 4;
export const DEFAULT_MCMC_COUNT = 4;
export const DEFAULT_SUBJECTIVE_COUNT = 1;

// -----------------------------------------------------------------------------
// Agent Colors — used for pipeline visualization badges and borders
// -----------------------------------------------------------------------------

export const AGENT_COLORS: Record<
  AgentName,
  { bg: string; text: string; border: string }
> = {
  CourseDetector: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-500',
    border: 'border-blue-500',
  },
  Analyzer: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-500',
    border: 'border-purple-500',
  },
  Creator: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-500',
    border: 'border-emerald-500',
  },
  Sanitizer: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-500',
    border: 'border-amber-500',
  },
  Reviewer: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-500',
    border: 'border-rose-500',
  },
  Refiner: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-500',
    border: 'border-cyan-500',
  },
  Formatter: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-500',
    border: 'border-indigo-500',
  },
};

// -----------------------------------------------------------------------------
// Agent Descriptions — shown in the pipeline stepper UI
// -----------------------------------------------------------------------------

export const AGENT_DESCRIPTIONS: Record<AgentName, string> = {
  CourseDetector: 'Identifying academic domain and context',
  Analyzer: 'Analyzing transcript coverage and quality',
  Creator: 'Generating educational content',
  Sanitizer: 'Reviewing for accuracy and consistency',
  Reviewer: 'Evaluating quality against rubric',
  Refiner: 'Applying targeted improvements',
  Formatter: 'Formatting and structuring output',
};

// -----------------------------------------------------------------------------
// Agent Icons — Lucide icon component names
// -----------------------------------------------------------------------------

export const AGENT_ICONS: Record<AgentName, string> = {
  CourseDetector: 'Search',
  Analyzer: 'BarChart3',
  Creator: 'PenTool',
  Sanitizer: 'Shield',
  Reviewer: 'CheckCircle',
  Refiner: 'Sparkles',
  Formatter: 'FileText',
};

// -----------------------------------------------------------------------------
// Pipeline Execution Order
// -----------------------------------------------------------------------------

export const PIPELINE_ORDER: AgentName[] = [
  'CourseDetector',
  'Analyzer',
  'Creator',
  'Sanitizer',
  'Reviewer',
  'Refiner',
  'Formatter',
];

// -----------------------------------------------------------------------------
// Content Type Display Styles
// -----------------------------------------------------------------------------

export const CONTENT_TYPE_COLORS: Record<
  ContentType,
  { bg: string; text: string; badge: string }
> = {
  lecture: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300',
  },
  'pre-read': {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  assignment: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  },
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  lecture: 'Lecture Notes',
  'pre-read': 'Pre-Read',
  assignment: 'Assignment',
};

// -----------------------------------------------------------------------------
// Gemini Model IDs
// -----------------------------------------------------------------------------

export const GEMINI_MODELS = {
  pro: 'gemini-2.5-pro',
  flash: 'gemini-2.5-flash',
} as const;

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS];

// -----------------------------------------------------------------------------
// Token Pricing — cost per 1 million tokens (USD)
// -----------------------------------------------------------------------------

export const TOKEN_PRICING: Record<
  GeminiModel,
  { input: number; output: number }
> = {
  [GEMINI_MODELS.pro]: { input: 1.25, output: 10.0 },
  [GEMINI_MODELS.flash]: { input: 0.15, output: 0.6 },
};
