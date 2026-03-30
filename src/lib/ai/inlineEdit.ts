import { AIProvider } from '../types';
import { streamCompletion, StreamChunk, Message } from './client';

export type InlineEditAction = 'improve' | 'expand' | 'simplify' | 'examples';

const SYSTEM_PROMPTS: Record<InlineEditAction, string> = {
  improve:
    'You are an expert editor. Rewrite the following text to be clearer, more precise, and better structured. Return ONLY the rewritten text, no explanations.',
  expand:
    'You are an expert educator. Expand the following text with more detail, context, and depth while keeping the same tone. Return ONLY the expanded text.',
  simplify:
    'You are an expert at plain language. Simplify the following text so a first-year student can understand it. Return ONLY the simplified text.',
  examples:
    'You are an expert educator. Add concrete, illustrative examples to the following text. Integrate them naturally. Return ONLY the enhanced text with examples added.',
};

export function buildInlineEditPrompt(
  action: InlineEditAction,
  selectedText: string,
): string {
  return `${SYSTEM_PROMPTS[action]}\n\n${selectedText}`;
}

export function buildInlineEditMessages(
  action: InlineEditAction,
  selectedText: string,
): Message[] {
  return [
    { role: 'system', content: SYSTEM_PROMPTS[action] },
    { role: 'user', content: selectedText },
  ];
}

export async function runInlineEdit(
  action: InlineEditAction,
  selectedText: string,
  provider: AIProvider,
  onChunk: (chunk: StreamChunk) => void,
): Promise<string> {
  const messages = buildInlineEditMessages(action, selectedText);
  return streamCompletion(provider, messages, onChunk);
}
