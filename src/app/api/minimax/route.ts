import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 600;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey } = await req.json();
    const finalKey = apiKey || process.env.MINIMAX_API_KEY;

    if (!finalKey) {
      return NextResponse.json({ error: 'No MiniMax API key provided via Settings or Environment' }, { status: 401 });
    }

    const upstream = await fetch('https://api.minimax.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${finalKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? 'MiniMax-M2.7',
        messages,
        stream: true,
        // Strip reasoning tags into separate field so we only stream content
        reasoning_split: true,
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
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
