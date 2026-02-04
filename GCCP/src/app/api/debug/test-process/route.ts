/**
 * Debug endpoint to test the processing flow
 * GET /api/debug/test-process?id=<generation_id>
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const xaiApiKey = process.env.XAI_API_KEY;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  
  const checks = {
    timestamp: new Date().toISOString(),
    environment: {
      NEXT_PUBLIC_SUPABASE_URL: !!supabaseUrl,
      SUPABASE_SERVICE_ROLE_KEY: !!supabaseServiceKey,
      XAI_API_KEY: !!xaiApiKey,
      xaiKeyPrefix: xaiApiKey ? xaiApiKey.slice(0, 10) + '...' : 'NOT SET',
    },
    generation: null as any,
    testXAI: null as any,
    error: null as any,
  };

  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // If ID provided, fetch that generation
    if (id) {
      const { data, error } = await supabase
        .from('generations')
        .select('id, topic, status, current_step, created_at, updated_at')
        .eq('id', id)
        .single();
      
      checks.generation = error ? { error: error.message } : data;
    } else {
      // Get latest 5 generations
      const { data, error } = await supabase
        .from('generations')
        .select('id, topic, status, current_step, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      checks.generation = error ? { error: error.message } : data;
    }

    // Test xAI API
    if (xaiApiKey) {
      try {
        const response = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${xaiApiKey}`,
          },
          body: JSON.stringify({
            model: 'grok-3-fast',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Say "OK"' }],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          checks.testXAI = {
            status: 'success',
            model: data.model,
            response: data.choices?.[0]?.message?.content,
          };
        } else {
          const errorText = await response.text();
          checks.testXAI = {
            status: 'failed',
            httpStatus: response.status,
            error: errorText.slice(0, 500),
          };
        }
      } catch (xaiErr: any) {
        checks.testXAI = {
          status: 'error',
          message: xaiErr.message,
        };
      }
    }

  } catch (err: any) {
    checks.error = err.message;
  }

  return NextResponse.json(checks, { status: 200 });
}

/**
 * POST /api/debug/test-process
 * Manually trigger processing for a generation
 */
export async function POST(request: NextRequest) {
  try {
    const { generation_id } = await request.json();
    
    if (!generation_id) {
      return NextResponse.json({ error: 'generation_id required' }, { status: 400 });
    }

    // Get base URL
    const requestUrl = new URL(request.url);
    const baseUrl = `${requestUrl.protocol}//${requestUrl.host}`;

    console.log('[Debug] Triggering process for:', generation_id, 'at:', baseUrl);

    // Call the process endpoint directly and wait for response
    const response = await fetch(`${baseUrl}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generation_id }),
    });

    const result = await response.json();

    return NextResponse.json({
      triggered: true,
      generation_id,
      processResponse: {
        status: response.status,
        body: result,
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
