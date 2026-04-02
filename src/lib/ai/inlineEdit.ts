import { AIProvider } from '../types';
import { streamCompletion, StreamChunk, Message } from './client';

export type InlineEditAction = 'improve' | 'expand' | 'simplify' | 'examples';

export interface InlineEditContext {
  contentType?: string;       // 'lecture' | 'pre-lecture' | 'assignment'
  topic?: string;             // the content topic
  surroundingText?: string;   // ~200 chars before and after the selection, separated by |||SELECTION|||
  userInstruction?: string;   // user's custom explanation of what they want
}

const ACTION_INSTRUCTIONS: Record<InlineEditAction, string> = {
  improve:
    'Rewrite the text to be clearer, more precise, and better structured.',
  expand:
    'Expand the text with more detail, context, and depth while keeping the same tone.',
  simplify:
    'Simplify the text so a first-year student can understand it easily.',
  examples:
    'Add concrete, illustrative examples to the text. Integrate them naturally.',
};

const AUDIENCE_MAP: Record<string, string> = {
  'pre-lecture': 'beginners encountering this topic for the first time',
  lecture: 'students building mastery and deeper understanding',
  assignment: 'students being assessed on their knowledge',
};

// Fallback simple prompts (no context available)
const SIMPLE_SYSTEM_PROMPTS: Record<InlineEditAction, string> = {
  improve:
    'You are an expert editor. Rewrite the following text to be clearer, more precise, and better structured. Return ONLY the rewritten text, no explanations.',
  expand:
    'You are an expert educator. Expand the following text with more detail, context, and depth while keeping the same tone. Return ONLY the expanded text.',
  simplify:
    'You are an expert at plain language. Simplify the following text so a first-year student can understand it. Return ONLY the simplified text.',
  examples:
    'You are an expert educator. Add concrete, illustrative examples to the following text. Integrate them naturally. Return ONLY the enhanced text with examples added.',
};

function buildContextAwareSystemPrompt(
  action: InlineEditAction,
  context: InlineEditContext,
): string {
  const { contentType, topic, userInstruction } = context;

  // If we have no meaningful context, fall back to simple prompts
  if (!contentType && !topic && !userInstruction) {
    return SIMPLE_SYSTEM_PROMPTS[action];
  }

  const typeLabel = contentType ?? 'educational';
  const audience = (contentType && AUDIENCE_MAP[contentType]) || 'students';
  const topicLine = topic ? ` about "${topic}"` : '';

  let prompt = `You are an expert educational content editor working on ${typeLabel} content${topicLine}.\n\nAudience: ${audience}\n\n${ACTION_INSTRUCTIONS[action]}`;

  if (userInstruction) {
    prompt += `\n\nThe user specifically wants: ${userInstruction}`;
  }

  prompt += '\n\nMaintain the same markdown formatting style and tone as the surrounding content. Return ONLY the edited text, no explanations.';

  return prompt;
}

function buildContextAwareUserMessage(
  selectedText: string,
  context: InlineEditContext,
): string {
  const { surroundingText } = context;

  if (!surroundingText) {
    return selectedText;
  }

  const separatorIndex = surroundingText.indexOf('|||SELECTION|||');
  if (separatorIndex === -1) {
    return selectedText;
  }

  const before = surroundingText.slice(0, separatorIndex);
  const after = surroundingText.slice(separatorIndex + '|||SELECTION|||'.length);

  let message = '';

  if (before.trim()) {
    message += `SURROUNDING CONTEXT (for tone/style reference — do NOT include this in your output):\n...${before}...\n\n`;
  }

  message += `TEXT TO EDIT:\n${selectedText}`;

  if (after.trim()) {
    message += `\n\nSURROUNDING CONTEXT (continues after):\n...${after}...`;
  }

  return message;
}

export function buildInlineEditPrompt(
  action: InlineEditAction,
  selectedText: string,
  context?: InlineEditContext,
): string {
  if (context) {
    const systemPrompt = buildContextAwareSystemPrompt(action, context);
    const userMessage = buildContextAwareUserMessage(selectedText, context);
    return `${systemPrompt}\n\n${userMessage}`;
  }
  return `${SIMPLE_SYSTEM_PROMPTS[action]}\n\n${selectedText}`;
}

export function buildInlineEditMessages(
  action: InlineEditAction,
  selectedText: string,
  context?: InlineEditContext,
): Message[] {
  if (context) {
    return [
      { role: 'system', content: buildContextAwareSystemPrompt(action, context) },
      { role: 'user', content: buildContextAwareUserMessage(selectedText, context) },
    ];
  }
  return [
    { role: 'system', content: SIMPLE_SYSTEM_PROMPTS[action] },
    { role: 'user', content: selectedText },
  ];
}

export async function runInlineEdit(
  action: InlineEditAction,
  selectedText: string,
  provider: AIProvider,
  onChunk: (chunk: StreamChunk) => void,
  context?: InlineEditContext,
): Promise<string> {
  const messages = buildInlineEditMessages(action, selectedText, context);
  return streamCompletion(provider, messages, onChunk);
}
