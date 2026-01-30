import { AnthropicClient } from "@/lib/anthropic/client";

/**
 * Task types for model routing
 */
export type TaskType = "creative" | "analytical" | "mechanical";

/**
 * Model routing configuration
 * Maps task types to appropriate models for cost optimization
 */
export const MODEL_ROUTING: Record<TaskType, { model: string; fallback: string }> = {
  creative: {
    model: "claude-sonnet-4-5-20250929",
    fallback: "claude-haiku-4-5-20251001",
  },
  analytical: {
    model: "claude-sonnet-4-5-20250929",
    fallback: "claude-haiku-4-5-20251001",
  },
  mechanical: {
    model: "claude-haiku-4-5-20251001",
    fallback: "claude-sonnet-4-5-20250929", // Fallback to stronger model if needed
  },
};

/**
 * Base class for all agents in the GCCP system
 */
export abstract class BaseAgent {
  protected name: string;
  public model: string;
  protected client: AnthropicClient;
  protected taskType: TaskType;
  protected useFallback: boolean = false;

  /**
   * @param name - Agent name for logging and identification
   * @param model - Default model to use (can be overridden by taskType routing)
   * @param client - Anthropic client instance
   * @param taskType - Type of task for model routing (creative, analytical, mechanical)
   */
  constructor(
    name: string,
    model: string,
    client: AnthropicClient,
    taskType: TaskType = "analytical"
  ) {
    this.name = name;
    this.client = client;
    this.taskType = taskType;
    this.model = this.resolveModel(model, taskType);
  }

  /**
   * Resolve the model to use based on task type routing
   */
  private resolveModel(explicitModel: string, taskType: TaskType): string {
    // If an explicit model is provided and taskType is not set, use explicit
    // Otherwise, use task-based routing for cost optimization
    const routing = MODEL_ROUTING[taskType];
    
    // For mechanical tasks, always use the cheaper model
    if (taskType === "mechanical") {
      return routing.model;
    }
    
    // For creative/analytical, use routing config
    return routing.model;
  }

  /**
   * Get the system prompt for this agent
   */
  abstract getSystemPrompt(mode?: string): string;

  /**
   * Switch to fallback model (e.g., for rate limits)
   */
  useFallbackModel(): void {
    const routing = MODEL_ROUTING[this.taskType];
    this.model = routing.fallback;
    this.useFallback = true;
    console.warn(`[${this.name}] Switched to fallback model: ${this.model}`);
  }

  /**
   * Reset to primary model
   */
  resetToPrimaryModel(): void {
    const routing = MODEL_ROUTING[this.taskType];
    this.model = routing.model;
    this.useFallback = false;
  }

  /**
   * Get current model info
   */
  getModelInfo(): { primary: string; fallback: string; current: string; taskType: TaskType } {
    const routing = MODEL_ROUTING[this.taskType];
    return {
      primary: routing.model,
      fallback: routing.fallback,
      current: this.model,
      taskType: this.taskType,
    };
  }
}
