import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { AssignmentItem } from "@/types/assignment";

export class FormatterAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Formatter", "claude-haiku-4-5-20251001", client);
    }

    getSystemPrompt(): string {
        return `You are a JSON Validation Specialist who ensures assignment content is valid, parseable JSON.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE  
═══════════════════════════════════════════════════════════════

Fix and validate JSON structure. Your output MUST pass JSON.parse().

═══════════════════════════════════════════════════════════════
🔴 CRITICAL JSON RULES (Violations = Parse Failure)
═══════════════════════════════════════════════════════════════

1. **NO RAW NEWLINES IN STRINGS**: Replace actual line breaks with \\n
2. **ESCAPE QUOTES**: Use \\" for quotes inside string values
3. **SINGLE-LINE VALUES**: Each JSON string value on one line
4. **CODE BLOCKS**: \`\`\`python\\ncode\\n\`\`\` (all escaped)

═══════════════════════════════════════════════════════════════
✅ VALID JSON EXAMPLE
═══════════════════════════════════════════════════════════════

[{"questionType": "mcsc", "contentBody": "What is 2+2?", "options": {"1": "3", "2": "4", "3": "5", "4": "6"}, "mcscAnswer": 2, "difficultyLevel": "0.3", "answerExplanation": "2+2=4. Option 2 is correct."}]

═══════════════════════════════════════════════════════════════
� ABSOLUTELY FORBIDDEN OUTPUT FORMATS
═══════════════════════════════════════════════════════════════

DO NOT wrap in markdown code blocks:
❌ WRONG: \`\`\`json\n[...]\n\`\`\`
❌ WRONG: \`\`\`\n[...]\n\`\`\`
✅ CORRECT: [...]

DO NOT add ANY text before or after the JSON.

═══════════════════════════════════════════════════════════════
📤 OUTPUT
═══════════════════════════════════════════════════════════════

Output ONLY raw JSON starting with [ and ending with ]. NO markdown. NO explanatory text.`;
    }

    async formatAssignment(content: string, signal?: AbortSignal): Promise<string> {
        // FAST PATH: Check if content is already valid JSON
        try {
            const fastParsed = await parseLLMJson<any[]>(content, []);
            if (fastParsed.length > 0) {
                // Check if it's already in new format
                if (fastParsed[0].questionType || fastParsed[0].contentBody) {
                    const validated = this.ensureAssignmentItemFormat(fastParsed);
                    console.log("Formatter: Fast Path (new format) - skipping LLM");
                    return JSON.stringify(validated, null, 2);
                }
            }
        } catch (e) {
            // Fast path failed, proceed to LLM
        }

        // LLM Path - ask model to format
        const prompt = `Fix and validate this assignment content as proper JSON.

═══════════════════════════════════════════════════════════════
📄 CONTENT TO FIX
═══════════════════════════════════════════════════════════════

${content}

═══════════════════════════════════════════════════════════════
🔴 FIX THESE JSON ISSUES
═══════════════════════════════════════════════════════════════

1. Replace ALL raw newlines in strings with \\n
2. Escape ALL double quotes inside strings as \\"
3. Ensure each string value is on ONE line
4. Fix any trailing commas before ] or }
5. Convert A/B/C/D answers to 1/2/3/4

═══════════════════════════════════════════════════════════════
📦 REQUIRED STRUCTURE
═══════════════════════════════════════════════════════════════

[{"questionType": "mcsc", "contentBody": "...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "mcscAnswer": 2, "difficultyLevel": "0.5", "answerExplanation": "..."}]

═══════════════════════════════════════════════════════════════
📤 OUTPUT  
═══════════════════════════════════════════════════════════════

Output the fixed JSON array as RAW JSON ONLY.

🚫 DO NOT wrap in \`\`\`json ... \`\`\` markdown code blocks.
🚫 DO NOT add explanatory text.
✅ Start directly with [ and end with ].

Must be parseable by JSON.parse().`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: 'user', content: prompt }],
            model: this.model,
            signal
        });

        const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
        let text = textBlock?.type === 'text' ? textBlock.text : '[]';

        // Only strip the OUTER markdown wrapper, NOT backticks inside JSON content
        // This regex matches ```json at the very start and ``` at the very end
        text = text.trim();
        if (text.startsWith('```json')) {
            text = text.slice(7);
        } else if (text.startsWith('```')) {
            text = text.slice(3);
        }
        if (text.endsWith('```')) {
            text = text.slice(0, -3);
        }
        text = text.trim();

        try {
            const parsed = await parseLLMJson<any[]>(text, []);
            const formatted = this.ensureAssignmentItemFormat(parsed);
            return JSON.stringify(formatted, null, 2);
        } catch (e) {
            console.error("Formatter JSON parse error, attempting recovery", e);
            return this.attemptRecovery(text);
        }
    }

    /**
     * Ensure all items conform to AssignmentItem interface
     */
    private ensureAssignmentItemFormat(items: any[]): AssignmentItem[] {
        return items.map(item => {
            // Ensure options is an object with keys 1-4
            let options = item.options;
            if (Array.isArray(options)) {
                options = {
                    1: options[0] || '',
                    2: options[1] || '',
                    3: options[2] || '',
                    4: options[3] || '',
                };
            } else if (!options) {
                options = { 1: '', 2: '', 3: '', 4: '' };
            }

            // Normalize questionType
            let questionType = item.questionType || 'mcsc';
            questionType = questionType.toLowerCase();

            // Handle answer conversion from letters to numbers
            let mcscAnswer = item.mcscAnswer;
            let mcmcAnswer = item.mcmcAnswer;

            if (item.correct_option && !mcscAnswer && !mcmcAnswer) {
                const letterToNum: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
                if (questionType === 'mcsc') {
                    mcscAnswer = letterToNum[item.correct_option.toUpperCase().trim()] || 1;
                } else if (questionType === 'mcmc') {
                    const letters = item.correct_option.split(',').map((l: string) => l.trim().toUpperCase());
                    mcmcAnswer = letters.map((l: string) => letterToNum[l]).filter(Boolean).join(', ');
                }
            }

            return {
                questionType,
                contentType: 'markdown' as const,
                contentBody: item.contentBody || item.question_text || '',
                options,
                mcscAnswer: questionType === 'mcsc' ? mcscAnswer : undefined,
                mcmcAnswer: questionType === 'mcmc' ? mcmcAnswer : undefined,
                subjectiveAnswer: questionType === 'subjective' ? (item.subjectiveAnswer || item.model_answer) : undefined,
                difficultyLevel: item.difficultyLevel || 'Medium',
                answerExplanation: item.answerExplanation || item.explanation || '',
            } as AssignmentItem;
        });
    }

    /**
     * Attempt to recover from parse errors
     */
    private attemptRecovery(text: string): string {
        try {
            const questions: any[] = [];
            const objectMatches = text.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);

            for (const match of objectMatches) {
                try {
                    const obj = JSON.parse(match[0]);
                    if ((obj.questionType) && (obj.contentBody)) {
                        questions.push(obj);
                    }
                } catch {
                    // Skip malformed objects
                }
            }

            if (questions.length > 0) {
                console.log(`Recovered ${questions.length} questions from partial JSON`);
                const formatted = this.ensureAssignmentItemFormat(questions);
                return JSON.stringify(formatted, null, 2);
            }
        } catch (recoveryError) {
            console.error("Recovery also failed", recoveryError);
        }

        return '[]';
    }
}
