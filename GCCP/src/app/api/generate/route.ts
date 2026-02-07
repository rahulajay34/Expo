import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';
import { GEMINI_MODELS } from '@/lib/gemini/client';
import { MetaQualityAgent } from '@/lib/agents/meta-quality';
import { MetaFeedbackService } from '@/lib/services/meta-feedback';
import { AnthropicClient } from '@/lib/anthropic/client';
import type { GenerationInsert } from '@/types/database';

export const maxDuration = 300; // Allow longer processing for fallback

/**
 * POST /api/generate
 * Starts a new content generation
 * 
 * This endpoint creates a generation record and triggers the Edge Function
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { topic, subtopics, mode, transcript, assignmentCounts } = body;

    // Validate required fields
    if (!topic || !subtopics || !mode) {
      return NextResponse.json(
        { error: 'Missing required fields: topic, subtopics, mode' },
        { status: 400 }
      );
    }

    // Create generation record
    const insertData: GenerationInsert = {
      user_id: user.id,
      topic,
      subtopics,
      mode,
      transcript: transcript || null,
      status: 'queued',
      assignment_data: assignmentCounts ? { counts: assignmentCounts } : null,
    };

    const { data: generation, error: insertError } = await supabase
      .from('generations')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('[API] Generation insert error:', insertError);
      return NextResponse.json(
        { error: 'Failed to create generation' },
        { status: 500 }
      );
    }

    // Trigger Edge Function using service client (has proper permissions)
    const serviceClient = await createServiceClient();
    const { error: fnError } = await serviceClient.functions.invoke('generate-content', {
      body: { generation_id: generation.id },
    });

    if (fnError) {
      console.warn('[API] Edge function invoke failed:', fnError);

      // Fallback: Process using inline xAI calls
      processInline(generation.id, {
        topic,
        subtopics,
        mode,
        transcript: transcript || '',
        assignmentCounts,
      }).catch(err => {
        console.error('[API/Generate] Inline processing failed:', err);
      });
    }

    return NextResponse.json({
      success: true,
      generation_id: generation.id,
      status: 'queued',
    });

  } catch (error: any) {
    console.error('[API] Generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// INLINE PROCESSING FALLBACK (shared logic)
// ========================================

interface ProcessParams {
  topic: string;
  subtopics: string;
  mode: string;
  transcript: string;
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}

async function processInline(generationId: string, params: ProcessParams) {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const geminiApiKey = process.env.GEMINI_API_KEY!;

  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const log = async (agent: string, message: string, type = 'info') => {
    await supabase.from('generation_logs').insert({
      generation_id: generationId,
      agent_name: agent,
      message,
      log_type: type,
    });
  };

  const updateStatus = async (status: string, step: number) => {
    await supabase
      .from('generations')
      .update({
        status,
        current_step: step,
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);
  };

  const callGemini = async (messages: { role: string; content: string }[], systemPrompt?: string, maxTokens = 10000): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 minute timeout

    try {
      // Convert messages to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

      // ... (inside function)
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODELS.flash}:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: 0.7,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API error: ${error}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const { topic, subtopics, mode, transcript, assignmentCounts } = params;

    await log('CourseDetector', 'Analyzing content domain...', 'step');
    await updateStatus('drafting', 1);

    // Step 1-2: Simplified course detection and gap analysis
    let gapAnalysis = null;
    if (transcript) {
      await log('Analyzer', 'Analyzing transcript coverage...', 'step');
      const gapPrompt = `Analyze which subtopics are covered: ${subtopics}\nTranscript: ${transcript.slice(0, 30000)}\n\nReturn JSON: {covered: [], notCovered: [], partiallyCovered: []}`;
      try {
        const gapResult = await callGemini([{ role: 'user', content: gapPrompt }]);
        gapAnalysis = JSON.parse(gapResult.replace(/```json\n?|\n?```/g, ''));
        await supabase.from('generations').update({ gap_analysis: gapAnalysis }).eq('id', generationId);
        await log('Analyzer', 'Gap analysis complete', 'success');
      } catch { /* continue */ }
    }

    // Step 3: Draft Creation
    await log('Creator', 'Creating initial draft...', 'step');
    await updateStatus('drafting', 2);

    const systemPrompt = `You are an expert educational content creator. Create high-quality ${mode} content.`;
    const draftPrompt = `Create ${mode} content for:\nTopic: ${topic}\nSubtopics: ${subtopics}\n${transcript ? `Transcript: ${transcript.slice(0, 25000)}` : ''}\n${assignmentCounts ? `Assignments: MCQ Single: ${assignmentCounts.mcsc}, MCQ Multi: ${assignmentCounts.mcmc}, Subjective: ${assignmentCounts.subjective}` : ''}`;

    let content = await callGemini([{ role: 'user', content: draftPrompt }], systemPrompt, 8000);
    await log('Creator', 'Draft created', 'success');

    // Step 4-5: Review & Refine
    await log('Reviewer', 'Reviewing...', 'step');
    await updateStatus('critiquing', 3);

    const reviewPrompt = `Review this ${mode} content:\n${content.slice(0, 15000)}\n\nReturn JSON: {score: 1-10, needsPolish: bool, feedback: ""}`;
    try {
      const reviewResponse = await callGemini([{ role: 'user', content: reviewPrompt }]);
      const review = JSON.parse(reviewResponse.replace(/```json\n?|\n?```/g, ''));

      if (review.needsPolish && review.score < 8) {
        await log('Refiner', 'Refining...', 'step');
        await updateStatus('refining', 4);
        content = await callGemini([{ role: 'user', content: `Improve: ${content}\nFeedback: ${review.feedback}` }], undefined, 8000);
        await log('Refiner', 'Done', 'success');
      }
    } catch { /* continue */ }

    // Step 6: Format assignments
    let formattedContent = null;
    if (mode === 'assignment') {
      await log('Formatter', 'Formatting...', 'step');
      await updateStatus('formatting', 5);
      try {
        const formatResponse = await callGemini([{ role: 'user', content: `Convert to JSON: ${content}\n\nReturn: {questions: [{type, question, options, correctAnswer, explanation}]}` }], undefined, 8000);
        formattedContent = JSON.parse(formatResponse.replace(/```json\n?|\n?```/g, ''));
        await log('Formatter', 'Done', 'success');
      } catch (err: any) {
        console.error('[Inline] Formatter failed:', err);
        await log('Formatter', `Formatting failed: ${err.message}`, 'warning');
        formattedContent = { questions: [], raw: content, error: 'Formatting failed' };
      }
    }

    // Complete
    await log('Orchestrator', 'Generation completed!', 'success');
    await supabase.from('generations').update({
      status: 'completed',
      final_content: content,
      assignment_data: formattedContent,
      current_step: 6,
      estimated_cost: 0.01,
      updated_at: new Date().toISOString(),
    }).eq('id', generationId);

    // Trigger Meta-Quality Analysis (Async)
    try {
      await log('MetaQuality', 'Starting post-generation analysis...', 'info');

      const client = new AnthropicClient(geminiApiKey);
      const agent = new MetaQualityAgent(client);
      const feedbackService = new MetaFeedbackService(supabase);

      const analysis = await agent.analyze(content, mode);
      await feedbackService.aggregateFeedback(mode, analysis);
      await feedbackService.markGenerationAnalyzed(generationId);

      await log('MetaQuality', 'Analysis complete and feedback archived', 'success');
    } catch (metaError: any) {
      console.error('[Inline] Meta-analysis failed:', metaError);
      await log('MetaQuality', `Analysis failed: ${metaError.message}`, 'warning');
    }

  } catch (error: any) {
    console.error('[Inline] Error:', error);
    await log('Orchestrator', error.message, 'error');
    await supabase.from('generations').update({
      status: 'failed',
      error_message: error.message,
      updated_at: new Date().toISOString(),
    }).eq('id', generationId);
  }
}
