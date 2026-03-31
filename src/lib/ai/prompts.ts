import { GenerationInput } from '../types';
import { Message } from './client';
import { sanitizeShortInput, sanitizeTranscript } from '../utils';

export function getChunkConfig(input: GenerationInput): { id: string; instruction: string }[] {
  if (input.type === 'assignment') {
    const mcqCount = input.questionCounts?.mcq ?? 4;
    const msqCount = input.questionCounts?.msq ?? 4;
    const subjCount = input.questionCounts?.subjective ?? 1;
    const startMsq = mcqCount + 1;
    const startSubj = mcqCount + msqCount + 1;
    const endSubj = mcqCount + msqCount + subjCount;
    const subjQNums = subjCount === 1
      ? `Q${startSubj}`
      : `Q${startSubj} through Q${endSubj}`;

    return [
      {
        id: 'mcqs',
        instruction: [
          `╔══════════════════════════════════════════════════════════╗`,
          `║  CHUNK TASK: MCQ SECTION ONLY                          ║`,
          `╚══════════════════════════════════════════════════════════╝`,
          ``,
          `You are generating ONLY ONE PART of a larger assignment.`,
          `Your output scope is strictly LIMITED to:`,
          ``,
          `1. The Subtopic Coverage Plan (for the full assignment)`,
          `2. EXACTLY ${mcqCount} MCQ question(s), numbered Q1 to Q${mcqCount}`,
          ``,
          `HARD RULES:`,
          `• Output EXACTLY ${mcqCount} MCQs — not ${mcqCount - 1}, not ${mcqCount + 1}`,
          `• Number them Q1 through Q${mcqCount}`,
          `• DO NOT generate ANY MSQ or Subjective questions`,
          `• DO NOT generate the "## Hard Level Question" section`,
          `• STOP IMMEDIATELY after Q${mcqCount}'s explanation`,
          ``,
          `The full assignment has ${mcqCount + msqCount + subjCount} total questions,`,
          `but you are ONLY responsible for the first ${mcqCount} MCQs.`,
          `Other agents handle MSQs and Subjective questions separately.`,
        ].join('\n'),
      },
      {
        id: 'msqs',
        instruction: [
          `╔══════════════════════════════════════════════════════════╗`,
          `║  CHUNK TASK: MSQ SECTION ONLY                          ║`,
          `╚══════════════════════════════════════════════════════════╝`,
          ``,
          `You are generating ONLY ONE PART of a larger assignment.`,
          `Your output scope is strictly LIMITED to:`,
          ``,
          `1. EXACTLY ${msqCount} MSQ question(s), numbered Q${startMsq} to Q${mcqCount + msqCount}`,
          ``,
          `HARD RULES:`,
          `• Output EXACTLY ${msqCount} MSQs — not ${msqCount - 1}, not ${msqCount + 1}`,
          `• Number them Q${startMsq} through Q${mcqCount + msqCount}`,
          `• Begin IMMEDIATELY with the \`### Multiple Select Questions (MSQs)\` header`,
          `• DO NOT output a Subtopic Coverage Plan`,
          `• DO NOT output ANY MCQ questions`,
          `• DO NOT output ANY Subjective questions`,
          `• STOP IMMEDIATELY after Q${mcqCount + msqCount}'s explanation`,
          ``,
          `Other agents handle MCQs and Subjective questions separately.`,
        ].join('\n'),
      },
      {
        id: 'subjective',
        instruction: [
          `╔══════════════════════════════════════════════════════════╗`,
          `║  CHUNK TASK: SUBJECTIVE SECTION ONLY                   ║`,
          `╚══════════════════════════════════════════════════════════╝`,
          ``,
          `You are generating ONLY ONE PART of a larger assignment.`,
          `Your output scope is strictly LIMITED to:`,
          ``,
          `1. EXACTLY ${subjCount} Subjective question(s) (${subjQNums})`,
          ``,
          `HARD RULES:`,
          `• Output EXACTLY ${subjCount} Subjective question(s)`,
          `• Number: ${subjQNums}`,
          `• Begin IMMEDIATELY with the \`## Hard Level Question\` header`,
          `• DO NOT output a Subtopic Coverage Plan`,
          `• DO NOT output ANY MCQ or MSQ questions`,
          `• Include all required sections: Deliverables, Constraints, Evaluation Criteria, Model Answer`,
          ``,
          `Other agents handle MCQs and MSQs separately.`,
        ].join('\n'),
      },
    ];
  }

  if (input.type === 'pre-lecture') {
    return [
      { id: 'intro-explanation', instruction: 'Your ONLY job is to output the `### 1. What You\'ll Learn` and `### 2. Detailed Explanation` (including all subsections, diagrams etc) sections. Do NOT output the What\'s Coming Next or Practice Exercises sections. Stop after finishing the Detailed Explanation.' },
      { id: 'teaser-exercises', instruction: 'Your ONLY job is to output the `### 3. What\'s Coming Next` and `### 4. Practice Exercises` sections. Do NOT output the What You\'ll Learn or Detailed Explanation sections. Begin immediately with the `### 3. What\'s Coming Next` header.' },
    ];
  }

  if (input.type === 'lecture') {
    return [
      { id: 'intro-walkthrough', instruction: 'Your ONLY job is to output the `### 1. What You\'ll Learn` and `### 2. Detailed Explanation` sections. Do NOT output the Try It Yourself or Key Takeaways sections. Stop after finishing the Detailed Explanation.' },
      { id: 'tryit-takeaways', instruction: 'Your ONLY job is to output the `### 3. Try It Yourself` and `### 4. Key Takeaways` sections. Do NOT output the What You\'ll Learn or Detailed Explanation sections. Begin immediately with the `### 3. Try It Yourself` header.' },
    ];
  }

  return [{ id: 'all', instruction: '' }];
}

export async function loadPrompt(filename: string): Promise<string> {
  const res = await fetch(`/Prompts/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Failed to load prompt: ${filename} (${res.status})`);
  return res.text();
}

export function fillPrompt(template: string, variables: Record<string, string>): string {
  let filled = template;
  for (const [key, value] of Object.entries(variables)) {
    filled = filled.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return filled;
}

export function buildCreatorMessages(input: GenerationInput, promptTemplate: string, chunkInstruction?: string): Message[] {
  const sanitizedTopic = sanitizeShortInput(input.topic);
  const sanitizedTranscript = sanitizeTranscript(
    [
      ...input.sources.map(s => s.content ?? ''),
      input.transcript ?? '',
    ].filter(Boolean).join('\n\n')
  );
  const sanitizedSubtopics = (input.subtopics ?? []).map(sanitizeShortInput);
  const sanitizedPrereqs = (input.prerequisites ?? []).map(sanitizeShortInput);

  const variables: Record<string, string> = {
    TOPIC: `<topic>${sanitizedTopic}</topic>`,
    TRANSCRIPT: `<transcript>${sanitizedTranscript}</transcript>`,
    SUBTOPICS: sanitizedSubtopics.length > 0 ? `<subtopics>${sanitizedSubtopics.join('; ')}</subtopics>` : '',
    PREREQUISITES: sanitizedPrereqs.length > 0 ? `<prerequisites>${sanitizedPrereqs.join('; ')}</prerequisites>` : '',
    ...(input.questionCounts ? {
      MCQ_COUNT: String(input.questionCounts.mcq),
      MSQ_COUNT: String(input.questionCounts.msq),
      SUBJECTIVE_COUNT: String(input.questionCounts.subjective),
      TOTAL_COUNT: String(input.questionCounts.mcq + input.questionCounts.msq + input.questionCounts.subjective),
      EASY_COUNT: String(input.questionCounts.mcq + input.questionCounts.msq),
    } : {}),
  };

  let content = fillPrompt(promptTemplate, variables);

  // For assignments, PREPEND chunk instruction so it's the first thing the model sees
  if (chunkInstruction && input.type === 'assignment') {
    content = `${chunkInstruction}\n\n---\n\nBELOW IS THE FULL ASSIGNMENT PROMPT FOR CONTEXT.\nRemember: you are ONLY generating the section described above.\n\n---\n\n${content}`;
  } else if (chunkInstruction) {
    content += `\n\nCRITICAL TASK INSTRUCTION:\n${chunkInstruction}`;
  }

  return [
    { role: 'system', content: 'You are an expert educational content creator. Follow the instructions precisely and produce high-quality, well-structured content. Pay special attention to any CHUNK TASK instructions — they override the general prompt.' },
    { role: 'user', content },
  ];
}

export function buildReviewerMessages(originalContent: string, contentType?: string): Message[] {
  const typeContext = contentType === 'assignment'
    ? 'This is an assignment with MCQ, MSQ, and Subjective questions. Check: correct question counts match headers, all questions are scenario-based (not definitional), answer keys are present, options are balanced, and question numbering is sequential.'
    : contentType === 'lecture' || contentType === 'pre-lecture'
    ? `This is ${contentType} content. Check: all required sections are present, content flows logically, examples are clear, and formatting is consistent.`
    : '';

  return [
    {
      role: 'system',
      content: `You are an expert educational content reviewer. Carefully check for: factual inaccuracies, structural issues, formatting inconsistencies, missing sections, and quality problems. ${typeContext} If everything looks good, respond with exactly "LGTM". Otherwise, list the specific issues concisely.`,
    },
    { role: 'user', content: `Review this educational content and identify any issues that need fixing:\n\n${originalContent}` },
  ];
}

export function buildRefinerMessages(originalContent: string, issues: string, contentType?: string): Message[] {
  const typeContext = contentType === 'assignment'
    ? 'This is an assignment. Preserve exact question numbering, question types (MCQ/MSQ/Subjective), and answer format. Do not add or remove questions.'
    : '';

  return [
    {
      role: 'system',
      content: `You are an expert educational content refiner. Fix ONLY the sections that have issues. Output each changed section with its \`### Section Name\` header. Do NOT include unchanged sections — they will be preserved automatically. ${typeContext} Keep your output focused and minimal.`,
    },
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
    { role: 'user', content: `Format this ${contentType} content. Output only the sections where formatting changed, with \`### Section Name\` headers:\n\n${content}` },
  ];
}
