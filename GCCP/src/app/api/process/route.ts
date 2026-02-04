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
import { calculateCost, estimateTokens } from '@/lib/anthropic/token-counter';
import { applySearchReplace } from '@/lib/agents/utils/text-diff';
import { XAIClient } from '@/lib/xai/client';

export const maxDuration = 300; // 5 minutes max
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const xaiApiKey = process.env.XAI_API_KEY!;

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

    if (!xaiApiKey) {
      return NextResponse.json({ error: 'XAI_API_KEY not configured' }, { status: 500 });
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

  const callXAI = async (messages: { role: string; content: string }[], systemPrompt?: string, maxTokens = 10000): Promise<{ content: string; inputTokens: number; outputTokens: number }> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 minute timeout per call

    try {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${xaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'grok-4-1-fast-reasoning-latest',
          max_tokens: maxTokens,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...messages
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`xAI API error (${response.status}): ${error.slice(0, 200)}`);
      }

      const data = await response.json();
      return {
        content: data.choices[0]?.message?.content || '',
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const { topic, subtopics, mode, transcript, assignment_data } = generation;
    const assignmentCounts = assignment_data?.counts;
    
    // Initialize Anthropic client and agents
    const xaiApiKey = process.env.XAI_API_KEY!;
    const xaiClient = new XAIClient(xaiApiKey);
    const courseDetector = new CourseDetectorAgent(xaiClient);
    const analyzer = new AnalyzerAgent(xaiClient);
    const creator = new CreatorAgent(xaiClient);
    const reviewer = new ReviewerAgent(xaiClient);
    const refiner = new RefinerAgent(xaiClient);
    const formatter = new FormatterAgent(xaiClient);
    const sanitizer = new SanitizerAgent(xaiClient);
    const assignmentSanitizer = new AssignmentSanitizerAgent(xaiClient);
    
    // Track costs per agent
    let totalCost = 0;
    const costBreakdown: Record<string, { tokens: number; cost: number }> = {};

    // Step 1: Course Detection (using CourseDetectorAgent)
    await log('CourseDetector', 'Analyzing content domain...', 'step');
    await updateStatus('processing', 1);

    let courseContext: any;
    try {
      courseContext = await courseDetector.detect(topic, subtopics, transcript);
      const courseTokens = estimateTokens(topic + subtopics + (transcript?.slice(0, 2000) || '')) + 100;
      const courseCost = calculateCost(courseDetector.model, courseTokens, 100);
      totalCost += courseCost;
      costBreakdown['CourseDetector'] = { tokens: courseTokens + 100, cost: courseCost };
      
      await log('CourseDetector', `Detected: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}%)`, 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await log('CourseDetector', `Error: ${errorMessage} - using default context`, 'warning');
      courseContext = undefined;
    }

    // Step 2: Gap Analysis (using AnalyzerAgent)
    let gapAnalysis = null;
    if (transcript) {
      try {
        await log('Analyzer', 'Analyzing transcript coverage...', 'step');

        gapAnalysis = await analyzer.analyze(subtopics, transcript);
        const analyzerTokens = estimateTokens(subtopics + transcript.slice(0, 40000)) + 300;
        const analyzerCost = calculateCost(analyzer.model, analyzerTokens, 300);
        totalCost += analyzerCost;
        costBreakdown['Analyzer'] = { tokens: analyzerTokens + 300, cost: analyzerCost };

        try {
          await supabase
            .from('generations')
            .update({ gap_analysis: gapAnalysis })
            .eq('id', generationId);
        } catch (dbError) {
          // Log but don't fail on database update
          console.error('[Process] Gap analysis DB update failed:', dbError);
        }

        await log('Analyzer', `Coverage: ${gapAnalysis.covered?.length || 0} covered, ${gapAnalysis.notCovered?.length || 0} not covered`, 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('Analyzer', `Error: ${errorMessage} - continuing without gap analysis`, 'warning');
      }
    }

    // Step 3: Draft Creation (using CreatorAgent streaming)
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

    let content = '';
    const creatorStream = creator.generateStream(creatorOptions);
    for await (const chunk of creatorStream) {
      content += chunk;
    }
    
    const creatorInputTokens = estimateTokens(creator.formatUserPrompt(creatorOptions));
    const creatorOutputTokens = estimateTokens(content);
    const creatorCost = calculateCost(creator.model, creatorInputTokens, creatorOutputTokens);
    totalCost += creatorCost;
    costBreakdown['Creator'] = { tokens: creatorInputTokens + creatorOutputTokens, cost: creatorCost };
    
    await log('Creator', `Draft created (${content.length} chars)`, 'success');

    // Step 3.5: Sanitizer (if transcript - verify facts)
    if (transcript) {
      try {
        await log('Sanitizer', 'Verifying facts against transcript...', 'step');
        const sanitized = await sanitizer.sanitize(content, transcript);
        
        const sanitizerInputTokens = estimateTokens(content + transcript.slice(0, 50000));
        const sanitizerOutputTokens = estimateTokens(sanitized);
        const sanitizerCost = calculateCost(sanitizer.model, sanitizerInputTokens, sanitizerOutputTokens);
        totalCost += sanitizerCost;
        costBreakdown['Sanitizer'] = { tokens: sanitizerInputTokens + sanitizerOutputTokens, cost: sanitizerCost };
        
        if (sanitized && sanitized !== content) {
          content = sanitized;
          await log('Sanitizer', 'Content sanitized and verified', 'success');
        } else {
          await log('Sanitizer', 'No changes needed - content verified', 'success');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('Sanitizer', `Error: ${errorMessage} - continuing with unsanitized content`, 'warning');
      }
    }

    // Step 4-5: Review-Refiner Loop (up to 3 iterations with quality gates)
    let loopCount = 0;
    const MAX_LOOPS = 3;
    let isQualityMet = false;

    while (loopCount < MAX_LOOPS && !isQualityMet) {
      loopCount++;
      
      try {
        await log('Reviewer', loopCount > 1 ? `Re-evaluating quality (Round ${loopCount})...` : 'Reviewing content quality...', 'step');
        await updateStatus('critiquing', 3);

        const review = await reviewer.review(content, mode, courseContext);
        
        const reviewInputTokens = estimateTokens(content.slice(0, 20000));
        const reviewOutputTokens = 200;
        const reviewCost = calculateCost(reviewer.model, reviewInputTokens, reviewOutputTokens);
        totalCost += reviewCost;
        
        // Accumulate reviewer costs across loops
        const existingReviewerCost = costBreakdown['Reviewer']?.cost || 0;
        costBreakdown['Reviewer'] = { 
          tokens: (costBreakdown['Reviewer']?.tokens || 0) + reviewInputTokens + reviewOutputTokens,
          cost: existingReviewerCost + reviewCost
        };

        // Always require score of 10 for quality
        const qualityThreshold = 10;
        const passesThreshold = review.score >= qualityThreshold;

        await log('Reviewer', `Quality score: ${review.score}/10 (threshold: ${qualityThreshold})`, passesThreshold ? 'success' : 'warning');

        if (passesThreshold || !review.needsPolish) {
          isQualityMet = true;
          await log('Reviewer', '✅ Content meets quality standards', 'success');
          break;
        }

        // Last loop - don't refine, just proceed
        if (loopCount >= MAX_LOOPS) {
          await log('Reviewer', '⚠️ Max iterations reached - proceeding with current version', 'warning');
          break;
        }

        // Refine based on feedback
        await log('Refiner', `Refining: ${review.feedback}`, 'step');
        await updateStatus('refining', 4);

        let refinerPatch = '';
        const refinerStream = refiner.refineStream(
          content,
          review.feedback,
          review.detailedFeedback || [],
          courseContext
        );
        
        for await (const chunk of refinerStream) {
          refinerPatch += chunk;
        }
        
        // Validate refiner output is not empty
        if (!refinerPatch || refinerPatch.trim().length === 0) {
          await log('Refiner', '⚠️ Refiner returned empty output - keeping original', 'warning');
          continue; // Skip this refinement, keep current content
        }
        
        // Apply the search/replace blocks to get the refined content
        const refinedContent = applySearchReplace(content, refinerPatch);
        
        // Validate refined content is different and not empty
        if (!refinedContent || refinedContent.trim().length === 0) {
          await log('Refiner', '⚠️ Refined content is empty - keeping original', 'warning');
          continue; // Skip this refinement, keep current content
        }
        
        if (refinedContent === content) {
          await log('Refiner', 'No changes applied - content already optimal', 'info');
          // Content didn't change, but that's okay - might be NO_CHANGES_NEEDED
        }
        
        const refinerInputTokens = estimateTokens(content + review.feedback);
        const refinerOutputTokens = estimateTokens(refinerPatch);
        const refinerCost = calculateCost(refiner.model, refinerInputTokens, refinerOutputTokens);
        totalCost += refinerCost;
        
        // Accumulate refiner costs across loops
        const existingRefinerCost = costBreakdown['Refiner']?.cost || 0;
        costBreakdown['Refiner'] = { 
          tokens: (costBreakdown['Refiner']?.tokens || 0) + refinerInputTokens + refinerOutputTokens,
          cost: existingRefinerCost + refinerCost
        };
        
        content = refinedContent;
        await log('Refiner', `Content refined (Round ${loopCount})`, 'success');
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('Review/Refine', `Error in iteration ${loopCount}: ${errorMessage} - continuing with current content`, 'warning');
        // Don't fail the entire generation, just continue with current content
        break;
      }
    }
    
    // Ensure we have content even if all iterations failed
    if (!content || content.trim().length === 0) {
      throw new Error('All review-refine iterations failed - no content generated');
    }

    // Step 6: Format (for assignments using FormatterAgent)
    let formattedContent = null;
    if (mode === 'assignment') {
      await log('Formatter', 'Formatting assignment structure...', 'step');
      await updateStatus('formatting', 5);

      try {
        formattedContent = await formatter.formatAssignment(content);
        
        const formatterInputTokens = estimateTokens(content);
        const formatterOutputTokens = estimateTokens(formattedContent);
        const formatterCost = calculateCost(formatter.model, formatterInputTokens, formatterOutputTokens);
        totalCost += formatterCost;
        costBreakdown['Formatter'] = { tokens: formatterInputTokens + formatterOutputTokens, cost: formatterCost };
        
        // Parse to get question count
        const parsed = JSON.parse(formattedContent);
        await log('Formatter', `Formatted ${parsed.length} questions`, 'success');
        
        // Step 6.5: AssignmentSanitizer - validate questions
        try {
          await log('AssignmentSanitizer', 'Validating assignment questions...', 'step');
          const sanitizationResult = await assignmentSanitizer.sanitize(
            parsed, // Array of AssignmentItem
            topic,
            subtopics,
            assignmentCounts || { mcsc: 5, mcmc: 3, subjective: 2 }
          );
          
          const sanitizerInputTokens = estimateTokens(formattedContent);
          const sanitizerOutputTokens = estimateTokens(JSON.stringify(sanitizationResult.questions));
          const assignmentSanitizerCost = calculateCost(assignmentSanitizer.model, sanitizerInputTokens, sanitizerOutputTokens);
          totalCost += assignmentSanitizerCost;
          costBreakdown['AssignmentSanitizer'] = { tokens: sanitizerInputTokens + sanitizerOutputTokens, cost: assignmentSanitizerCost };
          
          formattedContent = JSON.stringify(sanitizationResult.questions);
          await log('AssignmentSanitizer', `✅ Validated ${sanitizationResult.questions.length} questions (${sanitizationResult.replacedCount} replaced, ${sanitizationResult.removedCount} removed)`, 'success');
        } catch (sanitizerError) {
          const errorMessage = sanitizerError instanceof Error ? sanitizerError.message : 'Unknown error';
          await log('AssignmentSanitizer', `Error: ${errorMessage} - using formatter output without validation`, 'warning');
          // Keep the formatted content even if sanitization fails
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await log('Formatter', `JSON formatting failed: ${errorMessage}`, 'warning');
        formattedContent = JSON.stringify([]);
      }
    }

    // Complete - log cost breakdown
    const costSummary = Object.entries(costBreakdown)
      .map(([agent, { cost }]) => `${agent}: $${cost.toFixed(4)}`)
      .join(', ');
    
    await log('Orchestrator', `✅ Generation completed! Total Cost: $${totalCost.toFixed(4)} | Breakdown: ${costSummary}`, 'success');

    // Update generation record with final content and cost
    await supabase
      .from('generations')
      .update({
        status: 'completed',
        final_content: content,
        assignment_data: formattedContent || generation.assignment_data,
        course_context: courseContext,
        current_step: 6,
        estimated_cost: totalCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    // Update user's spent_credits (convert dollars to cents)
    const costInCents = Math.round(totalCost * 100);
    try {
      await supabase.rpc('increment_spent_credits', {
        user_id_param: generation.user_id,
        amount: costInCents
      });
      console.log(`[Process] Updated spent_credits for user ${generation.user_id}: +${costInCents} cents ($${totalCost.toFixed(4)})`);
    } catch (creditsError) {
      const errorMessage = creditsError instanceof Error ? creditsError.message : 'Unknown error';
      console.error('[Process] Failed to update spent_credits:', creditsError);
      await log('Orchestrator', `Warning: Failed to update user credits: ${errorMessage}`, 'warning');
      // Don't fail the generation if credits update fails
    }

  } catch (error: any) {
    console.error('[Process] Generation error:', error);
    await log('Orchestrator', `Error: ${error.message}`, 'error');

    await supabase
      .from('generations')
      .update({
        status: 'failed',
        error_message: error.message || 'Processing failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);

    throw error;
  }
}
