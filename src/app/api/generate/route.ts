// =============================================================================
// GCCP — Content Generation API Route
// POST /api/generate
//
// Accepts generation parameters and streams pipeline events back to the client
// as Server-Sent Events (SSE) over a ReadableStream.
// =============================================================================

import { NextRequest } from 'next/server';
import { runPipeline, type PipelineEvent, type PhasedContext } from '@/lib/ai/pipeline';
import type { ContentType } from '@/lib/types';
import { RateLimiter } from '@/lib/utils/rate-limiter';

// -----------------------------------------------------------------------------
// Rate Limiter — 12 generations per hour per IP (in-memory, sliding window)
// -----------------------------------------------------------------------------

const rateLimiter = new RateLimiter({
  maxRequests: 12,
  windowMs: 60 * 60 * 1000, // 1 hour
});

/**
 * Extract the client IP address from request headers.
 * Uses x-forwarded-for (proxy/load-balancer), x-real-ip, or falls back to
 * 'unknown' for local development without a reverse proxy.
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // x-forwarded-for may contain a comma-separated list; use the first IP
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') ?? 'unknown';
}

// -----------------------------------------------------------------------------
// Request validation
// -----------------------------------------------------------------------------

interface GenerateRequestBody {
  topic: string;
  subtopics: string[];
  contentType: ContentType;
  transcript?: string;
  mcscCount?: number;
  mcmcCount?: number;
  subjectiveCount?: number;
  /** Gemini model to use. Defaults to gemini-2.5-flash. */
  modelName?: string;
  /** Language for generated content. Defaults to English. */
  outputLanguage?: string;
  /** Content length preference. Defaults to 'standard'. */
  contentLength?: 'brief' | 'standard' | 'detailed' | 'comprehensive';
  /** Pipeline phase to execute (1, 2, or 3). Omit to run the full pipeline. */
  phase?: 1 | 2 | 3;
  /** Content from a previous phase to continue from. */
  previousContent?: string;
  /** Serialized context from previous phases. */
  previousContext?: PhasedContext;
}

function validateRequest(body: unknown): { valid: true; data: GenerateRequestBody } | { valid: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object.' };
  }

  const { topic, subtopics, contentType, transcript, mcscCount, mcmcCount, subjectiveCount, modelName, outputLanguage, contentLength, phase, previousContent, previousContext } = body as Record<string, unknown>;

  if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
    return { valid: false, error: 'A non-empty "topic" string is required.' };
  }

  if (!Array.isArray(subtopics)) {
    return { valid: false, error: '"subtopics" must be an array of strings.' };
  }

  const validTypes: ContentType[] = ['lecture', 'pre-read', 'assignment'];
  if (!validTypes.includes(contentType as ContentType)) {
    return { valid: false, error: `"contentType" must be one of: ${validTypes.join(', ')}.` };
  }

  if (transcript !== undefined && typeof transcript !== 'string') {
    return { valid: false, error: '"transcript" must be a string if provided.' };
  }

  if (mcscCount !== undefined && (typeof mcscCount !== 'number' || mcscCount < 0 || mcscCount > 20)) {
    return { valid: false, error: '"mcscCount" must be a number between 0 and 20.' };
  }

  if (mcmcCount !== undefined && (typeof mcmcCount !== 'number' || mcmcCount < 0 || mcmcCount > 20)) {
    return { valid: false, error: '"mcmcCount" must be a number between 0 and 20.' };
  }

  if (subjectiveCount !== undefined && (typeof subjectiveCount !== 'number' || subjectiveCount < 0 || subjectiveCount > 10)) {
    return { valid: false, error: '"subjectiveCount" must be a number between 0 and 10.' };
  }

  if (phase !== undefined && ![1, 2, 3].includes(phase as number)) {
    return { valid: false, error: '"phase" must be 1, 2, or 3 if provided.' };
  }

  if (previousContent !== undefined && typeof previousContent !== 'string') {
    return { valid: false, error: '"previousContent" must be a string if provided.' };
  }

  if (previousContext !== undefined && (typeof previousContext !== 'object' || previousContext === null)) {
    return { valid: false, error: '"previousContext" must be an object if provided.' };
  }

  if (modelName !== undefined && typeof modelName !== 'string') {
    return { valid: false, error: '"modelName" must be a string if provided.' };
  }

  if (outputLanguage !== undefined && typeof outputLanguage !== 'string') {
    return { valid: false, error: '"outputLanguage" must be a string if provided.' };
  }

  const validLengths = ['brief', 'standard', 'detailed', 'comprehensive'];
  if (contentLength !== undefined && !validLengths.includes(contentLength as string)) {
    return { valid: false, error: `"contentLength" must be one of: ${validLengths.join(', ')}.` };
  }

  return {
    valid: true,
    data: {
      topic: topic.trim(),
      subtopics: (subtopics as unknown[]).map((s) => String(s).trim()).filter(Boolean),
      contentType: contentType as ContentType,
      transcript: typeof transcript === 'string' ? transcript.trim() || undefined : undefined,
      mcscCount: (mcscCount as number | undefined) ?? 4,
      mcmcCount: (mcmcCount as number | undefined) ?? 4,
      subjectiveCount: (subjectiveCount as number | undefined) ?? 1,
      modelName: typeof modelName === 'string' ? modelName : undefined,
      outputLanguage: typeof outputLanguage === 'string' ? outputLanguage : undefined,
      contentLength: validLengths.includes(contentLength as string) ? contentLength as GenerateRequestBody['contentLength'] : undefined,
      phase: phase as (1 | 2 | 3) | undefined,
      previousContent: typeof previousContent === 'string' ? previousContent : undefined,
      previousContext: previousContext as PhasedContext | undefined,
    },
  };
}

// -----------------------------------------------------------------------------
// SSE Encoder Helper
// -----------------------------------------------------------------------------

/**
 * Encodes a PipelineEvent as an SSE-formatted string.
 * Format: `data: <JSON>\n\n`
 */
function encodeSSE(event: PipelineEvent): Uint8Array {
  const json = JSON.stringify(event);
  const text = `data: ${json}\n\n`;
  return new TextEncoder().encode(text);
}

// -----------------------------------------------------------------------------
// Route Handler
// -----------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Check rate limit
  const clientIp = getClientIp(request);
  const rateLimitResult = rateLimiter.check(clientIp);

  if (!rateLimitResult.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded. Maximum 12 generations per hour.',
        retryAfter: rateLimitResult.retryAfterSeconds,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateLimitResult.retryAfterSeconds),
        },
      },
    );
  }

  // Parse request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  // Validate
  const validation = validateRequest(body);
  if (!validation.valid) {
    return new Response(
      JSON.stringify({ error: validation.error }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const data = validation.data;

  // Set up AbortController for client disconnection
  const abortController = new AbortController();

  // Listen for the client disconnecting (Next.js passes the native signal)
  request.signal.addEventListener('abort', () => {
    abortController.abort();
  });

  // Create a TransformStream to push SSE events
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  // Run the pipeline in the background, pushing events to the stream
  const pipelinePromise = (async () => {
    try {
      await runPipeline({
        topic: data.topic,
        subtopics: data.subtopics,
        contentType: data.contentType,
        transcript: data.transcript,
        mcscCount: data.mcscCount,
        mcmcCount: data.mcmcCount,
        subjectiveCount: data.subjectiveCount,
        modelName: data.modelName,
        outputLanguage: data.outputLanguage,
        contentLength: data.contentLength,
        phase: data.phase,
        previousContent: data.previousContent,
        previousContext: data.previousContext,
        signal: abortController.signal,
        onEvent: (event: PipelineEvent) => {
          // Write event to the SSE stream (fire-and-forget within the async context)
          writer.write(encodeSSE(event)).catch(() => {
            // Stream closed — ignore write errors
          });
        },
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Client disconnected or user pressed Stop — not an error
        const abortEvent: PipelineEvent = {
          type: 'error',
          data: { message: 'Generation was cancelled.', aborted: true },
        };
        await writer.write(encodeSSE(abortEvent)).catch(() => {});
      } else {
        // Unexpected error — send it to the client
        const message = err instanceof Error ? err.message : String(err);
        const errorEvent: PipelineEvent = {
          type: 'error',
          data: { message: `Pipeline error: ${message}` },
        };
        await writer.write(encodeSSE(errorEvent)).catch(() => {});
      }
    } finally {
      try {
        await writer.close();
      } catch {
        // Stream already closed — safe to ignore
      }
    }
  })();

  // Do not await the pipeline — let it run while the stream is being read.
  // The response is returned immediately with the readable side of the stream.
  void pipelinePromise;

  return new Response(readable, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
