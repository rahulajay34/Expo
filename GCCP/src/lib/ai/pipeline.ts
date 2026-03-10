// =============================================================================
// GCCP — 7-Agent Pipeline Orchestrator
// Runs the full generation pipeline: CourseDetector → Analyzer → Creator →
// Sanitizer → Reviewer → Refiner → Formatter
// =============================================================================

import { getModel } from './gemini';
import {
  getCourseDetectorPrompt,
  getAnalyzerPrompt,
  getCreatorPrompt,
  getSanitizerPrompt,
  getReviewerPrompt,
  getRefinerPrompt,
  getFormatterPrompt,
  type CourseContext,
  type PromptContext,
} from './prompts';
import { getCacheKey, getFromCache, setCache } from './cache';
import { withRetry } from './retry';
import type { AgentName, ContentType } from '@/lib/types';
import { GEMINI_MODELS, TOKEN_PRICING } from '@/lib/constants';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface PipelineOptions {
  topic: string;
  subtopics: string[];
  contentType: ContentType;
  transcript?: string;
  mcscCount?: number;
  mcmcCount?: number;
  subjectiveCount?: number;
  /** Gemini model to use. Defaults to gemini-2.5-flash. */
  modelName?: string;
  /** Language for generated content. Defaults to English. */
  outputLanguage?: string;
  /** Content length preference. Defaults to 'standard'. */
  contentLength?: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  onEvent: (event: PipelineEvent) => void;
  signal?: AbortSignal;
  /** Which phase of the pipeline to execute (1, 2, or 3). Defaults to running all. */
  phase?: 1 | 2 | 3;
  /** Content from a previous phase to continue from. */
  previousContent?: string;
  /** Serialized context from previous phases (courseContext, reviewFeedback, costs, etc.). */
  previousContext?: PhasedContext;
}

/** Context carried between pipeline phases. */
export interface PhasedContext {
  courseContext?: CourseContext;
  gapAnalysis?: Record<string, unknown>;
  instructorQuality?: Record<string, unknown>;
  reviewFeedback?: string;
  costs?: {
    totalCost: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    perAgent: Partial<Record<string, { inputTokens: number; outputTokens: number; cost: number }>>;
  };
}

export interface PipelineEvent {
  type:
    | 'agent-start'
    | 'agent-complete'
    | 'agent-retry'
    | 'content-chunk'
    | 'gap-analysis'
    | 'instructor-quality'
    | 'questions'
    | 'error'
    | 'complete'
    | 'cost-update'
    | 'pipeline-pause';
  agent?: string;
  data?: Record<string, unknown> | Record<string, unknown>[];
}

interface AgentCost {
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface PipelineCost {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  perAgent: Partial<Record<AgentName, AgentCost>>;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Check if the pipeline has been aborted and throw if so. */
function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('Pipeline aborted by user.', 'AbortError');
  }
}

/** Calculate cost from token counts for the given model. */
function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = GEMINI_MODELS.flash,
): number {
  const pricing = TOKEN_PRICING[model as keyof typeof TOKEN_PRICING] ?? TOKEN_PRICING[GEMINI_MODELS.flash];
  return (
    (inputTokens / 1_000_000) * pricing.input +
    (outputTokens / 1_000_000) * pricing.output
  );
}

/**
 * Calls the Gemini model with the given prompt and returns the full text
 * response along with token usage metadata. Automatically retries on
 * transient errors (429, 503, network) with exponential backoff.
 */
async function callAgent(
  prompt: string,
  signal?: AbortSignal,
  agentName?: string,
  onEvent?: (event: PipelineEvent) => void,
  modelName?: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  checkAbort(signal);

  return withRetry(
    async () => {
      const model = getModel(modelName ?? GEMINI_MODELS.flash);
      const result = await model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract token usage from the response metadata
      const usage = response.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;

      return { text, inputTokens, outputTokens };
    },
    signal,
    (info) => {
      if (agentName && onEvent) {
        onEvent({
          type: 'agent-retry',
          agent: agentName,
          data: {
            attempt: info.attempt,
            maxAttempts: info.maxAttempts,
            delay: info.delayMs / 1000,
            error: info.error,
          },
        });
      }
    },
  );
}

/**
 * Calls the Gemini model with streaming enabled. Yields text chunks as they
 * arrive. Returns the full concatenated text and token usage when done.
 * Automatically retries on transient errors with exponential backoff.
 *
 * Note: On retry, previously emitted chunks are discarded. The `onChunk`
 * callback receives fresh chunks from the new attempt. The caller should
 * handle content replacement accordingly (the pipeline already does this
 * via `fullContent` replacement events after each agent).
 */
async function callAgentStreaming(
  prompt: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  agentName?: string,
  onEvent?: (event: PipelineEvent) => void,
  modelName?: string,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  checkAbort(signal);

  return withRetry(
    async () => {
      const model = getModel(modelName ?? GEMINI_MODELS.flash);
      const result = await model.generateContentStream(prompt);

      let fullText = '';

      for await (const chunk of result.stream) {
        checkAbort(signal);
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          onChunk(chunkText);
        }
      }

      // Get final usage metadata from the aggregated response
      const aggregated = await result.response;
      const usage = aggregated.usageMetadata;
      const inputTokens = usage?.promptTokenCount ?? 0;
      const outputTokens = usage?.candidatesTokenCount ?? 0;

      return { text: fullText, inputTokens, outputTokens };
    },
    signal,
    (info) => {
      if (agentName && onEvent) {
        onEvent({
          type: 'agent-retry',
          agent: agentName,
          data: {
            attempt: info.attempt,
            maxAttempts: info.maxAttempts,
            delay: info.delayMs / 1000,
            error: info.error,
          },
        });
      }
    },
  );
}

/**
 * Safely parse JSON from an LLM response, stripping common artifacts like
 * markdown code fences that models sometimes wrap around JSON output.
 */
function safeParseJSON<T>(text: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    // Remove opening fence (with optional language tag)
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '');
    // Remove closing fence
    cleaned = cleaned.replace(/\n?```\s*$/, '');
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned) as T;
}

// -----------------------------------------------------------------------------
// Pipeline Orchestrator
// -----------------------------------------------------------------------------

export async function runPipeline(options: PipelineOptions): Promise<void> {
  const {
    topic,
    subtopics,
    contentType,
    transcript,
    mcscCount,
    mcmcCount,
    subjectiveCount,
    modelName,
    outputLanguage,
    contentLength,
    onEvent,
    signal,
    phase,
    previousContent,
    previousContext,
  } = options;

  // Cumulative cost tracker — seed from previous phases if continuing
  const costs: PipelineCost = {
    totalCost: previousContext?.costs?.totalCost ?? 0,
    totalInputTokens: previousContext?.costs?.totalInputTokens ?? 0,
    totalOutputTokens: previousContext?.costs?.totalOutputTokens ?? 0,
    perAgent: (previousContext?.costs?.perAgent as Partial<Record<AgentName, AgentCost>>) ?? {},
  };

  /** Utility to record an agent's cost and emit a cost-update event. */
  function recordCost(agent: AgentName, inputTokens: number, outputTokens: number): void {
    const cost = calculateCost(inputTokens, outputTokens, modelName);
    costs.perAgent[agent] = { inputTokens, outputTokens, cost };
    costs.totalCost += cost;
    costs.totalInputTokens += inputTokens;
    costs.totalOutputTokens += outputTokens;

    onEvent({
      type: 'cost-update',
      data: {
        agent,
        agentCost: { inputTokens, outputTokens, cost },
        total: { ...costs },
      },
    });
  }

  // Check cache first (only for non-phased full pipeline runs)
  const cacheKey = getCacheKey(topic, subtopics, contentType);
  if (!phase) {
    const cached = getFromCache(cacheKey);
    if (cached) {
      onEvent({ type: 'content-chunk', data: { chunk: cached } });
      onEvent({
        type: 'complete',
        data: { content: cached, costs, cacheHit: true },
      });
      return;
    }
  }

  // Determine which phases to run
  const runPhase1 = !phase || phase === 1;
  const runPhase2 = !phase || phase === 2;
  const runPhase3 = !phase || phase === 3;

  // Build the shared prompt context that gets enriched as agents complete.
  const promptCtx: PromptContext = {
    topic,
    subtopics,
    contentType,
    transcript,
    mcscCount,
    mcmcCount,
    subjectiveCount,
    outputLanguage,
    contentLength,
  };

  // Restore context from previous phases
  if (previousContext?.courseContext) {
    promptCtx.courseContext = previousContext.courseContext as CourseContext;
  }
  if (previousContext?.reviewFeedback) {
    promptCtx.reviewFeedback = previousContext.reviewFeedback;
  }

  // ---------------------------------------------------------------------------
  // Agent 1 — CourseDetector (Phase 1)
  // ---------------------------------------------------------------------------
  if (runPhase1) try {
    checkAbort(signal);
    onEvent({
      type: 'agent-start',
      agent: 'CourseDetector',
      data: { action: 'Identifying academic domain and context...' },
    });

    const courseDetectorPrompt = getCourseDetectorPrompt(promptCtx);
    const { text: courseRaw, inputTokens, outputTokens } = await callAgent(
      courseDetectorPrompt,
      signal,
      'CourseDetector',
      onEvent,
      modelName,
    );

    const courseContext = safeParseJSON<CourseContext>(courseRaw);
    promptCtx.courseContext = courseContext;

    recordCost('CourseDetector', inputTokens, outputTokens);

    onEvent({
      type: 'agent-complete',
      agent: 'CourseDetector',
      data: {
        courseContext,
        inputTokens,
        outputTokens,
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const message = err instanceof Error ? err.message : String(err);
    onEvent({
      type: 'error',
      agent: 'CourseDetector',
      data: { message: `CourseDetector failed: ${message}` },
    });
    // CourseDetector failure is non-fatal — continue with defaults.
    promptCtx.courseContext = {
      domain: 'General',
      confidence: 0.3,
      keywords: [],
      level: 'intermediate',
      prerequisites: [],
      description: topic,
    };
  }

  // ---------------------------------------------------------------------------
  // Agent 2 — Analyzer (Phase 1, only if transcript is provided)
  // ---------------------------------------------------------------------------
  if (runPhase1 && transcript && transcript.trim().length > 0) {
    try {
      checkAbort(signal);
      onEvent({
        type: 'agent-start',
        agent: 'Analyzer',
        data: { action: 'Analyzing transcript coverage and quality...' },
      });

      const analyzerPrompt = getAnalyzerPrompt(promptCtx);
      const { text: analyzerRaw, inputTokens, outputTokens } = await callAgent(
        analyzerPrompt,
        signal,
        'Analyzer',
        onEvent,
        modelName,
      );

      const analyzerResult = safeParseJSON<{
        gapAnalysis: { covered: string[]; partial: string[]; missing: string[] };
        instructorQuality: {
          clarity: number;
          examples: number;
          depth: number;
          engagement: number;
          overall: number;
          summary: string;
          suggestions: string[];
        };
        mismatch: boolean;
      }>(analyzerRaw);

      recordCost('Analyzer', inputTokens, outputTokens);

      // Emit gap analysis
      onEvent({
        type: 'gap-analysis',
        agent: 'Analyzer',
        data: analyzerResult.gapAnalysis,
      });

      // Emit instructor quality
      onEvent({
        type: 'instructor-quality',
        agent: 'Analyzer',
        data: analyzerResult.instructorQuality,
      });

      onEvent({
        type: 'agent-complete',
        agent: 'Analyzer',
        data: {
          gapAnalysis: analyzerResult.gapAnalysis,
          instructorQuality: analyzerResult.instructorQuality,
          mismatch: analyzerResult.mismatch,
          inputTokens,
          outputTokens,
        },
      });

      // Halt pipeline if mismatch detected
      if (analyzerResult.mismatch) {
        onEvent({
          type: 'error',
          agent: 'Analyzer',
          data: {
            message:
              'Transcript mismatch detected. The provided transcript appears to be unrelated to the given topic and subtopics. You can generate without the transcript or adjust your inputs.',
            mismatch: true,
          },
        });
        return;
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      const message = err instanceof Error ? err.message : String(err);
      onEvent({
        type: 'error',
        agent: 'Analyzer',
        data: { message: `Analyzer failed: ${message}` },
      });
      // Analyzer failure is non-fatal — continue without gap analysis.
      onEvent({
        type: 'agent-complete',
        agent: 'Analyzer',
        data: { skipped: true, reason: message },
      });
    }
  } else if (runPhase1) {
    // No transcript — skip Analyzer
    onEvent({
      type: 'agent-complete',
      agent: 'Analyzer',
      data: { skipped: true, reason: 'No transcript provided' },
    });
  }

  // ---------------------------------------------------------------------------
  // Agent 3 — Creator (Phase 1, streams content)
  // ---------------------------------------------------------------------------
  let generatedContent = previousContent ?? '';

  if (runPhase1) try {
    checkAbort(signal);
    onEvent({
      type: 'agent-start',
      agent: 'Creator',
      data: {
        action:
          contentType === 'assignment'
            ? 'Generating assessment questions...'
            : contentType === 'pre-read'
              ? 'Generating pre-read content...'
              : 'Generating lecture notes...',
      },
    });

    const creatorPrompt = getCreatorPrompt(promptCtx);

    if (contentType === 'assignment') {
      // Assignments are JSON — do not stream (partial JSON is not displayable)
      const { text, inputTokens, outputTokens } = await callAgent(
        creatorPrompt,
        signal,
        'Creator',
        onEvent,
        modelName,
      );
      generatedContent = text;

      // Parse and emit questions immediately
      try {
        const questions = safeParseJSON<Record<string, unknown>[]>(text);
        onEvent({ type: 'questions', agent: 'Creator', data: questions });
      } catch {
        // Will be cleaned up by Formatter — emit raw for now
        onEvent({ type: 'content-chunk', agent: 'Creator', data: { chunk: text } });
      }

      recordCost('Creator', inputTokens, outputTokens);
    } else {
      // Lecture notes and pre-reads — stream content
      const { text, inputTokens, outputTokens } = await callAgentStreaming(
        creatorPrompt,
        (chunk) => {
          onEvent({
            type: 'content-chunk',
            agent: 'Creator',
            data: { chunk },
          });
        },
        signal,
        'Creator',
        onEvent,
        modelName,
      );
      generatedContent = text;
      recordCost('Creator', inputTokens, outputTokens);
    }

    onEvent({
      type: 'agent-complete',
      agent: 'Creator',
      data: {
        contentLength: generatedContent.length,
        inputTokens: costs.perAgent.Creator?.inputTokens,
        outputTokens: costs.perAgent.Creator?.outputTokens,
      },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const message = err instanceof Error ? err.message : String(err);
    onEvent({
      type: 'error',
      agent: 'Creator',
      data: { message: `Creator failed: ${message}` },
    });
    // Creator failure is fatal — no content to process downstream.
    return;
  }

  // ---------------------------------------------------------------------------
  // Phase 1 pause point — after Creator, before Sanitizer
  // ---------------------------------------------------------------------------
  if (phase === 1) {
    onEvent({
      type: 'pipeline-pause',
      data: {
        reason: 'after-creator',
        message: 'Content created. Review and edit before continuing.',
        phaseContext: {
          courseContext: promptCtx.courseContext,
          content: generatedContent,
          costs: { ...costs },
        },
      },
    });
    return; // End Phase 1 — client will call Phase 2 when ready
  }

  // ---------------------------------------------------------------------------
  // Agent 4 — Sanitizer (Phase 2)
  // ---------------------------------------------------------------------------
  if (runPhase2) try {
    checkAbort(signal);
    onEvent({
      type: 'agent-start',
      agent: 'Sanitizer',
      data: { action: 'Reviewing for accuracy and consistency...' },
    });

    promptCtx.content = generatedContent;
    const sanitizerPrompt = getSanitizerPrompt(promptCtx);

    const { text: sanitizedContent, inputTokens, outputTokens } = await callAgent(
      sanitizerPrompt,
      signal,
      'Sanitizer',
      onEvent,
      modelName,
    );

    generatedContent = sanitizedContent;
    recordCost('Sanitizer', inputTokens, outputTokens);

    // Emit the sanitized content as a full replacement
    if (contentType === 'assignment') {
      try {
        const questions = safeParseJSON<Record<string, unknown>[]>(sanitizedContent);
        onEvent({ type: 'questions', agent: 'Sanitizer', data: questions });
      } catch {
        // Non-fatal — keep going
      }
    } else {
      onEvent({
        type: 'content-chunk',
        agent: 'Sanitizer',
        data: { fullContent: sanitizedContent },
      });
    }

    onEvent({
      type: 'agent-complete',
      agent: 'Sanitizer',
      data: { inputTokens, outputTokens },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const message = err instanceof Error ? err.message : String(err);
    onEvent({
      type: 'error',
      agent: 'Sanitizer',
      data: { message: `Sanitizer failed: ${message}` },
    });
    // Sanitizer failure is non-fatal — continue with unsanitized content.
    onEvent({
      type: 'agent-complete',
      agent: 'Sanitizer',
      data: { skipped: true, reason: message },
    });
  }

  // ---------------------------------------------------------------------------
  // Agent 5 — Reviewer (Phase 2)
  // ---------------------------------------------------------------------------
  let reviewFeedback = previousContext?.reviewFeedback ?? '';

  if (runPhase2) try {
    checkAbort(signal);
    onEvent({
      type: 'agent-start',
      agent: 'Reviewer',
      data: { action: 'Evaluating quality against rubric...' },
    });

    promptCtx.content = generatedContent;
    const reviewerPrompt = getReviewerPrompt(promptCtx);

    const { text: reviewRaw, inputTokens, outputTokens } = await callAgent(
      reviewerPrompt,
      signal,
      'Reviewer',
      onEvent,
      modelName,
    );

    reviewFeedback = reviewRaw;
    recordCost('Reviewer', inputTokens, outputTokens);

    // Parse review scores for the quality gate
    try {
      const review = safeParseJSON<{
        scores: Record<string, number>;
        overallScore: number;
        summary: string;
        strengths: string[];
        improvements: string[];
      }>(reviewRaw);

      onEvent({
        type: 'agent-complete',
        agent: 'Reviewer',
        data: {
          scores: review.scores,
          overallScore: review.overallScore,
          summary: review.summary,
          strengths: review.strengths,
          improvementCount: review.improvements.length,
          inputTokens,
          outputTokens,
        },
      });

      // Quality gate: if overall score is very high, skip the Refiner
      if (review.overallScore >= 9.0 && review.improvements.length === 0) {
        onEvent({
          type: 'agent-complete',
          agent: 'Refiner',
          data: {
            skipped: true,
            reason: 'Content quality already excellent (score >= 9.0)',
          },
        });
        // Jump to Formatter
        reviewFeedback = ''; // Signal to skip Refiner
      }
    } catch {
      // Could not parse review — continue anyway
      onEvent({
        type: 'agent-complete',
        agent: 'Reviewer',
        data: { inputTokens, outputTokens, parseError: true },
      });
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const message = err instanceof Error ? err.message : String(err);
    onEvent({
      type: 'error',
      agent: 'Reviewer',
      data: { message: `Reviewer failed: ${message}` },
    });
    // Reviewer failure is non-fatal — skip Refiner too.
    onEvent({
      type: 'agent-complete',
      agent: 'Reviewer',
      data: { skipped: true, reason: message },
    });
  }

  // ---------------------------------------------------------------------------
  // Phase 2 pause point — after Reviewer, before Refiner
  // ---------------------------------------------------------------------------
  if (phase === 2) {
    onEvent({
      type: 'pipeline-pause',
      data: {
        reason: 'after-reviewer',
        message: 'Review complete. Check feedback before refinement.',
        phaseContext: {
          courseContext: promptCtx.courseContext,
          reviewFeedback,
          content: generatedContent,
          costs: { ...costs },
        },
      },
    });
    return; // End Phase 2 — client will call Phase 3 when ready
  }

  // ---------------------------------------------------------------------------
  // Agent 6 — Refiner (Phase 3, skipped if Reviewer gave high score or failed)
  // ---------------------------------------------------------------------------
  if (runPhase3 && reviewFeedback) {
    try {
      checkAbort(signal);
      onEvent({
        type: 'agent-start',
        agent: 'Refiner',
        data: { action: 'Applying targeted improvements...' },
      });

      promptCtx.content = generatedContent;
      promptCtx.reviewFeedback = reviewFeedback;
      const refinerPrompt = getRefinerPrompt(promptCtx);

      const { text: refinedContent, inputTokens, outputTokens } = await callAgent(
        refinerPrompt,
        signal,
        'Refiner',
        onEvent,
        modelName,
      );

      generatedContent = refinedContent;
      recordCost('Refiner', inputTokens, outputTokens);

      // Emit the refined content
      if (contentType === 'assignment') {
        try {
          const questions = safeParseJSON<Record<string, unknown>[]>(refinedContent);
          onEvent({ type: 'questions', agent: 'Refiner', data: questions });
        } catch {
          // Non-fatal
        }
      } else {
        onEvent({
          type: 'content-chunk',
          agent: 'Refiner',
          data: { fullContent: refinedContent },
        });
      }

      onEvent({
        type: 'agent-complete',
        agent: 'Refiner',
        data: { inputTokens, outputTokens },
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err;
      const message = err instanceof Error ? err.message : String(err);
      onEvent({
        type: 'error',
        agent: 'Refiner',
        data: { message: `Refiner failed: ${message}` },
      });
      onEvent({
        type: 'agent-complete',
        agent: 'Refiner',
        data: { skipped: true, reason: message },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Agent 7 — Formatter (Phase 3)
  // ---------------------------------------------------------------------------
  if (runPhase3) try {
    checkAbort(signal);
    onEvent({
      type: 'agent-start',
      agent: 'Formatter',
      data: { action: 'Formatting and structuring output...' },
    });

    promptCtx.content = generatedContent;
    const formatterPrompt = getFormatterPrompt(promptCtx);

    const { text: formattedContent, inputTokens, outputTokens } = await callAgent(
      formatterPrompt,
      signal,
      'Formatter',
      onEvent,
      modelName,
    );

    generatedContent = formattedContent;
    recordCost('Formatter', inputTokens, outputTokens);

    // Emit the final formatted content
    if (contentType === 'assignment') {
      try {
        const questions = safeParseJSON<Record<string, unknown>[]>(formattedContent);
        onEvent({ type: 'questions', agent: 'Formatter', data: questions });
      } catch {
        // Last resort: try to parse the original content
        try {
          const questions = safeParseJSON<Record<string, unknown>[]>(generatedContent);
          onEvent({ type: 'questions', agent: 'Formatter', data: questions });
        } catch {
          onEvent({
            type: 'error',
            agent: 'Formatter',
            data: {
              message: 'Failed to parse assignment questions as JSON. The raw content is preserved.',
            },
          });
        }
      }
    } else {
      onEvent({
        type: 'content-chunk',
        agent: 'Formatter',
        data: { fullContent: formattedContent },
      });
    }

    onEvent({
      type: 'agent-complete',
      agent: 'Formatter',
      data: { inputTokens, outputTokens },
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    const message = err instanceof Error ? err.message : String(err);
    onEvent({
      type: 'error',
      agent: 'Formatter',
      data: { message: `Formatter failed: ${message}` },
    });
    // Formatter failure is non-fatal — the content is still usable.
    onEvent({
      type: 'agent-complete',
      agent: 'Formatter',
      data: { skipped: true, reason: message },
    });
  }

  // ---------------------------------------------------------------------------
  // Cache the result and signal completion
  // ---------------------------------------------------------------------------
  setCache(cacheKey, generatedContent);

  onEvent({
    type: 'complete',
    data: {
      content: generatedContent,
      costs,
      cacheHit: false,
    },
  });
}
