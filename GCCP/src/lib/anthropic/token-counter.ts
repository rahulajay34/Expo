/**
 * Token Counter - Legacy Compatibility Layer
 * 
 * Re-exports from Gemini token counter for backwards compatibility.
 */

export {
    estimateTokens,
    calculateCost,
    calculateImageCost,
    getModelPricing,
    GeminiPricing as Pricing
} from '@/lib/gemini/token-counter';
