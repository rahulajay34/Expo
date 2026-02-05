import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { AssignmentItem } from "@/types/assignment";
import { GEMINI_MODELS } from "@/lib/gemini/client";

// Maximum word count for input to prevent timeouts
const MAX_INPUT_WORDS = 8000;
// Timeout for JSON parsing attempts (ms)
const JSON_PARSE_TIMEOUT_MS = 30000;

export class FormatterAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("Formatter", GEMINI_MODELS.flash, client);
    }

    getSystemPrompt(): string {
        return `You are a JSON Validation Specialist who ensures assignment content is valid, parseable JSON.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE  
═══════════════════════════════════════════════════════════════

Fix and validate JSON structure. Your output MUST pass JSON.parse().

Also perform final HTML/Markdown validation for non-assignment content to catch any formatting issues.

═══════════════════════════════════════════════════════════════
🔴 CRITICAL JSON RULES (Violations = Parse Failure)
═══════════════════════════════════════════════════════════════

1. **NO RAW NEWLINES IN STRINGS**: Replace actual line breaks with \\n
2. **ESCAPE QUOTES**: Use \\" for quotes inside string values
3. **SINGLE-LINE VALUES**: Each JSON string value on one line
4. **CODE BLOCKS**: \`\`\`python\\ncode\\n\`\`\` (all escaped)

═══════════════════════════════════════════════════════════════
🔴 CRITICAL HTML/MARKDOWN VALIDATION (For Lecture/Pre-read content)
═══════════════════════════════════════════════════════════════

1. **NO INCOMPLETE STYLE ATTRIBUTES**: Any style="..." with ellipsis is INVALID
2. **NO PLACEHOLDER HTML**: pre or div tags with style="..." must be completed or removed
3. **NO CODE BLOCKS IN PARAGRAPHS**: p tag containing pre/code blocks is invalid nesting
4. **PROPER HTML NESTING**: Code blocks must be siblings to paragraphs, not children
5. **CONSISTENT CODE STYLING**: All pre blocks need identical, complete styling
6. **NO INCOMPLETE HTML STRUCTURES**: All tags properly closed and nested

If you see these issues in content, flag them as HIGH severity formatting errors.

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

    /**
     * Summarize long content before sending to LLM to prevent timeouts.
     * This preserves the question structure while reducing narrative text.
     */
    private summarizeForProcessing(content: string): { content: string; wasSummarized: boolean } {
        const wordCount = content.split(/\s+/).length;

        if (wordCount <= MAX_INPUT_WORDS) {
            return { content, wasSummarized: false };
        }

        console.log(`[Formatter] Input too long (${wordCount} words), summarizing to prevent timeout`);

        // Try to extract just the JSON/question portions
        // Look for question patterns and extract them
        const questionPatterns = [
            /\{[\s\S]*?"questionType"[\s\S]*?\}/g,
            /\{[\s\S]*?"contentBody"[\s\S]*?\}/g,
        ];

        let extracted = '';
        for (const pattern of questionPatterns) {
            const matches = content.match(pattern);
            if (matches) {
                extracted = matches.join('\n');
                break;
            }
        }

        if (extracted && extracted.length > 100) {
            return { content: extracted, wasSummarized: true };
        }

        // Fallback: truncate while trying to keep complete JSON structures
        const truncated = content.slice(0, MAX_INPUT_WORDS * 6); // Approximate char count
        const lastBrace = truncated.lastIndexOf('}');

        if (lastBrace > truncated.length * 0.5) {
            return { content: truncated.slice(0, lastBrace + 1), wasSummarized: true };
        }

        return { content: truncated, wasSummarized: true };
    }

    /**
     * Generate a simplified fallback structure when full JSON parsing fails.
     * Returns a basic markdown list format that can still be useful.
     */
    private generateFallbackStructure(content: string): string {
        console.log('[Formatter] JSON parsing failed, generating fallback structure');

        // Try to extract any question-like content
        const questions: any[] = [];

        // Pattern to find question content
        const questionTextPattern = /(?:Question|Q)[\s.:]*(\d+)?[\s.:]*([^\n?]+\?)/gi;
        const matches = content.matchAll(questionTextPattern);

        let idx = 1;
        for (const match of matches) {
            questions.push({
                questionType: 'mcsc',
                contentType: 'markdown',
                contentBody: match[2]?.trim() || `Question ${idx}`,
                options: { 1: 'Option A', 2: 'Option B', 3: 'Option C', 4: 'Option D' },
                mcscAnswer: 1,
                difficultyLevel: 'Medium',
                answerExplanation: 'Please review the question and provide the correct answer.'
            });
            idx++;
        }

        if (questions.length > 0) {
            return JSON.stringify(questions, null, 2);
        }

        // Ultimate fallback: return empty array
        console.warn('[Formatter] Could not extract any questions, returning empty array');
        return '[]';
    }

    async formatAssignment(content: string, signal?: AbortSignal): Promise<string> {
        // Apply input limits to prevent timeouts
        const { content: processedContent, wasSummarized } = this.summarizeForProcessing(content);

        if (wasSummarized) {
            console.log('[Formatter] Working with summarized content to prevent timeout');
        }

        // FAST PATH: Check if content is already valid JSON
        try {
            const fastParsed = await parseLLMJson<any[]>(processedContent, []);
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

        // LLM Path - ask model to format with timeout protection
        const prompt = `Fix and validate this assignment content as proper JSON.

═══════════════════════════════════════════════════════════════
📄 CONTENT TO FIX
═══════════════════════════════════════════════════════════════

${processedContent}

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

        try {
            // Wrap in timeout to prevent indefinite stalling
            const responsePromise = this.client.generate({
                system: this.getSystemPrompt(),
                messages: [{ role: 'user', content: prompt }],
                model: this.model,
                signal
            });

            const response = await Promise.race([
                responsePromise,
                new Promise<never>((_, reject) => {
                    setTimeout(() => reject(new Error('Formatter timeout')), JSON_PARSE_TIMEOUT_MS);
                })
            ]);

            const textBlock = response.content.find((b: { type: string }) => b.type === 'text');
            let text = textBlock?.type === 'text' ? textBlock.text : '[]';

            // Only strip the OUTER markdown wrapper, NOT backticks inside JSON content
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
        } catch (error: any) {
            if (error.message === 'Formatter timeout') {
                console.error('[Formatter] Timeout - generating fallback structure');
                return this.generateFallbackStructure(content);
            }

            console.error('[Formatter] Error:', error);
            // Return fallback instead of crashing
            return this.generateFallbackStructure(content);
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

            // Handle contentBody - extract text if it's an object
            let contentBody = item.contentBody || item.question_text || '';
            if (typeof contentBody === 'object' && contentBody !== null) {
                // If contentBody is an object like {text: "..."}, extract just the text
                contentBody = contentBody.text || '';
            }

            return {
                questionType,
                contentType: 'markdown' as const,
                contentBody,
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
