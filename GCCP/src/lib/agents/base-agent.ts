import { AnthropicClient } from "@/lib/anthropic/client";

export abstract class BaseAgent {
  protected name: string;
  public model: string;
  protected client: AnthropicClient;
  protected internalBuffer: string = "";
  protected messageHistory: Array<{ role: string; content: string }> = [];

  constructor(name: string, model: string, client: AnthropicClient) {
    this.name = name;
    this.model = model;
    this.client = client;
  }

  /**
   * Reset internal state to prevent context pollution between requests.
   * Call this before every new generation run to ensure request isolation.
   */
  reset(): void {
    this.internalBuffer = "";
    this.messageHistory = [];
  }

  abstract getSystemPrompt(mode?: string): string;
}
