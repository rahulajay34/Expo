import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";

export class SanitizerAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Sanitizer", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a meticulous Fact Verification Specialist. Your role is to ensure content accuracy against source material.

CRITICAL PRINCIPLE: You are a CONSERVATIVE editor. When in doubt, preserve the original content. Only modify claims that are clearly contradicted by the transcript.

OUTPUT: Return the corrected text ONLY. No explanations, no markdown wrappers, no conversational text.`;
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
2. **CONTRADICTED** → Rewrite to align with transcript
3. **UNSUPPORTED but reasonable** → Keep (general explanations are OK)
4. **UNSUPPORTED and specific** → Remove or generalize

**WHAT COUNTS AS A PROBLEM:**
• Specific facts, numbers, or claims that contradict the transcript
• Attributions like "the instructor said X" when they said Y
• Technical details that are demonstrably wrong per transcript

**WHAT IS ACCEPTABLE:**
• General educational explanations (even if not in transcript)
• Standard definitions and concepts
• Examples that illustrate transcript content (even if not verbatim)
• Pedagogical additions that don't contradict the source

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
