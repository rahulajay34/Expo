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
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) { full += delta; onChunk({ delta, done: false }); }
      } catch { /* skip malformed */ }
    }
  }

  onChunk({ delta: '', done: true });
  return full;
}
