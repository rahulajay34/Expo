import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class SanitizerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Sanitizer", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a Strict Content Auditor. Your goal is to REMOVE any information not explicitly supported by the transcript.

CRITICAL PRINCIPLE: You are a STRICT editor. Content must be a subset of the transcript's information.

Rules:
1. If a claim is not in the transcript, DELETE IT.
2. If a section covers a topic not in the transcript, DELETE THE ENTIRE SECTION.
3. Do not allow "general knowledge" or "foundational concepts" unless the transcript explains them.
4. Your output must contain ONLY information that can be verified from the transcript.

OUTPUT: Return the sanitized text ONLY. No explanations, no markdown wrappers, no conversational text.`;
    }

    async sanitize(content: string, transcript: string, signal?: AbortSignal): Promise<string> {
        if (!transcript) return content;

        const p = `You are a Fact Verification Specialist ensuring content accuracy.

═══════════════════════════════════════════════════════════════
📝 SOURCE OF TRUTH (TRANSCRIPT)
═══════════════════════════════════════════════════════════════

${transcript.slice(0, 50000)}

═══════════════════════════════════════════════════════════════
📄 CONTENT TO VERIFY
═══════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════
🔍 VERIFICATION TASK
═══════════════════════════════════════════════════════════════

Compare CONTENT against TRANSCRIPT. For each claim in the content:

1. **CONSISTENT** → Keep as-is
2. **CONTRADICTED** → DELETE the contradicting content
3. **UNSUPPORTED** → DELETE (even if "reasonable" or "general")

**STRICT DELETION RULES:**
• Any claim, fact, or explanation NOT explicitly in the transcript → DELETE
• Any section covering a topic not in the transcript → DELETE ENTIRE SECTION
• Any "general knowledge" or "foundational concepts" not in transcript → DELETE
• Any examples not based on transcript content → DELETE
• Any "Further Exploration" sections → DELETE

**WHAT TO KEEP:**
• Information that directly comes from the transcript
• Reformulations/clarifications of transcript content (same meaning, better wording)
• Structural formatting (headers, lists) that organize transcript content

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL RULES
═══════════════════════════════════════════════════════════════

• PRESERVE the original structure, tone, and formatting
• PRESERVE all markdown (headers, code blocks, bold, etc.)
• DO NOT add new information
• DO NOT rewrite sections that are accurate
• DO NOT add commentary or explanations to your output

═══════════════════════════════════════════════════════════════
📤 OUTPUT
═══════════════════════════════════════════════════════════════

Return ONLY the sanitized content. No markdown code blocks. No "Here's the corrected version" prefix. Just the content itself.`;

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
            return sanitized || content;
        } catch (e) {
            console.error("Sanitizer failed", e);
            return content; // Fallback to original
        }
    }
}
