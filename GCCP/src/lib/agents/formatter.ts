import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { AssignmentItem } from "@/types/assignment";

export type QuestionType = "mcsc" | "mcmc" | "subjective";

export interface QuestionSpec {
  type: QuestionType;
  count: number;
}

export interface QuestionGenerationOptions {
  topic: string;
  subtopics: string;
  type: QuestionType;
  transcript?: string;
  courseContext?: Record<string, unknown>;
  gapAnalysis?: Record<string, unknown> | null;
  existingQuestions?: AssignmentItem[];
}

export interface QuestionGenerationResult {
  success: boolean;
  question?: AssignmentItem;
  error?: string;
  attempts: number;
}

export class FormatterAgent extends BaseAgent {
  constructor(client: AnthropicClient) {
    super("Formatter", "claude-haiku-4-5-20251001", client, "mechanical");
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
📤 OUTPUT
═══════════════════════════════════════════════════════════════

Output ONLY a valid JSON array. NO markdown fences. NO explanatory text.`;
  }

  /**
   * Generate questions one-by-one with duplicate detection and retry logic
   */
  async generateQuestionsOneByOne(
    options: QuestionGenerationOptions,
    signal?: AbortSignal,
    onProgress?: (current: number, total: number, type: QuestionType) => void
  ): Promise<AssignmentItem[]> {
    const { topic, subtopics, type, transcript, courseContext, gapAnalysis } = options;
    const generatedQuestions: AssignmentItem[] = [];
    const questionFingerprints = new Set<string>();
    
    const totalCount = options.existingQuestions?.length || 0;
    let currentIndex = 0;

    // Process each question type separately
    for (const spec of this.getQuestionSpecs(options)) {
      for (let i = 0; i < spec.count; i++) {
        if (signal?.aborted) {
          throw new Error("Aborted");
        }

        const result = await this.generateSingleQuestionWithRetry({
          topic,
          subtopics,
          type: spec.type,
          transcript,
          courseContext,
          gapAnalysis,
          existingQuestions: generatedQuestions,
        }, questionFingerprints, signal);

        if (result.success && result.question) {
          generatedQuestions.push(result.question);
          
          // Add fingerprint for duplicate detection
          const fingerprint = this.getQuestionFingerprint(result.question);
          questionFingerprints.add(fingerprint);
        }

        currentIndex++;
        onProgress?.(currentIndex, totalCount, spec.type);
      }
    }

    return generatedQuestions;
  }

  /**
   * Generate a single question with retry logic for duplicates
   */
  private async generateSingleQuestionWithRetry(
    options: QuestionGenerationOptions,
    existingFingerprints: Set<string>,
    signal?: AbortSignal,
    maxRetries: number = 3
  ): Promise<QuestionGenerationResult> {
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;

      try {
        const question = await this.generateSingleQuestion(options, signal);
        
        if (!question) {
          continue;
        }

        // Check for duplicates
        const fingerprint = this.getQuestionFingerprint(question);
        
        if (existingFingerprints.has(fingerprint)) {
          console.warn(`Duplicate question detected (attempt ${attempts}), retrying...`);
          continue;
        }

        return {
          success: true,
          question,
          attempts,
        };
      } catch (error) {
        console.error(`Question generation failed (attempt ${attempts}):`, error);
        
        if (signal?.aborted) {
          throw error;
        }
      }
    }

    return {
      success: false,
      error: `Failed to generate unique question after ${maxRetries} attempts`,
      attempts,
    };
  }

  /**
   * Generate a single question using the LLM
   */
  private async generateSingleQuestion(
    options: QuestionGenerationOptions,
    signal?: AbortSignal
  ): Promise<AssignmentItem | null> {
    const { topic, subtopics, type, transcript, courseContext, gapAnalysis, existingQuestions } = options;

    const typeDescriptions: Record<QuestionType, string> = {
      mcsc: "Multiple choice question with exactly ONE correct answer (Single Correct)",
      mcmc: "Multiple choice question with MULTIPLE correct answers (Multiple Correct)",
      subjective: "Open-ended question requiring a written response",
    };

    const existingQuestionsText = existingQuestions && existingQuestions.length > 0
      ? `\nExisting questions (avoid duplicating these topics/concepts):\n${existingQuestions.map((q, i) => `${i + 1}. ${q.contentBody.slice(0, 100)}...`).join("\n")}`
      : "";

    const prompt = `Generate a single ${typeDescriptions[type]} for an educational assignment.

═══════════════════════════════════════════════════════════════
📋 QUESTION PARAMETERS
═══════════════════════════════════════════════════════════════

Topic: ${topic}
Subtopics: ${subtopics}
Question Type: ${type}
${transcript ? `\nBased on transcript (first 15000 chars):\n${transcript.slice(0, 15000)}` : ""}
${courseContext ? `\nCourse context: ${JSON.stringify(courseContext)}` : ""}
${gapAnalysis ? `\nGap analysis: ${JSON.stringify(gapAnalysis)}` : ""}
${existingQuestionsText}

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

Return a single JSON object with this exact structure:

{
  "questionType": "${type}",
  "contentBody": "The question text - clear and unambiguous",
  "options": ${type !== "subjective" ? '{"1": "Option A", "2": "Option B", "3": "Option C", "4": "Option D"}' : 'null'},
  ${type === "mcsc" ? '"mcscAnswer": 2,' : type === "mcmc" ? '"mcmcAnswer": "1, 3",' : '"subjectiveAnswer": "Model answer for subjective question",'}
  "difficultyLevel": "0.5",
  "answerExplanation": "Detailed explanation of why the answer is correct"
}

CRITICAL RULES:
- For MCSC: mcscAnswer must be a NUMBER (1, 2, 3, or 4)
- For MCMC: mcmcAnswer must be a STRING with comma-separated numbers (e.g., "1, 3" for options 1 and 3)
- For MCMC: at least 2 options must be correct
- For subjective: options should be null, provide a model answer in subjectiveAnswer
- difficultyLevel: string between "0.1" (easy) and "1.0" (hard)
- contentBody must be a complete, standalone question
- answerExplanation should teach the concept, not just state the answer

Return ONLY the JSON object. No markdown code fences, no explanatory text.`;

    const response = await this.client.generate({
      system: this.getSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
      model: this.model,
      signal,
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";

    try {
      // Clean up the response
      let cleanText = text.trim();
      if (cleanText.startsWith("```json")) {
        cleanText = cleanText.slice(7);
      } else if (cleanText.startsWith("```")) {
        cleanText = cleanText.slice(3);
      }
      if (cleanText.endsWith("```")) {
        cleanText = cleanText.slice(0, -3);
      }
      cleanText = cleanText.trim();

      const parsed = await parseLLMJson<any>(cleanText, null);
      
      if (!parsed) {
        return null;
      }

      return this.normalizeQuestion(parsed);
    } catch (error) {
      console.error("Failed to parse generated question:", error);
      return null;
    }
  }

  /**
   * Create a fingerprint for duplicate detection
   */
  private getQuestionFingerprint(question: AssignmentItem): string {
    // Normalize the question text for comparison
    const normalizedText = question.contentBody
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100); // First 100 chars for comparison

    return `${question.questionType}:${normalizedText}`;
  }

  /**
   * Get question specifications from options
   */
  private getQuestionSpecs(options: QuestionGenerationOptions): QuestionSpec[] {
    // This would typically come from assignment configuration
    // For now, return a default distribution based on the requested type
    if (options.existingQuestions) {
      // Count existing types
      const counts: Record<QuestionType, number> = { mcsc: 0, mcmc: 0, subjective: 0 };
      options.existingQuestions.forEach((q) => {
        if (q.questionType in counts) {
          counts[q.questionType as QuestionType]++;
        }
      });

      // Return specs for remaining questions needed
      return Object.entries(counts)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({ type: type as QuestionType, count }));
    }

    // Default: generate one of the requested type
    return [{ type: options.type, count: 1 }];
  }

  /**
   * Normalize a parsed question to AssignmentItem format
   */
  private normalizeQuestion(parsed: any): AssignmentItem {
    // Ensure options is an object with keys 1-4
    let options = parsed.options;
    if (Array.isArray(options)) {
      options = {
        1: options[0] || "",
        2: options[1] || "",
        3: options[2] || "",
        4: options[3] || "",
      };
    } else if (!options && parsed.questionType !== "subjective") {
      options = { 1: "", 2: "", 3: "", 4: "" };
    }

    // Normalize questionType
    let questionType = parsed.questionType || "mcsc";
    questionType = questionType.toLowerCase();

    // Handle answer conversion from letters to numbers
    let mcscAnswer = parsed.mcscAnswer;
    let mcmcAnswer = parsed.mcmcAnswer;

    if (parsed.correct_option && !mcscAnswer && !mcmcAnswer) {
      const letterToNum: Record<string, number> = { A: 1, B: 2, C: 3, D: 4 };
      if (questionType === "mcsc") {
        mcscAnswer = letterToNum[parsed.correct_option.toUpperCase().trim()] || 1;
      } else if (questionType === "mcmc") {
        const letters = parsed.correct_option.split(",").map((l: string) => l.trim().toUpperCase());
        mcmcAnswer = letters.map((l: string) => letterToNum[l]).filter(Boolean).join(", ");
      }
    }

    return {
      questionType,
      contentType: "markdown" as const,
      contentBody: parsed.contentBody || parsed.question_text || parsed.question || "",
      options,
      mcscAnswer: questionType === "mcsc" ? mcscAnswer : undefined,
      mcmcAnswer: questionType === "mcmc" ? mcmcAnswer : undefined,
      subjectiveAnswer: questionType === "subjective" 
        ? (parsed.subjectiveAnswer || parsed.model_answer || parsed.answer) 
        : undefined,
      difficultyLevel: parsed.difficultyLevel || parsed.difficulty || "Medium",
      answerExplanation: parsed.answerExplanation || parsed.explanation || "",
    } as AssignmentItem;
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

Output ONLY the fixed JSON array. NO markdown. NO explanation. Must pass JSON.parse().`;

    const response = await this.client.generate({
      system: this.getSystemPrompt(),
      messages: [{ role: "user", content: prompt }],
      model: this.model,
      signal,
    });

    const textBlock = response.content.find((b: { type: string }) => b.type === "text");
    let text = textBlock?.type === "text" ? textBlock.text : "[]";

    // Only strip the OUTER markdown wrapper, NOT backticks inside JSON content
    // This regex matches ```json at the very start and ``` at the very end
    text = text.trim();
    if (text.startsWith("```json")) {
      text = text.slice(7);
    } else if (text.startsWith("```")) {
      text = text.slice(3);
    }
    if (text.endsWith("```")) {
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
    return items.map((item) => this.normalizeQuestion(item));
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
          if (obj.questionType && obj.contentBody) {
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

    return "[]";
  }
}
