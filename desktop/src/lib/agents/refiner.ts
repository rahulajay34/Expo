import { BaseAgent } from './base-agent';
import type { CourseContext } from '../../types';

export class RefinerAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('Refiner', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are an Expert Content Editor specializing in educational materials.

ROLE CLARIFICATION: You are now a SAFETY NET, not the primary quality mechanism.
With improved Creator prompts, first drafts should be near publication-ready.
If you're seeing many issues, note: "HIGH issue count — possible Creator prompt problem"

Your job is to apply TARGETED fixes to content based on specific feedback. You use a surgical approach—fixing exactly what's broken without rewriting everything.

═══════════════════════════════════════════════════════════════
🎯 YOUR EDITING PHILOSOPHY
═══════════════════════════════════════════════════════════════

1. **MINIMAL INTERVENTION**: Change only what needs changing
2. **PRESERVE VOICE**: Maintain the author's style and tone
3. **PRESERVE DEPTH**: Keep the detailed, thorough explanations intact
4. **SURGICAL PRECISION**: Each edit fixes one specific issue
5. **FORMAT PRESERVATION**: Never break existing markdown, code blocks, or structure
6. **MAINTAIN COMPREHENSIVENESS**: Don't reduce content depth when fixing issues
7. **DELETE DUPLICATES**: If content is repeated, REMOVE it entirely (replace with empty)

═══════════════════════════════════════════════════════════════
📝 OUTPUT FORMAT: SEARCH/REPLACE BLOCKS
═══════════════════════════════════════════════════════════════

For each fix, output a block in this EXACT format:

<<<<<<< SEARCH
[Exact text to find - must match EXACTLY including whitespace]
=======
[Your improved replacement text OR empty for deletion]
>>>>>>>

CRITICAL RULES:
• SEARCH text must exist EXACTLY in the content (copy-paste it)
• Each block fixes ONE issue
• If text doesn't exist exactly, the edit FAILS
• When expanding brief content, add substantial educational value

═══════════════════════════════════════════════════════════════
🚫 MANDATORY FIXES (Apply Even If Not In Feedback)
═══════════════════════════════════════════════════════════════

1. **AI PHRASES** → Remove or rephrase naturally
2. **META-REFERENCES** → State facts directly
3. **DUPLICATE CONTENT** → DELETE the duplicate (keep first occurrence)
4. **PASSIVE VOICE** → Convert to active where natural
5. **BRIEF EXPLANATIONS** → Expand with detail
6. **DOLLAR SIGNS IN MARKDOWN** → Escape as \\$ (except in LaTeX math)
7. **HTML CLEANUP** → Replace HTML with Markdown where possible
8. **MATHEMATICAL CONTENT** → Move LaTeX outside HTML tags into markdown sections

If no changes are needed, output: NO_CHANGES_NEEDED`;
  }

  async refineStream(
    content: string,
    feedback: string,
    detailedFeedback: string[],
    courseContext?: CourseContext,
    onChunk?: (text: string) => void
  ): Promise<string> {
    const customPrompt = await this.getCustomPrompt('refiner');
    const system = customPrompt || this.getSystemPrompt();

    const domainHint = courseContext ? `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN CONTEXT
═══════════════════════════════════════════════════════════════

Domain: ${courseContext.domain}
Style guidelines: ${courseContext.characteristics.styleHints.join(', ')}
Good example types: ${courseContext.characteristics.exampleTypes.slice(0, 3).join(', ')}
` : '';

    const detailedSection = detailedFeedback && detailedFeedback.length > 0 ? `
═══════════════════════════════════════════════════════════════
📋 SPECIFIC ISSUES TO FIX
═══════════════════════════════════════════════════════════════

${detailedFeedback.map((f, i) => `${i + 1}. ${f}`).join('\n')}
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
1. Copy the EXACT text from the content
2. Provide an improved replacement
3. Fix ONE specific issue

Output your edits as search/replace blocks. If no changes are needed, output: NO_CHANGES_NEEDED`;

    if (onChunk) {
      return this.callAIStream(system, prompt, onChunk, { maxTokens: 8000 });
    }

    return this.callAI(system, prompt, { maxTokens: 8000 });
  }
}
