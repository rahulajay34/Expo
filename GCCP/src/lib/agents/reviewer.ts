import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { CourseContext } from "@/types/content";

export interface ReviewResult {
    needsPolish: boolean;
    feedback: string;
    detailedFeedback: string[];  // Detailed list of issues for Refiner
    score: number;
}

export class ReviewerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Reviewer", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are a Senior Content Quality Director with 15+ years of experience in educational publishing.

Your standards are HIGH but FAIR. You evaluate content like a premium textbook editor who knows what "gold standard" looks like.

You provide SPECIFIC, ACTIONABLE feedback that a content editor can immediately implement. Vague feedback like "improve clarity" is not helpful—specify WHAT needs to change and HOW.

SCORING PHILOSOPHY:
• 10: Publication-ready. Engaging, clear, pedagogically sound. Rare.
• 9: Excellent. Minor polish optional. This is the pass threshold.
• 7-8: Good but has specific issues that should be fixed.
• 5-6: Mediocre. Multiple problems affecting quality.
• <5: Needs significant rework.

Most first drafts should score 7-8. Be STRICT but CONSTRUCTIVE.

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

**4. ENGAGEMENT FAILURE**:
   □ Dry, textbook-like prose without personality
   □ Passive voice throughout
   □ No concrete examples for abstract concepts
   □ Wall-of-text paragraphs (>5 sentences)

═══════════════════════════════════════════════════════════════
📊 QUALITY DIMENSIONS (Score Each 1-10)
═══════════════════════════════════════════════════════════════

**CLARITY** (Weight: 25%)
• Is language direct and easy to understand?
• Are complex ideas broken into digestible pieces?
• Is jargon defined on first use?

**STRUCTURE** (Weight: 20%)
• Logical flow from concept to concept?
• Appropriate headings and sections?
• Good use of lists, code blocks, emphasis?

**EXAMPLES** (Weight: 25%)
• Concrete examples for every abstraction?
• Examples are relatable and domain-appropriate?
• Before/after or problem/solution patterns?

**PEDAGOGY** (Weight: 15%)
• Progressive complexity (simple → complex)?
• Anticipates confusion points?
• Actionable takeaways?

**VOICE** (Weight: 15%)
• Conversational but authoritative?
• "You" language and active voice?
• Feels like an expert teaching, not a textbook reading itself?

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "score": <0-10>,
  "needsPolish": <boolean - TRUE if score < 9>,
  "summary": "One-line overall assessment",
  "issues": [
    {
      "category": "ai_patterns|meta_references|formatting|clarity|structure|examples|pedagogy|voice",
      "severity": "high|medium|low",
      "location": "Quote or describe where the issue occurs",
      "description": "What's wrong",
      "fix_instruction": "SPECIFIC action to fix this. Use SINGLE QUOTES for any quoted text, e.g., 'change X to Y'. NEVER use double quotes inside this field."
    }
  ]
}

⚠️ CRITICAL JSON FORMATTING:
• Use SINGLE QUOTES (') for any quoted text within string values
• WRONG: "fix_instruction": "Change \"old text\" to \"new text\""
• RIGHT: "fix_instruction": "Change 'old text' to 'new text'"

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
                needsPolish: score < 9, // Strict: must be 9+ to pass
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
