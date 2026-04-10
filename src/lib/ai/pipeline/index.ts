/**
 * Barrel re-exports for the pipeline sub-modules.
 *
 * TypeScript resolves `@/lib/ai/pipeline` to the sibling file
 * `src/lib/ai/pipeline.ts` (file takes precedence over directory index),
 * so `runPipeline` is NOT re-exported here — it lives in the parent file.
 *
 * This barrel exists so internal consumers can do:
 *   import { parseSections } from '@/lib/ai/pipeline/index'
 * if needed, but the primary import path for external consumers remains
 * `@/lib/ai/pipeline` -> pipeline.ts -> runPipeline.
 */

export { headerCore, buildCodeFenceMask, parseSections, mergeSectionPatches } from './section-parser';
export type { Section } from './section-parser';

export {
  isLGTM,
  mergeQuestionPatches,
  countAssignmentQuestions,
  validateAssignmentCounts,
  findMissingQuestionNumbers,
  cleanAssignmentStitching,
} from './assignment-utils';
export type { QuestionType } from './assignment-utils';

export { buildMermaidFixMessages } from './mermaid-fix';
