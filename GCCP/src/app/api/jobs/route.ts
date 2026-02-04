/**
 * Server-Orchestrated Job API
 * 
 * POST /api/jobs - Create a new generation job (queued for backend processing)
 * GET /api/jobs - List all jobs for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase/server';
import type { GenerationInsert } from '@/types/database';

export const maxDuration = 300; // 5 minutes for inline processing fallback

/**
 * POST /api/jobs
 * Creates a new server-orchestrated generation job
 * The job runs in the background - no streaming to client
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Check user budget
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, spent_credits')
      .eq('id', user.id)
      .single();

    if (profile) {
      const budget = (profile.credits || 0) / 100;
      const spent = (profile.spent_credits || 0) / 100;
      if (spent >= budget) {
        return NextResponse.json(
          { error: 'Budget exhausted. Please contact an administrator.' },
          { status: 402 }
        );
      }
    }

    // Create generation record in database
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
      console.error('[API/Jobs] Generation insert error:', insertError);
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
      console.warn('[API/Jobs] Edge function invoke failed:', fnError);
      
      // Fallback: Process inline using xAI directly
      // This ensures the job doesn't get stuck if Edge Function is unavailable
      try {
        // Update status to indicate we're processing
        await serviceClient
          .from('generations')
          .update({ status: 'processing', current_step: 1 })
          .eq('id', generation.id);
        
        // Fire off inline processing (don't await - let it run in background)
        processInline(generation.id, {
          topic,
          subtopics,
          mode,
          transcript: transcript || '',
          assignmentCounts,
        }).catch(err => {
          console.error('[API/Jobs] Inline processing failed:', err);
        });
        
      } catch (fallbackError) {
        console.error('[API/Jobs] Fallback processing setup failed:', fallbackError);
        // Still return success - the job is created, user can retry later
      }
    }

    return NextResponse.json({
      success: true,
      jobId: generation.id,
      status: 'queued',
      message: 'Generation job queued successfully. Check Archives for results.',
    });

  } catch (error: any) {
    console.error('[API/Jobs] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs
 * List all jobs for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Fetch user's jobs
    const { data: jobs, error: jobsError, count } = await supabase
      .from('generations')
      .select('id, topic, subtopics, mode, status, current_step, estimated_cost, created_at, updated_at', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (jobsError) {
      throw jobsError;
    }

    return NextResponse.json({
      jobs: jobs || [],
      total: count || 0,
      limit,
      offset,
    });

  } catch (error: any) {
    console.error('[API/Jobs] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// INLINE PROCESSING FALLBACK
// ========================================

interface ProcessParams {
  topic: string;
  subtopics: string;
  mode: string;
  transcript: string;
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}

/**
 * Process generation inline when Edge Function is unavailable
 * This uses the xAI API directly via the Next.js API route
 */
async function processInline(generationId: string, params: ProcessParams) {
  const { createClient } = await import('@supabase/supabase-js');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const xaiApiKey = process.env.XAI_API_KEY!;
  
  if (!xaiApiKey) {
    throw new Error('XAI_API_KEY not configured');
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
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${xaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-3-fast',
        max_tokens: maxTokens,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          ...messages
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`xAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  };
  
  try {
    const { topic, subtopics, mode, transcript, assignmentCounts } = params;
    
    // Step 1: Course Detection
    await log('CourseDetector', 'Analyzing content domain...', 'step');
    await updateStatus('drafting', 1);
    
    const coursePrompt = `Analyze this educational content and determine the subject domain:
Topic: ${topic}
Subtopics: ${subtopics}

Return a brief description of the domain (e.g., "computer science", "mathematics").`;
    
    const courseResult = await callXAI([{ role: 'user', content: coursePrompt }]);
    await log('CourseDetector', `Detected domain: ${courseResult.slice(0, 100)}`, 'success');
    
    // Step 2: Gap Analysis (if transcript)
    let gapAnalysis = null;
    if (transcript) {
      await log('Analyzer', 'Analyzing transcript coverage...', 'step');
      
      const gapPrompt = `Analyze which subtopics are covered in the transcript:
Subtopics: ${subtopics}
Transcript: ${transcript.slice(0, 30000)}

Return JSON with: covered (array), notCovered (array), partiallyCovered (array)`;
      
      try {
        const gapResult = await callXAI([{ role: 'user', content: gapPrompt }]);
        gapAnalysis = JSON.parse(gapResult.replace(/```json\n?|\n?```/g, ''));
        
        await supabase
          .from('generations')
          .update({ gap_analysis: gapAnalysis })
          .eq('id', generationId);
          
        await log('Analyzer', 'Gap analysis complete', 'success');
      } catch {
        await log('Analyzer', 'Gap analysis parsing failed, continuing...', 'warning');
      }
    }
    
    // Step 3: Draft Creation
    await log('Creator', 'Creating initial draft...', 'step');
    await updateStatus('drafting', 2);
    
    const systemPrompt = `You are an expert educational content creator. Create high-quality ${mode} content.`;
    const draftPrompt = `Create ${mode} content for:
Topic: ${topic}
Subtopics: ${subtopics}
${transcript ? `Based on transcript: ${transcript.slice(0, 25000)}` : ''}
${assignmentCounts ? `Assignment counts: MCQ Single: ${assignmentCounts.mcsc}, MCQ Multi: ${assignmentCounts.mcmc}, Subjective: ${assignmentCounts.subjective}` : ''}

Generate comprehensive, well-structured content.`;
    
    let content = await callXAI([{ role: 'user', content: draftPrompt }], systemPrompt, 8000);
    await log('Creator', 'Initial draft created', 'success');
    
    // Step 4: Review
    await log('Reviewer', 'Reviewing content quality...', 'step');
    await updateStatus('critiquing', 3);
    
    const reviewPrompt = `Review this ${mode} content for quality:

${content.slice(0, 15000)}

Return JSON with: score (1-10), needsPolish (boolean), feedback (string)`;
    
    let reviewResult = { score: 7, needsPolish: true, feedback: '' };
    try {
      const reviewResponse = await callXAI([{ role: 'user', content: reviewPrompt }]);
      reviewResult = JSON.parse(reviewResponse.replace(/```json\n?|\n?```/g, ''));
    } catch {
      // Use default
    }
    
    await log('Reviewer', `Quality score: ${reviewResult.score}/10`, reviewResult.score >= 7 ? 'success' : 'warning');
    
    // Step 5: Refine if needed
    if (reviewResult.needsPolish && reviewResult.score < 8) {
      await log('Refiner', 'Refining content...', 'step');
      await updateStatus('refining', 4);
      
      const refinePrompt = `Improve this content based on feedback:
Content: ${content}
Feedback: ${reviewResult.feedback}

Return the improved content.`;
      
      content = await callXAI([{ role: 'user', content: refinePrompt }], undefined, 8000);
      await log('Refiner', 'Refinement complete', 'success');
    }
    
    // Step 6: Format (for assignments)
    let formattedContent = null;
    if (mode === 'assignment') {
      await log('Formatter', 'Formatting assignment...', 'step');
      await updateStatus('formatting', 5);
      
      const formatPrompt = `Convert this assignment content to structured JSON format:

${content}

Return JSON with: questions array, each containing type, question, options (if MCQ), correctAnswer, explanation`;
      
      try {
        const formatResponse = await callXAI([{ role: 'user', content: formatPrompt }], undefined, 8000);
        formattedContent = JSON.parse(formatResponse.replace(/```json\n?|\n?```/g, ''));
      } catch {
        formattedContent = { questions: [], raw: content };
      }
      
      await log('Formatter', 'Assignment formatted', 'success');
    }
    
    // Complete
    await log('Orchestrator', 'Generation completed successfully!', 'success');
    
    await supabase
      .from('generations')
      .update({
        status: 'completed',
        final_content: content,
        assignment_data: formattedContent || null,
        current_step: 6,
        estimated_cost: 0.01, // Rough estimate
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);
    
  } catch (error: any) {
    console.error('[Inline Processing] Error:', error);
    await log('Orchestrator', error.message || 'Processing failed', 'error');
    
    await supabase
      .from('generations')
      .update({
        status: 'failed',
        error_message: error.message || 'Inline processing failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', generationId);
  }
}
