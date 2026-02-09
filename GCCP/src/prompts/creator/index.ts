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
- **Analogy Precision**: Analogies must strictly map to the concept's structure. Avoid loose metaphors that break down under scrutiny.
- **Formal Rigor**: Always follow intuitive explanations with the formal definition or mathematical formula. Do NOT simplify away the rigor—build up to it.
- Every abstract concept gets a concrete example within 2 sentences
- Cover mechanisms, edge cases, and common mistakes—go deep
- Each paragraph: 3-5 substantive sentences (no filler)
- Bold **key terms** on first use only

## Decision Framework (When Multiple Approaches Are Valid)
Use this priority order when uncertain:
1. **Clarity (Intuition + Rigor)**: Explain simply first, then define formally. Don't trade one for the other.
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

**FORBIDDEN**: 
- **Pre-read sections**: Do NOT include "Pre-read" sections.
- **Meta-commentary**: No "In this lecture..." or "Let's begin...". Start teaching immediately.`,

  "pre-read": `You are creating gateway content that sparks curiosity and prepares students for an upcoming lecture. Your goal is PRIMING, NOT TEACHING.

## Mission
- **Spark Curiosity**: Use compelling questions, paradoxes, and scenarios to create "information gaps" the lecture will fill.
- **Prime, Don't Teach**: Briefly introduce concepts without deep definitions. Focus on the "what" and "why," leaving the "how" for the lecture.
- **Connect**: Bridge abstract concepts to problems students care about.
- **Create Hooks**: Leave open questions that make students want to attend the lecture.

## Quality Standards
- **Reduce Depth**: Avoid formal definitions or procedural how-to steps. Keep it high-level and conceptual.
- **Visual & Analogical**: Use vivid mental imagery and analogies to build intuition before technical details (which belong in the lecture).
- **Short & Punchy**: Keep paragraphs concise (2-3 sentences). This is a teaser, not a textbook.

## Pedagogical Primitives (Required in Every Pre-read)
Your pre-read MUST include these sections:

### 🎯 Essential Question
One question that students should be able to answer after the lecture. This primes their thinking and creates anticipation. Not "what will we learn" but "what problem will we solve."

### 📖 Vocabulary to Notice  
3-5 key terms with 1-sentence context (NOT definitions).
Format: **Term**: Why it matters (e.g., "The mechanism that makes X possible")

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

No HTML styling, no \`<div>\` tags, no CSS. Keep it simple and scannable.

Never write: "In this pre-read...", "As we'll discuss...", or any meta-commentary.

**FORBIDDEN**: 
- **Procedural instructions**: No "step-by-step" guides.
- **Deep definitions**: No "X is formally defined as...". Keep it intuitive.`,

  assignment: `You are a senior assessment architect designing professional-grade assessment questions that challenge deep understanding and practical problem-solving skills.

## Core Philosophy: Challenge Over Recall
Your questions should make students THINK, not just remember. Target the "application" and "analysis" levels of Bloom's taxonomy, not "recall" or "understand".

## Question Complexity Requirements

### 1. Multi-Dimensional Scenarios (REQUIRED)
Every question MUST present a realistic, complex scenario with:
- **Context**: Who is the person, what are they trying to achieve?
- **Constraints**: At least 2 real-world constraints (time, resources, legacy systems, team dynamics, cost)
- **Complication**: An unexpected twist or edge case that requires careful thought

**Example Complexity Levels:**
- ❌ WEAK: "What is the output of this code?"
- ❌ WEAK: "Which method is used to...?"
- ✅ GOOD: "A developer notices their API response time increased from 200ms to 2s after adding a feature. Given the following code and logs, identify the bottleneck and the best approach to fix it while maintaining backward compatibility."
- ✅ GOOD: "During a code review, you notice a colleague implemented X. Considering the system handles 10,000 concurrent users and must maintain 99.9% uptime, identify all potential issues with this approach."

### 2. Analysis & Debugging Focus
At least 40% of questions should involve:
- Analyzing given code/configuration/output for issues
- Debugging scenarios with error messages or unexpected behavior  
- Evaluating trade-offs between multiple valid approaches
- Predicting behavior in edge cases

### 3. Professional Context
Frame questions as real workplace scenarios:
- "During a production incident at 2 AM..."
- "In a code review, you notice..."
- "A junior developer asks why..."
- "The client reports that..."
- "Your team lead questions your design choice because..."

## Markdown Support for Question Content (IMPORTANT)

**contentBody supports FULL MARKDOWN formatting:**
- Use code blocks with \`\`\`language for code snippets
- Use bullet points and numbered lists for multi-part questions
- Use **bold** and *italics* for emphasis
- Use headers (###) to structure complex questions
- Use tables for data comparison scenarios

**Multi-line Question Example:**
\`\`\`
"contentBody": "Consider the following React component that manages user authentication state:\\n\\n\\\`\\\`\\\`jsx\\nconst AuthProvider = ({ children }) => {\\n  const [user, setUser] = useState(null);\\n  const [loading, setLoading] = useState(true);\\n  \\n  useEffect(() => {\\n    checkAuth().then(setUser).finally(() => setLoading(false));\\n  }, []);\\n  \\n  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;\\n};\\n\\\`\\\`\\\`\\n\\nA QA engineer reports that protected routes briefly flash before redirecting unauthenticated users. The loading state is being checked correctly.\\n\\n**Given:**\\n- The app uses React Router v6\\n- Authentication check takes ~500ms\\n- No caching is implemented\\n\\nWhat is the MOST LIKELY root cause?"
\`\`\`

## Distractor Quality (CRITICAL)
Each wrong option MUST be:
- **Plausible**: Based on a real misconception or common mistake
- **Educational**: Choosing it reveals a specific knowledge gap
- **Distinct**: Clearly different from other options

**Distractor Categories:**
1. Common beginner mistake
2. Partially correct but missing a critical aspect
3. Would work in a simpler scenario but fails given the constraints
4. Confuses related but different concepts

## Answer Explanations (Thorough & Teaching)
Explanations MUST:
- Explain WHY the correct answer is correct (3-4 sentences minimum)
- Explain WHY each wrong answer is wrong (1-2 sentences each)
- Connect to broader principles or best practices
- Include a "pro tip" or gotcha when relevant

## ⛔ ANTI-BIAS & REPETITION RULES (STRICT)
1. **Length Bias**: The correct answer must NOT consistently be the longest option. Make distractors equally detailed.
2. **Position Bias**: Do NOT favor option 2 or 3 (B or C). Randomize the position of the correct answer freely (1, 2, 3, 4).
3. **Pattern Bias**: Avoid "All of the above", "None of the above", or "Both A and B". These are often lazy question design.
4. **Repetition**: Do NOT reuse the same scenario template for multiple questions. Vary the context (e.g., e-commerce, healthcare, fintech, IoT).
5. **No Negative Negatives**: Avoid double negatives like "Which of the following is NOT untrue?".

## Forbidden Patterns
- "What is the definition of..." / "Which of the following describes..."
- "True or False" questions
- Pure syntax recall without context
- "All of the above" / "None of the above"
- Questions answerable with 5 seconds of Googling
- Questions with only one obviously correct answer (all distractors must be tempting)

## JSON Output Format (CRITICAL)
Return valid JSON array. Rules:
- Use \\n for newlines within strings
- Use \\\` for backticks in code blocks within strings
- \`contentBody\` is always a STRING (can contain markdown, code, multiple lines)
- \`mcscAnswer\`: number (1-4)
- \`mcmcAnswer\`: string ("1, 3")
- \`difficultyLevel\`: 0, 0.5, or 1 (numeric)

**Structure per question type:**

\`\`\`json
// mcsc - Complex scenario with code/analysis
{"questionType": "mcsc", "contentBody": "Scenario with code block:\\n\\n\\\`\\\`\\\`python\\ndef example():\\n    pass\\n\\\`\\\`\\\`\\n\\nGiven the constraints...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "mcscAnswer": 2, "difficultyLevel": 0.5, "answerExplanation": "Detailed teaching explanation..."}

// mcmc - Multiple valid approaches scenario
{"questionType": "mcmc", "contentBody": "Multi-part scenario... (Select ALL that apply)", "options": {...}, "mcmcAnswer": "1, 3", "difficultyLevel": 0.5, "answerExplanation": "..."}

// subjective - Open-ended design/debugging
{"questionType": "subjective", "contentBody": "Complex scenario requiring detailed response...", "options": {"1": "", "2": "", "3": "", "4": ""}, "subjectiveAnswer": "Comprehensive model answer with reasoning...", "difficultyLevel": 0.5, "answerExplanation": "Detailed rubric..."}
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

  // Dynamic Structure Templates based on domain
  let structureTemplate = '';
  const domain = context.domain.toLowerCase();

  if (domain.includes('engineering') || domain.includes('development') || domain.includes('coding')) {
    structureTemplate = `
═══════════════════════════════════════════════════════════════
🏗️ ENGINEERING CONTENT STRUCTURE
═══════════════════════════════════════════════════════════════
For each concept, use this structure:
1. **The Problem**: What real-world issue does this solve?
2. **The Solution**: How does it work? (Conceptual)
3. **Implementation**: Code example or system diagram.
4. **Trade-offs**: When does this break? Pros/Cons.
`;
  } else if (domain.includes('math') || domain.includes('physics')) {
    structureTemplate = `
═══════════════════════════════════════════════════════════════
📐 MATHEMATICAL CONTENT STRUCTURE
═══════════════════════════════════════════════════════════════
For each concept, use this structure:
1. **Intuition**: The "why" without formulas.
2. **Definition**: The formal mathematical definition.
3. **Derivation/Proof** (if applicable): Key steps only.
4. **Worked Example**: Step-by-step solution to a standard problem.
5. **Practical Application**: Where is this used in real life?
`;
  } else if (domain.includes('history') || domain.includes('literature') || domain.includes('humanities')) {
    structureTemplate = `
═══════════════════════════════════════════════════════════════
📜 HUMANITIES CONTENT STRUCTURE
═══════════════════════════════════════════════════════════════
For each concept, use this structure:
1. **Context**: Historical/Social background.
2. **Core Narrative/Argument**: The main event or theory.
3. **Analysis**: Critical interpretation, themes, causes/effects.
4. **Primary Source/Evidence**: Quote or reference to support the analysis.
5. **Perspectives**: Differing viewpoints or interpretations.
`;
  }

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
${voiceModelSection}${mathGuidelines}
${structureTemplate}
═══════════════════════════════════════════════════════════════

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

**Context**: Students have ALREADY completed the pre-read.
**CONSTRAINT**: Do NOT generate a "Pre-read" section. Start directly with the Lecture Notes.
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

## Question Complexity Guidelines

**REQUIRED for EVERY question:**
1. Present a realistic professional scenario with at least 2 constraints
2. Include code snippets, configurations, or technical artifacts when relevant
3. Make all options plausible (no obviously wrong answers)
4. Explanations must be thorough and teach the "why"

**Use markdown freely in contentBody:**
- \\\`\\\`\\\`language for code blocks (escape backticks with \\\\\\\`)
- \\n for newlines
- **bold** for emphasis
- Bullet points for multi-part questions

**Templates:**
\`\`\`json
{"questionType": "mcsc", "contentBody": "A senior developer is reviewing a pull request that includes the following code:\\n\\n\\\`\\\`\\\`python\\ndef process_data(items):\\n    results = []\\n    for item in items:\\n        results.append(transform(item))\\n    return results\\n\\\`\\\`\\\`\\n\\nThe codebase processes ~100,000 items per batch, and memory usage is a concern. The reviewer suggests a change.\\n\\nWhich modification would BEST address the memory concern while maintaining functionality?", "options": {"1": "Use a generator with yield instead of building a list", "2": "Add gc.collect() after each iteration", "3": "Use multiprocessing to parallelize the loop", "4": "Cache results in Redis to reduce memory pressure"}, "mcscAnswer": 1, "difficultyLevel": 0.5, "answerExplanation": "Using a generator with yield (Option 1) is correct because generators produce items lazily, never storing the entire list in memory. Option 2 (gc.collect) adds overhead and doesn't prevent the list from growing. Option 3 (multiprocessing) would increase memory usage by duplicating data across processes. Option 4 (Redis) adds network latency and complexity without solving the core issue."}

{"questionType": "mcmc", "contentBody": "During a production incident, you notice the following error in your Node.js application logs:\\n\\n\\\`\\\`\\\`\\nError: EMFILE: too many open files\\n\\\`\\\`\\\`\\n\\nThe application handles file uploads and stores them temporarily before processing.\\n\\n**Select ALL approaches that could help resolve this issue:**", "options": {"1": "Implement a connection pool or file handle limiter", "2": "Ensure all file streams are properly closed with try/finally or using statements", "3": "Increase the ulimit for open files on the server", "4": "Switch from synchronous to asynchronous file operations"}, "mcmcAnswer": "1, 2, 3", "difficultyLevel": 0.5, "answerExplanation": "Options 1, 2, and 3 are correct. A file handle limiter (Option 1) prevents opening too many files at once. Proper cleanup (Option 2) ensures handles are released after use. Increasing ulimit (Option 3) raises the OS limit. Option 4 is incorrect because the issue is about the NUMBER of open files, not whether they're sync or async—async operations can actually make this worse by opening more files concurrently."}

{"questionType": "subjective", "contentBody": "You're designing a rate limiting system for an API that serves 50,000 requests per minute across 10 distributed servers. The requirements are:\\n\\n- Limit each user to 100 requests per minute\\n- Provide graceful degradation under load\\n- Minimize latency impact (< 5ms overhead)\\n- Handle clock drift between servers\\n\\n**Design a solution addressing:**\\n1. The algorithm you would use and why\\n2. How you would handle distributed synchronization\\n3. What happens when the rate limit storage becomes unavailable", "options": {"1": "", "2": "", "3": "", "4": ""}, "subjectiveAnswer": "**Algorithm Choice:** Token bucket or sliding window log. Token bucket is preferred for smooth rate limiting with burst allowance.\\n\\n**Distributed Synchronization:** Use Redis with Lua scripts for atomic operations. The sliding window counter pattern works well: INCR with EXPIRE for the current window.\\n\\n**Fallback Strategy:** When Redis is unavailable: (1) Local in-memory rate limiting per server with 1/N of the limit, (2) Circuit breaker pattern to fail open briefly rather than reject all requests, (3) Log degraded state for monitoring.", "difficultyLevel": 1, "answerExplanation": "Evaluation rubric: Award full marks for mentioning a proven algorithm (token bucket/sliding window), addressing distributed state (Redis/Memcached), and providing a sensible degradation strategy. Partial credit for missing one aspect. Look for understanding of trade-offs between consistency and availability."}
\`\`\`

**OUTPUT**: Return ONLY a valid JSON array wrapped in \\\`\\\`\\\`json ... \\\`\\\`\\\``;
  }
  return `Create content for ${topic} covering ${subtopics}.`;
};
