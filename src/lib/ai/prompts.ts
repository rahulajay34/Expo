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
    return [{ id: 'all', instruction: '' }];
  }

  if (input.type === 'lecture') {
    return [{ id: 'all', instruction: '' }];
  }

  return [{ id: 'all', instruction: '' }];
}

const promptCache = new Map<string, string>();

export async function loadPrompt(filename: string): Promise<string> {
  const cached = promptCache.get(filename);
  if (cached) return cached;

  const res = await fetch(`/Prompts/${encodeURIComponent(filename)}`);
  if (!res.ok) throw new Error(`Failed to load prompt: ${filename} (${res.status})`);
  const text = await res.text();
  promptCache.set(filename, text);
  return text;
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
    { role: 'system', content: input.type === 'assignment'
      ? 'You are an expert educational content creator. Follow the instructions precisely and produce high-quality, well-structured content. Pay special attention to any CHUNK TASK instructions — they override the general prompt.'
      : 'You are an expert educational content creator. Follow the instructions precisely and produce high-quality, well-structured content that covers all required sections completely.' },
    { role: 'user', content },
  ];
}

export function buildReviewerMessages(originalContent: string, contentType?: string): Message[] {
  let typeContext = '';

  if (contentType === 'assignment') {
    typeContext = `This is an assignment with MCQ, MSQ, and Subjective questions. Check:
- Correct question counts match headers (MCQs, MSQs, Subjective)
- All questions are scenario-based (not definitional like "What is X?")
- Answer keys are present with explanations for every question
- Options are balanced (correct answer isn't always longest/most detailed)
- Question numbering is sequential with no gaps
- Correct answer position distribution: each letter (A-D) appears at least once; no 3 consecutive same positions
- Difficulty values are valid (0, 0.5, or 1)
- At least 1 MCQ and 1 MSQ use negative/exception-based framing`;
  } else if (contentType === 'lecture') {
    typeContext = `This is lecture content for building student mastery. Check:
- "What You'll Learn" section exists with 3-4 action-verb bullet points
- "Detailed Explanation" section uses progressive complexity (simple → layered → realistic)
- At least 2 relatable analogies are present throughout (not just in the intro)
- Mermaid diagrams are included where processes or relationships would benefit from visualization
- "Try It Yourself" section has 1-2 micro-exercises focused on application, not recall
- "Key Takeaways" section has 3-5 bullet points with a mental model
- Code examples (if any) are short (5-10 lines), well-explained, and build on each other
- No references to "the transcript", "the lecture", or "the speaker"
- Bold key terms on first occurrence
- Formatting: consistent ### headers, proper markdown fencing for code blocks, adequate white space`;
  } else if (contentType === 'pre-lecture') {
    typeContext = `This is pre-read content for complete beginners (0→10 on a 100-point scale). Check:
- "What You'll Learn" section uses discovery language ("you'll discover...")
- "Detailed Explanation" has appropriate subsections (not all forced in)
- Common Misconceptions section is present with 2-3 gentle clarifications
- At least one Mermaid diagram is included for a key concept/process
- "What's Coming Next" section bridges to the deeper session without introducing new concepts
- "Practice Exercises" section has 3-5 exercises ordered from easiest to hardest with hints and answer key
- At least 3 relatable analogies using everyday concepts
- Content stays introductory — does not go too deep for a pre-read
- No unexplained jargon; every technical term defined immediately
- Formatting: consistent ### headers, proper mermaid code fencing, bold key terms, adequate white space`;
  }

  return [
    {
      role: 'system',
      content: `You are an expert educational content reviewer and quality checker. Review the content thoroughly for: factual accuracy, structural completeness, formatting quality, and adherence to content-type standards.

${typeContext}

Also check these formatting standards across all content types:
- Markdown headers use consistent levels (## for major sections, ### for subsections)
- Code blocks specify the language (e.g., \`\`\`python not just \`\`\`)
- Mermaid diagrams use \`\`\`mermaid fencing and are syntactically valid
- Bold is used for key terms on first occurrence only (not overused)
- Lists are consistently formatted (all bullets or all numbers, not mixed)
- No orphaned formatting characters (unclosed **, \`, etc.)
- Adequate spacing between sections

If everything looks good, respond with exactly "LGTM". Otherwise, list the specific issues concisely — group them as STRUCTURAL, CONTENT, or FORMATTING issues.`,
    },
    { role: 'user', content: `Review this educational content and identify any issues that need fixing:\n\n${originalContent}` },
  ];
}

export function buildRefinerMessages(originalContent: string, issues: string, contentType?: string): Message[] {
  let typeContext = '';

  if (contentType === 'assignment') {
    typeContext = 'This is an assignment. Preserve exact question numbering, question types (MCQ/MSQ/Subjective), and answer format. Do not add or remove questions.';
  } else if (contentType === 'lecture') {
    typeContext = 'This is lecture content. Preserve the 4-part structure (What You\'ll Learn → Detailed Explanation → Try It Yourself → Key Takeaways). Keep the tone conversational and beginner-friendly. Ensure code blocks specify language and mermaid diagrams use proper fencing.';
  } else if (contentType === 'pre-lecture') {
    typeContext = 'This is pre-read content for complete beginners. Preserve the 4-part structure (What You\'ll Learn → Detailed Explanation → What\'s Coming Next → Practice Exercises). Keep depth introductory (0→10 scale). Ensure mermaid diagrams use proper fencing and exercises have hints.';
  }

  return [
    {
      role: 'system',
      content: `You are an expert educational content refiner. Fix the reported issues — both content problems AND formatting issues. Output each changed section with its \`### Section Name\` header. Do NOT include unchanged sections — they will be preserved automatically.

${typeContext}

When fixing formatting issues:
- Ensure markdown headers use consistent levels
- Fix code block fencing (add language specifiers like \`\`\`python)
- Fix mermaid blocks to use \`\`\`mermaid fencing
- Ensure bold key terms on first occurrence, not overused
- Fix list formatting consistency
- Close any orphaned formatting characters

Keep your output focused and minimal — only the sections that changed.`,
    },
    { role: 'user', content: `Fix these issues in the content. Output only the sections that changed — nothing else:

ISSUES TO FIX:
${issues}

ORIGINAL CONTENT:
${originalContent}` },
  ];
}

