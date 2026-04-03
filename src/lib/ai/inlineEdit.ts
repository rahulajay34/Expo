import { AIProvider } from '../types';
import { streamCompletion, StreamChunk, Message } from './client';

export type InlineEditAction = 'improve' | 'expand' | 'simplify' | 'examples' | 'custom';

export interface InlineEditContext {
  contentType?: string;       // 'lecture' | 'pre-lecture' | 'assignment'
  topic?: string;             // the content topic
  documentOutline?: string;      // list of headings for structural awareness
  sectionBefore?: string;        // full content of the section above the selection
  sectionAfter?: string;         // full content of the section below the selection
  surroundingText?: string;      // legacy fallback — kept for compatibility
  userInstruction?: string;      // user's custom explanation of what they want
  editHistory?: { instruction: string; result: string }[];  // for Task 3 (conversational follow-up)
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
  custom: '', // Uses userInstruction directly
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
  custom:
    'You are an expert editor. Follow the user\'s instructions precisely for the given text. Return ONLY the edited text, no explanations.',
};

// Intent categories for custom instructions
type EditIntent = 'rename' | 'tone' | 'augment' | 'restructure' | 'general';

const INTENT_PATTERNS: { intent: EditIntent; patterns: RegExp[] }[] = [
  {
    intent: 'rename',
    patterns: [
      /\b(rename|change\s*(the\s*)?(name|title|heading|topic)|(better|new|different)\s*(name|title|heading|topic))\b/i,
      /\breplace\s+\S+\s+with\b/i,
    ],
  },
  {
    intent: 'tone',
    patterns: [
      /\b(make\s*(it\s*)?(formal|casual|friendly|professional|academic|fun|funnier|serious|playful|engaging))\b/i,
      /\b(tone|voice|style|mood)\b/i,
    ],
  },
  {
    intent: 'augment',
    patterns: [
      /\b(add|include|insert|append|incorporate)\s+(example|detail|code|explanation|context|link|reference|hint)\b/i,
    ],
  },
  {
    intent: 'restructure',
    patterns: [
      /\b(turn\s*(it\s*)?into|convert\s*to|make\s*(it\s*)?(a|into)\s*(list|bullet|table|paragraph|heading|steps|numbered))\b/i,
      /\b(split|merge|reorganize|restructure|reorder)\b/i,
    ],
  },
];

function detectIntent(instruction: string): EditIntent {
  for (const { intent, patterns } of INTENT_PATTERNS) {
    if (patterns.some(p => p.test(instruction))) return intent;
  }
  return 'general';
}

const INTENT_GUIDANCE: Record<EditIntent, string> = {
  rename: 'Generate a NEW version of this text. The original meaning/purpose should be preserved but the specific name, title, or label the user mentioned MUST change to something different and better.',
  tone: 'Rewrite the text with the requested tone/style while preserving the same information, structure, and markdown formatting.',
  augment: 'Keep the original text intact and naturally integrate the requested additions (examples, details, code, etc.) into it.',
  restructure: 'Reorganize the content into the requested format. All information should be preserved but the structure should change as requested.',
  general: 'Apply the user\'s instruction to modify the selected text. You MUST produce a noticeably different result — do NOT return the original text unchanged or with only trivial formatting differences.',
};

const FORMAT_PRESERVATION = `Match the markdown formatting of the original text by default. If the original starts with "# ", keep the same heading level. If the original uses **bold**, maintain bold. Only change formatting (heading levels, bold, lists, code blocks, etc.) when your content change logically requires it — for example, if you're turning a paragraph into a list, or if the user explicitly asks for formatting changes.`;

function buildContextAwareSystemPrompt(
  action: InlineEditAction,
  context: InlineEditContext,
): string {
  const { contentType, topic, userInstruction } = context;
  const typeLabel = contentType ?? 'educational';
  const audience = (contentType && AUDIENCE_MAP[contentType]) || 'students';
  const topicLine = topic ? ` about "${topic}"` : '';

  const baseIntro = `You are an expert educational content editor working on ${typeLabel} content${topicLine}.\n\nAudience: ${audience}`;

  if (action === 'custom') {
    if (!userInstruction) return SIMPLE_SYSTEM_PROMPTS.custom;

    const intent = detectIntent(userInstruction);
    const guidance = INTENT_GUIDANCE[intent];

    return [
      baseIntro,
      `The user wants you to: ${userInstruction}`,
      guidance,
      FORMAT_PRESERVATION,
      'Return ONLY the edited text, no explanations or commentary.',
    ].join('\n\n');
  }

  // If we have no meaningful context, fall back to simple prompts
  if (!contentType && !topic && !userInstruction) {
    return SIMPLE_SYSTEM_PROMPTS[action];
  }

  const parts = [
    baseIntro,
    ACTION_INSTRUCTIONS[action],
  ];

  if (userInstruction) {
    parts.push(`The user specifically wants: ${userInstruction}`);
  }

  parts.push(FORMAT_PRESERVATION);
  parts.push('Return ONLY the edited text, no explanations or commentary.');

  return parts.join('\n\n');
}

function buildContextAwareUserMessage(
  selectedText: string,
  context: InlineEditContext,
): string {
  const parts: string[] = [];

  // Document outline for structural awareness
  if (context.documentOutline) {
    parts.push(`DOCUMENT OUTLINE (for structural context — do NOT include this in your output):\n${context.documentOutline}`);
  }

  // Section before selection
  if (context.sectionBefore?.trim()) {
    parts.push(`SECTION BEFORE (for tone/style reference — do NOT include this in your output):\n${context.sectionBefore}`);
  }

  parts.push(`TEXT TO EDIT:\n${selectedText}`);

  // Section after selection
  if (context.sectionAfter?.trim()) {
    parts.push(`SECTION AFTER (for continuity reference — do NOT include this in your output):\n${context.sectionAfter}`);
  }

  // Conversational follow-up context (for Task 3)
  if (context.editHistory && context.editHistory.length > 0) {
    const historyStr = context.editHistory
      .map((h, i) => `Edit ${i + 1}:\n  Instruction: ${h.instruction}\n  Result: ${h.result.slice(0, 300)}${h.result.length > 300 ? '...' : ''}`)
      .join('\n');
    parts.push(`PREVIOUS EDITS IN THIS SESSION (the user is iterating — build on the latest result, not the original):\n${historyStr}`);
  }

  return parts.join('\n\n');
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

export async function runInlineEditMulti(
  action: InlineEditAction,
  selectedText: string,
  provider: AIProvider,
  onChunk: (chunk: StreamChunk) => void,
  context?: InlineEditContext,
  count: number = 3,
): Promise<string> {
  const messages = buildInlineEditMessages(action, selectedText, context);
  // Modify the system prompt to request multiple alternatives
  if (messages.length > 0 && messages[0].role === 'system') {
    messages[0].content += `\n\nIMPORTANT: Provide exactly ${count} different alternatives, each on its own line. Number them like:\n1. First alternative\n2. Second alternative\n3. Third alternative\n\nEach alternative should be a complete replacement for the selected text. Do NOT include explanations — just the numbered alternatives.`;
  }
  return streamCompletion(provider, messages, onChunk);
}

export function parseAlternatives(raw: string): string[] {
  const lines = raw.split('\n').filter(l => l.trim());
  const alts: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\d+[\.\)]\s*(.+)/);
    if (match) {
      alts.push(match[1].trim());
    }
  }
  // If parsing fails, return the whole thing as one alternative
  return alts.length > 0 ? alts : [raw.trim()];
}

export async function generateSuggestedActions(
  selectedText: string,
  provider: AIProvider,
  onChunk: (chunk: StreamChunk) => void,
  context?: InlineEditContext,
): Promise<string> {
  const contextParts: string[] = [];
  if (context?.contentType) contextParts.push(`Content type: ${context.contentType}`);
  if (context?.topic) contextParts.push(`Topic: ${context.topic}`);
  if (context?.documentOutline) contextParts.push(`Document outline:\n${context.documentOutline}`);

  const messages: Message[] = [
    {
      role: 'system',
      content: `You analyze selected text from educational content and suggest 4-5 specific, actionable edit operations. Each suggestion should be a short verb phrase (2-5 words) that would improve or transform the text in a useful way. Consider the text type (heading, paragraph, list, code, etc.) and surrounding context.

Return ONLY a JSON array of strings like: ["Make more engaging", "Add real-world analogy", "Shorten to one line", "Use active voice"]

No explanations. Just the JSON array.`,
    },
    {
      role: 'user',
      content: `${contextParts.length > 0 ? contextParts.join('\n') + '\n\n' : ''}Selected text:\n${selectedText.slice(0, 500)}`,
    },
  ];

  return streamCompletion(provider, messages, onChunk);
}

export function parseSuggestedActions(raw: string): string[] {
  try {
    // Find JSON array in the response
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      const arr = JSON.parse(match[0]);
      if (Array.isArray(arr)) return arr.filter(s => typeof s === 'string').slice(0, 5);
    }
  } catch { /* fall through */ }
  return [];
}
