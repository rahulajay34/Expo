import { AIProvider } from '../types';

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export type Message = { role: 'user' | 'system' | 'assistant'; content: string };

const DEFAULT_MODELS: Record<AIProvider, string> = {
  openai:  'gpt-5.4',
  minimax: 'MiniMax-M2.7',
  gemini:  'gemini-2.0-flash',
  xai:     'grok-3',
};

function getAPIKey(provider: AIProvider): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(`news13n_apikey_${provider}`) ?? '';
}

function getSavedModel(provider: AIProvider): string {
  if (typeof window === 'undefined') return DEFAULT_MODELS[provider];
  return localStorage.getItem(`news13n_model_${provider}`) ?? DEFAULT_MODELS[provider];
}

export async function streamCompletion(
  provider: AIProvider,
  messages: Message[],
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  // We no longer throw if apiKey is empty, because the server will fall back to process.env securely
  const apiKey = getAPIKey(provider);
  const model = getSavedModel(provider);

  // Send request to our unified, secure Next.js API route proxy
  const response = await fetch(`/api/${provider}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model, apiKey }),
  });

  if (!response.ok) {
    const text = await response.text();
    let errorMsg = `Server error from ${provider}: ${response.status} ${response.statusText}`;
    try {
        const json = JSON.parse(text);
        if (json.error) errorMsg = json.error;
    } catch {
       // fallback to text if parsing fails
    }
    throw new Error(errorMsg);
  }

  if (!response.body) throw new Error(`No response body from ${provider} proxy`);

  // Our proxies have all been carefully orchestrated to output standard OpenAI-like SSE streams
  return readSSEStream(response.body, onChunk);
}

async function readSSEStream(
  body: ReadableStream<Uint8Array>,
  onChunk: (chunk: StreamChunk) => void
): Promise<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = '';
  let buffer = '';
  let pendingWords = 0;
  let emittedLength = 0;
  const WORD_BATCH = 15;

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

        // Handle OpenAI format
        let delta = parsed.choices?.[0]?.delta?.content ?? '';

        // Handle Anthropic format
        if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
          delta = parsed.delta?.text ?? '';
        }

        if (delta) {
          full += delta;
          // Count words: split on whitespace, count non-empty tokens
          pendingWords += (delta.match(/\s+/g) || []).length + (delta.trim() ? 1 : 0);

          // Emit only the NEW portion when we have 15+ words ready
          if (pendingWords >= WORD_BATCH) {
            const newContent = full.slice(emittedLength);
            onChunk({ delta: newContent, done: false });
            emittedLength = full.length;
            pendingWords = 0;
          }
        }
      } catch { /* skip malformed */ }
    }
  }

  // Flush remaining content with done: true
  let flushedDone = false;
  if (pendingWords > 0 || full.length > 0) {
    const newContent = full.slice(emittedLength);
    onChunk({ delta: newContent, done: true });
    flushedDone = true;
  }

  // Final empty sentinel only if not already done
  if (!flushedDone) {
    onChunk({ delta: '', done: true });
  }

  return full;
}
