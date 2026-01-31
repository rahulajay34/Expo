import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Database, Generation } from '@/types/database';

type GenerationUpdate = Database['public']['Tables']['generations']['Update'];

/**
 * POST /api/generate
 * Triggers the Edge Function for an existing generation record
 * 
 * The generation record is created by the client hook (useGeneration)
 * This endpoint only triggers the Edge Function orchestrator
 */
export async function POST(request: Request) {
  console.log('[API /api/generate] Request received');
  
  try {
    const supabase = await createServerSupabaseClient();
    console.log('[API /api/generate] Supabase client created');
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[API /api/generate] Auth check:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError: authError?.message 
    });
    
    if (authError || !user) {
      console.error('[API /api/generate] Auth failed:', authError);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { generation_id, resume_token } = body;
    console.log('[API /api/generate] Request body:', { generation_id, hasResumeToken: !!resume_token });

    // Validate required fields
    if (!generation_id) {
      console.error('[API /api/generate] Missing generation_id');
      return NextResponse.json(
        { error: 'Missing required field: generation_id' },
        { status: 400 }
      );
    }

    // Verify the generation exists and belongs to the user
    console.log('[API /api/generate] Fetching generation from database...');
    const { data: generation, error: fetchError } = await supabase
      .from('generations')
      .select('id, user_id, status')
      .eq('id', generation_id)
      .single<Generation>();

    if (fetchError || !generation) {
      console.error('[API /api/generate] Generation not found:', fetchError);
      return NextResponse.json(
        { error: 'Generation not found' },
        { status: 404 }
      );
    }

    console.log('[API /api/generate] Generation found:', {
      id: generation.id,
      status: generation.status,
      user_id: generation.user_id,
    });

    // Verify ownership (unless admin)
    if (generation.user_id !== user.id) {
      console.log('[API /api/generate] Checking admin status...');
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<{ role: 'admin' | 'user' }>();
      
      if (profile?.role !== 'admin') {
        console.error('[API /api/generate] User not authorized');
        return NextResponse.json(
          { error: 'Not authorized to access this generation' },
          { status: 403 }
        );
      }
    }

    // Trigger Edge Function (fire-and-forget)
    // The Edge Function will update the generation status
    console.log('[API /api/generate] Invoking Edge Function...');
    const invokeStart = Date.now();
    const { error: fnError } = await supabase.functions.invoke('generate-content', {
      body: { generation_id, resume_token },
    });
    const invokeTime = Date.now() - invokeStart;
    console.log('[API /api/generate] Edge Function invocation completed:', { 
      success: !fnError, 
      timeMs: invokeTime,
      error: fnError?.message 
    });

    if (fnError) {
      console.error('[API /api/generate] Edge Function error:', fnError);
      // Update generation status to failed
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('generations')
        .update({
          status: 'failed',
          error_message: `Edge Function invocation failed: ${fnError.message}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', generation_id);
      
      return NextResponse.json(
        { error: 'Generation failed to start', details: fnError.message },
        { status: 500 }
      );
    }

    console.log('[API /api/generate] Success response');
    return NextResponse.json({
      success: true,
      generation_id,
      status: generation.status,
    });

  } catch (error: any) {
    console.error('[API] Generate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
