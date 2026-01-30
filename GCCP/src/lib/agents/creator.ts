import { BaseAgent } from "./base-agent";
import { CREATOR_SYSTEM_PROMPTS, getCreatorUserPrompt } from "@/prompts/creator";
import { ContentMode, GapAnalysisResult } from "@/types/content";

export interface CreatorOptions {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  gapAnalysis?: GapAnalysisResult;
  assignmentCounts?: any;
}

export class CreatorAgent extends BaseAgent {
  constructor(client: any, model: string = "claude-sonnet-4-5-20250929") {
    super("Creator", model, client, "creative");
  }

  getSystemPrompt(mode: ContentMode = "lecture"): string {
    return CREATOR_SYSTEM_PROMPTS[mode] || CREATOR_SYSTEM_PROMPTS["lecture"];
  }

  formatUserPrompt(options: CreatorOptions): string {
    return getCreatorUserPrompt(options);
  }

  async *generateStream(options: CreatorOptions, signal?: AbortSignal) {
    const system = this.getSystemPrompt(options.mode);
    const user = this.formatUserPrompt(options);

    yield* this.client.stream({
      system,
      messages: [{ role: "user", content: user }],
      model: this.model,
      signal
    });
  }
}
