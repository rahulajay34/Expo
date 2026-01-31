import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Generation } from '@/types/database';

/**
 * POST /api/generate/stop
 * Stops an in-progress generation by updating its status
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
    const { generationId } = body;

    // Validate required fields
    if (!generationId) {
      return NextResponse.json(
        { error: 'Missing required field: generationId' },
        { status: 400 }
      );
    }

    // Verify the generation exists and belongs to the user
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, status')
      .eq('id', generationId)
      .single<Generation>();

    if (fetchError || !generation) {
      console.error('[API] Generation not found:', fetchError);
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    // Verify ownership (unless admin)
    if (generation.user_id !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: 'admin' | 'user' }>();
      
      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Not authorized to access this generation' },
          { status: 403 }
        );
      }
    }

    // Update generation status to failed (stopped by user)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('generations')
      .update({
        status: 'failed',
        error_message: 'Stopped by user',
        progress_message: 'Generation stopped by user',
        updated_at: new Date().toISOString()
      })
      .eq('id', generationId);

    if (updateError) {
      console.error('[API] Failed to stop generation:', updateError);
      return NextResponse.json(
        { error: 'Failed to stop generation' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      generationId,
      status: 'stopped',
    });

  } catch (error: any) {
    console.error('[API] Stop generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
