import { NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';
import { GEMINI_MODELS } from '@/lib/gemini/client';

export const maxDuration = 300; // Allow longer processing for fallback

/**
 * POST /api/retry
 * Retries a failed generation from its last checkpoint
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

    const { generation_id } = await request.json();

    if (!generation_id) {
      return NextResponse.json(
        { error: 'Missing generation_id' },
        { status: 400 }
      );
    }

    // Fetch the generation to verify ownership
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', generation_id)
      .single();

    if (fetchError || !generation) {
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Verify ownership (RLS should handle this, but double check)
    if (generation.user_id !== user.id) {
      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Not authorized to retry this generation' },
          { status: 403 }
        );
      }
    }

    // Get the last checkpoint
    const { data: checkpoint } = await supabase
      .from('checkpoints')
      .select('*')
      .eq('generation_id', generation_id)
      .order('step_number', { ascending: false })
      .limit(1)
      .single();

    // Reset generation status
    const { error: updateError } = await supabase
      .from('generations')
      .update({
        status: 'queued',
        error_message: null,
      })
      .eq('id', generation_id);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to reset generation status' },
        { status: 500 }
      );
    }

    // Trigger Edge Function with checkpoint info using service client
    const serviceClient = await createServiceClient();
    const { error: fnError } = await serviceClient.functions.invoke('generate-content', {
      body: {
        generation_id,
        resume_from: checkpoint?.step_name || null,
        resume_content: checkpoint?.content_snapshot || null,
      },
    });

    if (fnError) {
      console.warn('[API] Retry Edge Function failed, using inline fallback:', fnError);

      // Fallback: Process inline
      processRetryInline(generation_id, generation, checkpoint?.content_snapshot).catch(err => {
        console.error('[API/Retry] Inline processing failed:', err);
      });
    }

    return NextResponse.json({
      success: true,
      generation_id,
      resumed_from: checkpoint?.step_name || 'beginning',
    });

  } catch (error: any) {
    console.error('[API] Retry error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// Inline retry processing
async function processRetryInline(generationId: string, generation: any, resumeContent?: string) {
  const { createClient } = await import('@supabase/supabase-js');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const geminiApiKey = process.env.GEMINI_API_KEY!;

  if (!geminiApiKey) throw new Error('GEMINI_API_KEY not configured');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const log = async (agent: string, message: string, type = 'info') => {
    await supabase.from('generation_logs').insert({
      generation_id: generationId,
      agent_name: agent,
      message,
      log_type: type,
    });
  };

  const callGemini = async (messages: { role: string; content: string }[], systemPrompt?: string, maxTokens = 10000): Promise<string> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 minute timeout

    try {
      // Convert messages to Gemini format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
      }));

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

      if (!response.ok) throw new Error(`Gemini API error: ${await response.text()}`);
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    const { topic, subtopics, mode, transcript } = generation;

    await log('Orchestrator', 'Retrying generation...', 'step');
    await supabase.from('generations').update({ status: 'processing', current_step: 1 }).eq('id', generationId);

    // Use resume content or create new draft
    let content = resumeContent || '';

    if (!content) {
      await log('Creator', 'Creating draft...', 'step');
      const systemPrompt = `You are an expert educational content creator. Create high-quality ${mode} content.`;
      const draftPrompt = `Create ${mode} content for:\nTopic: ${topic}\nSubtopics: ${subtopics}\n${transcript ? `Transcript: ${transcript.slice(0, 25000)}` : ''}`;
      content = await callGemini([{ role: 'user', content: draftPrompt }], systemPrompt, 8000);
      await log('Creator', 'Draft created', 'success');
    }

    // Review & Refine
    await log('Reviewer', 'Reviewing...', 'step');
    await supabase.from('generations').update({ status: 'critiquing', current_step: 3 }).eq('id', generationId);

    const reviewPrompt = `Review this ${mode} content:\n${content.slice(0, 15000)}\n\nReturn JSON: {score: 1-10, needsPolish: bool, feedback: ""}`;
    try {
      const reviewResponse = await callGemini([{ role: 'user', content: reviewPrompt }]);
      const review = JSON.parse(reviewResponse.replace(/```json\n?|\n?```/g, ''));

      if (review.needsPolish && review.score < 8) {
        await log('Refiner', 'Refining...', 'step');
        await supabase.from('generations').update({ status: 'refining', current_step: 4 }).eq('id', generationId);
        content = await callGemini([{ role: 'user', content: `Improve: ${content}\nFeedback: ${review.feedback}` }], undefined, 8000);
      }
    } catch { /* continue */ }

    // Format assignments
    let formattedContent = null;
    if (mode === 'assignment') {
      await log('Formatter', 'Formatting...', 'step');
      await supabase.from('generations').update({ status: 'formatting', current_step: 5 }).eq('id', generationId);
      try {
        const formatResponse = await callGemini([{ role: 'user', content: `Convert to JSON: ${content}\n\nReturn: {questions: [{type, question, options, correctAnswer, explanation}]}` }], undefined, 8000);
        formattedContent = JSON.parse(formatResponse.replace(/```json\n?|\n?```/g, ''));
      } catch {
        formattedContent = { questions: [], raw: content };
      }
    }

    await log('Orchestrator', 'Retry completed!', 'success');
    await supabase.from('generations').update({
      status: 'completed',
      final_content: content,
      assignment_data: formattedContent,
      current_step: 6,
      estimated_cost: 0.01,
    }).eq('id', generationId);

  } catch (error: any) {
    console.error('[Retry Inline] Error:', error);
    await log('Orchestrator', error.message, 'error');
    await supabase.from('generations').update({
      status: 'failed',
      error_message: error.message,
    }).eq('id', generationId);
  }
}
