import { aiCall } from '../ai-client';
import { getPrompt } from '../database';

export abstract class BaseAgent {
  protected name: string;
  public model: string;
  protected provider: string;
  protected apiKey: string;
  protected internalBuffer: string = '';
  protected messageHistory: Array<{ role: string; content: string }> = [];

  constructor(name: string, model: string, provider: string, apiKey: string) {
    this.name = name;
    this.model = model;
    this.provider = provider;
    this.apiKey = apiKey;
  }

  reset(): void {
    this.internalBuffer = '';
    this.messageHistory = [];
  }

  abstract getSystemPrompt(mode?: string): string;

  protected async getCustomPrompt(agentName: string): Promise<string | null> {
    try {
      const prompt = await getPrompt(agentName);
      if (prompt && prompt.is_custom) {
        return prompt.prompt_text;
      }
      return null;
    } catch {
      return null;
    }
  }

  protected async callAI(
    systemPrompt: string,
    userPrompt: string,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    return aiCall({
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 4096,
      stream: false,
    });
  }

  protected async callAIStream(
    systemPrompt: string,
    userPrompt: string,
    onChunk: (text: string) => void,
    options?: { temperature?: number; maxTokens?: number }
  ): Promise<string> {
    return aiCall({
      provider: this.provider,
      apiKey: this.apiKey,
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 16000,
      stream: true,
      onChunk,
    });
  }
}
