import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/utils';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    const finalKey = process.env.MINIMAX_API_KEY?.trim();

    if (!finalKey) {
      return NextResponse.json({ error: 'MiniMax API key not configured in environment variables' }, { status: 401 });
    }

    const systemMessage = messages.find((m: any) => m.role === 'system')?.content;
    const userMessages = messages.filter((m: any) => m.role !== 'system');

    const upstream = await fetch('https://api.minimax.io/anthropic/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': finalKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        system: systemMessage,
        messages: userMessages,
        max_tokens: 16384,
        stream: true,
        thinking: {
          type: 'enabled',
          budget_tokens: 10000,
        },
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: `MiniMax API error: ${upstream.status} ${upstream.statusText}`, detail: text },
        { status: upstream.status }
      );
    }

    if (!upstream.body) {
      return NextResponse.json({ error: 'No response body from MiniMax' }, { status: 502 });
    }

    // Pipe the upstream SSE stream directly to the client
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (err) {
    console.error('[/api/minimax] error:', err);
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
