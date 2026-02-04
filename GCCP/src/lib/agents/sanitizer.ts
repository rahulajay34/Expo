import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { CourseContext } from "@/types/content";

export class SanitizerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Sanitizer", "grok-4-latest", client);
    }

    getSystemPrompt(): string {
        return `You are a Fact-Checking Editor and Content Enhancer with Domain-Awareness. Your goal is to VERIFY claims against the transcript AND ensure domain consistency, outputting a corrected version of the content.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You verify claims in the content against the transcript and check for domain consistency. Your output is the COMPLETE, CORRECTED document - you go through the content ONCE, fixing issues as you output it.

⚠️ CRITICAL ANTI-DUPLICATION RULE:
- You output the FULL document exactly ONCE
- Each section appears only ONE time in your output
- When you correct a section, output the CORRECTED version, not both old and new
- Think of yourself as rewriting the document in a single pass, not making annotations

═══════════════════════════════════════════════════════════════
🔴 DOMAIN-CONSISTENCY VALIDATION (CRITICAL)
═══════════════════════════════════════════════════════════════

Before checking transcript facts, verify DOMAIN ALIGNMENT:

1. **PRIMARY DOMAIN CHECK**: Does the content align with the established domain/topic?
   - If content introduces terminology from a DIFFERENT field without clear analogy/comparison, FLAG IT
   - Example: A Machine Learning lecture shouldn't suddenly explain medieval history facts
   
2. **TERMINOLOGY CONSISTENCY**: 
   - Technical terms should be appropriate for the stated domain
   - If jargon from an unrelated field appears, it's likely a hallucination
   - EXCEPTION: Analogies that explicitly draw comparisons ("Like how X in chemistry works...")

3. **CONTEXT MISMATCH DETECTION**:
   - Facts may be technically correct but contextually wrong
   - "The mitochondria is the powerhouse of the cell" is TRUE but WRONG in a JavaScript tutorial
   - Such cross-domain contamination should be corrected or removed

When you detect domain inconsistency:
- Replace with domain-appropriate content from the transcript
- If no suitable replacement exists, remove the off-topic content
- Maintain document flow and educational value

═══════════════════════════════════════════════════════════════
✅ WHAT TO PRESERVE (NEVER TOUCH)
═══════════════════════════════════════════════════════════════

• ALL Markdown formatting: headers (#, ##, ###), bold (**text**), italic (*text*), lists (-, *)
• ALL HTML tags and their attributes: <div>, <span>, <strong>, <em>, <p>, etc.
• ALL code blocks with their language identifiers
• ALL LaTeX/KaTeX math expressions: $inline$ and $$block$$
• Structure and organization of the content
• Educational explanations that clarify transcript concepts
• Examples that illustrate transcript concepts (even if not verbatim)

═══════════════════════════════════════════════════════════════
🔄 WHAT TO CORRECT (OUTPUT CORRECTED VERSION)
═══════════════════════════════════════════════════════════════

When you encounter content that:
• CONTRADICTS the transcript
• Mentions topics NOT covered in the transcript
• Contains unverified external information
• **INTRODUCES OFF-DOMAIN TERMINOLOGY OR FACTS** (NEW)

**YOU MUST output the CORRECTED VERSION** (not both old and new):
• Replace with relevant information FROM the transcript
• Maintain the document's flow and structure
• Ensure it fits naturally with surrounding content
• Match the same formatting style (HTML/Markdown)

**HOW TO HANDLE CORRECTIONS:**

WRONG APPROACH (causes duplication):
You see: "### Original Section Title\\nOriginal content that's wrong..."
Don't output both old and new like: "### Original Section Title\\nOriginal...\\n### Corrected Section Title\\nCorrected..."

CORRECT APPROACH (single-pass output):
You see: "### Original Section Title\\nOriginal content that's wrong..."
Output: "### Section Title\\nCorrected content from transcript..."

You output each section ONCE - either unchanged (if correct) or corrected (if wrong). Never output both versions.

**EXAMPLE:**
❌ WRONG (just deleting):
Leave sections empty without replacement

✅ CORRECT (replacing with transcript content):
Replace with relevant, detailed content from the transcript that maintains flow and formatting

═══════════════════════════════════════════════════════════════
📤 OUTPUT
═══════════════════════════════════════════════════════════════

Return the enhanced content directly. Keep ALL formatting intact and ensure the document flows naturally without gaps.`;
    }

    async sanitize(content: string, transcript: string, courseContext?: CourseContext, signal?: AbortSignal): Promise<string> {
        if (!transcript) return content;

        // Build domain context hint for validation
        const domainSection = courseContext ? `
═══════════════════════════════════════════════════════════════
🎯 DOMAIN CONTEXT (Use for Consistency Validation)
═══════════════════════════════════════════════════════════════

**Primary Domain**: ${courseContext.domain}
**Expected Vocabulary**: ${courseContext.characteristics.vocabulary.slice(0, 10).join(', ')}
**Style Context**: ${courseContext.characteristics.styleHints.join(', ')}

⚠️ DOMAIN VALIDATION RULES:
- Content should use terminology consistent with "${courseContext.domain}"
- Technical terms from unrelated domains (unless used as explicit analogies) are SUSPICIOUS
- If something sounds factually correct but doesn't fit "${courseContext.domain}", it's likely a hallucination
- Flag and replace any cross-domain contamination with transcript-sourced content

` : '';

        const p = `You are a Fact Verification Editor with Domain-Awareness. Your job is to output the COMPLETE, CORRECTED version of the content in a SINGLE PASS, ensuring both factual accuracy AND domain consistency.
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

**STEP 1 - DOMAIN CHECK (Do this FIRST):**
- Does this section's content belong to the expected domain?
- Are the terms and concepts appropriate for this subject?
- If NOT → Mark for correction with domain-appropriate content

**STEP 2 - FACT CHECK:**
1. **SUPPORTED/CONSISTENT with transcript** → Output it EXACTLY as-is (including all formatting)
   
2. **CONTRADICTED or UNSUPPORTED by transcript** → Output CORRECTED version with transcript content that:
   - Fits the pedagogical purpose of that section
   - Maintains natural flow with surrounding content
   - Uses the same formatting style (HTML/Markdown)
   - Serves the same educational objective

3. **COMPLETELY OFF-TOPIC or OFF-DOMAIN** → Output corrected version with the most relevant transcript content

⚠️ CRITICAL ANTI-DUPLICATION RULES:
❌ DO NOT output a section twice (once original, once corrected)
❌ DO NOT add annotations like "Original:", "Corrected:", "Before:", "After:"
❌ DO NOT leave both old and new versions in the output
✅ DO output each section exactly ONCE - either unchanged or corrected
✅ DO treat this as rewriting the document in a single pass
✅ DO make corrections silently without marking them

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL: FORMATTING PRESERVATION RULES
═══════════════════════════════════════════════════════════════

🟢 MUST PRESERVE (Copy exactly, character-for-character):
• Markdown headers: # ## ### etc.
• Bold text: **text** 
• Italic text: *text* or _text_
• Bullet lists: - item or * item
• Numbered lists: 1. item
• Code blocks: \`\`\`language ... \`\`\`
• Inline code: \`code\`
• HTML tags: <div>, <span>, <strong>, <em>, <p>, <br>, etc.
• HTML attributes: style="...", class="...", etc.
• LaTeX math: $inline$ and $$block$$
• Links: [text](url)
• Blockquotes: > text

🔴 WHAT BREAKS IF YOU DON'T PRESERVE:
• Removing ** makes bold text disappear
• Removing # makes headers become plain text  
• Removing HTML tags breaks styled content boxes
• The user sees broken, ugly content

═══════════════════════════════════════════════════════════════
✅ WHAT TO KEEP (Be Generous)
═══════════════════════════════════════════════════════════════

• Explanations that CLARIFY transcript concepts (even if worded differently)
• Examples that ILLUSTRATE transcript concepts (pedagogical additions are OK)
• Analogies and metaphors that help understanding
• Definitions that expand on transcript terminology
• ALL structural formatting without exception

═══════════════════════════════════════════════════════════════
🔄 CORRECTION GUIDELINES
═══════════════════════════════════════════════════════════════

When you need to correct a section:

1. **Understand the Context**: What was this section trying to teach?
2. **Verify Domain Fit**: Is this appropriate for the subject matter?
3. **Find Transcript Match**: What related content exists in the transcript?
4. **Maintain Purpose**: Use content that serves the same educational goal
5. **Preserve Flow**: Ensure smooth transitions before and after
6. **Match Style**: Use the same formatting (HTML boxes, markdown, etc.)
7. **Be Natural**: The correction should feel like it was always there
8. **Output Once**: Output the corrected version, NOT both old and new

**EXAMPLE OF CORRECT SINGLE-PASS OUTPUT:**

Input has wrong info about Algorithm A.
Your output (corrected, appears once): The section now correctly mentions Algorithm B as discussed in the transcript.

❌ WRONG (causes duplication - never do this):
Don't output the section twice - once with Algorithm A, then again with Algorithm B.

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Output the COMPLETE corrected document directly, preserving EVERY formatting character.

⚠️ CRITICAL OUTPUT RULES:
• Do NOT wrap in markdown code blocks
• Do NOT add "Here's the result:" or any preamble
• Do NOT add markers like "CORRECTED:" or "ORIGINAL:" 
• Do NOT output any section twice
• Just output the verified document with corrections applied silently

The output should be SIMILAR IN LENGTH to the input - corrections, not deletions.
Each section appears EXACTLY ONCE in your output.`;


        try {
            const stream = this.client.stream({
                system: this.getSystemPrompt(),
                messages: [{ role: "user", content: p }],
                model: this.model
            });

            let sanitized = "";
            for await (const chunk of stream) {
                if (signal?.aborted) throw new Error("Aborted");
                sanitized += chunk;
            }
            
            // Safety check: If sanitizer stripped too much formatting, prefer original
            // This prevents the sanitizer from accidentally destroying content structure
            const originalHasFormatting = this.hasSignificantFormatting(content);
            const sanitizedHasFormatting = this.hasSignificantFormatting(sanitized);
            
            if (originalHasFormatting && !sanitizedHasFormatting && sanitized.length < content.length * 0.5) {
                console.warn("[Sanitizer] Output lost significant formatting, using original content");
                return content;
            }
            
            return sanitized || content;
        } catch (e) {
            console.error("Sanitizer failed", e);
            return content; // Fallback to original
        }
    }
    
    /**
     * Check if content has significant markdown/HTML formatting
     */
    private hasSignificantFormatting(text: string): boolean {
        const formattingIndicators = [
            /^#{1,6}\s/m,           // Markdown headers
            /\*\*[^*]+\*\*/,        // Bold text
            /<[a-z][^>]*>/i,         // HTML tags
            /```[\s\S]*?```/,        // Code blocks
            /^[-*]\s/m,              // Bullet lists
            /^\d+\.\s/m,            // Numbered lists
            /\$[^$]+\$/,            // LaTeX math
        ];
        
        return formattingIndicators.some(pattern => pattern.test(text));
    }
}
