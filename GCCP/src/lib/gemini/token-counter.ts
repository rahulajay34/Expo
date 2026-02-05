/**
 * Token estimation and pricing for Gemini models
 * 
 * Pricing is per 1 million tokens (as of 2024)
 * https://ai.google.dev/pricing
 */

import { GEMINI_MODELS } from './client';

export const GeminiPricing: Record<string, { input: number; output: number }> = {
    // Pro model - $2 input / $12 output per 1M tokens
    [GEMINI_MODELS.pro]: { input: 2.00, output: 12.00 },

    // Flash model - $0.50 input / $3 output per 1M tokens
    [GEMINI_MODELS.flash]: { input: 0.50, output: 3.00 },

    // Image generation model - $0.30 input / $2 output per 1M tokens + $0.02 per image
    [GEMINI_MODELS.image]: { input: 0.30, output: 2.00 },
};

// Fallback for unknown models
const DEFAULT_PRICING = { input: 0.50, output: 2.00 };

/**
 * Estimate token count from text
 * Uses a simple heuristic: ~4 characters per token (similar to GPT models)
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    // Gemini uses similar tokenization to GPT models
    // Roughly 4 characters per token on average
    return Math.ceil(text.length / 4);
}

/**
 * Calculate cost for a given model and token counts
 * @param model - The Gemini model name
 * @param inputTokens - Number of input tokens
 * @param outputTokens - Number of output tokens
 * @returns Cost in USD
 */
export function calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number
): number {
    const pricing = GeminiPricing[model] || DEFAULT_PRICING;

    // Pricing is per 1M tokens
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;

    return inputCost + outputCost;
}

/**
 * Calculate cost for image generation
 * @param count - Number of images generated
 * @param inputTokens - Input tokens used for generation
 * @param outputTokens - Output tokens used (if any)
 * @returns Cost in USD
 */
export function calculateImageCost(count: number, inputTokens: number, outputTokens: number): number {
    // Base cost for tokens
    const tokenCost = calculateCost(GEMINI_MODELS.image, inputTokens, outputTokens);

    // Fixed cost per image ($0.02)
    const imageFixedCost = count * 0.039;

    return tokenCost + imageFixedCost;
}

/**
 * Get pricing info for a model
 */
export function getModelPricing(model: string): { input: number; output: number } {
    return GeminiPricing[model] || DEFAULT_PRICING;
}

// Re-export with old naming for backwards compatibility
export const Pricing = GeminiPricing;
