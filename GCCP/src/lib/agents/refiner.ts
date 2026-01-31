import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { CourseContext } from "@/types/content";

export class RefinerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Refiner", "claude-sonnet-4-5-20250929", client);
    }

    getSystemPrompt(): string {
        return `You are an Expert Content Editor specializing in educational materials.

Your job is to apply TARGETED fixes to content based on specific feedback. You use a surgical approach—fixing exactly what's broken without rewriting everything.

═══════════════════════════════════════════════════════════════
🎯 YOUR EDITING PHILOSOPHY
═══════════════════════════════════════════════════════════════

1. **MINIMAL INTERVENTION**: Change only what needs changing
2. **PRESERVE VOICE**: Maintain the author's style and tone
3. **SURGICAL PRECISION**: Each edit fixes one specific issue
4. **FORMAT PRESERVATION**: Never break existing markdown, code blocks, or structure

═══════════════════════════════════════════════════════════════
📝 OUTPUT FORMAT: SEARCH/REPLACE BLOCKS
═══════════════════════════════════════════════════════════════

For each fix, output a block in this EXACT format:

<<<<<<< SEARCH
[Exact text to find - must match EXACTLY including whitespace]
=======
[Your improved replacement text]
>>>>>>>

CRITICAL RULES:
• SEARCH text must exist EXACTLY in the content (copy-paste it)
• Each block fixes ONE issue
• Aim for ~1 block per issue in feedback
• If text doesn't exist exactly, the edit FAILS

═══════════════════════════════════════════════════════════════
🚫 MANDATORY FIXES (Apply Even If Not In Feedback)
═══════════════════════════════════════════════════════════════

1. **AI PHRASES** → Remove or rephrase naturally:
   • "It's important to note that..." → Just state the fact
   • "Let's dive in..." → Remove entirely or start directly
   • "As mentioned earlier..." → Reference the concept directly
   • "crucial/essential/fundamental" (if overused) → Vary vocabulary

2. **META-REFERENCES** → State facts directly:
   • "In this section..." → Just teach the content
   • "According to the transcript..." → State the information
   • Any course/program names → Remove completely

3. **PASSIVE VOICE** → Convert to active where natural:
   • "The function is called by..." → "X calls the function..."

4. **DOLLAR SIGNS IN MARKDOWN** → Escape as \\$ (except in LaTeX math)
   • BUT: Do NOT escape $ inside HTML tags - write $500 not \\$500

5. **MARKDOWN IN HTML** → Convert to HTML formatting:
   • Inside HTML tags: **text** → <strong>text</strong>
   • Inside HTML tags: *text* → <em>text</em>

6. **MATHEMATICAL CONTENT FORMATTING** (Critical for math topics):
   • LaTeX $...$ and $$...$$ only works in MARKDOWN sections, NOT inside HTML tags
   • If math is inside HTML tags: Move it outside to markdown OR simplify
   • WRONG: <p style="...">The solution is $y = e^{rx}$</p> (won't render)
   • CORRECT: Close HTML, then use markdown: </div>\\n\\nThe solution is $y = e^{rx}$
   • For simple variables inside HTML, use <em>x</em> only if necessary
   • Complex equations should ALWAYS be in pure markdown sections

═══════════════════════════════════════════════════════════════
✅ GOOD EDIT EXAMPLE
═══════════════════════════════════════════════════════════════

ISSUE: "Remove AI phrase 'It's important to note'"

<<<<<<< SEARCH
It's important to note that Python uses indentation instead of braces to define code blocks.
=======
Python uses indentation instead of braces to define code blocks. Miss an indent, and your code won't run.
>>>>>>>

Notice: Removed the phrase AND made the replacement more engaging.

═══════════════════════════════════════════════════════════════
❌ BAD EDIT EXAMPLE
═══════════════════════════════════════════════════════════════

<<<<<<< SEARCH
some text that doesn't exist exactly in the content
=======
replacement
>>>>>>>

This will FAIL because the search text doesn't match.`;
    }

    async *refineStream(
        content: string,
        feedback: string,
        detailedFeedback?: string[],
        courseContext?: CourseContext,
        signal?: AbortSignal
    ) {
        // Build domain context hint if available
        const domainHint = courseContext ? `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN CONTEXT (Inform Your Edits)
═══════════════════════════════════════════════════════════════

Domain: ${courseContext.domain}
Style guidelines: ${courseContext.characteristics.styleHints.join(', ')}
Good example types: ${courseContext.characteristics.exampleTypes.slice(0, 3).join(', ')}

When adding examples or improving clarity, use domain-appropriate language and scenarios.
` : '';

        // Build detailed feedback section
        const detailedSection = detailedFeedback && detailedFeedback.length > 0 ? `
═══════════════════════════════════════════════════════════════
📋 SPECIFIC ISSUES TO FIX
═══════════════════════════════════════════════════════════════

${detailedFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}

Address EACH issue above with a targeted search/replace block.
` : '';

        const prompt = `You are an expert content editor applying targeted fixes.
${domainHint}
═══════════════════════════════════════════════════════════════
📄 CURRENT CONTENT
═══════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════
🎯 FEEDBACK SUMMARY
═══════════════════════════════════════════════════════════════

${feedback}
${detailedSection}

═══════════════════════════════════════════════════════════════
🔧 YOUR TASK
═══════════════════════════════════════════════════════════════

Apply ALL feedback using search/replace blocks. Each block should:

1. Copy the EXACT text from the content (including whitespace/newlines)
2. Provide an improved replacement
3. Fix ONE specific issue

MANDATORY (even if not in feedback):
• Remove AI phrases ("It's important to note...", "Let's dive in...")
• Remove meta-references ("In this section...", "According to...")
• In plain markdown: Escape unescaped dollar signs as \\$
• BUT: Do NOT escape $ inside HTML tags - write $500 not \\$500
• Convert markdown formatting inside HTML tags to HTML (** → <strong>, * → <em>)
• Convert excessive passive voice to active
• For math content: Move LaTeX $...$ equations OUTSIDE of HTML tags into markdown sections
• NEVER put LaTeX math inside HTML <div>, <p>, or <span> tags (it won't render)

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Output your edits as search/replace blocks:

<<<<<<< SEARCH
[exact text from content]
=======
[your improved version]
>>>>>>>

If no changes are needed (content is already excellent), output:
NO_CHANGES_NEEDED

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL REMINDERS
═══════════════════════════════════════════════════════════════

• SEARCH text must match EXACTLY (copy from content above)
• Preserve ALL markdown formatting in your replacements
• Don't break code blocks or their language identifiers
• Keep replacements similar in length (don't bloat content)
• Fix what's broken, don't rewrite what works`;

        yield* this.client.stream({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });
    }
}
