import { AnthropicClient } from "@/lib/anthropic/client";

export abstract class BaseAgent {
  protected name: string;
  public model: string;
  protected client: AnthropicClient;

  constructor(name: string, model: string, client: AnthropicClient) {
    this.name = name;
    this.model = model;
    this.client = client;
  }

  abstract getSystemPrompt(mode?: string): string;
}
