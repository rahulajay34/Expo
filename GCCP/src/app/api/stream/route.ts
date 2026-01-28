import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Configure route for long-running operations
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

// Server-side Anthropic client - API key is secure here
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * POST /api/stream
 * Proxies streaming requests to Anthropic API
 * Keeps API key secure on server side
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { system, messages, model, maxTokens, temperature } = body;

    // Validate required fields
    if (!messages || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, model' },
        { status: 400 }
      );
    }

    // Create streaming response
    const stream = await anthropic.messages.create({
      model: model,
      max_tokens: maxTokens || 10000,
      messages: messages,
      system: system || '',
      temperature: temperature || 0.7,
      stream: true,
    });

    // Create a ReadableStream to send chunks to client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const data = JSON.stringify({ type: 'chunk', content: chunk.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error: any) {
          const errorData = JSON.stringify({ type: 'error', message: error.message });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('[API/Stream] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/stream/generate (non-streaming)
 * For non-streaming API calls
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Anthropic API key not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { system, messages, model, maxTokens, temperature } = body;

    if (!messages || !model) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, model' },
        { status: 400 }
      );
    }

    const response = await anthropic.messages.create({
      model: model,
      max_tokens: maxTokens || 10000,
      messages: messages,
      system: system || '',
      temperature: temperature || 0.7,
    });

    return NextResponse.json({
      content: response.content,
      usage: response.usage,
    });

  } catch (error: any) {
    console.error('[API/Stream] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
