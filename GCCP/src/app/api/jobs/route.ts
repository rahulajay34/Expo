/**
 * Server-Orchestrated Job API
 * 
 * POST /api/jobs - Create a new generation job (queued for backend processing)
 * GET /api/jobs - List all jobs for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { GenerationInsert } from '@/types/database';

export const maxDuration = 60;

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

    // Trigger the /api/process endpoint for processing
    // Use the request URL to get the correct base URL
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;
    
    console.log('[API/Jobs] Triggering process at:', `${baseUrl}/api/process`, 'for generation:', generation.id);
    
    // Use Next.js after() to run the processing trigger after the response is sent
    // This ensures the request completes even after we return the response
    after(async () => {
      try {
        console.log('[API/Jobs] After: Starting process trigger for:', generation.id);
        const processResponse = await fetch(`${baseUrl}/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generation_id: generation.id }),
        });
        console.log('[API/Jobs] After: Process response status:', processResponse.status);
      } catch (err) {
        console.error('[API/Jobs] After: Process trigger failed:', err);
      }
    });

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
// Note: Inline processing is now handled by /api/process endpoint
// This allows for better parallel execution of multiple generations
