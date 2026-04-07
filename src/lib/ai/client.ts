import { AIProvider } from '../types';

export interface StreamChunk {
  delta: string;
  done: boolean;
  thinking?: string;   // thinking delta from model's chain-of-thought
}

export type Message = { role: 'user' | 'system' | 'assistant'; content: string };

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  minimax: 'MiniMax-M2.7',
};

const RETRY_STATUS_CODES = new Set([429, 500, 502, 503]);

function isRetryableError(status: number): boolean {
  return RETRY_STATUS_CODES.has(status);
}

async function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
  if (signal?.aborted) return;
}

export async function streamCompletion(
  provider: AIProvider,
  messages: Message[],
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal,
  options?: { onRetry?: (attempt: number) => void }
): Promise<string> {
  const { onRetry } = options ?? {};

  const attempt = await doFetch(0);

  async function doFetch(attemptNumber: number): Promise<string> {
    if (signal?.aborted) throw new Error('Generation cancelled');

    let response: Response;
    try {
      response = await fetch(`/api/minimax`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
        signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Generation cancelled');
      }
      if (signal?.aborted) throw new Error('Generation cancelled');
      if (attemptNumber < 2) {
        const delay = attemptNumber === 0 ? 2000 : 5000;
        onRetry?.(attemptNumber + 2);
        await sleep(delay, signal);
        return doFetch(attemptNumber + 1);
      }
      throw err;
    }

    if (!response.ok) {
      if (isRetryableError(response.status) && attemptNumber < 2) {
        const retryAfter = response.headers.get('Retry-After');
        const delay = retryAfter ? parseInt(retryAfter) * 1000 : (attemptNumber === 0 ? 2000 : 5000);
        onRetry?.(attemptNumber + 2);
        await sleep(delay, signal);
        return doFetch(attemptNumber + 1);
      }
      const text = await response.text();
      let errorMsg = `Server error: ${response.status} ${response.statusText}`;
      try {
        const json = JSON.parse(text);
        if (json.error) errorMsg = json.error;
      } catch {
        // fallback to text if parsing fails
      }
      throw new Error(errorMsg);
    }

    if (!response.body) throw new Error('No response body from server');
    return readSSEStream(response.body, onChunk);
  }

  return attempt;
}

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let fullThinking = '';
  let buffer = '';

  // Track current content block type for Anthropic format thinking support
  let currentBlockType: 'thinking' | 'text' | null = null;

  // Smooth streaming: emit in larger batches to reduce re-render frequency.
  // 50 chars was too aggressive — each emit re-runs the entire markdown
  // pipeline (remark parse, rehype-highlight tokenize, rehype-sanitize,
  // rehype-wrap-lines, React reconciliation), causing visible jitter.
  // 200 chars is still fast enough to feel live but ~4x fewer renders.
  let emittedLength = 0;
  const CHAR_BATCH = 200;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') { onChunk({ delta: '', done: true }); continue; }
      try {
        const parsed = JSON.parse(data);

        // ── Anthropic format: track block types for thinking ──
        if (parsed.type === 'content_block_start') {
          const blockType = parsed.content_block?.type;
          if (blockType === 'thinking') currentBlockType = 'thinking';
          else if (blockType === 'text') currentBlockType = 'text';
          continue;
        }

        if (parsed.type === 'content_block_stop') {
          currentBlockType = null;
          continue;
        }

        if (parsed.type === 'message_stop') {
          onChunk({ delta: '', done: true });
          continue;
        }

        // ── Anthropic thinking delta ──
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'thinking_delta') {
          const thinkDelta = parsed.delta?.thinking ?? '';
          if (thinkDelta) {
            fullThinking += thinkDelta;
            onChunk({ delta: '', done: false, thinking: thinkDelta });
          }
          continue;
        }

        // ── Anthropic text delta ──
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          const delta = parsed.delta?.text ?? '';
          if (delta) {
            full += delta;
            if (full.length - emittedLength >= CHAR_BATCH) {
              const newContent = full.slice(emittedLength);
              onChunk({ delta: newContent, done: false });
              emittedLength = full.length;
            }
          }
          continue;
        }

        // ── OpenAI format fallback (content_block_delta without explicit types) ──
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) {
          full += delta;
          if (full.length - emittedLength >= CHAR_BATCH) {
            const newContent = full.slice(emittedLength);
            onChunk({ delta: newContent, done: false });
            emittedLength = full.length;
          }
        }
      } catch { /* skip malformed */ }
    }
  }

  // Flush remaining content
  let flushedDone = false;
  if (full.length > emittedLength || fullThinking.length > 0) {
    const newContent = full.slice(emittedLength);
    onChunk({ delta: newContent, done: true });
    flushedDone = true;
  }

  if (!flushedDone) {
    onChunk({ delta: '', done: true });
  }

  return full;
}
