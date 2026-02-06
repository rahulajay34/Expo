import { ContentMode, GapAnalysisResult, CourseContext } from "@/types/content";
import { normalizeSubtopics, formatSubtopicsForPrompt } from "@/lib/utils/subtopic-normalizer";

export interface CreatorPromptOptions {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  gapAnalysis?: GapAnalysisResult;
  courseContext?: CourseContext; // Injected by CourseDetector
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}

export const CREATOR_SYSTEM_PROMPTS = {
  lecture: `You are a world-class educator creating comprehensive lecture notes. Your explanations are known for making complex topics click—like a brilliant friend explaining at a whiteboard.

## Teaching Approach
- Build deep understanding through thorough explanations, concrete examples, and real-world connections
- Assume intelligence, not prior knowledge—explain the "why" behind the "what"
- Prioritize mastery over brevity: 4-8 paragraphs per concept, 2-3 examples each
- Write conversationally using "you" language and active voice

## Quality Standards
- Every abstract concept gets a concrete example within 2 sentences
- Cover mechanisms, edge cases, and common mistakes—go deep
- Each paragraph: 3-5 substantive sentences (no filler)
- Bold **key terms** on first use only

## Decision Framework (When Multiple Approaches Are Valid)
Use this priority order when uncertain:
1. **Clarity over comprehensiveness**: If explaining thoroughly makes it confusing, simplify
2. **Concrete over abstract**: When in doubt, add an example rather than more explanation
3. **Active over passive**: "You will learn..." not "It will be learned..."
4. **Domain-specific over generic**: Use domain vocabulary even if it requires more context
5. **Student perspective over instructor perspective**: What would help THEM, not what impresses YOU

When two principles conflict, the one listed earlier wins.

## Pedagogical Primitives (Required in Every Lecture)
Your lecture MUST include these elements:
- **Learning Objectives** (3-4): Action verbs only (explain, implement, compare, debug)
- **Synthesis Points**: After each major section, distill to ONE key takeaway (not a summary—a takeaway)
- **Actionable Bridges**: Before each new concept, link theory→practice: "You'll use this when..."
- **Key Takeaways** (6-10): Each 2-3 sentences, actionable, not just restating content

## Structure
Use clean Markdown with:
- \`## Headers\` for sections, \`### Subheaders\` for concepts
- \`> 💡 **Pro Tip**:\` blockquotes for callouts
- Fenced code blocks with language identifiers
- Tables for comparisons
- \`<details>\` for optional deep-dives

## Content Depth Checklist
For each concept, cover: what it is → why it exists → how it works → 2-3 usage examples → common pitfalls → when to use/avoid → connections to other concepts

Never write: "It's important to note...", "Let's dive in...", "In this section...", or any meta-commentary about the content itself.

**FORBIDDEN**: "Visual:" section headers or image placeholders. Do NOT suggest images or diagrams—just write the content.`,

  "pre-read": `You are creating gateway content that sparks curiosity and prepares students for an upcoming lecture. Your pre-reads make students genuinely excited to learn more.

## Mission
- Spark curiosity with compelling questions and scenarios
- Build foundational understanding (2-3 paragraphs per concept with examples)
- Connect abstract concepts to problems students care about
- Create mental "hooks" for the main lecture

## Pedagogical Primitives (Required in Every Pre-read)
Your pre-read MUST include these sections:

### 🎯 Essential Question
One question that students should be able to answer after the lecture. This primes their thinking and creates anticipation. Not "what will we learn" but "what problem will we solve."

### 📖 Vocabulary to Notice  
3-5 key terms with brief context (NOT definitions—those come in lecture).
Format: **Term**: Brief context of why it matters

### 🔗 Bridge from Familiar
Connect to something students already know. Start with a relatable scenario, then bridge to the new concept. This is NOT optional—it's how learning works.

### 💭 Questions to Ponder
2-3 thought-provoking questions that have no easy answers. These create "productive confusion" that the lecture will resolve. NOT comprehension questions—thinking questions.

## Approach
1. **CURIOSITY FIRST**: Lead with a surprising fact, question, or relatable scenario
2. **VOCABULARY SEEDING**: Introduce key terms naturally in context
3. **SCAFFOLDING**: Build from familiar → unfamiliar with clear explanations
4. **ANTICIPATION**: End with thought-provoking questions for the lecture

## Style
- Conversational and inviting—like a friendly introduction
- Use "you" language throughout
- 2-4 paragraphs per concept (not just bullet points)
- Relatable analogies from everyday life

## Format (Markdown Only)
Use clean Markdown:
- \`## 🎯 Headers\` with emojis for visual anchors
- \`> blockquotes\` for questions to ponder and callouts
- Tables for before/after comparisons
- \`<details>\` for reflection prompts only

No HTML styling, no \`<div>\` tags, no CSS. Keep it simple and scannable with short paragraphs (2-3 sentences).

Never write: "In this pre-read...", "As we'll discuss...", or any meta-commentary.

**FORBIDDEN**: "Visual:" section headers or image placeholders (e.g., "### Visual: [topic]"). Do NOT suggest images or diagrams.`,

  assignment: `You are a senior assessment designer creating questions that test practical understanding, not memorization.

## Question Requirements
- **EVERY question MUST be scenario-based**: "A developer is building...", "Given a scenario where...", "You are debugging..."
- Test applied thinking, not definitions or recall
- Include plausible distractors based on real misconceptions
- Explanations must teach (3-5 sentences): why correct answer works, why each wrong option fails

## Pedagogical Primitives (Required in Every Question)

### Constraint Engineering
Every question MUST include at least one real-world constraint:
- Time pressure: "Given only 15 minutes before deployment..."
- Resource limits: "On a system with limited memory..."
- Legacy constraints: "Working with an existing codebase that..."
- Trade-offs: "Optimizing for performance while maintaining..."

### Ambiguity Handling
Include at least one intentional gap that requires reasonable assumptions. Students should recognize what information is missing and make defensible choices. This tests real-world problem-solving.

### Artifact Generation Focus
Questions should lead to producing something tangible when possible:
- "Write the exact SQL query that..."
- "Produce the configuration that..."
- "Draft the error message that..."
NOT just: "Which option is correct?"

## Forbidden Patterns
- "What is the definition of..." / "Which describes..." / "True or False"
- Pure recall without context
- "All of the above" / "None of the above"

## JSON Output (CRITICAL)
Return valid JSON array. Rules:
- Use \`\\n\` for newlines (NOT raw line breaks)
- \`contentBody\` is always a STRING, never an object
- \`mcscAnswer\`: number (1-4)
- \`mcmcAnswer\`: string ("1, 3")
- \`difficultyLevel\`: 0, 0.5, or 1 (numeric)

**Structure per question type:**

\`\`\`json
// mcsc
{"questionType": "mcsc", "contentBody": "Scenario...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "mcscAnswer": 2, "difficultyLevel": 0.5, "answerExplanation": "..."}

// mcmc  
{"questionType": "mcmc", "contentBody": "Scenario... (Select ALL)", "options": {...}, "mcmcAnswer": "1, 3", "difficultyLevel": 0.5, "answerExplanation": "..."}

// subjective
{"questionType": "subjective", "contentBody": "Scenario...", "options": {"1": "", "2": "", "3": "", "4": ""}, "subjectiveAnswer": "Model answer...", "difficultyLevel": 0.5, "answerExplanation": "Rubric..."}
\`\`\`

Questions must be standalone and student-facing. Never reference transcripts or source material.`,
};

/**
 * Format course context section for injection into prompts (runtime injection)
 * This section tailors content to the detected domain with:
 * 1. Domain guidelines (vocabulary, examples, style)
 * 2. Voice model (prevents AI-sounding phrases at source)
 * 3. Structural templates (domain-specific content organization)
 */
const formatCourseContextSection = (context?: CourseContext, mode?: ContentMode): string => {
  if (!context || context.domain === 'general') return '';

  // Check if this is a math-heavy domain
  const hasMathContent = context.characteristics.formats.some(f =>
    f.toLowerCase().includes('latex') ||
    f.toLowerCase().includes('equation') ||
    f.toLowerCase().includes('formula')
  );

  const mathGuidelines = hasMathContent ? `
═══════════════════════════════════════════════════════════════
📐 MATHEMATICAL CONTENT FORMATTING (REQUIRED FOR THIS DOMAIN)
═══════════════════════════════════════════════════════════════

This topic involves mathematical equations. You MUST follow these rules:

**LaTeX Rendering Rules:**
• LaTeX $...$ and $$...$$ ONLY renders in MARKDOWN sections
• LaTeX does NOT render inside HTML tags (<div>, <p>, <span>, etc.)

**Correct Pattern:**
1. Use blockquotes for conceptual explanations (without equations)
2. Place actual equations in pure markdown
3. Use standard markdown for structural highlighting

**Example of CORRECT formatting:**
\`\`\`markdown
> **📐 Worked Example**
>
> Solve the differential equation:

$$y'' - 4y' + 4y = 0$$

**Step 1:** Form the characteristic equation:

$$r^2 - 4r + 4 = 0$$
\`\`\`

**NEVER do this (LaTeX won't render inside HTML):**
\`\`\`html
<p style="...">The solution is $y = e^{rx}$ where $r = 2$.</p>
\`\`\`

**For inline math in explanations:**
• Place inline math like $x = 2$ directly in the sentence
• Do NOT wrap in HTML tags

` : '';

  // Voice model section - prevents AI-sounding phrases at generation time
  const voiceModelSection = context.voiceModel ? `
═══════════════════════════════════════════════════════════════
🎤 VOICE MODEL: ${context.voiceModel.tone.toUpperCase().replace(/_/g, ' ')}
═══════════════════════════════════════════════════════════════

Write like an experienced professional explaining to a capable colleague new to this topic.

**Voice Characteristics:**
- **Direct**: Start sentences with the point. No wind-ups like "It's important to note..."
- **Grounded**: Every claim is immediately illustrated or contextualized
- **Conversational authority**: Confident but not arrogant
- **Second person**: "You" is your default subject

**Sentence Starters to Use:**
${context.voiceModel.exemplarPhrases.map(p => `• ${p}`).join('\n')}

**Automatic Rewrites (Apply During Generation):**
| Instead of | Write |
|------------|-------|
| "It's important to note that X" | "X" (just state it) |
| "Let's dive into" | Start directly with content |
| "In this section, we will" | Just teach the content |
| "As mentioned earlier" | Reference the concept directly |
| "crucial/essential/fundamental" | Use sparingly (max 1 per document) |

` : '';

  // Structural template section - domain-specific content organization
  let structuralTemplateSection = '';
  if (context.structuralTemplate && mode) {
    const modeKey = mode === 'pre-read' ? 'preRead' : mode;
    const template = context.structuralTemplate[modeKey as keyof typeof context.structuralTemplate];

    if (template && 'requiredSections' in template) {
      structuralTemplateSection = `
═══════════════════════════════════════════════════════════════
📋 REQUIRED STRUCTURAL ELEMENTS (Non-Negotiable for ${context.domain})
═══════════════════════════════════════════════════════════════

**Structural Pattern**: ${template.structuralPattern}
**Required Sections**: ${template.requiredSections.join(' → ')}

This structure is pedagogically significant for this domain—not optional formatting.

`;
    } else if (template && 'scenarioPatterns' in template) {
      // Assignment mode
      const assignmentTemplate = template as { scenarioPatterns: string[]; constraintTypes: string[] };
      structuralTemplateSection = `
═══════════════════════════════════════════════════════════════
📋 ASSIGNMENT STRUCTURE (Domain-Specific for ${context.domain})
═══════════════════════════════════════════════════════════════

**Scenario Starters to Use**: ${assignmentTemplate.scenarioPatterns.join(', ')}
**Required Constraints**: Each question must include at least one: ${assignmentTemplate.constraintTypes.join(', ')}

Questions without real-world constraints feel artificial and test memory, not understanding.

`;
    }
  }

  return `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN-TAILORED CONTENT GUIDELINES
═══════════════════════════════════════════════════════════════

${context.contentGuidelines}

**Example Types to Use**: ${context.characteristics.exampleTypes.join(', ')}
(Create your own examples inspired by these patterns—don't use generic ones)

**Content Formats That Work Well**: ${context.characteristics.formats.join(', ')}

**Domain Vocabulary** (use naturally, don't force): ${context.characteristics.vocabulary.slice(0, 7).join(', ')}

**Style Adjustments**: ${context.characteristics.styleHints.join('; ')}

**Relatable Scenarios for Students**:
${context.characteristics.relatableExamples.map(ex => `• ${ex}`).join('\n')}

⚠️ CRITICAL: Do NOT explicitly mention the domain, course name, or program. Just naturally incorporate domain-appropriate examples and style. The content should feel tailored without announcing it.
${voiceModelSection}${structuralTemplateSection}${mathGuidelines}═══════════════════════════════════════════════════════════════

`;
};

// Helper to format transcript section for prompts
const formatTranscriptSection = (transcript: string, gapAnalysis?: GapAnalysisResult): string => {
  let section = `
═══════════════════════════════════════════════════════════════
📝 SOURCE MATERIAL: INSTRUCTOR TRANSCRIPT
═══════════════════════════════════════════════════════════════

You have a transcript from an actual teaching session. This is your PRIMARY and ONLY source of truth.

**Your Task**:
1. Extract the instructor's key explanations, examples, and insights
2. Preserve their specific analogies and demonstrations
3. Reorganize and enhance for written format (spoken → polished written)

**CRITICAL STRICTNESS RULE**:
• You are RESTRICTED to the topics covered in the provided transcript.
• If a subtopic is requested but NOT found in the transcript, you MUST OMIT IT.
• DO NOT add "foundational knowledge" or "external facts" to fill gaps.
• DO NOT create a "Further Exploration" section for missing topics.
• If the transcript only covers 2 of 5 subtopics, generate content ONLY for those 2.
• If the transcript explains something → use that explanation (enhanced for clarity)
• Never attribute specific claims to "the instructor" unless they're in the transcript
• Never invent examples, facts, or explanations not present in the transcript

`;

  if (gapAnalysis) {
    if (gapAnalysis.covered.length > 0) {
      section += `**✅ FULLY COVERED in Transcript** (use transcript content as foundation):
${gapAnalysis.covered.map(s => `   • ${s}`).join('\n')}

`;
    }
    if (gapAnalysis.partiallyCovered.length > 0) {
      section += `**⚠️ PARTIALLY COVERED** (use only what the transcript provides, do not supplement):
${gapAnalysis.partiallyCovered.map(s => `   • ${s}`).join('\n')}

`;
    }
    if (gapAnalysis.notCovered.length > 0) {
      section += `**❌ NOT COVERED in Transcript** (OMIT THESE - do not generate content for them):
${gapAnalysis.notCovered.map(s => `   • ${s}`).join('\n')}

⚠️ STRICT RULE: Do NOT generate any content for topics marked as NOT COVERED. Simply skip them entirely.

`;
    }
  }

  section += `═══════════════════════════════════════════════════════════════
TRANSCRIPT CONTENT:
═══════════════════════════════════════════════════════════════

${transcript.slice(0, 80000)}
${transcript.length > 80000 ? '\n... [transcript truncated for length]' : ''}

═══════════════════════════════════════════════════════════════

`;
  return section;
};

export const getCreatorUserPrompt = (
  options: CreatorPromptOptions
) => {
  const { topic, subtopics, mode, transcript, gapAnalysis, courseContext, assignmentCounts = { mcsc: 4, mcmc: 4, subjective: 1 } } = options;

  // Normalize subtopics to handle multiline and comma-separated input
  const normalizedSubtopics = normalizeSubtopics(subtopics);
  const subtopicsDisplay = normalizedSubtopics.commaSeparated;
  const subtopicsFormatted = formatSubtopicsForPrompt(subtopics);

  // Runtime course context injection (from CourseDetector)
  const courseSection = formatCourseContextSection(courseContext, mode);

  if (mode === "lecture") {
    const transcriptSection = transcript ? formatTranscriptSection(transcript, gapAnalysis) : '';

    return `${courseSection}${transcriptSection}
## Content Request

**Topic**: ${topic}
**Subtopics** (${normalizedSubtopics.count}):
${subtopicsFormatted}

**Context**: Students have completed pre-reading.
${transcript ? '**Source Priority**: Use the transcript as your primary source. Extract, enhance, and reorganize.' : ''}

## Output Structure

# Lecture Notes: ${topic}

### Learning Objectives
3-4 specific, action-oriented objectives (explain, implement, compare, debug).

### [Section per Major Concept]
For each subtopic:
1. **Hook**: Why should students care? What problem does this solve?
2. **Core Explanation**: Thorough coverage with mechanisms, nuances, examples
3. **Examples**: 2-3 concrete examples with detailed walkthroughs
4. **Practical Application**: Real-world usage, best practices, when to use/avoid
5. **Common Pitfalls** (where relevant): Mistakes, how to fix, why they happen

### Key Takeaways
6-10 actionable points, each 2-3 sentences.

${transcript ? '**SCOPE**: Only cover topics from the transcript. Omit any subtopics not discussed.' : ''}

Write as a confident expert teaching directly to a capable student.`;
  }

  if (mode === "pre-read") {
    const transcriptSection = transcript ? formatTranscriptSection(transcript, gapAnalysis) : '';

    return `${courseSection}${transcriptSection}
## Content Request

**Topic**: ${topic}
**Subtopics** (${normalizedSubtopics.count}):
${subtopicsFormatted}

**Purpose**: Prepare students for the upcoming lecture—spark curiosity, not mastery.
${transcript ? '**Source**: Transcript provides context for depth calibration.' : ''}

## Output Structure

# Pre-Read: ${topic}

### What You'll Discover
3-4 intriguing promises about what students will learn.

### [Opening Hook]
Open with a surprising fact, relatable problem, or "what if" scenario.

### Understanding [Core Concepts]
For each key concept:
- **What it is**: Everyday comparison → precise definition
- **Why it matters**: Concrete benefits

### From Familiar to New
Show old way vs new way (use tables for comparisons).

### Thinking Ahead
2-3 thought-provoking questions to prime lecture thinking.

Make students genuinely curious about the upcoming lecture.`;
  }

  if (mode === "assignment") {
    const { mcsc, mcmc, subjective } = assignmentCounts;
    const total = mcsc + mcmc + subjective;
    const transcriptSection = transcript ? formatTranscriptSection(transcript, gapAnalysis) : '';

    return `${courseSection}${transcriptSection}
## Assessment Request

**Topic**: ${topic}
**Subtopics** (${normalizedSubtopics.count}):
${subtopicsFormatted}

${transcript && gapAnalysis ? '**SCOPE**: Only create questions for topics marked as COVERED. Omit NOT COVERED topics.' : ''}

## Question Counts (Exact)
- **mcsc** (Single Correct): ${mcsc}
- **mcmc** (Multiple Correct): ${mcmc}
- **subjective** (Open-ended): ${subjective}
**TOTAL**: ${total} questions

## JSON Format (Critical for Parsing)
- Use \\\\n for newlines (NOT raw breaks)
- contentBody is ALWAYS a string
- mcscAnswer: number (1-4)
- mcmcAnswer: string ("1, 3")
- difficultyLevel: 0, 0.5, or 1 (numeric)

**Templates:**
\`\`\`json
{"questionType": "mcsc", "contentBody": "Scenario...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "mcscAnswer": 2, "difficultyLevel": 0.5, "answerExplanation": "..."}

{"questionType": "mcmc", "contentBody": "Scenario... (Select ALL)", "options": {...}, "mcmcAnswer": "1, 3", "difficultyLevel": 0.5, "answerExplanation": "..."}

{"questionType": "subjective", "contentBody": "Scenario...", "options": {"1": "", "2": "", "3": "", "4": ""}, "subjectiveAnswer": "...", "difficultyLevel": 0.5, "answerExplanation": "Rubric..."}
\`\`\`

## Quality
- Explanations: 3-5 sentences, teach why correct/wrong
- Options: Based on real misconceptions
- Plain text only (no diagrams)

**OUTPUT**: Return ONLY a valid JSON array wrapped in \\\`\\\`\\\`json ... \\\`\\\`\\\``;
  }
  return `Create content for ${topic} covering ${subtopics}.`;
};
