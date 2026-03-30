import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, apiKey } = await req.json();
    const finalKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalKey) {
      return NextResponse.json({ error: 'No Gemini API key provided via Settings or Environment' }, { status: 401 });
    }

    const genAI = new GoogleGenerativeAI(finalKey);
    const geminiModel = genAI.getGenerativeModel({ model: model ?? 'gemini-2.0-flash' });

    // Format messages for standard Gemini structure
    const systemMsg = messages.find((m: any) => m.role === 'system');
    const userMessages = messages.filter((m: any) => m.role !== 'system');
    
    const contents = userMessages.map((m: any, i: number) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ 
        text: i === 0 && systemMsg 
          ? `${systemMsg.content}\n\n${m.content}` 
          : m.content 
      }],
    }));

    // Start native Gemini generation
    const result = await geminiModel.generateContentStream({ contents });

    // We create a custom readable stream that formats Gemini chunks into OpenAI-style SSE data payloads
    // This allows the browser client to use exactly the same `readSSEStream` abstraction for Gemini!
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              // Format exactly like an OpenAI delta to make it seamless for client.ts
              const payload = {
                choices: [{ delta: { content: chunkText } }]
              };
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      }
    });

    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (err) {
    console.error('[/api/gemini] error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
