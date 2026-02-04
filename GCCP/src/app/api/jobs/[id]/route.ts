/**
 * Job Status & Control API
 * 
 * GET /api/jobs/[id] - Get detailed job status with events
 * DELETE /api/jobs/[id] - Cancel a running job
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getJobQueue } from '@/lib/queue/job-queue';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/jobs/[id]
 * Get detailed job status including events for telemetry
 */
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify job ownership
    const { data: job, error: jobError } = await supabase
      .from('generations')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get job events for telemetry
    const queue = getJobQueue();
    const jobStatus = await queue.getJobStatus(id);

    return NextResponse.json({
      job: {
        id: job.id,
        topic: job.topic,
        subtopics: job.subtopics,
        mode: job.mode,
        status: job.status,
        currentStep: job.current_step,
        content: job.final_content,
        formattedContent: (job.assignment_data as { formatted?: string } | null)?.formatted,
        gapAnalysis: job.gap_analysis,
        estimatedCost: job.estimated_cost,
        error: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
      },
      telemetry: jobStatus ? {
        progress: jobStatus.progress,
        currentAgent: jobStatus.currentStep,
        events: jobStatus.events,
      } : null,
    });

  } catch (error: any) {
    console.error('[API/Jobs/ID] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/jobs/[id]
 * Cancel a running job
 */
export async function DELETE(request: NextRequest, context: RouteParams) {
  try {
    const { id } = await context.params;
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify job ownership and status
    const { data: job, error: jobError } = await supabase
      .from('generations')
      .select('id, status, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Can only cancel queued or processing jobs
    if (!['queued', 'processing', 'drafting', 'critiquing', 'refining', 'formatting'].includes(job.status)) {
      return NextResponse.json(
        { error: `Cannot cancel job with status: ${job.status}` },
        { status: 400 }
      );
    }

    // Cancel the job
    const queue = getJobQueue();
    await queue.cancelJob(id);

    return NextResponse.json({
      success: true,
      message: 'Job cancelled successfully',
    });

  } catch (error: any) {
    console.error('[API/Jobs/ID] Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
