import OpenAI from 'openai';
import { log } from '@/lib/utils/env-logger';

// Check if we're on the server or client
const isServer = typeof window === 'undefined';

// Message types compatible with xAI/OpenAI format
export interface XAIMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class XAIClient {
  private client: OpenAI | null = null;
  private useProxy: boolean;

  constructor(apiKey?: string) {
    // On client side, always use the secure proxy
    // On server side (API routes), use direct xAI client
    this.useProxy = !isServer;

    if (isServer) {
      const key = apiKey || process.env.XAI_API_KEY;
      if (!key) {
        throw new Error('API Key is missing. Please set XAI_API_KEY in environment variables.');
      }
      this.client = new OpenAI({ 
        apiKey: key,
        baseURL: 'https://api.x.ai/v1'
      });
    }
    log.debug('XAIClient initialized', { data: { useProxy: this.useProxy } });
  }

  /**
   * Retry wrapper with exponential backoff for transient API errors
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 3,
    signal?: AbortSignal
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      // Check abort signal before each attempt
      if (signal?.aborted) {
        throw new Error('Aborted');
      }

      try {
        return await fn();
      } catch (err: any) {
        lastError = err;

        // Don't retry on abort
        if (err?.name === 'AbortError' || signal?.aborted) {
          throw err;
        }

        // Retry on rate limits (429) or server errors (5xx)
        const status = err?.status || err?.response?.status;
        if (status === 429 || (status >= 500 && status < 600)) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
          console.warn(`API error (${status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }

        // Don't retry other errors (auth, bad request, etc.)
        throw err;
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  async generate(params: {
    system: string;
    messages: XAIMessageParam[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  }) {
    if (this.useProxy) {
      // Client-side: use secure proxy
      const response = await fetch('/api/stream', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: params.system,
          messages: params.messages,
          model: params.model,
          maxTokens: params.maxTokens || 16000,
          temperature: params.temperature || 0.7,
        }),
        signal: params.signal,
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }
      return response.json();
    }

    // Server-side: direct xAI call (OpenAI-compatible)
    const result = await this.withRetry(
      async () => {
        const completion = await this.client!.chat.completions.create({
          model: params.model,
          max_tokens: params.maxTokens || 16000,
          messages: [
            { role: 'system', content: params.system },
            ...params.messages
          ],
          temperature: params.temperature || 0.7,
        }, { signal: params.signal });
        
        return {
          content: [{ type: 'text', text: completion.choices[0]?.message?.content || '' }],
          usage: {
            input_tokens: completion.usage?.prompt_tokens || 0,
            output_tokens: completion.usage?.completion_tokens || 0,
          }
        };
      },
      3,
      params.signal
    );

    return result;
  }

  async *stream(params: {
    system: string;
    messages: XAIMessageParam[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    signal?: AbortSignal;
  }) {
    if (this.useProxy) {
      // Client-side: use secure proxy with SSE
      const response = await fetch('/api/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: params.system,
          messages: params.messages,
          model: params.model,
          maxTokens: params.maxTokens || 16000,
          temperature: params.temperature || 0.7,
        }),
        signal: params.signal,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') return;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'chunk' && parsed.content) {
                  yield parsed.content;
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.message);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
      return;
    }

    // Server-side: direct streaming
    const stream = await this.withRetry(
      () => this.client!.chat.completions.create({
        model: params.model,
        max_tokens: params.maxTokens || 16000,
        messages: [
          { role: 'system', content: params.system },
          ...params.messages
        ],
        temperature: params.temperature || 0.7,
        stream: true,
      }, { signal: params.signal }),
      3,
      params.signal
    );

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }
    }
  }
}

// Re-export for backwards compatibility
export { XAIClient as AnthropicClient };
export type { XAIMessageParam as MessageParam };
