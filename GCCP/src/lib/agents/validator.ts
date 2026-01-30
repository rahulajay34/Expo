import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";

export interface ValidationResult {
    isValid: boolean;     // If true, no refinement needed (Score > 8 AND No hallucinations)
    needsRefinement: boolean;
    score: number;
    feedback: string;
    issues: string[];     // specific issues found
}

export class ValidatorAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        // Using Haiku for cost efficiency check
        super("Validator", "claude-sonnet-4-5-20250929", client, "analytical");
    }

    getSystemPrompt(mode: string): string {
        if (mode === 'assignment') {
            return `You are a Quality Assurance Specialist for educational assessments.
Your goal is to validate assignment questions for:
1. SCHEMA COMPLIANCE: Each question must have correct structure
2. ANSWER VALIDITY: mcsc has ONE answer, mcmc has 2+ answers
3. OPTION QUALITY: All 4 options must be populated and plausible
4. EXPLANATION QUALITY: Explanations teach the concept

Be strict on schema issues. Pass only well-formed questions.`;
        }

        return `You are a Lead Editor and Fact Checker.
Your goal is to validate educational content for:
1. ACCURACY: Verify facts against the provided Source Material (if any).
2. QUALITY: Assess clarity, flow, structure, and engagement.

Be strict but constructive. High quality content should pass without interference.`;
    }

    async validate(content: string, transcript: string | null, mode: string): Promise<ValidationResult> {
        // For assignment mode, use specialized prompt
        if (mode === 'assignment') {
            return this.validateAssignment(content);
        }

        let prompt = `Validate the following content.`;

        if (transcript) {
            prompt += `\n\nSOURCE MATERIAL (Transcript):
${transcript.slice(0, 50000)}${transcript.length > 50000 ? '...[truncated]' : ''}
⚠️ CRITICAL: Check for hallucinations. Any claim in the content NOT supported by the source must be flagged. Educational explanations are allowed, but specific attributions or claims about "what was said" must be accurate.`;
        }

        prompt += `\n\nCONTENT TO DATACHECK:
${content.slice(0, 15000)}

EVALUATION CRITERIA:
1. Hallucinations: Are there claims not supported by the transcript? (Fail immediately if yes)
2. Clarity: Is the writing clear, concise, and easy to understand?
3. Structure: Does it follow a logical flow?
4. AI Patterns: Are there robotic phrases like "In this section...", "As mentioned..."?

OUTPUT FORMAT (JSON ONLY):
{
  "score": <number 0-10>,
  "has_hallucinations": <boolean>,
  "main_issues": ["list", "of", "major", "issues"],
  "refinement_instructions": "Specific instructions for the editor to fix the issues. If score > 8 and no hallucinations, keep brief."
}

SCORING:
- 9-10: Perfect accuracy, great style. (PASS)
- < 9: Hallucinations present OR style needs work. (NEEDS REFINEMENT)
`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(mode),
            messages: [{ role: 'user', content: prompt }],
            model: this.model
        });

        const text = response.content.find((b: { type: string }) => b.type === 'text')?.text || "{}";

        try {
            const result = await parseLLMJson<any>(text, {});
            const score = typeof result.score === 'number' ? result.score : 7;
            const hasHallucinations = !!result.has_hallucinations;

            // It needs refinement if score is low OR hallucinations exist
            const needsRefinement = score <= 8 || hasHallucinations;

            // Construct feedback
            let feedback = result.refinement_instructions || "General polish needed.";
            if (hasHallucinations) {
                feedback = `Fix hallucinations: ${feedback}`;
            }

            return {
                isValid: !needsRefinement,
                needsRefinement,
                score,
                feedback,
                issues: result.main_issues || []
            };
        } catch (e) {
            console.error("Validator JSON parse error", e);
            return {
                isValid: false,
                needsRefinement: true,
                score: 5,
                feedback: "Validate and polish content (parser error).",
                issues: ["Parser error"]
            };
        }
    }

    /**
     * Specialized validation for assignment questions
     */
    private async validateAssignment(content: string): Promise<ValidationResult> {
        const prompt = `Validate this assignment JSON for quality and schema compliance.

CONTENT:
${content.slice(0, 15000)}

CHECK EACH QUESTION FOR:
1. "questionType" must be "mcsc", "mcmc", or "subjective"
2. "contentBody" must be clear and unambiguous
3. "options" must be an object with keys "1", "2", "3", "4" (all populated for mcsc/mcmc)
4. "mcscAnswer" (for mcsc) must be a NUMBER 1-4, exactly ONE correct
5. "mcmcAnswer" (for mcmc) must be a string like "1, 3" with 2+ correct answers
6. "subjectiveAnswer" (for subjective) must provide a model answer
7. "answerExplanation" must teach the concept, not just restate the answer

OUTPUT (JSON ONLY):
{
  "score": <number 0-10>,
  "schema_issues": ["Missing options.3 in question 2", "mcmcAnswer has only 1 value in question 4"],
  "quality_issues": ["Question 1 explanation is too brief"],
  "refinement_instructions": "Specific fixes needed. Be actionable: 'Add option 3 to question 2', 'Add second correct answer to question 4'"
}

SCORING:
- 9-10: All schema correct, high quality (PASS)
- 6-8: Minor issues, can be refined
- < 6: Major schema violations, needs regeneration`;

        const response = await this.client.generate({
            system: this.getSystemPrompt('assignment'),
            messages: [{ role: 'user', content: prompt }],
            model: this.model
        });

        const text = response.content.find((b: { type: string }) => b.type === 'text')?.text || "{}";

        try {
            const result = await parseLLMJson<any>(text, {});
            const score = typeof result.score === 'number' ? result.score : 7;

            const allIssues = [
                ...(result.schema_issues || []),
                ...(result.quality_issues || [])
            ];

            const needsRefinement = score <= 8 || allIssues.length > 0;

            return {
                isValid: !needsRefinement,
                needsRefinement,
                score,
                feedback: result.refinement_instructions || "Fix assignment issues.",
                issues: allIssues
            };
        } catch (e) {
            console.error("Validator JSON parse error", e);
            return {
                isValid: false,
                needsRefinement: true,
                score: 5,
                feedback: "Validate assignment structure (parser error).",
                issues: ["Parser error"]
            };
        }
    }
}
