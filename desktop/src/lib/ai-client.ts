import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

interface AiCallOptions {
  provider: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  onChunk?: (text: string) => void;
}

export async function aiCall(options: AiCallOptions): Promise<string> {
  const streamId = crypto.randomUUID();

  if (options.stream && options.onChunk) {
    return new Promise<string>(async (resolve, reject) => {
      let fullText = '';
      let unlistenFn: (() => void) | null = null;

      try {
        // Set up listener BEFORE invoking to avoid race condition
        unlistenFn = await listen<{
          stream_id: string;
          delta: string;
          done: boolean;
          error: string | null;
        }>('ai-stream', (event) => {
          if (event.payload.stream_id !== streamId) return;

          if (event.payload.error) {
            unlistenFn?.();
            reject(new Error(event.payload.error));
            return;
          }

          if (event.payload.done) {
            unlistenFn?.();
            resolve(fullText);
            return;
          }

          if (event.payload.delta) {
            fullText += event.payload.delta;
            options.onChunk!(event.payload.delta);
          }
        });

        // Then invoke the Rust command
        await invoke('ai_call', {
          request: {
            provider: options.provider,
            api_key: options.apiKey,
            model: options.model,
            messages: options.messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 4096,
            stream: true,
            stream_id: streamId,
          },
        });
      } catch (err) {
        unlistenFn?.();
        reject(err);
      }
    });
  }

  // Non-streaming call
  return invoke<string>('ai_call', {
    request: {
      provider: options.provider,
      api_key: options.apiKey,
      model: options.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4096,
      stream: false,
      stream_id: streamId,
    },
  });
}