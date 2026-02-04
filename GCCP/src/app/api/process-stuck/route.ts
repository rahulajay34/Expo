/**
 * Batch Process API - Process multiple stuck generations
 * 
 * POST /api/process-stuck - Find and process all stuck generations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get base URL from request
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    // Find generations stuck in processing states for more than 2 minutes
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: stuckGenerations, error } = await supabase
      .from('generations')
      .select('id, topic, status, updated_at')
      .in('status', ['queued', 'processing', 'drafting', 'critiquing', 'refining', 'formatting'])
      .lt('updated_at', twoMinutesAgo)
      .order('created_at', { ascending: true })
      .limit(10); // Process max 10 at a time

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!stuckGenerations?.length) {
      return NextResponse.json({ 
        message: 'No stuck generations found',
        processed: 0 
      });
    }

    // Trigger processing for each stuck generation
    const results = await Promise.allSettled(
      stuckGenerations.map(async (gen) => {
        // Reset status first
        await supabase
          .from('generations')
          .update({ 
            status: 'queued',
            updated_at: new Date().toISOString()
          })
          .eq('id', gen.id);

        // Trigger processing
        const response = await fetch(`${baseUrl}/api/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ generation_id: gen.id }),
        });

        return { id: gen.id, topic: gen.topic, triggered: response.ok };
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;

    return NextResponse.json({
      message: `Triggered processing for ${successful}/${stuckGenerations.length} stuck generations`,
      processed: successful,
      generations: stuckGenerations.map(g => ({ id: g.id, topic: g.topic, status: g.status })),
    });

  } catch (error: any) {
    console.error('[API/ProcessStuck] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process stuck generations' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/process-stuck - Get list of stuck generations
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
    
    const { data: stuckGenerations, error } = await supabase
      .from('generations')
      .select('id, topic, status, created_at, updated_at')
      .in('status', ['queued', 'processing', 'drafting', 'critiquing', 'refining', 'formatting'])
      .lt('updated_at', twoMinutesAgo)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      count: stuckGenerations?.length || 0,
      generations: stuckGenerations || [],
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stuck generations' },
      { status: 500 }
    );
  }
}
