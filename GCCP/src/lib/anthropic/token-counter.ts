export const estimateTokens = (text: string): number => {
  // Rough estimate: 1 token ~= 4 chars for English
  return Math.ceil(text.length / 4);
};

export const Pricing = {
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 1.00, output: 5.00 }
};

export const calculateCost = (model: string, inputTokens: number, outputTokens: number): number => {
  const rates = Pricing[model as keyof typeof Pricing] || Pricing['claude-sonnet-4-5-20250929'];
  return (inputTokens / 1_000_000 * rates.input) + (outputTokens / 1_000_000 * rates.output);
};
