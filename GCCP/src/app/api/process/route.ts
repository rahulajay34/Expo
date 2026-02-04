/**
 * Background Processing API
 * 
 * POST /api/process - Process a generation job inline
 * This endpoint is designed to be called asynchronously and supports parallel execution
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
  try {
    const { generation_id } = await request.json() as ProcessRequest;

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

    // Process the generation
    await processGeneration(generation_id, generation, supabase);

    return NextResponse.json({ success: true, generation_id });

  } catch (error: any) {
    console.error('[API/Process] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: 500 }
    );
  }
}

async function processGeneration(generationId: string, generation: any, supabase: any) {
  const log = async (agent: string, message: string, type = 'info') => {
    await supabase.from('generation_logs').insert({
      generation_id: generationId,
      agent_name: agent,
      message,
      log_type: type,
    }).catch(() => {}); // Don't fail on log errors
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

  const callXAI = async (messages: { role: string; content: string }[], systemPrompt?: string, maxTokens = 10000): Promise<string> => {
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
      return data.choices[0]?.message?.content || '';
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const { topic, subtopics, mode, transcript, assignment_data } = generation;
    const assignmentCounts = assignment_data?.counts;

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
      const parsed = JSON.parse(courseResult.replace(/```json\n?|\n?```/g, '').trim());
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
        gapAnalysis = JSON.parse(gapResult.replace(/```json\n?|\n?```/g, '').trim());

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

    let content = await callXAI([{ role: 'user', content: draftPrompt }], systemPrompt, 8000);
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
      reviewResult = JSON.parse(reviewResponse.replace(/```json\n?|\n?```/g, '').trim());
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

      content = await callXAI([{ role: 'user', content: refinePrompt }], systemPrompt, 8000);
      await log('Refiner', 'Content refined', 'success');
    }

    // Step 6: Format (for assignments)
    let formattedContent = null;
    if (mode === 'assignment') {
      await log('Formatter', 'Formatting assignment structure...', 'step');
      await updateStatus('formatting', 5);

      const formatPrompt = `Convert this assignment content to a structured JSON format:

${content}

Return JSON with this exact structure:
{
  "questions": [
    {
      "type": "mcsc" | "mcmc" | "subjective",
      "question": "<question text>",
      "options": ["A) ...", "B) ...", ...] (only for MCQ types),
      "correctAnswer": "<answer or array of answers for mcmc>",
      "explanation": "<why this is correct>"
    }
  ]
}`;

      try {
        const formatResponse = await callXAI([{ role: 'user', content: formatPrompt }], undefined, 8000);
        formattedContent = JSON.parse(formatResponse.replace(/```json\n?|\n?```/g, '').trim());
        await log('Formatter', `Formatted ${formattedContent.questions?.length || 0} questions`, 'success');
      } catch {
        formattedContent = { questions: [], raw: content };
        await log('Formatter', 'JSON formatting failed, storing raw content', 'warning');
      }
    }

    // Complete
    await log('Orchestrator', 'Generation completed successfully!', 'success');

    await supabase
      .from('generations')
      .update({
        status: 'completed',
        final_content: content,
        assignment_data: formattedContent || generation.assignment_data,
        course_context: courseContext,
        current_step: 6,
        estimated_cost: 0.02, // Rough estimate for multiple calls
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
