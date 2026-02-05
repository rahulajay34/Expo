/**
 * XAI Client - Legacy Compatibility Layer
 * 
 * This file now re-exports from the Gemini client for backwards compatibility.
 * All existing code using XAIClient will continue to work seamlessly.
 */

// Re-export classes
export {
  GeminiClient as XAIClient,
  GeminiClient as AnthropicClient,
  GEMINI_MODELS
} from '@/lib/gemini/client';

// Re-export types with proper syntax
export type {
  GeminiMessageParam as XAIMessageParam,
  GeminiMessageParam as MessageParam,
  GeminiMessageParam
} from '@/lib/gemini/client';
