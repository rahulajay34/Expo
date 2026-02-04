export const estimateTokens = (text: string): number => {
  // Rough estimate: 1 token ~= 4 chars for English
  return Math.ceil(text.length / 4);
};

// Grok pricing (approximate - adjust based on actual xAI pricing)
export const Pricing = {
  'grok-4-1-fast-reasoning-latest': { input: 0.20, output: 0.50 },
};

export const calculateCost = (model: string, inputTokens: number, outputTokens: number): number => {
  const rates = Pricing[model as keyof typeof Pricing] || Pricing['grok-4-1-fast-reasoning-latest'];
  return (inputTokens / 1_000_000 * rates.input) + (outputTokens / 1_000_000 * rates.output);
};
