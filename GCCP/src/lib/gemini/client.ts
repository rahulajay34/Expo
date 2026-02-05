import { GoogleGenerativeAI, GenerativeModel, Content } from '@google/generative-ai';
import { log } from '@/lib/utils/env-logger';

// Check if we're on the server or client
const isServer = typeof window === 'undefined';

/**
 * Gemini Model Configuration
 * 
 * - pro: For complex reasoning, creative tasks, high-dependency operations
 * - flash: For simpler, faster tasks (quick summaries, simple Q&A)
 * - image: For image generation
 */
export const GEMINI_MODELS = {
    pro: 'gemini-3-pro-preview',
    flash: 'gemini-3-flash-preview',
    image: 'gemini-3-pro-image-preview'
} as const;

export type GeminiModelType = keyof typeof GEMINI_MODELS;

// Message types compatible with existing XAI/OpenAI format
export interface GeminiMessageParam {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export class GeminiClient {
    private genAI: GoogleGenerativeAI | null = null;
    private useProxy: boolean;

    constructor(apiKey?: string) {
        // On client side, always use the secure proxy
        // On server side (API routes), use direct Gemini client
        this.useProxy = !isServer;

        if (isServer) {
            const key = apiKey || process.env.GEMINI_API_KEY;
            if (!key) {
                throw new Error('API Key is missing. Please set GEMINI_API_KEY in environment variables.');
            }
            this.genAI = new GoogleGenerativeAI(key);
        }
        log.debug('GeminiClient initialized', { data: { useProxy: this.useProxy } });
    }

    /**
     * Get the appropriate model based on task type
     */
    static getModelForTask(taskType: 'creative' | 'simple' | 'image'): string {
        switch (taskType) {
            case 'creative':
                return GEMINI_MODELS.pro;
            case 'simple':
                return GEMINI_MODELS.flash;
            case 'image':
                return GEMINI_MODELS.image;
            default:
                return GEMINI_MODELS.flash;
        }
    }

    /**
     * Convert messages to Gemini format
     */
    private convertToGeminiFormat(systemPrompt: string, messages: GeminiMessageParam[]): {
        systemInstruction: string;
        contents: Content[];
    } {
        const contents: Content[] = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        return {
            systemInstruction: systemPrompt,
            contents
        };
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
        messages: GeminiMessageParam[];
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

        // Server-side: direct Gemini call
        const result = await this.withRetry(
            async () => {
                const model = this.genAI!.getGenerativeModel({
                    model: params.model,
                    systemInstruction: params.system,
                    generationConfig: {
                        maxOutputTokens: params.maxTokens || 16000,
                        temperature: params.temperature || 0.7,
                    }
                });

                const { contents } = this.convertToGeminiFormat(params.system, params.messages);

                const response = await model.generateContent({ contents });
                const text = response.response.text();
                const usageMetadata = response.response.usageMetadata;

                return {
                    content: [{ type: 'text', text }],
                    usage: {
                        input_tokens: usageMetadata?.promptTokenCount || 0,
                        output_tokens: usageMetadata?.candidatesTokenCount || 0,
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
        messages: GeminiMessageParam[];
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
        const model = this.genAI!.getGenerativeModel({
            model: params.model,
            systemInstruction: params.system,
            generationConfig: {
                maxOutputTokens: params.maxTokens || 16000,
                temperature: params.temperature || 0.7,
            }
        });

        const { contents } = this.convertToGeminiFormat(params.system, params.messages);

        const streamResult = await this.withRetry(
            () => model.generateContentStream({ contents }),
            3,
            params.signal
        );

        for await (const chunk of streamResult.stream) {
            const text = chunk.text();
            if (text) {
                yield text;
            }
        }
    }
}

// Re-export for backwards compatibility with XAI naming
export { GeminiClient as XAIClient };
export { GeminiClient as AnthropicClient };
export type { GeminiMessageParam as XAIMessageParam };
export type { GeminiMessageParam as MessageParam };
