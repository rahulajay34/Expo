import { NextRequest, NextResponse } from 'next/server';
import { getErrorMessage } from '@/lib/utils';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

// --- In-memory sliding-window rate limiter ---
const RATE_LIMITS = {
  minute: { window: 60_000, max: 10 },
  hour: { window: 3_600_000, max: 100 },
} as const;

const ipTimestamps = new Map<string, number[]>();
let requestCounter = 0;

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

// Opportunistic sweep: drop empty/stale keys so the Map doesn't grow unbounded.
function sweepRateLimitMap(now: number): void {
  const toDelete: string[] = [];
  ipTimestamps.forEach((arr, key) => {
    if (arr.length === 0 || now - arr[arr.length - 1] >= RATE_LIMITS.hour.window) {
      toDelete.push(key);
    }
  });
  for (let i = 0; i < toDelete.length; i++) ipTimestamps.delete(toDelete[i]);
}

function checkRateLimit(ip: string): { limited: boolean; retryAfter?: number } {
  const now = Date.now();
  const timestamps = ipTimestamps.get(ip) || [];

  // Prune entries older than the largest window (1 hour)
  const pruned = timestamps.filter((t) => now - t < RATE_LIMITS.hour.window);

  // Opportunistic global sweep to avoid unbounded growth.
  requestCounter++;
  if (ipTimestamps.size > 1000 || requestCounter % 500 === 0) {
    sweepRateLimitMap(now);
  }

  // Check per-minute limit
  const minuteCount = pruned.filter((t) => now - t < RATE_LIMITS.minute.window).length;
  if (minuteCount >= RATE_LIMITS.minute.max) {
    const oldest = pruned.filter((t) => now - t < RATE_LIMITS.minute.window).sort((a, b) => a - b)[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMITS.minute.window - now) / 1000);
    ipTimestamps.set(ip, pruned);
    return { limited: true, retryAfter };
  }

  // Check per-hour limit
  if (pruned.length >= RATE_LIMITS.hour.max) {
    const oldest = pruned.sort((a, b) => a - b)[0];
    const retryAfter = Math.ceil((oldest + RATE_LIMITS.hour.window - now) / 1000);
    ipTimestamps.set(ip, pruned);
    return { limited: true, retryAfter };
  }

  // Record this request
  pruned.push(now);
  if (pruned.length === 0) {
    ipTimestamps.delete(ip);
  } else {
    ipTimestamps.set(ip, pruned);
  }
  return { limited: false };
}

// --- Validation ---
function validateMessages(body: unknown): string | null {
  if (!body || typeof body !== 'object') return 'Request body must be a JSON object.';
  const { messages } = body as Record<string, unknown>;
  if (!Array.isArray(messages) || messages.length === 0) {
    return 'Request body must include a non-empty "messages" array.';
  }
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') {
      return `messages[${i}] must be an object.`;
    }
    if (typeof msg.role !== 'string' || msg.role.length === 0) {
      return `messages[${i}].role must be a non-empty string.`;
    }
    if (typeof msg.content !== 'string' || msg.content.length === 0) {
      return `messages[${i}].content must be a non-empty string.`;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const ip = getClientIp(req);
    const { limited, retryAfter } = checkRateLimit(ip);
    if (limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json();

    // Input validation
    const validationError = validateMessages(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { messages } = body;

    const finalKey = process.env.MINIMAX_API_KEY?.trim();

    if (!finalKey) {
      return NextResponse.json({ error: 'API key not configured in environment variables' }, { status: 401 });
    }

    const systemMessage = messages.find((m: any) => m.role === 'system')?.content;
    const userMessages = messages.filter((m: any) => m.role !== 'system');

    // Relay client disconnect to upstream so MiniMax stops generating (saves cost).
    const upstreamController = new AbortController();
    if (req.signal.aborted) {
      upstreamController.abort();
    } else {
      req.signal.addEventListener('abort', () => upstreamController.abort(), { once: true });
    }

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
      signal: upstreamController.signal,
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json(
        { error: `API error: ${upstream.status} ${upstream.statusText}`, detail: text },
        { status: upstream.status }
      );
    }

    if (!upstream.body) {
      return NextResponse.json({ error: 'No response body from server' }, { status: 502 });
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
