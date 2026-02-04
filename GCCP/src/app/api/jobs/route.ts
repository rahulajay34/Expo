/**
 * Server-Orchestrated Job API
 * 
 * POST /api/jobs - Create a new generation job (queued for backend processing)
 * GET /api/jobs - List all jobs for the current user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getJobQueue } from '@/lib/queue/job-queue';
import { processJobById } from '@/lib/queue/worker';
import { GenerationParams, ContentMode } from '@/types/content';

export const maxDuration = 300; // 5 minutes max for job processing

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

    // Create generation params
    const params: GenerationParams = {
      topic,
      subtopics,
      mode: mode as ContentMode,
      transcript: transcript || '',
      assignmentCounts,
    };

    // Enqueue the job
    const queue = getJobQueue();
    const jobId = await queue.enqueue(user.id, params);

    // Start processing in the background (fire-and-forget)
    // The job will continue even if this request completes
    processJobById(jobId).catch(err => {
      console.error(`[Jobs API] Background job ${jobId} failed:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId,
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
