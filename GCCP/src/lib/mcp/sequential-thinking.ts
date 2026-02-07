/**
 * Sequential Thinking Service
 * 
 * Provides structured, step-by-step reasoning capabilities using the
 * @modelcontextprotocol/server-sequential-thinking pattern.
 * 
 * This service enables:
 * - Dynamic reasoning with branching and revision
 * - Auditable thought chains for debugging
 * - Enhanced planning and analysis capabilities
 */

export interface ThinkingStep {
    id: string;
    thought: string;
    type: 'analysis' | 'hypothesis' | 'verification' | 'conclusion' | 'revision';
    confidence: number; // 0-1
    dependencies?: string[]; // IDs of dependent steps
    timestamp: number;
}

export interface ThinkingChain {
    id: string;
    topic: string;
    steps: ThinkingStep[];
    totalSteps: number;
    finalConclusion?: string;
    needsMoreSteps: boolean;
    startTime: number;
    endTime?: number;
}

export interface SequentialThinkingOptions {
    maxSteps?: number;
    minConfidence?: number; // Stop when confidence exceeds this
    allowRevisions?: boolean;
    verbose?: boolean;
}

const DEFAULT_OPTIONS: Required<SequentialThinkingOptions> = {
    maxSteps: 10,
    minConfidence: 0.85,
    allowRevisions: true,
    verbose: false
};

/**
 * Sequential Thinking Service Class
 * 
 * Uses LLM to perform structured reasoning through steps,
 * with dynamic adjustments based on intermediate results.
 */
export class SequentialThinkingService {
    private chains: Map<string, ThinkingChain> = new Map();
    private generateId = () => Math.random().toString(36).slice(2, 10);

    /**
     * Start a new thinking chain for a given topic
     */
    startChain(topic: string): ThinkingChain {
        const id = this.generateId();
        const chain: ThinkingChain = {
            id,
            topic,
            steps: [],
            totalSteps: 0,
            needsMoreSteps: true,
            startTime: Date.now()
        };
        this.chains.set(id, chain);
        return chain;
    }

    /**
     * Add a thinking step to an existing chain
     */
    addStep(
        chainId: string,
        thought: string,
        type: ThinkingStep['type'],
        confidence: number,
        dependencies?: string[]
    ): ThinkingStep {
        const chain = this.chains.get(chainId);
        if (!chain) throw new Error(`Chain ${chainId} not found`);

        const step: ThinkingStep = {
            id: this.generateId(),
            thought,
            type,
            confidence: Math.min(1, Math.max(0, confidence)),
            dependencies,
            timestamp: Date.now()
        };

        chain.steps.push(step);
        chain.totalSteps++;

        return step;
    }

    /**
     * Mark chain as complete with final conclusion
     */
    completeChain(chainId: string, conclusion: string): ThinkingChain {
        const chain = this.chains.get(chainId);
        if (!chain) throw new Error(`Chain ${chainId} not found`);

        chain.finalConclusion = conclusion;
        chain.needsMoreSteps = false;
        chain.endTime = Date.now();

        return chain;
    }

    /**
     * Get chain by ID
     */
    getChain(chainId: string): ThinkingChain | undefined {
        return this.chains.get(chainId);
    }

    /**
     * Clear all chains (for memory management)
     */
    clearChains(): void {
        this.chains.clear();
    }
}

/**
 * Build a sequential thinking prompt for LLM
 * This structures the LLM's reasoning into explicit steps
 */
export function buildSequentialPrompt(
    task: string,
    context: string,
    previousSteps: ThinkingStep[] = [],
    options: SequentialThinkingOptions = {}
): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    let prompt = `You are performing SEQUENTIAL REASONING on a task. Think step-by-step, explicitly stating each thought.

## Task
${task}

## Context
${context}

## Instructions
1. Break down your thinking into numbered steps
2. For each step, indicate your confidence (0-1)
3. If you realize a previous step was incorrect, you may REVISE it
4. Continue until you reach a confident conclusion

`;

    if (previousSteps.length > 0) {
        prompt += `## Previous Steps (continue from here)\n`;
        previousSteps.forEach((step, i) => {
            prompt += `${i + 1}. [${step.type.toUpperCase()}] (confidence: ${step.confidence})\n   ${step.thought}\n\n`;
        });
        prompt += `\n## Continue your reasoning:\n`;
    } else {
        prompt += `## Begin your reasoning:\n`;
    }

    prompt += `
Respond in this JSON format:
{
  "steps": [
    {
      "type": "analysis|hypothesis|verification|conclusion|revision",
      "thought": "Your detailed thinking for this step",
      "confidence": 0.0-1.0
    }
  ],
  "needsMoreSteps": true/false,
  "finalConclusion": "Only if needsMoreSteps is false"
}`;

    return prompt;
}

/**
 * Parse LLM response into thinking steps
 */
export function parseSequentialResponse(response: string): {
    steps: Omit<ThinkingStep, 'id' | 'timestamp'>[];
    needsMoreSteps: boolean;
    finalConclusion?: string;
} {
    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON found in response');
        }

        const parsed = JSON.parse(jsonMatch[0]);

        return {
            steps: parsed.steps || [],
            needsMoreSteps: parsed.needsMoreSteps ?? true,
            finalConclusion: parsed.finalConclusion
        };
    } catch (error) {
        console.error('[SequentialThinking] Parse error:', error);
        // Return a single analysis step as fallback
        return {
            steps: [{
                type: 'analysis',
                thought: response.slice(0, 500),
                confidence: 0.5
            }],
            needsMoreSteps: false,
            finalConclusion: 'Failed to parse structured response'
        };
    }
}

/**
 * Create a singleton instance
 */
export const sequentialThinking = new SequentialThinkingService();

/**
 * Helper: Create a structured analysis prompt for transcript gaps
 */
export function createGapAnalysisPrompt(subtopic: string, transcript: string): string {
    return buildSequentialPrompt(
        `Analyze how thoroughly "${subtopic}" is covered in the following transcript`,
        `Transcript excerpt:\n${transcript.slice(0, 3000)}...`,
        [],
        { maxSteps: 5, minConfidence: 0.8 }
    );
}

/**
 * Helper: Create a structured review prompt for content quality
 */
export function createQualityReviewPrompt(
    content: string,
    criteria: string[]
): string {
    return buildSequentialPrompt(
        `Evaluate the educational content against the following criteria: ${criteria.join(', ')}`,
        `Content to review:\n${content.slice(0, 4000)}...`,
        [],
        { maxSteps: criteria.length + 2, minConfidence: 0.85 }
    );
}

/**
 * Helper: Create an orchestrator planning prompt
 */
export function createPlanningPrompt(
    topic: string,
    hasTranscript: boolean,
    contentMode: string,
    customInstructions?: string
): string {
    return buildSequentialPrompt(
        'Determine the optimal agent execution strategy for content generation',
        `
Topic: ${topic}
Has Transcript: ${hasTranscript}
Content Mode: ${contentMode}
${customInstructions ? `Custom Instructions: ${customInstructions}` : ''}

Available agents:
- CourseDetector: Matches topic to curriculum
- Analyzer: Analyzes transcript coverage
- InstructorQuality: Evaluates teaching quality
- Expander: Generates educational content
- Reviewer: Assesses content quality
- AssignmentGenerator: Creates questions
- Formatter: Formats assignments
`,
        [],
        { maxSteps: 4, minConfidence: 0.9 }
    );
}

/**
 * Helper: Create a debug analysis prompt for failed generations
 */
export function createDebugPrompt(
    errorMessage: string,
    agentLogs: string,
    executionContext: string
): string {
    return buildSequentialPrompt(
        'Perform root cause analysis on this failed content generation',
        `
Error: ${errorMessage}

Agent Logs:
${agentLogs}

Execution Context:
${executionContext}
`,
        [],
        { maxSteps: 6, allowRevisions: true }
    );
}
