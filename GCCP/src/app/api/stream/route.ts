import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { createServerSupabaseClient } from '@/lib/supabase/server';

// Server-side xAI client (OpenAI-compatible) - API key is secure here
const xai = new OpenAI({
  apiKey: process.env.XAI_API_KEY || '',
  baseURL: 'https://api.x.ai/v1',
});

/**
 * POST /api/stream
 * Proxies streaming requests to xAI Grok API
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
    if (!process.env.XAI_API_KEY) {
      return NextResponse.json(
        { error: 'xAI API key not configured' },
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

    // Create streaming response using OpenAI-compatible API
    const stream = await xai.chat.completions.create({
      model: model,
      max_tokens: maxTokens || 10000,
      messages: [
        { role: 'system', content: system || '' },
        ...messages
      ],
      temperature: temperature || 0.7,
      stream: true,
    });

    // Create a ReadableStream to send chunks to client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              const data = JSON.stringify({ type: 'chunk', content });
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
 * PUT /api/stream (non-streaming)
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

    if (!process.env.XAI_API_KEY) {
      return NextResponse.json(
        { error: 'xAI API key not configured' },
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

    const response = await xai.chat.completions.create({
      model: model,
      max_tokens: maxTokens || 10000,
      messages: [
        { role: 'system', content: system || '' },
        ...messages
      ],
      temperature: temperature || 0.7,
    });

    return NextResponse.json({
      content: [{ type: 'text', text: response.choices[0]?.message?.content || '' }],
      usage: {
        input_tokens: response.usage?.prompt_tokens || 0,
        output_tokens: response.usage?.completion_tokens || 0,
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
