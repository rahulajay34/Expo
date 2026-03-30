import { GenerationInput } from '../types';
import { Message } from './client';

export const CHUNK_CONFIG: Record<string, { id: string; instruction: string }[]> = {
  assignment: [
    { id: 'mcqs', instruction: 'Your ONLY job is to output the Subtopic Coverage Plan and the Easy Level Questions (MCQs) section. Do NOT output MSQs or Subjective Questions. Stop after the last MCQ.' },
    { id: 'msqs', instruction: 'Your ONLY job is to output the Easy Level Questions (MSQs) section. Do NOT output MCQs or Subjective Questions. Do NOT output a Subtopic Coverage Plan. Begin immediately with the `### Multiple Select Questions (MSQs)` header.' },
    { id: 'subjective', instruction: 'Your ONLY job is to output the Hard Level Questions (Subjective) section. Generate EXACTLY 2 Subjective questions (Q5 and Q6). Do NOT output MCQs or MSQs. Do NOT output a Subtopic Coverage Plan. Begin immediately with the `## Hard Level Question` header for Q5, then Q6. Include both Question 5 and Question 6 in your output.' }
  ],
  'pre-lecture': [
    { id: 'intro-explanation', instruction: 'Your ONLY job is to output the `### 1. What You\'ll Learn` and `### 2. Detailed Explanation` (including all subsections, diagrams etc) sections. Do NOT output the What\'s Coming Next or Practice Exercises sections. Stop after finishing the Detailed Explanation.' },
    { id: 'teaser-exercises', instruction: 'Your ONLY job is to output the `### 3. What\'s Coming Next` and `### 4. Practice Exercises` sections. Do NOT output the What You\'ll Learn or Detailed Explanation sections. Begin immediately with the `### 3. What\'s Coming Next` header.' }
  ],
  lecture: [
    { id: 'intro-walkthrough', instruction: 'Your ONLY job is to output the `### 1. What You\'ll Learn` and `### 2. Detailed Explanation` sections. Do NOT output the Try It Yourself or Key Takeaways sections. Stop after finishing the Detailed Explanation.' },
    { id: 'tryit-takeaways', instruction: 'Your ONLY job is to output the `### 3. Try It Yourself` and `### 4. Key Takeaways` sections. Do NOT output the What You\'ll Learn or Detailed Explanation sections. Begin immediately with the `### 3. Try It Yourself` header.' }
  ]
};

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

export function buildCreatorMessages(input: GenerationInput, promptTemplate: string, chunkInstruction?: string): Message[] {
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

  let content = fillPrompt(promptTemplate, variables);

  if (chunkInstruction) {
    content += `\n\nCRITICAL TASK INSTRUCTION:\n${chunkInstruction}`;
  }

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
    { role: 'system', content: 'You are an expert educational content refiner. Fix ONLY the sections that have issues. Output each changed section with its `### Section Name` header. Do NOT include unchanged sections — they will be preserved automatically. If only one section needs fixing, output only that one section. Keep your output focused and minimal.' },
    { role: 'user', content: `Fix these issues in the content. Output only the sections that changed — nothing else:

ISSUES TO FIX:
${issues}

ORIGINAL CONTENT:
${originalContent}` },
  ];
}

export function buildFormatterMessages(content: string, contentType: string): Message[] {
  return [
    { role: 'system', content: `You are an expert markdown formatter. Output ONLY the sections whose formatting changed. Use \`### Section Name\` headers. Do NOT re-output sections that are already well-formatted — they will be preserved automatically. Keep your output minimal.` },
    { role: 'user', content: `Format this ${contentType} content. Output only the sections where formatting changed, with \`### Section Name\` headers:

${content}` },
  ];
}
