import { AnthropicClient } from "@/lib/anthropic/client";
import { CreatorAgent } from "./creator";
import { AnalyzerAgent } from "./analyzer";
import { SanitizerAgent } from "./sanitizer";
import { RefinerAgent } from "./refiner";
import { FormatterAgent } from "./formatter";
import { ReviewerAgent } from "./reviewer";
import { CourseDetectorAgent, CourseContext } from "./course-detector";
import { AssignmentSanitizerAgent } from "./assignment-sanitizer";
import { GenerationParams } from "@/types/content";
import { calculateCost, estimateTokens } from "@/lib/anthropic/token-counter";
import { cacheGapAnalysis, cache, simpleHash, getCacheStats } from "@/lib/utils/cache";
import { SemanticCaches, getSemanticCacheStats } from "@/lib/utils/semantic-cache";
import { prepareRefinerContext } from "@/lib/utils/context-manager";
import { QualityGates } from "@/lib/utils/quality-gate";
import { applySearchReplace } from "./utils/text-diff";
import { generationLog as log } from "@/lib/utils/env-logger";
import { logger } from "@/lib/utils/logger";
import { fixFormattingInsideHtmlTags, stripAgentMarkers } from "./utils/content-sanitizer";
import { parseLLMJson } from "./utils/json-parser";
import { deduplicateContent, deduplicateHeaders } from "./utils/deduplication";

// Default timeout for individual agent executions (120 seconds)
const AGENT_TIMEOUT_MS = 120_000;

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within the
 * specified time, it rejects with a timeout error.
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, agentName: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Agent timeout: ${agentName} exceeded ${timeoutMs / 1000}s limit`));
      }, timeoutMs);
    })
  ]);
}

/**
 * Wraps an async generator (stream) with a timeout for the entire operation.
 * If the stream doesn't complete within the specified time, it stops consuming and throws.
 */
async function* withStreamTimeout<T>(
  generator: AsyncGenerator<T>,
  timeoutMs: number,
  agentName: string
): AsyncGenerator<T> {
  const startTime = Date.now();
  
  try {
    for await (const chunk of generator) {
      // Check if we've exceeded the timeout
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(`Stream timeout: ${agentName} exceeded ${timeoutMs / 1000}s limit`);
      }
      yield chunk;
    }
  } finally {
    // Ensure the generator is cleaned up
    await generator.return?.(undefined as any);
  }
}

export class Orchestrator {
  private client: AnthropicClient;
  private creator: CreatorAgent;
  private analyzer: AnalyzerAgent;
  private sanitizer: SanitizerAgent;
  private refiner: RefinerAgent;
  private formatter: FormatterAgent;
  private reviewer: ReviewerAgent;
  private courseDetector: CourseDetectorAgent;
  private assignmentSanitizer: AssignmentSanitizerAgent;

  constructor(apiKey: string) {
    this.client = new AnthropicClient(apiKey);
    this.creator = new CreatorAgent(this.client);
    this.analyzer = new AnalyzerAgent(this.client);
    this.sanitizer = new SanitizerAgent(this.client);
    this.refiner = new RefinerAgent(this.client);
    this.formatter = new FormatterAgent(this.client);
    this.reviewer = new ReviewerAgent(this.client);
    this.courseDetector = new CourseDetectorAgent(this.client);
    this.assignmentSanitizer = new AssignmentSanitizerAgent(this.client);
  }

  /**
   * Reset all agents to clear any internal state from previous generations.
   * This enforces request isolation and prevents context pollution.
   */
  private resetAllAgents(): void {
    this.creator.reset();
    this.analyzer.reset();
    this.sanitizer.reset();
    this.refiner.reset();
    this.formatter.reset();
    this.reviewer.reset();
    this.courseDetector.reset();
    this.assignmentSanitizer.reset();
  }

  async *generate(params: GenerationParams, signal?: AbortSignal) {
    const { topic, subtopics, mode, additionalInstructions, transcript, assignmentCounts } = params;
    
    // CRITICAL: Reset all agents before each generation to enforce request isolation
    // This prevents context pollution (state leakage) between generation cycles
    this.resetAllAgents();
    
    let currentCost = 0;
    let currentContent = "";
    let gapAnalysisResult: { covered: string[]; notCovered: string[]; partiallyCovered: string[]; missingElements?: Record<string, string[]>; transcriptTopics: string[]; timestamp: string } | null = null;
    let courseContext: CourseContext | undefined;

    // Cost breakdown tracking for optimization metrics
    // Per agentic AI framework: track costs per agent for intelligent routing
    const costBreakdown: Record<string, { tokens: number; cost: number; model: string }> = {};

    // 0. Course Detection + Transcript Analysis (Parallel when possible)
    // Check cache for CourseContext first
    const courseContextCacheKey = `course:${simpleHash(topic + subtopics)}`;
    let cachedCourseContext = cache.get<CourseContext>(courseContextCacheKey);

    if (cachedCourseContext) {
      courseContext = cachedCourseContext;
      yield {
        type: "course_detected",
        content: courseContext,
        message: `Detected domain: ${courseContext.domain} (cached)`
      };
    }

    // Run CourseDetector and Analyzer in parallel if both needed
    const needsCourseDetection = !cachedCourseContext;
    const needsAnalysis = transcript && subtopics;

    try {
      if (needsCourseDetection && needsAnalysis) {
        // PARALLEL: Run both together - yield status ONCE before parallel execution
        yield {
          type: "step",
          agent: "CourseDetector",
          status: "working",
          action: "Analyzing content domain...",
          message: "Detecting Course Context"
        };
        yield {
          type: "step",
          agent: "Analyzer",
          action: "Analyzing transcript coverage...",
          message: "Analyzing Gaps (parallel)"
        };

        const cacheKey = `${topic}:${subtopics.slice(0, 100)}`;
        const courseDetectStart = performance.now();
        const analyzeStart = performance.now();
        const [detectedContext, analysis] = await Promise.all([
          withTimeout(this.courseDetector.detect(topic, subtopics, transcript), AGENT_TIMEOUT_MS, 'CourseDetector'),
          cacheGapAnalysis(cacheKey, transcript, subtopics, () => 
            withTimeout(this.analyzer.analyze(subtopics, transcript, signal), AGENT_TIMEOUT_MS, 'Analyzer')
          )
        ]);
        const courseDetectDuration = Math.round(performance.now() - courseDetectStart);
        const analyzeDuration = Math.round(performance.now() - analyzeStart);

        const detectInputTok = estimateTokens(`${topic} ${subtopics} ${(transcript || '').slice(0, 5000)}`);
        const detectOutputTok = estimateTokens(JSON.stringify(detectedContext));
        const detectCost = calculateCost(this.courseDetector.model, detectInputTok, detectOutputTok);
        currentCost += detectCost;
        costBreakdown['CourseDetector'] = { tokens: detectInputTok + detectOutputTok, cost: detectCost, model: this.courseDetector.model };

        const inputTok = estimateTokens(this.analyzer.formatUserPrompt(subtopics, transcript));
        const outputTok = estimateTokens(JSON.stringify(analysis));
        const analyzerCost = calculateCost(this.analyzer.model, inputTok, outputTok);
        currentCost += analyzerCost;
        costBreakdown['Analyzer'] = { tokens: inputTok + outputTok, cost: analyzerCost, model: this.analyzer.model };

        logger.info('CourseDetector completed', { agent: 'CourseDetector', duration: courseDetectDuration, cost: detectCost });
        logger.info('Analyzer completed', { agent: 'Analyzer', duration: analyzeDuration, cost: analyzerCost });

        courseContext = detectedContext;
        cache.set(courseContextCacheKey, courseContext); // Cache for next time
        gapAnalysisResult = analysis;

        yield {
          type: "course_detected",
          content: courseContext,
          message: `Detected domain: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}% confidence)`
        };
        yield { type: "gap_analysis", content: analysis };

        // Check for mismatch
        const totalSubtopics = analysis.covered.length + analysis.notCovered.length + analysis.partiallyCovered.length;
        const coveredCount = analysis.covered.length + analysis.partiallyCovered.length;
        if (totalSubtopics > 0 && coveredCount === 0) {
          yield {
            type: "mismatch_stop",
            message: "The transcript appears unrelated to the topic/subtopics.",
            cost: currentCost
          };
          return;
        }
      } else if (needsCourseDetection) {
        // Only CourseDetection needed
        yield {
          type: "step",
          agent: "CourseDetector",
          status: "working",
          action: "Analyzing content domain...",
          message: "Detecting Course Context"
        };

        const courseDetectStart = performance.now();
        courseContext = await withTimeout(
          this.courseDetector.detect(topic, subtopics, transcript),
          AGENT_TIMEOUT_MS,
          'CourseDetector'
        );
        const courseDetectDuration = Math.round(performance.now() - courseDetectStart);
        
        const detectInputTok = estimateTokens(`${topic} ${subtopics} ${(transcript || '').slice(0, 5000)}`);
        const detectOutputTok = estimateTokens(JSON.stringify(courseContext));
        const detectCost = calculateCost(this.courseDetector.model, detectInputTok, detectOutputTok);
        currentCost += detectCost;
        costBreakdown['CourseDetector'] = { tokens: detectInputTok + detectOutputTok, cost: detectCost, model: this.courseDetector.model };
        
        logger.info('CourseDetector completed', { agent: 'CourseDetector', duration: courseDetectDuration, cost: detectCost });
        cache.set(courseContextCacheKey, courseContext);

        yield {
          type: "course_detected",
          content: courseContext,
          message: `Detected domain: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}% confidence)`
        };
      } else if (needsAnalysis) {
        // Only Analysis needed (CourseContext was cached)
        const cacheKey = `${topic}:${subtopics.slice(0, 100)}`;
        
        yield {
          type: "step",
          agent: "Analyzer",
          action: "Analyzing transcript coverage...",
          message: "Analyzing Gaps"
        };

        const analyzeStart = performance.now();
        const analysis = await cacheGapAnalysis(cacheKey, transcript, subtopics, () => 
          withTimeout(this.analyzer.analyze(subtopics, transcript, signal), AGENT_TIMEOUT_MS, 'Analyzer')
        );
        const analyzeDuration = Math.round(performance.now() - analyzeStart);
        
        const inputTok = estimateTokens(this.analyzer.formatUserPrompt(subtopics, transcript));
        const outputTok = estimateTokens(JSON.stringify(analysis));
        const analyzerCost = calculateCost(this.analyzer.model, inputTok, outputTok);
        currentCost += analyzerCost;
        costBreakdown['Analyzer'] = { tokens: inputTok + outputTok, cost: analyzerCost, model: this.analyzer.model };
        
        logger.info('Analyzer completed', { agent: 'Analyzer', duration: analyzeDuration, cost: analyzerCost });
        gapAnalysisResult = analysis;

        yield { type: "gap_analysis", content: analysis };

        const totalSubtopics = analysis.covered.length + analysis.notCovered.length + analysis.partiallyCovered.length;
        const coveredCount = analysis.covered.length + analysis.partiallyCovered.length;
        if (totalSubtopics > 0 && coveredCount === 0) {
          yield {
            type: "mismatch_stop",
            message: "The transcript appears unrelated to the topic/subtopics.",
            cost: currentCost
          };
          return;
        }
      }
    } catch (err) {
      if (signal?.aborted) throw err;
      console.error("Initial analysis failed", err);
      yield { type: "error", message: "Analysis failed, continuing..." };
    }

    // 2. Creator Phase
    const useTranscript = !!transcript;

    try {
      yield {
        type: "step",
        agent: "Creator",
        status: "working",
        action: useTranscript ? "Drafting with transcript..." : "Drafting initial content...",
        message: `Drafting ${mode}...`
      };

      const creatorOptions = {
        topic,
        subtopics,
        mode,
        transcript: useTranscript ? transcript : undefined,
        gapAnalysis: useTranscript ? (gapAnalysisResult || undefined) : undefined,
        courseContext,
        assignmentCounts
      };

      const creatorStart = performance.now();
      const stream = this.creator.generateStream(creatorOptions, signal);
      
      // Wrap stream with timeout protection (use longer timeout for creator as it generates full content)
      const timeoutStream = withStreamTimeout(stream, AGENT_TIMEOUT_MS * 2, 'Creator'); // 240s for creator

      try {
        for await (const chunk of timeoutStream) {
          currentContent += chunk;
          yield { type: "chunk", content: chunk };
        }
      } catch (error: any) {
        if (error.message?.includes('timeout')) {
          console.error(`[Creator] Stream timeout after ${AGENT_TIMEOUT_MS * 2 / 1000}s - using partial output`);
          // If we have partial content, we can try to continue with it
          if (currentContent.length < 500) {
            throw new Error('Creator timeout with insufficient content');
          }
          yield { type: "warning", message: "Content generation timed out, using partial content" };
        } else {
          throw error;
        }
      }
      
      const creatorDuration = Math.round(performance.now() - creatorStart);

      const cInput = estimateTokens(this.creator.formatUserPrompt(creatorOptions));
      const cOutput = estimateTokens(currentContent);
      const creatorCost = calculateCost(this.creator.model, cInput, cOutput);
      currentCost += creatorCost;
      costBreakdown['Creator'] = { tokens: cInput + cOutput, cost: creatorCost, model: this.creator.model };

      logger.info('Creator completed', { agent: 'Creator', duration: creatorDuration, cost: creatorCost });

      // Post-processing: Deduplicate content to handle streaming stutters
      // This removes duplicate paragraphs/headers that may occur during generation
      const { content: deduplicatedContent, removedCount } = deduplicateContent(
        deduplicateHeaders(currentContent), 
        0.85
      );
      if (removedCount > 0) {
        log.debug('Creator output deduplicated', { data: { removedBlocks: removedCount } });
        currentContent = deduplicatedContent;
        yield { type: "replace", content: currentContent };
      }

      // Quality Gate: Validate Creator output before proceeding (per Agentic AI Framework)
      // At 90% accuracy per agent, 7-agent chain = 47.8%. Quality gates ensure 99%+ recall.
      const creatorValidation = QualityGates.generator.validate(currentContent, 'Creator');
      if (!creatorValidation.isValid) {
        log.debug('Creator output quality concern', { 
          data: { 
            confidence: creatorValidation.confidence,
            issues: creatorValidation.issues 
          }
        });
        // Don't fail - log and continue, but track for metrics
      }

      // 3. SANITIZER (Strictness)
      if (transcript) {
        const sanitizerStart = performance.now();
        
        yield {
          type: "step",
          agent: "Sanitizer",
          status: "working",
          action: "Verifying facts and domain consistency...",
          message: "Verifying facts..."
        };
        
        // Pass courseContext for domain-consistency validation
        const sanitized = await withTimeout(
          this.sanitizer.sanitize(currentContent, transcript, courseContext, signal),
          AGENT_TIMEOUT_MS,
          'Sanitizer'
        );
        const sanitizerDuration = Math.round(performance.now() - sanitizerStart);

        // Sanitizer Cost (approximated, input roughly same as Creator output + transcript portion)
        const sInput = estimateTokens(transcript.slice(0, 50000) + currentContent);
        const sOutput = estimateTokens(sanitized);
        const sanitizerCost = calculateCost(this.sanitizer.model, sInput, sOutput);
        currentCost += sanitizerCost;
        costBreakdown['Sanitizer'] = { tokens: sInput + sOutput, cost: sanitizerCost, model: this.sanitizer.model };

        logger.info('Sanitizer completed', { agent: 'Sanitizer', duration: sanitizerDuration, cost: sanitizerCost });

        if (sanitized !== currentContent) {
          currentContent = sanitized;
          yield { type: "replace", content: currentContent };
        }
        
        // Yield completion step for Sanitizer
        yield {
          type: "step",
          agent: "Sanitizer",
          status: "success",
          action: "Fact-check complete",
          message: "✅ Content verified against transcript."
        };
      }

      // 4. QUALITY LOOP (Iterative Refinement with Progressive Thresholds)
      let loopCount = 0;
      const MAX_LOOPS = 3;
      let isQualityMet = false;
      let previousIssues: string[] = []; // Track issues for section-based refinement

      while (loopCount < MAX_LOOPS && !isQualityMet) {
        loopCount++;

        yield {
          type: "step",
          agent: "Reviewer",
          status: "working",
          action: loopCount > 1 ? `Re-evaluating (Round ${loopCount})...` : "Reviewing content quality...",
          message: loopCount > 1 ? `Quality Check (Round ${loopCount})` : "Assessing draft quality..."
        };

        const reviewerStart = performance.now();
        const review = await withTimeout(
          this.reviewer.review(currentContent, mode, courseContext),
          AGENT_TIMEOUT_MS,
          'Reviewer'
        );
        const reviewerDuration = Math.round(performance.now() - reviewerStart);

        const revInput = estimateTokens(currentContent.slice(0, 20000));
        const revOutput = 200;
        const reviewerCost = calculateCost(this.reviewer.model, revInput, revOutput);
        currentCost += reviewerCost;
        // Track cumulative reviewer cost across loops
        const existingReviewerCost = costBreakdown['Reviewer']?.cost || 0;
        costBreakdown['Reviewer'] = { 
          tokens: (costBreakdown['Reviewer']?.tokens || 0) + revInput + revOutput, 
          cost: existingReviewerCost + reviewerCost, 
          model: this.reviewer.model 
        };

        logger.info('Reviewer completed', { agent: 'Reviewer', duration: reviewerDuration, cost: reviewerCost });

        // Quality threshold: 9 is good quality (avoids infinite loops)
        // First loop can accept 8, subsequent loops keep same threshold
        const qualityThreshold = 9;
        const passesThreshold = review.score >= qualityThreshold;

        if (passesThreshold || !review.needsPolish) {
          isQualityMet = true;
          yield {
            type: "step",
            agent: "Reviewer",
            status: "success",
            action: "Draft meets standards...",
            message: `✅ Draft meets quality threshold (score: ${review.score}).`
          };
          break;
        }

        // Last loop - don't refine, just proceed
        if (loopCount >= MAX_LOOPS) {
          yield {
            type: "step",
            agent: "Reviewer",
            status: "success",
            action: "Max attempts reached - proceeding...",
            message: "⚠️ Max loops reached. Proceeding."
          };
          break;
        }

        // Refine Phase - pass previous issues for section context
        yield {
          type: "step",
          agent: "Refiner",
          status: "working",
          action: `Refining: ${review.feedback}`,
          message: `Refining: ${review.feedback}`
        };

        // Apply context pruning for efficiency (per Agentic AI Framework)
        // This prevents "Needle in a Haystack" degradation on large content
        const { content: prunedContent, feedback: prunedFeedback, wasPruned } = prepareRefinerContext(
          currentContent,
          review.feedback,
          previousIssues,
          loopCount
        );
        
        if (wasPruned) {
          log.debug('Context pruned for refiner', { 
            data: { 
              originalTokens: estimateTokens(currentContent), 
              prunedTokens: estimateTokens(prunedContent),
              loopCount 
            } 
          });
        }

        // For loop 2+, include previous issues for context awareness
        const contextAwareFeedback = loopCount > 1 && previousIssues.length > 0
          ? [...review.detailedFeedback, `\nCONTEXT FROM PREVIOUS REVIEW: ${previousIssues.slice(0, 3).join('; ')}`]
          : review.detailedFeedback;

        let refinerOutput = "";
        const refinerStart = performance.now();
        const refinerStream = this.refiner.refineStream(
          prunedContent, // Use pruned content instead of full content
          prunedFeedback,
          contextAwareFeedback,
          courseContext,
          signal
        );

        // Wrap stream with timeout protection to prevent indefinite stalling
        const timeoutStream = withStreamTimeout(refinerStream, AGENT_TIMEOUT_MS, 'Refiner');

        try {
          for await (const chunk of timeoutStream) {
            if (signal?.aborted) throw new Error('Aborted');
            refinerOutput += chunk;
          }
        } catch (error: any) {
          if (error.message?.includes('timeout')) {
            console.error(`[Refiner] Stream timeout after ${AGENT_TIMEOUT_MS / 1000}s - using partial output`);
            // If we have partial output, use it; otherwise, skip refinement for this loop
            if (!refinerOutput) {
              console.warn('[Refiner] No output received before timeout, skipping refinement');
              break; // Exit the quality loop
            }
          } else {
            throw error; // Re-throw other errors
          }
        }
        
        const refinerDuration = Math.round(performance.now() - refinerStart);

        // Refiner cost: The refiner receives the full content + feedback in the prompt
        // This is correct - the Refiner is more expensive because it processes larger content
        const refInput = estimateTokens(prunedContent + prunedFeedback);
        const refOutput = estimateTokens(refinerOutput);
        const refinerCost = calculateCost(this.refiner.model, refInput, refOutput);
        currentCost += refinerCost;
        // Track cumulative refiner cost across loops
        const existingRefinerCost = costBreakdown['Refiner']?.cost || 0;
        costBreakdown['Refiner'] = { 
          tokens: (costBreakdown['Refiner']?.tokens || 0) + refInput + refOutput, 
          cost: existingRefinerCost + refinerCost, 
          model: this.refiner.model 
        };

        logger.info('Refiner completed', { agent: 'Refiner', duration: refinerDuration, cost: refinerCost });

        // Apply the patches to ORIGINAL content (not pruned)
        let refinedContent = applySearchReplace(currentContent, refinerOutput);

        // Post-refinement deduplication: Remove any duplicate blocks that may have been introduced
        // or that the refiner failed to remove
        const { content: deduplicatedRefined, removedCount: refinedRemovedCount } = deduplicateContent(
          deduplicateHeaders(refinedContent),
          0.85
        );
        if (refinedRemovedCount > 0) {
          log.debug('Post-refiner deduplication', { data: { removedBlocks: refinedRemovedCount } });
          refinedContent = deduplicatedRefined;
        }

        currentContent = refinedContent;
        yield { type: "replace", content: currentContent };

        // Store issues for next loop's context
        previousIssues = review.detailedFeedback;
      }

      // 5. FORMATTER (Assignment Only)
      if (mode === 'assignment') {
        yield {
          type: "step",
          agent: "Formatter",
          status: "working",
          action: "Structuring assignment data...",
          message: "Converting to structured data..."
        };

        const formatterStart = performance.now();
        const formatted = await withTimeout(
          this.formatter.formatAssignment(currentContent, signal),
          AGENT_TIMEOUT_MS,
          'Formatter'
        );
        const formatterDuration = Math.round(performance.now() - formatterStart);

        const fInput = estimateTokens(currentContent);
        const fOutput = estimateTokens(formatted);
        const formatterCost = calculateCost(this.formatter.model, fInput, fOutput);
        currentCost += formatterCost;
        costBreakdown['Formatter'] = { tokens: fInput + fOutput, cost: formatterCost, model: this.formatter.model };

        logger.info('Formatter completed', { agent: 'Formatter', duration: formatterDuration, cost: formatterCost });
        
        // Quality Gate: Validate Formatter output (critical for structured data)
        const formatterValidation = QualityGates.formatter.validate(formatted, 'Formatter');
        if (!formatterValidation.isValid) {
          log.debug('Formatter output quality concern', { 
            data: { 
              confidence: formatterValidation.confidence,
              issues: formatterValidation.issues 
            }
          });
        }
        
        // 6. ASSIGNMENT SANITIZER - Validate and replace invalid questions
        yield {
          type: "step",
          agent: "Sanitizer",
          status: "working",
          action: "Validating questions and replacing invalid ones...",
          message: "Ensuring question quality and count..."
        };

        try {
          const questions = await parseLLMJson<any[]>(formatted, []);
          
          if (questions.length > 0) {
            const sanitizerStart = performance.now();
            const sanitizationResult = await this.assignmentSanitizer.sanitize(
              questions,
              topic,
              subtopics,
              assignmentCounts || { mcsc: 5, mcmc: 3, subjective: 2 },
              signal
            );
            const sanitizerDuration = Math.round(performance.now() - sanitizerStart);

            // Calculate cost for sanitizer (replacement generations)
            if (sanitizationResult.replacedCount > 0) {
              const sanitizerTokens = 2000 * sanitizationResult.replacedCount + 500 * sanitizationResult.replacedCount;
              const sanitizerCost = calculateCost(this.assignmentSanitizer.model, 2000 * sanitizationResult.replacedCount, 500 * sanitizationResult.replacedCount);
              currentCost += sanitizerCost;
              costBreakdown['AssignmentSanitizer'] = { tokens: sanitizerTokens, cost: sanitizerCost, model: this.assignmentSanitizer.model };
              logger.info('AssignmentSanitizer completed', { 
                agent: 'AssignmentSanitizer', 
                duration: sanitizerDuration, 
                cost: sanitizerCost,
                data: {
                  removedCount: sanitizationResult.removedCount,
                  replacedCount: sanitizationResult.replacedCount
                }
              });
            }

            // Log any issues
            if (sanitizationResult.issues.length > 0) {
              log.debug('Assignment sanitization issues', { data: { issues: sanitizationResult.issues } });
            }

            // Update formatted content with sanitized questions
            const sanitizedFormatted = JSON.stringify(sanitizationResult.questions, null, 2);
            
            yield {
              type: "formatted", 
              content: sanitizedFormatted,
              sanitizationStats: {
                removedCount: sanitizationResult.removedCount,
                replacedCount: sanitizationResult.replacedCount,
                finalCount: sanitizationResult.questions.length
              }
            };
          } else {
            yield { type: "formatted", content: formatted };
          }
        } catch (sanitizeError) {
          console.error('Assignment sanitization failed, using original formatted output:', sanitizeError);
          yield { type: "formatted", content: formatted };
        }
      }

      // Final cleanup:
      // 1. Strip any leaked agent markers (<<<<<<< SEARCH, =======, >>>>>>>)
      currentContent = stripAgentMarkers(currentContent);
      // 2. Apply HTML formatting fixes (unescape \$ inside HTML, convert ** to <strong>, etc.)
      currentContent = fixFormattingInsideHtmlTags(currentContent);

      // Get cache stats for optimization monitoring
      const cacheStats = getCacheStats();
      const semanticStats = getSemanticCacheStats();
      
      // Note: User stats are tracked via Supabase in useGeneration hook
      log.debug('Generation complete', { 
        data: { 
          cost: currentCost, 
          costBreakdown,
          cacheHitRate: cacheStats.hitRate,
          semanticCacheHitRate: semanticStats.hitRate,
          cacheSize: cacheStats.size
        } 
      });

      yield {
        type: "complete",
        content: currentContent,
        cost: currentCost,
        // Include metrics for cost optimization per agentic AI framework
        metrics: {
          costBreakdown,
          cache: {
            hitRate: cacheStats.hitRate,
            hits: cacheStats.hits,
            misses: cacheStats.misses,
            size: cacheStats.size
          },
          semanticCache: {
            hitRate: semanticStats.hitRate,
            hits: semanticStats.hits,
            misses: semanticStats.misses,
            totalEntries: semanticStats.totalEntries
          },
          qualityLoops: loopCount
        }
      };

    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error('Aborted');
      }
      yield {
        type: "error",
        message: error.message || "Generation failed"
      };
    }
  }
}
