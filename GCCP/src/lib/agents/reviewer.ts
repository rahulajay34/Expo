import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { CourseContext } from "@/types/content";
import { GEMINI_MODELS } from "@/lib/gemini/client";

/**
 * Reviewer validates CONTENT QUALITY and ANSWER CORRECTNESS.
 * 
 * What it checks:
 * - Writing clarity and engagement
 * - Structure and formatting
 * - AI-sounding patterns
 * - Meta-references
 * - Example quality
 * - Assignment answer correctness (for mode='assignment')
 * - Whether answers match questions
 * - Mathematical/factual accuracy of solutions
 * 
 * For assignments, validates:
 * - MCSC: Correct option number matches the right answer
 * - MCMC: All correct options are marked, no incorrect ones included
 * - Subjective: Answer explanations are accurate and complete
 */
export interface ReviewResult {
    needsPolish: boolean;
    feedback: string;
    score: number; // 1-10
    detailedFeedback?: string[];
}

export class ReviewerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Reviewer", GEMINI_MODELS.flash, client);
    }

    getSystemPrompt(): string {
        return `You are a Senior Content Quality Director with 15+ years of experience in educational publishing.

Your standards are HIGH but FAIR. You evaluate content like a premium textbook editor who knows what "gold standard" looks like.

You provide SPECIFIC, ACTIONABLE feedback that a content editor can immediately implement. Vague feedback like "improve clarity" is not helpful—specify WHAT needs to change and HOW.

CRITICAL: You evaluate for quality issues, NOT for content depth. If content is thorough and detailed, that's GOOD. Only flag superficial content as an issue. Detailed, comprehensive explanations are the GOAL, not a problem.

═══════════════════════════════════════════════════════════════
📊 SCORING PHILOSOPHY (Updated for Improved Creator)
═══════════════════════════════════════════════════════════════

With improved Creator prompts and voice models, first drafts should typically score 8-9.
Only flag issues that genuinely harm educational value.

• 10: Perfect. Extremely rare.
• 9: Excellent. Publication-ready with optional polish. THIS IS THE TARGET.
• 8: Very Good. One or two minor issues worth fixing.
• 7: Good. Specific issues that should be addressed.
• 6: Mediocre. Multiple problems.
• <6: Needs rework (should NOT happen—flag as systemic issue if frequent).

KEY CHANGE: AI-sounding phrases should now be RARE because Creator uses a voice model.
If you see MANY AI phrases ("It's important to note", "Let's dive in"), note as HIGH severity.

IMPORTANT: Do NOT penalize content for being detailed. Comprehensive explanations are DESIRABLE.

═══════════════════════════════════════════════════════════════
📋 STRUCTURAL VALIDATION (Check Pedagogical Primitives)
═══════════════════════════════════════════════════════════════

Missing required structural elements = quality issue, even if writing is good.

**Pre-read**: Essential Question? Vocabulary to Notice? Questions to Ponder?
**Lecture**: Learning Objectives (action verbs)? Synthesis Points (takeaways, not summaries)?
**Assignment**: Constraints (time/resource limits)? Scenario-based? No "All of the above"?

**CRITICAL MODE RULE**:
- If mode is 'lecture', DO NOT check for or suggest adding "Pre-read" sections. These are ONLY for mode='pre-read'.
- If mode is 'lecture', these sections are FORBIDDEN. Flag them for removal if present.

═══════════════════════════════════════════════════════════════
⚠️ JSON OUTPUT RULES (Critical for parsing)
═══════════════════════════════════════════════════════════════

• Use SINGLE QUOTES (') for any quoted text within string values
• WRONG: "fix_instruction": "Change \\"old text\\" to \\"new text\\""
• RIGHT: "fix_instruction": "Change 'old text' to 'new text'"
• Return ONLY valid JSON that can be parsed by JSON.parse()

Return JSON only.`;
    }

    async review(content: string, mode: string, courseContext?: CourseContext): Promise<ReviewResult> {
        // Build domain-specific criteria if available
        const domainCriteria = courseContext ? `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN-SPECIFIC REQUIREMENTS (${courseContext.domain})
═══════════════════════════════════════════════════════════════

${courseContext.qualityCriteria}

**Expected example types**: ${courseContext.characteristics.exampleTypes.slice(0, 3).join(', ')}
**Expected formats**: ${courseContext.characteristics.formats.slice(0, 3).join(', ')}

Evaluate whether examples are appropriate for this domain. Generic examples in a specialized domain = quality issue.
` : '';

        const prompt = `You are a Senior Content Quality Director. Review this educational content with premium publication standards.

═══════════════════════════════════════════════════════════════
📄 CONTENT TO REVIEW
═══════════════════════════════════════════════════════════════

${content.slice(0, 20000)}

${domainCriteria}

${mode === 'assignment' ? `
═══════════════════════════════════════════════════════════════
🎯 ASSIGNMENT ANSWER VALIDATION (CRITICAL)
═══════════════════════════════════════════════════════════════

For EACH question, validate answer correctness:

**MCSC (Multiple Choice Single Correct)**:
□ Read the question and all 4 options carefully
□ Determine which option is factually correct
□ Verify 'mcscAnswer' points to the correct option number (1-4)
□ If wrong, provide fix: 'Change mcscAnswer from X to Y because [reason]'

**MCMC (Multiple Choice Multiple Correct)**:
□ Identify ALL correct options (can be 1-4)
□ Verify 'mcmcAnswer' array contains only correct option numbers
□ Check no correct options are missing
□ Check no incorrect options are included
□ If wrong, provide fix: 'Change mcmcAnswer from [X,Y] to [A,B] because [reason]'

**SUBJECTIVE**:
□ Read the question requirement carefully
□ Evaluate if 'answerExplanation' correctly answers the question
□ Check for factual errors, missing steps, or logical flaws
□ Verify completeness (does it address all parts?)
□ If wrong/incomplete, provide detailed fix instruction

**CRITICAL**: Wrong answers are HIGH SEVERITY issues. They must be fixed.

` : ''}
═══════════════════════════════════════════════════════════════
🔴 AUTOMATIC FAILURE CRITERIA (Check These First)
═══════════════════════════════════════════════════════════════

These issues AUTOMATICALLY reduce score to 7 or below:

**1. AI-SOUNDING PATTERNS** — Scan for these robotic phrases:
   □ "It's important to note that..."
   □ "Let's dive in..." / "Let's explore..."
   □ "In this section, we will..."
   □ "As mentioned earlier..."
   □ "According to the transcript/material..."
   □ "As an AI..." / "I've generated..."
   □ Overuse of: "crucial", "essential", "fundamental", "key"

**2. META-REFERENCES** — Content should NOT reference:
   □ "The transcript" or "the source material"
   □ "This course/module/lesson" (excessive use)
   □ Any course or program names
   □ The content generation process

**3. FORMATTING ISSUES**:
   □ Unescaped dollar signs ($ should be \\$, except in math)
   □ Unclosed code blocks (missing triple backticks)
   □ Broken markdown (unclosed tags, malformed tables/lists)
   □ Inconsistent heading hierarchy (h1 → h3 without h2)
   □ LaTeX math inside HTML tags (won't render - $...$ only works in markdown)
   □ Using <em>x</em> for equations instead of LaTeX $x$ (looks unprofessional)
   □ Complex math written as HTML italics (<em>r</em>² - 5<em>r</em> + 6 = 0) instead of LaTeX ($r^2 - 5r + 6 = 0$)
   
**3a. HTML FORMATTING ISSUES** (CRITICAL - These break rendering):
   □ Incomplete style attributes: <pre> or <div> tags with style="..." (ellipsis) without actual CSS values
   □ Placeholder ellipsis in HTML: Any ... in style attributes or incomplete HTML
   □ Improperly nested code blocks: paragraph tags containing pre/code blocks - code blocks must be siblings, not children
   □ Code blocks inside paragraphs: paragraph tags should NEVER contain pre or code blocks
   □ Unclosed HTML tags: Missing closing tags for div, pre, code, etc.
   □ Malformed HTML attributes: Missing quotes, broken attribute syntax
   □ Inconsistent code block styles: Some blocks have full styles, others have placeholders
   □ Text content directly after opening tags without proper spacing

**4. SUPERFICIAL CONTENT** (flag if content lacks depth):
   □ Overly brief explanations without substantive detail
   □ Missing examples or insufficient examples for concepts
   □ Surface-level coverage without exploring nuances
   □ Key concepts explained in 1-2 sentences when they need more depth
   □ No edge cases or important details discussed

**5. ENGAGEMENT FAILURE**:
   □ Dry, textbook-like prose without personality
   □ Passive voice throughout
   □ No concrete examples for abstract concepts
   □ Wall-of-text paragraphs (>7 sentences without breaks)

⚠️ NOTE: Do NOT flag content for being "too long" or "too detailed" - comprehensive, thorough explanations are GOOD. Only flag if content is repetitive fluff without educational value.

═══════════════════════════════════════════════════════════════
📊 QUALITY DIMENSIONS (Score Each 1-10)
═══════════════════════════════════════════════════════════════

**CLARITY** (Weight: 25%)
• Is language direct and easy to understand?
• Are complex ideas broken into digestible pieces?
• Is jargon defined on first use?
• Are explanations thorough enough for understanding?

**STRUCTURE** (Weight: 20%)
• Logical flow from concept to concept?
• Appropriate headings and sections?
• Good use of lists, code blocks, emphasis?
• Proper visual hierarchy with styled elements?

**EXAMPLES & DEPTH** (Weight: 25%)
• Concrete examples for every abstraction?
• Examples are relatable and domain-appropriate?
• Sufficient depth in explanations (not superficial)?
• Multiple examples showing different facets?
• Before/after or problem/solution patterns?

**PEDAGOGY** (Weight: 15%)
• Progressive complexity (simple → complex)?
• Anticipates confusion points?
• Actionable takeaways?
• Thorough coverage of nuances and edge cases?

**VOICE** (Weight: 15%)
• Conversational but authoritative?
• "You" language and active voice?
• Feels like an expert teaching, not a textbook reading itself?
• No AI-sounding phrases or meta-references?

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "score": <0-10>,
  "needsPolish": <boolean - TRUE if score < 9>,
  "summary": "One-line overall assessment",
  "issues": [
    {
      "category": "answer_correctness|ai_patterns|meta_references|formatting|clarity|structure|examples|pedagogy|voice|depth",
      "severity": "high|medium|low",
      "location": "Quote or describe where the issue occurs (e.g., 'Question 3' or 'MCSC #2' or 'Section: Python Basics')",
      "description": "What's wrong (be specific)",
      "fix_instruction": "SPECIFIC action to fix this. For wrong answers, specify: 'Change mcscAnswer from X to Y because [correct reasoning]'. For shallow content: 'Expand explanation of [concept] to include [specific details needed]'. Use SINGLE QUOTES for any quoted text. NEVER use double quotes inside this field."
    }
  ]
}

⚠️ CRITICAL JSON FORMATTING:
• Use SINGLE QUOTES (') for any quoted text within string values
• WRONG: "fix_instruction": "Change \"old text\" to \"new text\""
• RIGHT: "fix_instruction": "Change 'old text' to 'new text'"

⚠️ CRITICAL HTML VALIDATION:
• Search for ANY style=\"...\" with ellipsis - this means incomplete/placeholder styles (HIGH severity)
• Find pre or div tags with style=\"...\" - these MUST have complete CSS or be removed
• Check for code blocks (pre, code tags) nested inside paragraph tags - INVALID HTML
• Verify all HTML tags are properly closed and nested
• Flag any incomplete HTML structures that would break rendering

═══════════════════════════════════════════════════════════════
⚠️ REVIEW GUIDELINES
═══════════════════════════════════════════════════════════════

• List ONLY issues that genuinely affect quality (not nitpicks)
• High severity = blocks publication; Medium = should fix; Low = nice to fix
• Each issue needs a SPECIFIC fix_instruction the Refiner can act on
• If content is genuinely excellent, say so—don't invent problems
• Maximum 10 issues (focus on most important)`;

        try {
            const response = await this.client.generate({
                system: this.getSystemPrompt(),
                messages: [{ role: "user", content: prompt }],
                model: this.model,
                temperature: 0.2 // Low temperature for consistent, strict evaluation
            });

            const textBlock = response.content.find((b: { type: string }) => b.type === 'text') as { type: 'text'; text: string } | undefined;
            const text = textBlock?.text || "{}";
            const result = await parseLLMJson<any>(text, { score: 7, needsPolish: true, issues: [] });

            const score = typeof result.score === 'number' ? result.score : 7;

            // Extract detailed feedback from issues for Refiner
            const detailedFeedback: string[] = [];
            if (Array.isArray(result.issues)) {
                for (const issue of result.issues) {
                    if (issue.fix_instruction) {
                        const severity = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
                        const location = issue.location ? ` near "${issue.location.slice(0, 50)}..."` : '';
                        detailedFeedback.push(`${severity} [${issue.category}]${location}: ${issue.fix_instruction}`);
                    }
                }
            }

            // Build summary feedback for logging
            const summaryFeedback = result.summary ||
                (detailedFeedback.length > 0
                    ? detailedFeedback.slice(0, 2).join('; ')
                    : "General polish needed");

            return {
                needsPolish: score < 9, // Score 8+ is considered good enough
                feedback: summaryFeedback,
                detailedFeedback,
                score
            };

        } catch (e) {
            console.error("Reviewer failed", e);
            return {
                needsPolish: true, // Assume needs work if review fails
                feedback: "Review failed - recommend polish pass",
                detailedFeedback: ["Review process failed - do a general quality pass"],
                score: 7
            };
        }
    }
}
