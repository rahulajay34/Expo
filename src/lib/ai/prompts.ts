import { GenerationInput, ContentLength } from '../types';
import { Message } from './client';
import { sanitizeShortInput, sanitizeTranscript } from '../utils';
import { getTemplateById } from '../prompt-templates';

const LENGTH_DIRECTIVES: Record<Exclude<ContentLength, 'normal'>, string> = {
  concise: 'CONTENT LENGTH DIRECTIVE: Be extremely concise. Cover only the essential points. Use bullet points over paragraphs. Eliminate all redundancy. Every sentence must earn its place. Strip away all filler and tangential content.',
  short: 'CONTENT LENGTH DIRECTIVE: Keep the content brief and focused. Prioritize clarity over completeness. Use concise explanations and skip extended examples. Get to the point quickly.',
  long: 'CONTENT LENGTH DIRECTIVE: Provide thorough, detailed coverage. Include extended explanations, multiple examples, and deeper context for each concept. Be comprehensive.',
  explanatory: 'CONTENT LENGTH DIRECTIVE: Be maximally thorough and explanatory. Leave no concept unexplained. Include extensive examples, analogies, step-by-step breakdowns, and detailed context for every point. Treat the reader as someone who needs everything spelled out.',
};

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

  // ta-guide and any other single-chunk type fall through to the default
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
    TOPIC: sanitizedTopic,
    TRANSCRIPT: sanitizedTranscript,
    // SOURCE_MATERIAL is the TA-guide prompt's alias for the concatenated source content
    SOURCE_MATERIAL: sanitizedTranscript,
    SUBTOPICS: sanitizedSubtopics.length > 0 ? sanitizedSubtopics.join('; ') : '',
    PREREQUISITES: sanitizedPrereqs.length > 0 ? sanitizedPrereqs.join('; ') : '',
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

  // Build system prompt with optional custom instructions and length directive
  const baseSystem = input.type === 'assignment'
    ? 'You are an expert educational content creator. Follow the instructions precisely and produce high-quality, well-structured content. Pay special attention to any CHUNK TASK instructions — they override the general prompt.'
    : 'You are an expert educational content creator. Follow the instructions precisely and produce high-quality, well-structured content that covers all required sections completely.';

  const systemParts: string[] = [baseSystem];

  // Inject length directive
  if (input.contentLength && input.contentLength !== 'normal') {
    systemParts.push(LENGTH_DIRECTIVES[input.contentLength]);
  }

  // Inject custom prompt (from template + one-time instructions)
  const customParts: string[] = [];
  if (input.promptTemplateId) {
    const tmpl = getTemplateById(input.promptTemplateId);
    if (tmpl) customParts.push(tmpl.content);
  }
  if (input.customPrompt?.trim()) {
    customParts.push(input.customPrompt.trim());
  }
  if (customParts.length > 0) {
    systemParts.push(`CUSTOM INSTRUCTIONS FROM USER (follow these carefully):\n${customParts.join('\n\n')}`);
  }

  return [
    { role: 'system', content: systemParts.join('\n\n') },
    { role: 'user', content },
  ];
}

export function buildReviewerMessages(
  originalContent: string,
  contentType?: string,
  expectedCounts?: { mcq: number; msq: number; subjective: number },
): Message[] {
  let typeContext = '';

  if (contentType === 'assignment') {
    const countsLine = expectedCounts
      ? `\n\nEXPECTED QUESTION COUNTS: exactly ${expectedCounts.mcq} MCQs, ${expectedCounts.msq} MSQs, ${expectedCounts.subjective} Subjective. Numbering must be sequential from Q1 to Q${expectedCounts.mcq + expectedCounts.msq + expectedCounts.subjective} with no gaps and no duplicates. Flag any mismatch as a STRUCTURAL issue.`
      : '';
    typeContext = `This is an assignment with MCQ, MSQ, and Subjective questions. Check:
- Correct question counts match headers (MCQs, MSQs, Subjective)
- All questions are scenario-based (not definitional like "What is X?")
- Answer keys are present with explanations for every question
- Options are balanced (correct answer isn't always longest/most detailed)
- Question numbering is sequential with no gaps
- Correct answer position distribution: each letter (A-D) appears at least once; no 3 consecutive same positions
- Difficulty values are valid (0, 0.5, or 1)
- At least 1 MCQ and 1 MSQ use negative/exception-based framing${countsLine}`;
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
  } else if (contentType === 'ta-guide') {
    typeContext = `This is a TA (Teaching Assistant) Session Guide for a 90-minute tutorial. It is a Curriculum Coordinator → TA handoff document. Check the following carefully:

STRUCTURE:
- Session Overview table at the top contains ONLY two rows: "Session Topic" and "Total Duration (90 Minutes)". No other fields (no session number, date, prerequisites, target audience, etc.). Flag any extra rows as a STRUCTURAL issue.
- Part 1 — Rapidfire Recap (0–15 Minutes) section is present with a goal statement and TA instructions block.
- Part 1 has EXACTLY 10 questions numbered Question 1 through Question 10. Not 9, not 11. Flag any mismatch as a STRUCTURAL issue.
- Every Part 1 question has a "TA Talking Points" block containing BOTH a "Why correct" bullet AND a "Why wrong options fail" bullet.
- Part 1 questions show a progressive difficulty ladder (Q1 easiest, Q10 hardest, smooth ramp). Flag clustering of difficulty as a CONTENT issue.
- Part 1 has MCQs as the majority of the 10 questions (mix is dynamic but MCQ-heavy).
- Part 2 — Subjective Question Discussion (15–45 Minutes) section is present with a goal statement and TA instructions.
- Part 2 TA instructions mention the "aim to cover all 3 live, but defer one to take-home if discussion is running long or students are overwhelmed" guidance.
- Part 2 has EXACTLY 3 Live In-Class Subjective Questions, each with: Topic, Question, Concepts Tested, Step-by-Step Approach, Common Mistakes, Expected Output Format.
- Part 2 has EXACTLY 2 Take-Home Subjective Questions, each with: Question name/text, Task List, Solving Direction (NOT the full solution), Expected Output Format.
- Part 3 — Concept Reinforcement (45–90 Minutes) section is present with a goal statement and TA instructions.
- Part 3 has at least ONE concept topic with all four sub-blocks: Key Points, Real-World Example, Common Confusion Areas, Visual Aid.
- Part 3 Visual Aids use embedded Mermaid diagrams (\`\`\`mermaid fencing) where visuals help, with ≤10 nodes per diagram.
- "Final 10 Minutes — Recap & Doubt Resolution" section has 4–6 crisp one-sentence recap bullets/numbers.
- "Session Compliance Checklist" section is present with checkboxes.
- "Post-Session Google Form" section is present with a placeholder link like \`[Insert Google Form link]\`.
- "TA-to-CC Communication" section is present.

CONTENT CLEANLINESS:
- No difficulty labels (e.g., "Easy", "Hard"), topic tags, source tags, or character counts printed anywhere in Part 1. These are backend-only.
- No "From: [source]" or source-attribution lines anywhere in Part 2.
- Mentimeter question text should be ≤100 characters and each option ≤60 characters (the numbers themselves must NOT be printed — just verify the text fits).

TONE — SUPPORTIVE-COLLEAGUE RULE (STRUCTURAL):
- The document MUST NOT contain any of these words or phrases anywhere (case-insensitive): "final", "finalized", "do not modify", "do not change", "non-negotiable", "mandatory", "cannot be altered", "exact wording", "no modifications". Flag EVERY occurrence as a STRUCTURAL issue and call it out explicitly so the refiner can rewrite the surrounding sentence in a supportive, collegial tone.
- Every instruction should read as helpful guidance, not a top-down directive. Reminders in the Compliance Checklist and 24-hour guideline in the TA-to-CC section should feel warm, not strict.`;
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
  if (contentType === 'assignment') {
    const systemContent = `You are an expert educational content refiner for assignments. Fix the reported issues — both content problems AND formatting issues. You will output PER-QUESTION patches using a strict marker-block format.

PATCH FORMAT (use this exactly — nothing else):

<<<PATCH Q{n}>>>
**Question {n} ({MCQ|MSQ|Subjective})**
[full replacement body for that question, including scenario, options, correct answer, difficulty, and explanation — everything that belongs under this question]
<<<END>>>

RULES:
- Output ONE marker block per question you are changing. Do NOT wrap the blocks in any outer section headers.
- Only output questions you are changing — all others are preserved automatically.
- The \`{n}\` must be the question number as it appears in the original content (e.g. Q3, Q7).
- The first line inside the block must be \`**Question {n} (MCQ)**\` / \`(MSQ)\` / \`(Subjective)\` — matching the original type for that number.
- Do NOT emit \`### \` section headers. Do NOT wrap patches in code fences. Do NOT add any preamble or closing commentary outside the marker blocks.
- Preserve exact question numbering and types. Do not renumber or retype questions.

When fixing formatting issues inside a question:
- Ensure code block fencing specifies language (e.g. \`\`\`python)
- Use \`\`\`mermaid fencing for mermaid diagrams
- Close any orphaned formatting characters
- Keep lists consistent`;

    return [
      { role: 'system', content: systemContent },
      {
        role: 'user',
        content: `Fix these issues in the assignment. Output only per-question patch blocks as specified — nothing else:

ISSUES TO FIX:
${issues}

ORIGINAL CONTENT:
${originalContent}`,
      },
    ];
  }

  let typeContext = '';
  if (contentType === 'lecture') {
    typeContext = 'This is lecture content. Preserve the 4-part structure (What You\'ll Learn → Detailed Explanation → Try It Yourself → Key Takeaways). Keep the tone conversational and beginner-friendly. Ensure code blocks specify language and mermaid diagrams use proper fencing.';
  } else if (contentType === 'pre-lecture') {
    typeContext = 'This is pre-read content for complete beginners. Preserve the 4-part structure (What You\'ll Learn → Detailed Explanation → What\'s Coming Next → Practice Exercises). Keep depth introductory (0→10 scale). Ensure mermaid diagrams use proper fencing and exercises have hints.';
  } else if (contentType === 'ta-guide') {
    typeContext = `This is a TA Session Guide for a 90-minute tutorial. Preserve the top-level structure (## Session Overview → ## Part 1 → ## Part 2 → ## Part 3 → ## Final 10 Minutes → ## Session Compliance Checklist → ## Post-Session Google Form → ## TA-to-CC Communication). Keep the tone supportive and collegial throughout — when rewriting any section flagged for directive language, replace it with warm, peer-to-peer phrasing. The forbidden words (case-insensitive) are: "final", "finalized", "do not modify", "do not change", "non-negotiable", "mandatory", "cannot be altered", "exact wording", "no modifications" — none of these may appear in your patched sections. Ensure Mermaid diagrams use \`\`\`mermaid fencing. Keep Part 1 as exactly 10 numbered questions and each Question block with its TA Talking Points (Why correct + Why wrong options fail). Keep Part 2 as exactly 3 live + 2 take-home questions.`;
  }

  return [
    {
      role: 'system',
      content: `You are an expert educational content refiner. Fix the reported issues — both content problems AND formatting issues. Output each changed section with its \`### Section Name\` header. Do NOT include unchanged sections — they will be preserved automatically.

${typeContext}

CRITICAL: When you output a changed section, echo the section header VERBATIM from the original document — exact same text, exact same numbering/prefix/punctuation. Do not rename, renumber, or rephrase headers. If the original says \`### 3. Detailed Walkthrough\`, you must output \`### 3. Detailed Walkthrough\` — not \`### Detailed Walkthrough\` or \`### Step 3: Detailed Walkthrough\`.

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

export function buildSectionRegenMessages(
  fullMarkdown: string,
  sectionHeading: string,
  sectionContent: string,
  contentType: string,
  userInstruction?: string,
): Message[] {
  return [
    {
      role: 'system',
      content: `You are regenerating a single section of an educational document (${contentType}).

CRITICAL RULES:
- Output ONLY the replacement body content for the specified section.
- Do NOT include the section heading itself — it will be preserved automatically.
- Maintain the same markdown formatting style, tone, and depth as the rest of the document.
- If the user provided specific instructions, follow them precisely.
- If no specific instructions, improve the section: make it clearer, more engaging, and better structured.`,
    },
    {
      role: 'user',
      content: `Full document for context:\n${fullMarkdown}\n\n---\n\nSection to regenerate: "${sectionHeading}"\n\nCurrent section content:\n${sectionContent}\n\nUser instructions: ${userInstruction?.trim() || 'Improve this section — make it clearer, more engaging, and better structured.'}`,
    },
  ];
}

