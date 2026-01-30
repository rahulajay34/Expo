import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";

/**
 * Critic Agent - Automated Content Quality Assessment
 * 
 * Evaluates generated content on multiple dimensions and provides
 * structured feedback for potential regeneration loops.
 * Uses cheaper model (Haiku) since it's an evaluation task.
 */

export interface CriticCategoryScore {
  score: number; // 1-10
  weight: number; // 0-1
  feedback: string;
}

export interface CriticFeedback {
  overall_score: number; // 1-10
  category_scores: {
    theoretical_practical_balance: CriticCategoryScore;
    clarity_structure: CriticCategoryScore;
    accuracy_depth: CriticCategoryScore;
    engagement_level: CriticCategoryScore;
  };
  feedback_summary: string;
  actionable_improvements: string[];
  meets_threshold: boolean;
  recommended_action: "publish" | "refine" | "regenerate";
}

export class CriticAgent extends BaseAgent {
  constructor(client: AnthropicClient) {
    // Use Haiku for cost efficiency - evaluation is a classification/analytical task
    super("Critic", "claude-haiku-4-5-20251001", client, "mechanical");
  }

  getSystemPrompt(): string {
    return `You are an Expert Content Quality Assessor specializing in educational materials.

Your role is to objectively evaluate content quality across multiple dimensions and provide structured, actionable feedback. You are thorough but fair—your assessments directly impact whether content gets published or sent back for improvement.

═══════════════════════════════════════════════════════════════
📊 EVALUATION DIMENSIONS
═══════════════════════════════════════════════════════════════

1. THEORETICAL VS PRACTICAL BALANCE (Target: 20% theory, 80% practical)
   - Score 9-10: Perfect balance, mostly hands-on with just enough theory
   - Score 7-8: Good balance, could use more practical examples
   - Score 5-6: Too theoretical, needs more application
   - Score <5: Overwhelmingly abstract, lacks concrete examples

2. CLARITY AND STRUCTURE
   - Score 9-10: Crystal clear, logical flow, excellent headings
   - Score 7-8: Clear but some sections could be better organized
   - Score 5-6: Understandable but confusing in places
   - Score <5: Disorganized, hard to follow

3. ACCURACY AND DEPTH
   - Score 9-10: Accurate, comprehensive, appropriate depth
   - Score 7-8: Mostly accurate, good depth with minor gaps
   - Score 5-6: Some inaccuracies or superficial coverage
   - Score <5: Significant errors or very shallow

4. ENGAGEMENT LEVEL
   - Score 9-10: Captivating, conversational, memorable
   - Score 7-8: Engaging but occasionally dry
   - Score 5-6: Neutral, textbook-like
   - Score <5: Boring, robotic, or AI-sounding

═══════════════════════════════════════════════════════════════
⚠️ AUTOMATIC RED FLAGS (Reduce score significantly)
═══════════════════════════════════════════════════════════════

- AI-sounding phrases: "It's important to note", "Let's dive in", "As mentioned earlier"
- Meta-references: "In this section", "According to the transcript", course names
- Walls of text without breaks
- No concrete examples for abstract concepts
- Unescaped dollar signs in non-math content
- Passive voice throughout

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "overall_score": <number 1-10>,
  "category_scores": {
    "theoretical_practical_balance": {
      "score": <number 1-10>,
      "weight": 0.25,
      "feedback": "Specific feedback on theory/practice balance"
    },
    "clarity_structure": {
      "score": <number 1-10>,
      "weight": 0.25,
      "feedback": "Specific feedback on clarity and organization"
    },
    "accuracy_depth": {
      "score": <number 1-10>,
      "weight": 0.25,
      "feedback": "Specific feedback on accuracy and depth"
    },
    "engagement_level": {
      "score": <number 1-10>,
      "weight": 0.25,
      "feedback": "Specific feedback on engagement and voice"
    }
  },
  "feedback_summary": "One-paragraph summary of overall assessment",
  "actionable_improvements": [
    "Specific, actionable item 1",
    "Specific, actionable item 2"
  ],
  "meets_threshold": <boolean - true if overall_score >= 8>,
  "recommended_action": "publish" | "refine" | "regenerate"
}

RECOMMENDED_ACTION thresholds:
- "publish": overall_score >= 8.5
- "refine": overall_score >= 6.5 and < 8.5
- "regenerate": overall_score < 6.5

Return ONLY valid JSON. No markdown code fences, no explanatory text.`;
  }

  async evaluate(
    content: string,
    mode: string,
    transcript?: string | null
  ): Promise<CriticFeedback> {
    const prompt = this.buildEvaluationPrompt(content, mode, transcript);

    try {
      const response = await this.client.generate({
        system: this.getSystemPrompt(),
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        temperature: 0.2, // Low temperature for consistent evaluation
      });

      const textBlock = response.content.find(
        (b: { type: string }) => b.type === "text"
      ) as { type: "text"; text: string } | undefined;
      const text = textBlock?.text || "{}";

      const result = await parseLLMJson<any>(text, {});

      return this.normalizeFeedback(result);
    } catch (error) {
      console.error("CriticAgent evaluation failed:", error);
      // Return safe fallback that triggers refinement
      return this.getFallbackFeedback();
    }
  }

  private buildEvaluationPrompt(
    content: string,
    mode: string,
    transcript?: string | null
  ): string {
    const transcriptSection = transcript
      ? `
═══════════════════════════════════════════════════════════════
📄 SOURCE TRANSCRIPT (For Accuracy Check)
═══════════════════════════════════════════════════════════════

${transcript.slice(0, 10000)}`
      : "";

    return `═══════════════════════════════════════════════════════════════
📝 CONTENT TO EVALUATE (${mode} mode)
═══════════════════════════════════════════════════════════════

${content.slice(0, 15000)}${content.length > 15000 ? "\n...[truncated]" : ""}
${transcriptSection}

═══════════════════════════════════════════════════════════════
🔍 EVALUATION TASK
═══════════════════════════════════════════════════════════════

Evaluate this content across all four dimensions:
1. Theoretical vs Practical Balance (20/80 target)
2. Clarity and Structure
3. Accuracy and Depth
4. Engagement Level

Provide specific, actionable feedback. Be thorough but fair.

Return ONLY the JSON response in the specified format.`;
  }

  private normalizeFeedback(result: any): CriticFeedback {
    const overallScore =
      typeof result.overall_score === "number" ? result.overall_score : 7;

    const defaultCategory = {
      score: 7,
      weight: 0.25,
      feedback: "No specific feedback provided",
    };

    const categories = result.category_scores || {};

    return {
      overall_score: overallScore,
      category_scores: {
        theoretical_practical_balance: {
          score:
            typeof categories.theoretical_practical_balance?.score === "number"
              ? categories.theoretical_practical_balance.score
              : defaultCategory.score,
          weight:
            typeof categories.theoretical_practical_balance?.weight === "number"
              ? categories.theoretical_practical_balance.weight
              : 0.25,
          feedback:
            categories.theoretical_practical_balance?.feedback ||
            defaultCategory.feedback,
        },
        clarity_structure: {
          score:
            typeof categories.clarity_structure?.score === "number"
              ? categories.clarity_structure.score
              : defaultCategory.score,
          weight:
            typeof categories.clarity_structure?.weight === "number"
              ? categories.clarity_structure.weight
              : 0.25,
          feedback:
            categories.clarity_structure?.feedback || defaultCategory.feedback,
        },
        accuracy_depth: {
          score:
            typeof categories.accuracy_depth?.score === "number"
              ? categories.accuracy_depth.score
              : defaultCategory.score,
          weight:
            typeof categories.accuracy_depth?.weight === "number"
              ? categories.accuracy_depth.weight
              : 0.25,
          feedback:
            categories.accuracy_depth?.feedback || defaultCategory.feedback,
        },
        engagement_level: {
          score:
            typeof categories.engagement_level?.score === "number"
              ? categories.engagement_level.score
              : defaultCategory.score,
          weight:
            typeof categories.engagement_level?.weight === "number"
              ? categories.engagement_level.weight
              : 0.25,
          feedback:
            categories.engagement_level?.feedback || defaultCategory.feedback,
        },
      },
      feedback_summary:
        result.feedback_summary || "Evaluation completed with no major issues.",
      actionable_improvements: Array.isArray(result.actionable_improvements)
        ? result.actionable_improvements
        : ["Review content for general improvements"],
      meets_threshold:
        typeof result.meets_threshold === "boolean"
          ? result.meets_threshold
          : overallScore >= 8,
      recommended_action: ["publish", "refine", "regenerate"].includes(
        result.recommended_action
      )
        ? result.recommended_action
        : overallScore >= 8.5
        ? "publish"
        : overallScore >= 6.5
        ? "refine"
        : "regenerate",
    };
  }

  private getFallbackFeedback(): CriticFeedback {
    return {
      overall_score: 7,
      category_scores: {
        theoretical_practical_balance: {
          score: 7,
          weight: 0.25,
          feedback: "Evaluation failed - manual review recommended",
        },
        clarity_structure: {
          score: 7,
          weight: 0.25,
          feedback: "Evaluation failed - manual review recommended",
        },
        accuracy_depth: {
          score: 7,
          weight: 0.25,
          feedback: "Evaluation failed - manual review recommended",
        },
        engagement_level: {
          score: 7,
          weight: 0.25,
          feedback: "Evaluation failed - manual review recommended",
        },
      },
      feedback_summary:
        "Automated evaluation encountered an error. Content requires manual review.",
      actionable_improvements: [
        "Review content manually due to evaluation failure",
      ],
      meets_threshold: false,
      recommended_action: "refine",
    };
  }

  /**
   * Calculate weighted score from category scores
   */
  calculateWeightedScore(categoryScores: CriticFeedback["category_scores"]): number {
    const categories = Object.values(categoryScores);
    const totalWeight = categories.reduce((sum, cat) => sum + cat.weight, 0);
    const weightedSum = categories.reduce(
      (sum, cat) => sum + cat.score * cat.weight,
      0
    );
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Determine if content should be regenerated based on feedback
   */
  shouldRegenerate(feedback: CriticFeedback): boolean {
    return (
      feedback.recommended_action === "regenerate" ||
      feedback.overall_score < 6.5 ||
      feedback.category_scores.accuracy_depth.score < 5
    );
  }

  /**
   * Get the lowest scoring category for targeted improvement
   */
  getWeakestCategory(
    categoryScores: CriticFeedback["category_scores"]
  ): { name: string; score: number; feedback: string } {
    const entries = Object.entries(categoryScores);
    const weakest = entries.reduce((min, [name, data]) =>
      data.score < min.score ? { name, score: data.score, feedback: data.feedback } : min,
      { name: entries[0][0], score: entries[0][1].score, feedback: entries[0][1].feedback }
    );
    return weakest;
  }
}
