/**
 * Server-side Anthropic Client Wrapper
 * This module provides a client that routes through our secure API endpoint
 * instead of exposing API keys in the browser
 */

import Anthropic from '@anthropic-ai/sdk';

interface StreamParams {
  system: string;
  messages: Anthropic.MessageParam[];
  model: string;
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

interface GenerateParams extends StreamParams {}

export class SecureAnthropicClient {
  private baseUrl: string;

  constructor() {
    // Uses relative URL for API routes
    this.baseUrl = '/api/stream';
  }

  /**
   * Streaming generation via server-side proxy
   */
  async *stream(params: StreamParams): AsyncGenerator<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system: params.system,
        messages: params.messages,
        model: params.model,
        maxTokens: params.maxTokens || 10000,
        temperature: params.temperature || 0.7,
      }),
      signal: params.signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

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
            if (data === '[DONE]') {
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'chunk' && parsed.content) {
                yield parsed.content;
              } else if (parsed.type === 'error') {
                throw new Error(parsed.message);
              }
            } catch (e) {
              // Skip malformed JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  /**
   * Non-streaming generation via server-side proxy
   */
  async generate(params: GenerateParams): Promise<{
    content: Anthropic.ContentBlock[];
    usage: Anthropic.Usage;
  }> {
    const response = await fetch(this.baseUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system: params.system,
        messages: params.messages,
        model: params.model,
        maxTokens: params.maxTokens || 10000,
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
}

// Singleton instance
let clientInstance: SecureAnthropicClient | null = null;

export function getSecureAnthropicClient(): SecureAnthropicClient {
  if (!clientInstance) {
    clientInstance = new SecureAnthropicClient();
  }
  return clientInstance;
}
