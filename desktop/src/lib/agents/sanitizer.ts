import { BaseAgent } from './base-agent';
import type { CourseContext } from '../../types';

export class SanitizerAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('Sanitizer', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are a Fact-Checking Editor and Content Enhancer with Domain-Awareness. Your goal is to VERIFY claims against the transcript AND ensure domain consistency, outputting a corrected version of the content.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You verify claims in the content against the transcript and check for domain consistency. Your output is the COMPLETE, CORRECTED document in a single pass.

⚠️ CRITICAL ANTI-DUPLICATION RULE:
- Output the FULL document exactly ONCE
- Each section appears only ONE time
- When you correct a section, output the CORRECTED version, not both old and new

═══════════════════════════════════════════════════════════════
🔴 DOMAIN-CONSISTENCY VALIDATION
═══════════════════════════════════════════════════════════════

1. **PRIMARY DOMAIN CHECK**: Does the content align with the established domain/topic?
2. **TERMINOLOGY CONSISTENCY**: Technical terms should be appropriate for the stated domain
3. **CONTEXT MISMATCH DETECTION**: Facts may be technically correct but contextually wrong

═══════════════════════════════════════════════════════════════
✅ WHAT TO PRESERVE (NEVER TOUCH)
═══════════════════════════════════════════════════════════════

• ALL Markdown formatting: headers, bold, italic, lists
• ALL HTML tags and their attributes
• ALL code blocks with their language identifiers
• ALL LaTeX/KaTeX math expressions
• Educational explanations that clarify transcript concepts
• Examples that illustrate transcript concepts

═══════════════════════════════════════════════════════════════
🔄 WHAT TO CORRECT
═══════════════════════════════════════════════════════════════

• Content that CONTRADICTS the transcript
• Topics NOT covered in the transcript
• Unverified external information
• OFF-DOMAIN terminology or facts

Output the COMPLETE corrected document directly. Keep ALL formatting intact.`;
  }

  async sanitize(content: string, transcript: string, courseContext?: CourseContext): Promise<string> {
    if (!transcript) return content;

    const customPrompt = await this.getCustomPrompt('sanitizer');
    const system = customPrompt || this.getSystemPrompt();

    const domainSection = courseContext ? `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN CONTEXT
═══════════════════════════════════════════════════════════════

**Primary Domain**: ${courseContext.domain}
**Expected Vocabulary**: ${courseContext.characteristics.vocabulary.slice(0, 10).join(', ')}
**Style Context**: ${courseContext.characteristics.styleHints.join(', ')}
` : '';

    const prompt = `You are a Fact Verification Editor with Domain-Awareness. Output the COMPLETE, CORRECTED version in a SINGLE PASS.
${domainSection}
═══════════════════════════════════════════════════════════════
📝 SOURCE OF TRUTH (TRANSCRIPT)
═══════════════════════════════════════════════════════════════

${transcript.slice(0, 50000)}

═══════════════════════════════════════════════════════════════
📄 CONTENT TO VERIFY
═══════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════
🔍 SINGLE-PASS VERIFICATION TASK
═══════════════════════════════════════════════════════════════

Go through the content from beginning to end in ONE pass. For each section:
1. **SUPPORTED/CONSISTENT with transcript** → Output it EXACTLY as-is
2. **CONTRADICTED or UNSUPPORTED** → Output CORRECTED version with transcript content
3. **COMPLETELY OFF-TOPIC or OFF-DOMAIN** → Replace with relevant transcript content

⚠️ CRITICAL:
- Do NOT output a section twice
- Do NOT add annotations like "Original:", "Corrected:"
- Each section appears EXACTLY ONCE
- Output should be SIMILAR IN LENGTH to the input`;

    try {
      const sanitized = await this.callAIStream(
        system,
        prompt,
        () => {}, // No chunk callback needed
        { maxTokens: 16000 }
      );

      // Safety check: If sanitizer stripped too much formatting, prefer original
      const originalHasFormatting = this.hasSignificantFormatting(content);
      const sanitizedHasFormatting = this.hasSignificantFormatting(sanitized);

      if (originalHasFormatting && !sanitizedHasFormatting && sanitized.length < content.length * 0.5) {
        console.warn('[Sanitizer] Output lost significant formatting, using original content');
        return content;
      }

      return sanitized || content;
    } catch (e) {
      console.error('Sanitizer failed', e);
      return content;
    }
  }

  private hasSignificantFormatting(text: string): boolean {
    const formattingIndicators = [
      /^#{1,6}\s/m,
      /\*\*[^*]+\*\*/,
      /<[a-z][^>]*>/i,
      /```[\s\S]*?```/,
      /^[-*]\s/m,
      /^\d+\.\s/m,
      /\$[^$]+\$/,
    ];
    return formattingIndicators.some(pattern => pattern.test(text));
  }
}
