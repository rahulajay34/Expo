/**
 * Background Processing API
 * 
 * POST /api/process - Process a generation job
 * This endpoint runs the full generation synchronously (up to 5 minutes)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    
    // Track costs
    let totalInputTokens = 0;
    let totalOutputTokens = 0;

    // Step 1: Course Detection
    await log('CourseDetector', 'Analyzing content domain...', 'step');
    await updateStatus('processing', 1);

    const coursePrompt = `Analyze this educational content and determine the subject domain:
Topic: ${topic}
Subtopics: ${subtopics}
${transcript ? `Transcript preview: ${transcript.slice(0, 2000)}` : ''}

Return a brief JSON with: domain (string), confidence (0-1)`;

    let courseContext = { domain: 'general', confidence: 0.7 };
    try {
      const courseResult = await callXAI([{ role: 'user', content: coursePrompt }]);
      totalInputTokens += courseResult.inputTokens;
      totalOutputTokens += courseResult.outputTokens;
      const parsed = JSON.parse(courseResult.content.replace(/```json\n?|\n?```/g, '').trim());
      if (parsed.domain) courseContext = parsed;
    } catch {
      // Use default
    }
    await log('CourseDetector', `Detected: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}%)`, 'success');

    // Step 2: Gap Analysis (if transcript)
    let gapAnalysis = null;
    if (transcript) {
      await log('Analyzer', 'Analyzing transcript coverage...', 'step');

      const gapPrompt = `Analyze which subtopics are covered in the transcript:
Subtopics: ${subtopics}
Transcript: ${transcript.slice(0, 40000)}

Return JSON with: covered (array of strings), notCovered (array of strings), partiallyCovered (array of strings)`;

      try {
        const gapResult = await callXAI([{ role: 'user', content: gapPrompt }]);
        totalInputTokens += gapResult.inputTokens;
        totalOutputTokens += gapResult.outputTokens;
        gapAnalysis = JSON.parse(gapResult.content.replace(/```json\n?|\n?```/g, '').trim());

        await supabase
          .from('generations')
          .update({ gap_analysis: gapAnalysis })
          .eq('id', generationId);

        await log('Analyzer', `Coverage: ${gapAnalysis.covered?.length || 0} covered, ${gapAnalysis.notCovered?.length || 0} not covered`, 'success');
      } catch (e) {
        await log('Analyzer', 'Gap analysis parsing failed, continuing...', 'warning');
      }
    }

    // Step 3: Draft Creation
    await log('Creator', 'Creating initial draft...', 'step');
    await updateStatus('drafting', 2);

    const systemPrompt = `You are an expert educational content creator specializing in ${courseContext.domain}. Create high-quality ${mode} content that is comprehensive, well-structured, and pedagogically sound.`;

    let draftPrompt = `Create ${mode} content for:
Topic: ${topic}
Subtopics: ${subtopics}`;

    if (transcript) {
      // Filter subtopics based on gap analysis
      let filteredSubtopics = subtopics;
      if (gapAnalysis?.notCovered?.length > 0) {
        const notCoveredSet = new Set(gapAnalysis.notCovered.map((s: string) => s.toLowerCase().trim()));
        filteredSubtopics = subtopics
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => !notCoveredSet.has(s.toLowerCase()))
          .join(', ') || subtopics;
      }
      draftPrompt += `\n\nSubtopics to cover (based on transcript): ${filteredSubtopics}`;
      draftPrompt += `\n\nBased on this transcript:\n${transcript.slice(0, 30000)}`;
    }

    if (assignmentCounts && mode === 'assignment') {
      draftPrompt += `\n\nGenerate exactly:
- ${assignmentCounts.mcsc} Multiple Choice Single Correct questions
- ${assignmentCounts.mcmc} Multiple Choice Multiple Correct questions  
- ${assignmentCounts.subjective} Subjective/Essay questions

For each question include: question text, options (if MCQ), correct answer(s), and a brief explanation.`;
    }

    draftPrompt += '\n\nGenerate comprehensive, well-structured educational content.';

    const draftResult = await callXAI([{ role: 'user', content: draftPrompt }], systemPrompt, 8000);
    totalInputTokens += draftResult.inputTokens;
    totalOutputTokens += draftResult.outputTokens;
    let content = draftResult.content;
    await log('Creator', `Draft created (${content.length} chars)`, 'success');

    // Step 4: Review
    await log('Reviewer', 'Reviewing content quality...', 'step');
    await updateStatus('critiquing', 3);

    const reviewPrompt = `Review this ${mode} content for educational quality:

${content.slice(0, 18000)}

Evaluate on: accuracy, completeness, clarity, structure, pedagogical effectiveness.

Return JSON: {
  "score": <1-10>,
  "needsPolish": <boolean>,
  "feedback": "<specific improvements needed>",
  "issues": ["<issue1>", "<issue2>"]
}`;

    let reviewResult = { score: 7, needsPolish: false, feedback: '', issues: [] };
    try {
      const reviewResponse = await callXAI([{ role: 'user', content: reviewPrompt }]);
      totalInputTokens += reviewResponse.inputTokens;
      totalOutputTokens += reviewResponse.outputTokens;
      reviewResult = JSON.parse(reviewResponse.content.replace(/```json\n?|\n?```/g, '').trim());
    } catch {
      // Use default - assume it's okay
    }

    await log('Reviewer', `Quality score: ${reviewResult.score}/10`, reviewResult.score >= 7 ? 'success' : 'warning');

    // Step 5: Refine if needed
    if (reviewResult.needsPolish && reviewResult.score < 8 && reviewResult.feedback) {
      await log('Refiner', 'Refining content based on feedback...', 'step');
      await updateStatus('refining', 4);

      const refinePrompt = `Improve this ${mode} content based on reviewer feedback:

CURRENT CONTENT:
${content}

FEEDBACK TO ADDRESS:
${reviewResult.feedback}
${reviewResult.issues?.length ? `\nSpecific issues:\n- ${reviewResult.issues.join('\n- ')}` : ''}

Return the improved content with all issues addressed. Maintain the same format and structure.`;

      const refineResult = await callXAI([{ role: 'user', content: refinePrompt }], systemPrompt, 8000);
      totalInputTokens += refineResult.inputTokens;
      totalOutputTokens += refineResult.outputTokens;
      content = refineResult.content;
      await log('Refiner', 'Content refined', 'success');
    }

    // Step 6: Format (for assignments)
    let formattedContent = null;
    if (mode === 'assignment') {
      await log('Formatter', 'Formatting assignment structure...', 'step');
      await updateStatus('formatting', 5);

      const formatPrompt = `Convert this assignment content to a valid JSON array of AssignmentItem objects.

${content}

Return JSON array with this EXACT structure (no wrapper object):
[
  {
    "questionType": "mcsc" | "mcmc" | "subjective",
    "contentType": "markdown",
    "contentBody": "<question text>",
    "options": {
      "1": "Option 1 text",
      "2": "Option 2 text",
      "3": "Option 3 text",
      "4": "Option 4 text"
    },
    "mcscAnswer": 1 (number 1-4 for mcsc only),
    "mcmcAnswer": "1, 3" (comma-separated for mcmc only),
    "subjectiveAnswer": "Model answer" (for subjective only),
    "difficultyLevel": 0.5,
    "answerExplanation": "Why this answer is correct"
  }
]

CRITICAL: Return a JSON ARRAY directly, not wrapped in { "questions": [...] }`;

      try {
        const formatResponse = await callXAI([{ role: 'user', content: formatPrompt }], undefined, 8000);
        totalInputTokens += formatResponse.inputTokens;
        totalOutputTokens += formatResponse.outputTokens;
        
        // Parse and validate it's an array
        const parsed = JSON.parse(formatResponse.content.replace(/```json\n?|\n?```/g, '').trim());
        if (Array.isArray(parsed)) {
          formattedContent = JSON.stringify(parsed);
          await log('Formatter', `Formatted ${parsed.length} questions`, 'success');
        } else {
          throw new Error('Response is not an array');
        }
      } catch (error) {
        await log('Formatter', `JSON formatting failed: ${error.message}`, 'warning');
        formattedContent = JSON.stringify([]);
      }
    }

    // Complete - calculate real cost
    const costPerInputToken = 0.20 / 1_000_000; // $0.20 per 1M input tokens
    const costPerOutputToken = 0.50 / 1_000_000; // $0.50 per 1M output tokens
    const totalCost = (totalInputTokens * costPerInputToken) + (totalOutputTokens * costPerOutputToken);
    
    await log('Orchestrator', `Generation completed! Tokens: ${totalInputTokens + totalOutputTokens} | Cost: $${totalCost.toFixed(4)}`, 'success');

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
