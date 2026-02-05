import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { GEMINI_MODELS } from '@/lib/gemini/client';

// Server-side Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * POST /api/stream
 * Proxies streaming requests to Google Gemini API
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
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
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

    // Get Gemini model with configuration
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: system || '',
      generationConfig: {
        maxOutputTokens: maxTokens || 10000,
        temperature: temperature || 0.7,
      }
    });

    // Convert messages to Gemini format
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Create streaming response
    const streamResult = await geminiModel.generateContentStream({ contents });

    // Create a ReadableStream to send chunks to client
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult.stream) {
            const content = chunk.text();
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

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
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

    // Get Gemini model with configuration
    const geminiModel = genAI.getGenerativeModel({
      model: model,
      systemInstruction: system || '',
      generationConfig: {
        maxOutputTokens: maxTokens || 10000,
        temperature: temperature || 0.7,
      }
    });

    // Convert messages to Gemini format
    const contents = messages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await geminiModel.generateContent({ contents });
    const text = response.response.text();
    const usageMetadata = response.response.usageMetadata;

    return NextResponse.json({
      content: [{ type: 'text', text }],
      usage: {
        input_tokens: usageMetadata?.promptTokenCount || 0,
        output_tokens: usageMetadata?.candidatesTokenCount || 0,
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
