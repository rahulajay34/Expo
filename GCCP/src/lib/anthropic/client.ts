/**
 * Anthropic Client - Legacy Compatibility Layer
 * 
 * Re-exports from Gemini client for backwards compatibility.
 * This maintains the original Anthropic -> XAI -> Gemini migration path.
 */

// Re-export classes
export { GeminiClient as AnthropicClient } from '@/lib/gemini/client';

// Re-export types with proper syntax
export type {
    GeminiMessageParam as MessageParam,
    GeminiMessageParam
} from '@/lib/gemini/client';
