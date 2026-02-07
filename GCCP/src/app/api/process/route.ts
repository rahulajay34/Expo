/**
 * Background Processing API
 * 
 * POST /api/process - Process a generation job
 * This endpoint runs the full generation synchronously (up to 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AnthropicClient } from '@/lib/anthropic/client';
import { CourseDetectorAgent } from '@/lib/agents/course-detector';
import { AnalyzerAgent } from '@/lib/agents/analyzer';
import { CreatorAgent } from '@/lib/agents/creator';
import { ReviewerAgent } from '@/lib/agents/reviewer';
import { RefinerAgent } from '@/lib/agents/refiner';
import { FormatterAgent } from '@/lib/agents/formatter';
import { SanitizerAgent } from '@/lib/agents/sanitizer';
import { AssignmentSanitizerAgent } from '@/lib/agents/assignment-sanitizer';
import { InstructorQualityAgent } from '@/lib/agents/instructor-quality';
import { calculateCost, estimateTokens, getModelPricing } from '@/lib/anthropic/token-counter';
import { applySearchReplace } from '@/lib/agents/utils/text-diff';
import { XAIClient } from '@/lib/xai/client';

export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

// Replace hardcoded XAI checks with Gemini/XAI fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
// Allow either key, prefer Gemini
const apiKey = process.env.GEMINI_API_KEY || process.env.XAI_API_KEY!;

interface ProcessRequest {
  generation_id: string;
}

export async function POST(request: NextRequest) {
  let generationId: string = '';

  try {
    const { generation_id } = await request.json() as ProcessRequest;
    generationId = generation_id;

    if (!generation_id) {
      return NextResponse.json({ error: 'generation_id required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key (GEMINI_API_KEY/XAI_API_KEY) not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch generation
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json({ error: 'Generation not found' }, { status: 404 });
    }

    // Check if already completed or failed
    if (['completed', 'failed'].includes(generation.status)) {
      return NextResponse.json({
        success: true,
        message: 'Generation already finished',
        status: generation.status
      });
    }

    // GUARD: Check if job has final_content but status wasn't updated (recovery case)
    // This can happen if the completion update failed - fix the status and exit
    if (generation.final_content && generation.final_content.length > 100) {
      console.log('[API/Process] Job has content but status is', generation.status, '- fixing to completed');
      await supabase
        .from('generations')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', generation_id);

      return NextResponse.json({
        success: true,
        message: 'Generation was already complete - fixed status',
        status: 'completed'
      });
    }

    // CRITICAL: Check if already being processed (prevents duplicate processing)
    // If status is 'processing', 'drafting', 'critiquing', 'refining', or 'formatting'
    // and updated_at is within the last 2 minutes, another worker is handling it
    const activeStatuses = ['processing', 'drafting', 'critiquing', 'refining', 'formatting'];
    if (activeStatuses.includes(generation.status)) {
      const updatedAt = new Date(generation.updated_at).getTime();
      const now = Date.now();
      const twoMinutesAgo = now - 2 * 60 * 1000;

      if (updatedAt > twoMinutesAgo) {
        console.log('[API/Process] Job already being processed, skipping:', generation_id);
        return NextResponse.json({
          success: true,
          message: 'Generation already being processed by another worker',
          status: generation.status
        });
      }
      // If updated_at is older than 2 minutes, the previous worker likely died - we can take over
      console.log('[API/Process] Taking over stale job:', generation_id);
    }

    // Atomically set status to 'processing' to claim the job
    // Use updated_at check to prevent race conditions
    const { data: claimResult, error: claimError } = await supabase
      .from('generations')
      .update({
        status: 'processing',
        updated_at: new Date().toISOString()
      })
      .eq('id', generation_id)
      .eq('status', generation.status) // Only update if status hasn't changed
      .select('id');

    if (claimError) {
      console.log('[API/Process] Failed to claim job (database error):', generation_id, claimError);
      return NextResponse.json({
        success: false,
        message: 'Failed to claim job - database error',
      }, { status: 500 });
    }

    // Check if any row was actually updated (race condition check)
    if (!claimResult || claimResult.length === 0) {
      console.log('[API/Process] Job already claimed by another worker (no rows updated):', generation_id);
      return NextResponse.json({
        success: true,
        message: 'Job already claimed by another worker',
      });
    }

    // Process synchronously - this endpoint has 5 minutes maxDuration
    console.log('[API/Process] Starting processing for:', generation_id);
    await processGeneration(generation_id, generation, supabase);
    console.log('[API/Process] Completed processing for:', generation_id);

    return NextResponse.json({
      success: true,
      generation_id,
      message: 'Processing completed'
    });

  } catch (error: any) {
    console.error('[API/Process] FATAL Error:', {
      message: error.message,
      stack: error.stack,
      generationId,
    });

    // Log error to database
    if (generationId) {
      try {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        await supabase.from('generation_logs').insert({
          generation_id: generationId,
          agent_name: 'System',
          message: `FATAL ERROR: ${error.message}\n${error.stack}`,
          log_type: 'error',
        });

        await supabase
          .from('generations')
          .update({ status: 'failed', updated_at: new Date().toISOString() })
          .eq('id', generationId);
      } catch (dbErr) {
        console.error('[API/Process] Failed to update database:', dbErr);
      }
    }

    return NextResponse.json(
      {
        error: error.message || 'Processing failed',
        stack: error.stack,
        generationId
      },
      { status: 500 }
    );
  }
}

async function processGeneration(generationId: string, generation: any, supabase: any) {
  // Heartbeat interval - updates timestamp every 10 seconds so frontend knows we're alive
  let heartbeatInterval: NodeJS.Timeout | null = null;
  const startHeartbeat = () => {
    heartbeatInterval = setInterval(async () => {
      try {
        await supabase
          .from('generations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', generationId);
        console.log(`[Process] Heartbeat for ${generationId}`);
      } catch (e) {
        console.error('[Process] Heartbeat failed:', e);
      }
    }, 10000); // Every 10 seconds
  };

  const stopHeartbeat = () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  };

  // Start heartbeat immediately
  startHeartbeat();

  const log = async (agent: string, message: string, type = 'info') => {
    try {
      await supabase.from('generation_logs').insert({
        generation_id: generationId,
        agent_name: agent,
        message,
        log_type: type,
      });
    } catch (logErr) {
      // Don't fail on log errors
      console.error('[Process] Log error:', logErr);
    }
  };

  const updateStatus = async (status: string, step: number, extra?: Record<string, unknown>) => {
    await supabase
      .from('generations')
      .update({
        status,
        current_step: step,
        ...extra,
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);
  };

  try {
    const { topic, subtopics, mode, transcript, assignment_data } = generation;
    const assignmentCounts = assignment_data?.counts;

    // Initialize Anthropic client and agents
    const apiKey = process.env.GEMINI_API_KEY || process.env.XAI_API_KEY!;
    const xaiClient = new XAIClient(apiKey);
    const courseDetector = new CourseDetectorAgent(xaiClient);
    const analyzer = new AnalyzerAgent(xaiClient);
    const creator = new CreatorAgent(xaiClient);
    const reviewer = new ReviewerAgent(xaiClient);
    const refiner = new RefinerAgent(xaiClient);
    const formatter = new FormatterAgent(xaiClient);
    const sanitizer = new SanitizerAgent(xaiClient);
    const assignmentSanitizer = new AssignmentSanitizerAgent(xaiClient);
    const instructorQualityAgent = new InstructorQualityAgent(xaiClient);

    // RESUME LOGIC: Load state from existing generation record
    let currentStep = generation.current_step || 0;
    let totalCost = generation.estimated_cost || 0;

    // Load persisted artifacts if resuming
    let courseContext = generation.course_context;
    let gapAnalysis = generation.gap_analysis;
    let instructorQuality = generation.instructor_quality;
    let content = generation.final_content || '';
    let formattedContent = generation.assignment_data?.formatted || null; // Check structure
    let costBreakdown: Record<string, { tokens: number; cost: number }> = {};

    // Detailed cost tracking
    let costDetails = {
      inputTokens: 0,
      outputTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0
    };

    // Helper to add cost
    const addCost = (model: string, inputTokens: number, outputTokens: number) => {
      const pricing = getModelPricing(model);
      const iCost = (inputTokens / 1_000_000) * pricing.input;
      const oCost = (outputTokens / 1_000_000) * pricing.output;

      costDetails.inputTokens += inputTokens;
      costDetails.outputTokens += outputTokens;
      costDetails.inputCost += iCost;
      costDetails.outputCost += oCost;
      costDetails.totalCost += (iCost + oCost);

      totalCost += (iCost + oCost); // Keep legacy total tracking in sync
      return iCost + oCost;
    };

    console.log(`[Process] Resuming job ${generationId} at step ${currentStep}, cost: $${totalCost.toFixed(4)}`);

    // Step 1: Course Detection (using CourseDetectorAgent)
    if (currentStep < 1 || !courseContext) {
      await log('CourseDetector', 'Analyzing content domain...', 'step');
      await updateStatus('processing', 1);

      try {
        courseContext = await courseDetector.detect(topic, subtopics, transcript);
        const courseTokens = estimateTokens(topic + subtopics + (transcript?.slice(0, 2000) || '')) + 100;
        const outputTokens = 100;
        const courseCost = addCost(courseDetector.model, courseTokens, outputTokens);
        costBreakdown['CourseDetector'] = { tokens: courseTokens + outputTokens, cost: courseCost };

        await log('CourseDetector', `Detected: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}%)`, 'success');

        // Save context immediately
        await supabase.from('generations').update({ course_context: courseContext }).eq('id', generationId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('CourseDetector', `Error: ${errorMessage} - using default context`, 'warning');
        courseContext = undefined;
      }
    } else {
      await log('CourseDetector', 'Using cached course context (Resumed)', 'info');
    }

    // Step 2: Gap Analysis (using AnalyzerAgent)
    if (transcript && (!gapAnalysis || currentStep < 1)) { // Run if missing or if we were at step 1
      try {
        await log('Analyzer', 'Analyzing transcript coverage...', 'step');

        // Add timeout protection
        const analyzerPromise = analyzer.analyze(subtopics, transcript);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Analyzer timeout after 2 minutes')), 120000)
        );

        gapAnalysis = await Promise.race([analyzerPromise, timeoutPromise]) as any;
        const analyzerTokens = estimateTokens(subtopics + transcript.slice(0, 40000)) + 300;
        const outputTokens = 300;
        const analyzerCost = addCost(analyzer.model, analyzerTokens, outputTokens);
        costBreakdown['Analyzer'] = { tokens: analyzerTokens + outputTokens, cost: analyzerCost };

        try {
          await supabase
            .from('generations')
            .update({ gap_analysis: gapAnalysis })
            .eq('id', generationId);
        } catch (dbError) {
          console.error('[Process] Gap analysis DB update failed:', dbError);
        }

        await log('Analyzer', `Coverage: ${gapAnalysis.covered?.length || 0} covered, ${gapAnalysis.notCovered?.length || 0} not covered`, 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('Analyzer', `Error: ${errorMessage} - continuing without gap analysis`, 'warning');
      }
    } else if (gapAnalysis) {
      await log('Analyzer', 'Using cached gap analysis (Resumed)', 'info');
    }

    // Step 2.5: Instructor Quality Analysis (if transcript provided)
    if (transcript && (!instructorQuality || currentStep < 2)) {
      try {
        await log('InstructorQuality', 'Evaluating teaching quality...', 'step');

        const iqPromise = instructorQualityAgent.analyze(transcript, topic);
        const iqTimeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('InstructorQuality timeout after 90 seconds')), 90000)
        );

        instructorQuality = await Promise.race([iqPromise, iqTimeoutPromise]) as any;

        const iqTokens = estimateTokens(transcript.slice(0, 50000) + topic) + 200;
        const iqOutputTokens = 300;
        const iqCost = addCost(instructorQualityAgent.model, iqTokens, iqOutputTokens);
        costBreakdown['InstructorQuality'] = { tokens: iqTokens + iqOutputTokens, cost: iqCost };

        // Save instructor quality to database
        await supabase
          .from('generations')
          .update({ instructor_quality: instructorQuality })
          .eq('id', generationId);

        await log('InstructorQuality', `Teaching score: ${instructorQuality?.overallScore || 'N/A'}/10`, 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('InstructorQuality', `Error: ${errorMessage} - continuing without quality analysis`, 'warning');
      }
    } else if (instructorQuality) {
      await log('InstructorQuality', 'Using cached instructor quality (Resumed)', 'info');
    }

    // Step 3: Draft Creation (using CreatorAgent streaming)
    // Resume Condition: If we haven't reached Step 3 (Critiquing) OR content is empty/too short
    if (currentStep < 3 && (!content || content.length < 100)) {
      await log('Creator', 'Creating initial draft...', 'step');
      await updateStatus('drafting', 2);

      const creatorOptions = {
        topic,
        subtopics,
        mode,
        transcript: transcript || undefined,
        gapAnalysis: gapAnalysis || undefined,
        courseContext,
        assignmentCounts
      };

      content = '';
      try {
        const creatorStream = creator.generateStream(creatorOptions);

        // Add timeout for streaming (4 minutes for large content)
        const streamTimeout = setTimeout(() => {
          throw new Error('Creator stream timeout after 4 minutes');
        }, 240000);

        for await (const chunk of creatorStream) {
          content += chunk;
        }

        clearTimeout(streamTimeout);

        if (!content || content.trim().length === 0) {
          const error: any = new Error('Creator generated empty content');
          error.agent = 'Creator';
          error.step = 'Draft Creation';
          throw error;
        }
      } catch (error) {
        if (error instanceof Error) {
          (error as any).agent = 'Creator';
          (error as any).step = 'Draft Creation';
        }
        throw error;
      }

      const creatorInputTokens = estimateTokens(creator.formatUserPrompt(creatorOptions));
      const creatorOutputTokens = estimateTokens(content);
      const creatorCost = addCost(creator.model, creatorInputTokens, creatorOutputTokens);
      costBreakdown['Creator'] = { tokens: creatorInputTokens + creatorOutputTokens, cost: creatorCost };

      await log('Creator', `Draft created (${content.length} chars)`, 'success');

      // Save initial draft to database
      await supabase
        .from('generations')
        .update({
          final_content: content,
          updated_at: new Date().toISOString()
        })
        .eq('id', generationId);

      // Step 3.5: Sanitizer (if transcript - verify facts)
      // Only run sanitizer if we just created the draft OR if we are resuming and it wasn't done
      if (transcript) {
        try {
          await log('Sanitizer', 'Verifying facts against transcript...', 'step');
          const sanitized = await sanitizer.sanitize(content, transcript);

          const sanitizerInputTokens = estimateTokens(content + transcript.slice(0, 50000));
          const sanitizerOutputTokens = estimateTokens(sanitized);
          const sanitizerCost = addCost(sanitizer.model, sanitizerInputTokens, sanitizerOutputTokens);
          costBreakdown['Sanitizer'] = { tokens: sanitizerInputTokens + sanitizerOutputTokens, cost: sanitizerCost };

          if (sanitized && sanitized !== content) {
            content = sanitized;
            await log('Sanitizer', 'Content sanitized and verified', 'success');

            // Update database with sanitized content
            await supabase
              .from('generations')
              .update({
                final_content: content,
                updated_at: new Date().toISOString()
              })
              .eq('id', generationId);
          } else {
            await log('Sanitizer', 'No changes needed - content verified', 'success');
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await log('Sanitizer', `Error: ${errorMessage} - continuing with unsanitized content`, 'warning');
        }
      }
    } else {
      await log('Creator', 'Using existing draft content (Resumed)', 'info');
    }

    // Step 4-5: Review-Refiner Loop (up to 3 iterations)
    // Resume Logic: If we are not yet formatted/complete, enter the loop.
    // The loop inherently handles "existing content" by reviewing whatever is in `content`.

    if (currentStep < 5) {
      let loopCount = 0;
      const MAX_LOOPS = 3;
      let isQualityMet = false;

      while (loopCount < MAX_LOOPS && !isQualityMet) {
        loopCount++;

        try {
          await log('Reviewer', loopCount > 1 ? `Re-evaluating quality (Round ${loopCount})...` : 'Reviewing content quality...', 'step');
          // Update status based on loop phase to be granular
          await updateStatus('critiquing', 3);

          const review = await reviewer.review(content, mode, courseContext);

          const reviewInputTokens = estimateTokens(content.slice(0, 20000));
          const reviewOutputTokens = 200;
          const reviewCost = addCost(reviewer.model, reviewInputTokens, reviewOutputTokens);

          // Accumulate costs (partial tracking since breakdown is reset on resume)
          const existingReviewerCost = costBreakdown['Reviewer']?.cost || 0;
          costBreakdown['Reviewer'] = {
            tokens: (costBreakdown['Reviewer']?.tokens || 0) + reviewInputTokens + reviewOutputTokens,
            cost: existingReviewerCost + reviewCost
          };

          const qualityThreshold = 9;
          const passesThreshold = review.score >= qualityThreshold;

          await log('Reviewer', `Quality score: ${review.score}/10 (threshold: ${qualityThreshold})`, passesThreshold ? 'success' : 'warning');

          if (passesThreshold || !review.needsPolish) {
            isQualityMet = true;
            await log('Reviewer', '✅ Content meets quality standards', 'success');
            break;
          }

          if (loopCount >= MAX_LOOPS) {
            await log('Reviewer', '⚠️ Max iterations reached - proceeding with current version', 'warning');
            break;
          }

          // Refine
          await log('Refiner', `Refining: ${review.feedback}`, 'step');
          await updateStatus('refining', 4);

          let refinerPatch = '';
          const refinerStream = refiner.refineStream(
            content,
            review.feedback,
            review.detailedFeedback || [],
            courseContext
          );

          const refinerTimeout = setTimeout(() => {
            throw new Error(`Refiner stream timeout after 3 minutes (round ${loopCount})`);
          }, 180000);

          try {
            for await (const chunk of refinerStream) {
              refinerPatch += chunk;
            }
          } finally {
            clearTimeout(refinerTimeout);
          }

          if (!refinerPatch || refinerPatch.trim().length === 0) {
            await log('Refiner', '⚠️ Refiner returned empty output - keeping original', 'warning');
            continue;
          }

          let refinedContent = applySearchReplace(content, refinerPatch);

          if (!refinedContent || refinedContent.trim().length === 0) {
            await log('Refiner', '⚠️ Refined content is empty - keeping original', 'warning');
            continue;
          }

          // Post-refinement deduplication
          const { deduplicateContent, deduplicateHeaders } = await import('@/lib/agents/utils/deduplication');
          const { content: deduplicatedRefined, removedCount } = deduplicateContent(
            deduplicateHeaders(refinedContent),
            0.85
          );
          if (removedCount > 0) {
            await log('Refiner', `Removed ${removedCount} duplicate blocks`, 'info');
            refinedContent = deduplicatedRefined;
          }

          if (refinedContent === content) {
            await log('Refiner', 'No changes applied - content already optimal', 'info');
          }

          const refinerInputTokens = estimateTokens(content + review.feedback);
          const refinerOutputTokens = estimateTokens(refinerPatch);
          const refinerCost = addCost(refiner.model, refinerInputTokens, refinerOutputTokens);

          const existingRefinerCost = costBreakdown['Refiner']?.cost || 0;
          costBreakdown['Refiner'] = {
            tokens: (costBreakdown['Refiner']?.tokens || 0) + refinerInputTokens + refinerOutputTokens,
            cost: existingRefinerCost + refinerCost
          };

          content = refinedContent;
          await log('Refiner', `Content refined (Round ${loopCount})`, 'success');

          // Save progress
          await supabase
            .from('generations')
            .update({
              final_content: content,
              updated_at: new Date().toISOString()
            })
            .eq('id', generationId);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          await log('Review/Refine', `Error in iteration ${loopCount}: ${errorMessage} - continuing with current content`, 'warning');
          break;
        }
      }
    } else {
      await log('Reviewer', 'Skipping review loop (already completed/formatted)', 'info');
    }

    // Step 6: Format (for assignments)
    if (mode === 'assignment' && currentStep < 6) {
      await log('Formatter', 'Formatting assignment structure...', 'step');
      await updateStatus('formatting', 5); // Start step 5

      try {
        formattedContent = await formatter.formatAssignment(content);

        const formatterInputTokens = estimateTokens(content);
        const formatterOutputTokens = estimateTokens(formattedContent);
        const formatterCost = addCost(formatter.model, formatterInputTokens, formatterOutputTokens);
        costBreakdown['Formatter'] = { tokens: formatterInputTokens + formatterOutputTokens, cost: formatterCost };

        const parsed = JSON.parse(formattedContent);

        // Check if formatter returned empty array
        if (!Array.isArray(parsed) || parsed.length === 0) {
          await log('Formatter', '⚠️ Formatter returned 0 questions - assignment may need manual formatting', 'warning');
          // Don't fail - just proceed with empty but valid content
        } else {
          await log('Formatter', `Formatted ${parsed.length} questions`, 'success');

          // Step 6.5: AssignmentSanitizer (only if we have questions)
          try {
            await log('AssignmentSanitizer', 'Validating assignment questions...', 'step');
            const sanitizationResult = await assignmentSanitizer.sanitize(
              parsed,
              topic,
              subtopics,
              assignmentCounts || { mcsc: 5, mcmc: 3, subjective: 2 }
            );

            const sanitizerInputTokens = estimateTokens(formattedContent);
            const sanitizerOutputTokens = estimateTokens(JSON.stringify(sanitizationResult.questions));
            const assignmentSanitizerCost = addCost(assignmentSanitizer.model, sanitizerInputTokens, sanitizerOutputTokens);
            costBreakdown['AssignmentSanitizer'] = { tokens: sanitizerInputTokens + sanitizerOutputTokens, cost: assignmentSanitizerCost };

            formattedContent = JSON.stringify(sanitizationResult.questions);
            await log('AssignmentSanitizer', `✅ Validated ${sanitizationResult.questions.length} questions`, 'success');
          } catch (sanitizerError) {
            await log('AssignmentSanitizer', `Error validation failed - using formatter output`, 'warning');
          }
        }
      } catch (error: any) {
        await log('Formatter', `JSON formatting failed: ${error.message}`, 'error');
        formattedContent = JSON.stringify([]);
        // Log warning but don't fail the entire generation
        console.error('[Process] Formatter step failed:', error);
      }
    }

    // Final Completion Step
    const costSummary = Object.entries(costBreakdown)
      .map(([agent, { cost }]) => `${agent}: $${cost.toFixed(4)}`)
      .join(', ');

    await log('Orchestrator', `✅ Generation completed! Total Cost: $${totalCost.toFixed(4)}`, 'success');

    // CRITICAL: Update generation record with final content and cost
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'completed',
        final_content: content,
        assignment_data: formattedContent || generation.assignment_data,
        course_context: courseContext,
        current_step: 6, // Final step
        estimated_cost: totalCost,
        cost_details: costDetails, // Save detailed breakdown
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    if (updateError) {
      console.error('[Process] CRITICAL: Failed to update status to completed:', updateError);
      await log('Orchestrator', `CRITICAL: Failed to save completion status: ${updateError.message}`, 'error');
      // Retry once
      await supabase
        .from('generations')
        .update({
          status: 'completed',
          final_content: content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generationId);
    }

    console.log('[Process] Successfully updated status to completed for:', generationId);

    // Update credits
    const costInCents = Math.round(totalCost * 100);
    try {
      await supabase.rpc('increment_spent_credits', {
        user_id_param: generation.user_id,
        amount: costInCents
      });
    } catch (creditsError) {
      console.error('[Process] Failed to update spent_credits:', creditsError);
    }

  } catch (error: any) {
    console.error('[Process] Generation error:', error);

    const errorContext = {
      error: error.message || 'Unknown error',
      agent: error.agent || 'Unknown',
      step: error.step || 'Unknown'
    };

    await log('Orchestrator', `Error: ${error.message}`, 'error');

    await supabase
      .from('generations')
      .update({
        status: 'failed',
        error_message: `${error.message}\n\nAgent: ${errorContext.agent}\nStep: ${errorContext.step}\n\nThis generation failed but your credits were not charged. You can retry this generation.`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    throw error;
  } finally {
    stopHeartbeat();
  }
}
