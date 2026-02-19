import { BaseAgent } from './base-agent';
import type { CourseContext, ReviewResult } from '../../types';
import { parseLLMJson } from './utils/json-parser';

export class ReviewerAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('Reviewer', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are a Senior Content Quality Director with 15+ years in educational publishing.

Your standards are HIGH but FAIR. Provide SPECIFIC, ACTIONABLE feedback.

## Scoring Philosophy
• 10: Perfect. Extremely rare.
• 9: Excellent. Publication-ready. THIS IS THE TARGET.
• 8: Very Good. One or two minor issues.
• 7: Good. Specific issues to address.
• 6: Mediocre. Multiple problems.
• <6: Needs rework.

## Automatic Failure Criteria (score ≤ 7)
1. AI-sounding patterns ("It's important to note...", "Let's dive in...")
2. Meta-references (to transcript, source material)
3. Formatting issues (broken markdown, inconsistent headings)
4. Superficial content

## JSON Output Rules
Use SINGLE QUOTES for quoted text within string values.
Return ONLY valid JSON: { "needsPolish": boolean, "feedback": string, "score": number, "detailedFeedback": string[] }`;
  }

  async review(content: string, mode: string, courseContext?: CourseContext): Promise<ReviewResult> {
    const customPrompt = await this.getCustomPrompt('reviewer');
    const system = customPrompt || this.getSystemPrompt();

    let domainCriteria = '';
    if (courseContext) {
      domainCriteria = `\nDomain: ${courseContext.domain}\n${courseContext.qualityCriteria}\n`;
    }

    const prompt = `Review this ${mode} content:\n\n${content.slice(0, 20000)}\n${domainCriteria}\n\nReturn JSON: { "needsPolish": boolean, "feedback": string, "score": number, "detailedFeedback": string[] }`;

    const result = await this.callAI(system, prompt);
    return parseLLMJson<ReviewResult>(result, {
      needsPolish: false,
      feedback: 'Review completed',
      score: 8,
      detailedFeedback: [],
    });
  }
}
