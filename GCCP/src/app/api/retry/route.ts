import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

    // Trigger Edge Function with checkpoint info
    const { error: fnError } = await supabase.functions.invoke('generate-content', {
      body: {
        generation_id,
        resume_from: checkpoint?.step_name || null,
        resume_content: checkpoint?.content_snapshot || null,
      },
    });

    if (fnError) {
      console.warn('[API] Retry invoke warning:', fnError);
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
