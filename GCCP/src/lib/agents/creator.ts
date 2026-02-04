import { BaseAgent } from "./base-agent";
import { CREATOR_SYSTEM_PROMPTS, getCreatorUserPrompt } from "@/prompts/creator";
import { ContentMode, GapAnalysisResult } from "@/types/content";
import { deduplicateContent, deduplicateHeaders } from "./utils/deduplication";

export interface CreatorOptions {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  gapAnalysis?: GapAnalysisResult;
  assignmentCounts?: any;
}

export class CreatorAgent extends BaseAgent {
  constructor(client: any, model: string = "grok-code-fast-1") {
    super("Creator", model, client);
  }

  getSystemPrompt(mode: ContentMode = "lecture"): string {
    // Append anti-duplication constraints to the base prompt
    const basePrompt = CREATOR_SYSTEM_PROMPTS[mode] || CREATOR_SYSTEM_PROMPTS["lecture"];
    const antiDuplicationConstraints = `

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL: ANTI-DUPLICATION RULES
═══════════════════════════════════════════════════════════════

You MUST NOT repeat content. Violations will cause content to be rejected:

1. **NO REPEATED HEADERS**: Each header (##, ###, etc.) must appear EXACTLY ONCE
   - ❌ WRONG: Having "## Introduction" appear twice
   - ✅ CORRECT: Each section has a unique header

2. **NO REPEATED PARAGRAPHS**: Never output the same paragraph or example twice
   - If you've explained a concept, DO NOT explain it again verbatim
   - Reference earlier content instead: "As discussed in [section]..."

3. **NO STUTTERING**: Do not restart or repeat content mid-generation
   - If you lose track of position, continue forward from where you are
   - NEVER go back and re-output previous sections

4. **UNIQUE EXAMPLES**: Each example, code snippet, or illustration must be distinct
   - Use different scenarios, values, or approaches for each example

Track your output structure mentally. If uncertain, summarize what you've covered so far internally before continuing.`;

    return basePrompt + antiDuplicationConstraints;
  }

  formatUserPrompt(options: CreatorOptions): string {
    return getCreatorUserPrompt(options);
  }

  /**
   * Post-process generated content to remove any duplicates that may have
   * occurred during streaming (stutters, buffer issues, etc.)
   */
  private postProcessContent(content: string): string {
    // First remove duplicate headers
    let processed = deduplicateHeaders(content);
    
    // Then remove duplicate paragraphs/blocks
    const { content: deduplicated, removedCount } = deduplicateContent(processed, 0.85);
    
    if (removedCount > 0) {
      console.log(`[Creator] Removed ${removedCount} duplicate block(s) during post-processing`);
    }
    
    return deduplicated;
  }

  async *generateStream(options: CreatorOptions, signal?: AbortSignal) {
    const system = this.getSystemPrompt(options.mode);
    const user = this.formatUserPrompt(options);

    // Collect full content for post-processing deduplication
    let fullContent = "";
    
    for await (const chunk of this.client.stream({
      system,
      messages: [{ role: "user", content: user }],
      model: this.model,
      signal
    })) {
      fullContent += chunk;
      yield chunk;
    }
    
    // Note: Post-processing happens in orchestrator after stream completes
    // The orchestrator should call postProcessContent on the final content
  }

  /**
   * Generate content with automatic deduplication applied.
   * Use this for non-streaming scenarios or when post-processing is needed.
   */
  async generateWithDeduplication(options: CreatorOptions, signal?: AbortSignal): Promise<string> {
    let content = "";
    for await (const chunk of this.generateStream(options, signal)) {
      content += chunk;
    }
    return this.postProcessContent(content);
  }
}
