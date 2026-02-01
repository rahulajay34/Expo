import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class SanitizerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Sanitizer", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a Fact-Checking Editor. Your goal is to VERIFY claims against the transcript while PRESERVING all formatting.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You verify that claims in the content are supported by the transcript. You remove ONLY factually unsupported claims.

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
❌ WHAT TO REMOVE
═══════════════════════════════════════════════════════════════

• Claims that CONTRADICT the transcript
• Entire topics NOT mentioned in the transcript at all
• "Further Exploration" or "Additional Resources" sections with external info

═══════════════════════════════════════════════════════════════
📤 OUTPUT
═══════════════════════════════════════════════════════════════

Return the sanitized content directly. Keep ALL formatting intact.`;
    }

    async sanitize(content: string, transcript: string, signal?: AbortSignal): Promise<string> {
        if (!transcript) return content;

        const p = `You are a Fact Verification Editor. Your job is to verify claims while PRESERVING ALL FORMATTING.

═══════════════════════════════════════════════════════════════
📝 SOURCE OF TRUTH (TRANSCRIPT)
═══════════════════════════════════════════════════════════════

${transcript.slice(0, 50000)}

═══════════════════════════════════════════════════════════════
📄 CONTENT TO VERIFY (PRESERVE ALL FORMATTING!)
═══════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════
🔍 VERIFICATION TASK
═══════════════════════════════════════════════════════════════

For each claim in the content:

1. **SUPPORTED/CONSISTENT** → Keep EXACTLY as-is (including all formatting)
2. **CONTRADICTED** → Remove the specific contradicting sentence only
3. **COMPLETELY OFF-TOPIC** → Remove only if the entire section has zero relation to transcript

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
❌ WHAT TO REMOVE (Be Conservative)
═══════════════════════════════════════════════════════════════

• Claims that DIRECTLY CONTRADICT the transcript
• Entire sections about topics with ZERO mention in transcript
• "Further Reading" sections with external unverified info

When in doubt, KEEP the content. False negatives (keeping good content) are better than false positives (removing good content).

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT
═══════════════════════════════════════════════════════════════

Return the content directly, preserving EVERY formatting character.
Do NOT wrap in \`\`\`markdown ... \`\`\` code blocks.
Do NOT add "Here's the result:" or any preamble.
Just output the verified content with all formatting intact.`;

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
