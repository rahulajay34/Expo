import { CreatorAgent } from './creator';
import { AnalyzerAgent } from './analyzer';
import { SanitizerAgent } from './sanitizer';
import { RefinerAgent } from './refiner';
import { FormatterAgent } from './formatter';
import { ReviewerAgent } from './reviewer';
import { CourseDetectorAgent } from './course-detector';
import { AssignmentSanitizerAgent } from './assignment-sanitizer';
import { MetaQualityAgent } from './meta-quality';
import { InstructorQualityAgent } from './instructor-quality';
import { applySearchReplace } from './utils/text-diff';
import { stripAgentMarkers, fixFormattingInsideHtmlTags } from './utils/content-sanitizer';
import { deduplicateContent, deduplicateHeaders } from './utils/deduplication';
import { parseLLMJson } from './utils/json-parser';
import { getApiKeys, getModels, getPrompts } from '../database';
import type {
  GenerationParams,
  CourseContext,
  GapAnalysisResult,
  PipelineStep,
} from '../../types';

const AGENT_TIMEOUT_MS = 120_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, agentName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Agent timeout: ${agentName} exceeded ${timeoutMs / 1000}s limit`)), timeoutMs);
    }),
  ]);
}

/**
 * Resolve provider + model + apiKey for a given agent slug.
 * Falls back to the first available key if no model/key is
 * tagged for the agent specifically.
 */
async function resolveAgentConfig(agentSlug?: string): Promise<{
  model: string;
  provider: string;
  apiKey: string;
}> {
  const keys = await getApiKeys();
  const models = await getModels();

  if (keys.length === 0) {
    throw new Error('No API keys configured. Go to Settings → API Keys and add a key.');
  }

  // Pick the default model whose provider has a key, otherwise fall back to any model with a key
  const activeModel =
    models.find(m => m.is_default === 1 && keys.some(k => k.provider === m.provider)) ||
    models.find(m => keys.some(k => k.provider === m.provider));

  if (!activeModel) {
    const configuredProviders = keys.map(k => k.provider).join(', ');
    throw new Error(`No model found for your configured providers (${configuredProviders}). Go to Settings → Models and set a default.`);
  }

  const provider = activeModel.provider;
  const modelName = activeModel.model_id;
  const key = keys.find(k => k.provider === provider)!;

  return { model: modelName, provider, apiKey: key.api_key };
}

export interface PipelineEvent {
  type:
    | 'step'
    | 'chunk'
    | 'replace'
    | 'gap_analysis'
    | 'course_detected'
    | 'instructor_quality'
    | 'formatted'
    | 'complete'
    | 'error'
    | 'warning'
    | 'mismatch_stop';
  agent?: string;
  status?: string;
  action?: string;
  message?: string;
  content?: any;
  cost?: number;
  metrics?: any;
  sanitizationStats?: any;
}

export class Orchestrator {
  private aborted = false;

  abort() {
    this.aborted = true;
  }

  async *generate(params: GenerationParams): AsyncGenerator<PipelineEvent> {
    const { topic, subtopics, mode, transcript, assignmentCounts } = params;
    this.aborted = false;

    let currentContent = '';
    let gapAnalysisResult: GapAnalysisResult | null = null;
    let courseContext: CourseContext | undefined;

    // Resolve provider / model / key
    let config: { model: string; provider: string; apiKey: string };
    try {
      config = await resolveAgentConfig();
    } catch (e: any) {
      yield { type: 'error', message: e.message };
      return;
    }

    const { model, provider, apiKey } = config;

    // Instantiate agents
    const creator = new CreatorAgent(model, provider, apiKey);
    const analyzer = new AnalyzerAgent(model, provider, apiKey);
    const sanitizer = new SanitizerAgent(model, provider, apiKey);
    const refiner = new RefinerAgent(model, provider, apiKey);
    const formatter = new FormatterAgent(model, provider, apiKey);
    const reviewer = new ReviewerAgent(model, provider, apiKey);
    const courseDetector = new CourseDetectorAgent(model, provider, apiKey);
    const assignmentSanitizer = new AssignmentSanitizerAgent(model, provider, apiKey);
    const metaQuality = new MetaQualityAgent(model, provider, apiKey);
    const instructorQuality = new InstructorQualityAgent(model, provider, apiKey);

    // ───────────────────────────── Phase 0 ─────────────────────────────
    // Course Detection + Transcript Analysis (parallel when possible)
    const needsAnalysis = !!transcript && !!subtopics;

    try {
      if (needsAnalysis) {
        yield { type: 'step', agent: 'CourseDetector', status: 'working', action: 'Analyzing content domain...', message: 'Detecting Course Context' };
        yield { type: 'step', agent: 'Analyzer', status: 'working', action: 'Analyzing transcript coverage...', message: 'Analyzing Gaps (parallel)' };
        yield { type: 'step', agent: 'InstructorQuality', status: 'working', action: 'Evaluating teaching quality...', message: 'Analyzing Instructor Effectiveness (parallel)' };

        const [detectedContext, analysis, iqResult] = await Promise.all([
          withTimeout(courseDetector.detect(topic, subtopics, transcript), AGENT_TIMEOUT_MS, 'CourseDetector'),
          withTimeout(analyzer.analyze(subtopics, transcript!), AGENT_TIMEOUT_MS, 'Analyzer'),
          withTimeout(instructorQuality.analyze(transcript!, topic), AGENT_TIMEOUT_MS, 'InstructorQuality'),
        ]);

        courseContext = detectedContext;
        gapAnalysisResult = analysis;

        yield { type: 'course_detected', content: courseContext, message: `Detected domain: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}% confidence)` };
        yield { type: 'gap_analysis', content: analysis };
        yield { type: 'instructor_quality', content: iqResult };

        // Check for mismatch
        const totalSubtopics = analysis.covered.length + analysis.notCovered.length + analysis.partiallyCovered.length;
        const coveredCount = analysis.covered.length + analysis.partiallyCovered.length;
        if (totalSubtopics > 0 && coveredCount === 0) {
          yield { type: 'mismatch_stop', message: 'The transcript appears unrelated to the topic/subtopics.' };
          return;
        }
      } else {
        // Just detect course context
        yield { type: 'step', agent: 'CourseDetector', status: 'working', action: 'Analyzing content domain...', message: 'Detecting Course Context' };
        courseContext = await withTimeout(courseDetector.detect(topic, subtopics, transcript), AGENT_TIMEOUT_MS, 'CourseDetector');
        yield { type: 'course_detected', content: courseContext, message: `Detected domain: ${courseContext.domain}` };
      }
    } catch (err: any) {
      if (this.aborted) throw new Error('Aborted');
      console.error('Initial analysis failed', err);
      yield { type: 'warning', message: 'Analysis failed, continuing...' };
    }

    // ───────────────────────────── Phase 1 ─────────────────────────────
    // Creator (streaming)
    try {
      yield { type: 'step', agent: 'Creator', status: 'working', action: transcript ? 'Drafting with transcript...' : 'Drafting initial content...', message: `Drafting ${mode}...` };

      const creatorOptions = {
        topic,
        subtopics,
        mode,
        transcript: transcript || undefined,
        gapAnalysis: transcript ? (gapAnalysisResult || undefined) : undefined,
        courseContext,
        assignmentCounts,
      };

      currentContent = await creator.generateStream(
        creatorOptions,
        (chunk: string) => {
          // We can't yield inside a callback, so we accumulate
        }
      );

      // Post-process: deduplicate
      const { content: deduped, removedCount } = deduplicateContent(deduplicateHeaders(currentContent), 0.85);
      if (removedCount > 0) {
        currentContent = deduped;
      }

      yield { type: 'replace', content: currentContent };
    } catch (error: any) {
      if (this.aborted) throw new Error('Aborted');
      yield { type: 'error', message: `Creator failed: ${error.message}` };
      return;
    }

    // ───────────────────────────── Phase 2 ─────────────────────────────
    // Sanitizer (fact-checking against transcript)
    if (transcript) {
      try {
        yield { type: 'step', agent: 'Sanitizer', status: 'working', action: 'Verifying facts and domain consistency...', message: 'Verifying facts...' };

        const sanitized = await withTimeout(
          sanitizer.sanitize(currentContent, transcript, courseContext),
          AGENT_TIMEOUT_MS,
          'Sanitizer'
        );

        if (sanitized !== currentContent) {
          currentContent = sanitized;
          yield { type: 'replace', content: currentContent };
        }

        yield { type: 'step', agent: 'Sanitizer', status: 'success', action: 'Fact-check complete', message: '✅ Content verified against transcript.' };
      } catch (err: any) {
        if (this.aborted) throw new Error('Aborted');
        console.error('Sanitizer failed', err);
        yield { type: 'warning', message: 'Fact-checking failed, continuing...' };
      }
    }

    // ───────────────────────────── Phase 3 ─────────────────────────────
    // Quality Loop (Reviewer → Refiner, max 3 cycles)
    let loopCount = 0;
    const MAX_LOOPS = 3;
    let isQualityMet = false;

    while (loopCount < MAX_LOOPS && !isQualityMet && !this.aborted) {
      loopCount++;

      yield {
        type: 'step',
        agent: 'Reviewer',
        status: 'working',
        action: loopCount > 1 ? `Re-evaluating (Round ${loopCount})...` : 'Reviewing content quality...',
        message: loopCount > 1 ? `Quality Check (Round ${loopCount})` : 'Assessing draft quality...',
      };

      try {
        const review = await withTimeout(reviewer.review(currentContent, mode, courseContext), AGENT_TIMEOUT_MS, 'Reviewer');

        const qualityThreshold = 9;
        if (review.score >= qualityThreshold || !review.needsPolish) {
          isQualityMet = true;
          yield { type: 'step', agent: 'Reviewer', status: 'success', action: 'Draft meets standards...', message: `✅ Quality met (score: ${review.score}).` };
          break;
        }

        if (loopCount >= MAX_LOOPS) {
          yield { type: 'step', agent: 'Reviewer', status: 'success', action: 'Max attempts reached', message: '⚠️ Max loops reached. Proceeding.' };
          break;
        }

        // Refine
        yield { type: 'step', agent: 'Refiner', status: 'working', action: `Refining: ${review.feedback}`, message: `Refining: ${review.feedback}` };

        let refinerOutput = '';
        refinerOutput = await withTimeout(
          refiner.refineStream(
            currentContent,
            review.feedback,
            review.detailedFeedback || [],
            courseContext,
            (chunk: string) => { refinerOutput += chunk; }
          ),
          AGENT_TIMEOUT_MS,
          'Refiner'
        );

        // Apply the patches
        let refinedContent = applySearchReplace(currentContent, refinerOutput);

        // Post-refinement deduplication
        const { content: dedupedRefined, removedCount } = deduplicateContent(deduplicateHeaders(refinedContent), 0.85);
        if (removedCount > 0) refinedContent = dedupedRefined;

        currentContent = refinedContent;
        yield { type: 'replace', content: currentContent };
      } catch (err: any) {
        if (this.aborted) throw new Error('Aborted');
        console.error(`Quality loop ${loopCount} failed`, err);
        yield { type: 'warning', message: `Quality loop ${loopCount} failed, continuing...` };
        break;
      }
    }

    // ───────────────────────────── Phase 4 ─────────────────────────────
    // Formatter + Assignment Sanitizer (assignment mode only)
    if (mode === 'assignment') {
      try {
        yield { type: 'step', agent: 'Formatter', status: 'working', action: 'Structuring assignment data...', message: 'Converting to structured data...' };

        let formatted = '[]';
        try {
          formatted = await withTimeout(formatter.formatAssignment(currentContent), AGENT_TIMEOUT_MS * 1.5, 'Formatter');
        } catch (fmtError: any) {
          console.error('[Orchestrator] Formatter failed:', fmtError);
          yield { type: 'warning', message: 'Assignment formatting failed, some features may be limited.' };
        }

        // Assignment Sanitizer
        yield { type: 'step', agent: 'Sanitizer', status: 'working', action: 'Validating questions...', message: 'Ensuring question quality...' };

        try {
          const questions = await parseLLMJson<any[]>(formatted, []);
          if (questions.length > 0) {
            const sanitizationResult = await assignmentSanitizer.sanitize(
              questions,
              topic,
              subtopics,
              assignmentCounts || { mcsc: 5, mcmc: 3, subjective: 2 }
            );

            yield {
              type: 'formatted',
              content: JSON.stringify(sanitizationResult.questions, null, 2),
              sanitizationStats: {
                removedCount: sanitizationResult.removedCount,
                replacedCount: sanitizationResult.replacedCount,
                finalCount: sanitizationResult.questions.length,
              },
            };
          } else {
            yield { type: 'formatted', content: formatted };
          }
        } catch (sanitizeError) {
          console.error('Assignment sanitization failed:', sanitizeError);
          yield { type: 'formatted', content: formatted };
        }
      } catch (err: any) {
        if (this.aborted) throw new Error('Aborted');
        console.error('Assignment phase failed', err);
        yield { type: 'warning', message: 'Assignment formatting encountered errors.' };
      }
    }

    // ───────────────────────────── Final Cleanup ─────────────────────────────
    currentContent = stripAgentMarkers(currentContent);
    currentContent = fixFormattingInsideHtmlTags(currentContent);

    yield {
      type: 'complete',
      content: currentContent,
      metrics: { qualityLoops: loopCount },
    };

    // Non-blocking meta-analysis (fire-and-forget)
    metaQuality.analyze(currentContent, mode).catch(err => {
      console.error('[MetaQuality] Background analysis failed:', err);
    });
  }
}
