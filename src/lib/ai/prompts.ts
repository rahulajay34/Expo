import { GenerationInput } from '../types';
import { Message } from './client';

export async function loadPrompt(filename: string): Promise<string> {
  const res = await fetch(`/Prompts/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Failed to load prompt: ${filename} (${res.status})`);
  return res.text();
}

export function fillPrompt(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    // Support both {{KEY}} and {{}} (empty double-braces in pre-lecture prompt)
    filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return filled;
}

export function buildCreatorMessages(input: GenerationInput, promptTemplate: string): Message[] {
  const variables: Record<string, string> = {
    TOPIC: input.topic,
    TRANSCRIPT: [
      ...input.sources.map(s => s.content ?? ''),
      input.transcript ?? '',
    ].filter(Boolean).join('\n\n'),
    SUBTOPICS: input.subtopics?.join(', ') ?? '',
    PREREQUISITES: input.prerequisites?.join(', ') ?? '',
    ...(input.questionCounts ? {
      MCQ_COUNT: String(input.questionCounts.mcq),
      MSQ_COUNT: String(input.questionCounts.msq),
      SUBJECTIVE_COUNT: String(input.questionCounts.subjective),
      TOTAL_COUNT: String(input.questionCounts.mcq + input.questionCounts.msq + input.questionCounts.subjective),
      EASY_COUNT: String(input.questionCounts.mcq + input.questionCounts.msq),
    } : {}),
  };

  const content = fillPrompt(promptTemplate, variables);

  return [
    { role: 'system', content: 'You are an expert educational content creator. Follow the instructions precisely and produce high-quality, well-structured content.' },
    { role: 'user', content },
  ];
}

export function buildReviewerMessages(originalContent: string): Message[] {
  return [
    { role: 'system', content: 'You are an expert educational content reviewer. Carefully check for: factual inaccuracies, structural issues, formatting inconsistencies, missing sections, and quality problems. If everything looks good, respond with exactly "LGTM". Otherwise, list the specific issues concisely.' },
    { role: 'user', content: `Review this educational content and identify any issues that need fixing:\n\n${originalContent}` },
  ];
}

export function buildRefinerMessages(originalContent: string, issues: string): Message[] {
  return [
    { role: 'system', content: 'You are an expert educational content refiner. Fix the identified issues while preserving all correct content and quality. Return the complete corrected content.' },
    { role: 'user', content: `Fix these issues in the content:\n\nISSUES TO FIX:\n${issues}\n\nORIGINAL CONTENT:\n${originalContent}` },
  ];
}

export function buildFormatterMessages(content: string, contentType: string): Message[] {
  return [
    { role: 'system', content: `You are an expert markdown formatter. Ensure the ${contentType} content is properly structured with consistent markdown formatting, appropriate headings, and clean layout. Do not change the actual content — only improve formatting.` },
    { role: 'user', content: `Format this ${contentType} content with proper, consistent markdown structure. Return only the formatted content:\n\n${content}` },
  ];
}
