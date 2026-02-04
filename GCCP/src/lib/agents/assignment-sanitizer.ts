import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { AssignmentItem, QuestionType } from "@/types/assignment";
import { parseLLMJson } from "./utils/json-parser";

/**
 * SanitizationResult contains the validated questions and any issues found
 */
export interface SanitizationResult {
  questions: AssignmentItem[];
  removedCount: number;
  replacedCount: number;
  issues: string[];
}

/**
 * AssignmentSanitizerAgent validates assignment questions and ensures:
 * 1. All questions are valid and properly formatted
 * 2. Questions that fail validation are replaced with new questions of the same type
 * 3. Total question count NEVER decreases
 * 4. No duplicate questions exist
 */
export class AssignmentSanitizerAgent extends BaseAgent {
  private maxReplacementAttempts = 3;

  constructor(client: AnthropicClient) {
    super("AssignmentSanitizer", "grok-code-fast-1", client);
  }

  getSystemPrompt(): string {
    return `You are an Expert Assessment Quality Specialist responsible for validating and improving educational assessment questions.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You validate questions for quality, correctness, and educational value. When a question is invalid or low-quality, you GENERATE A REPLACEMENT—never leave gaps.

═══════════════════════════════════════════════════════════════
📋 VALIDATION CRITERIA
═══════════════════════════════════════════════════════════════

**MUST PASS (Automatic fail if violated):**
1. Question has clear, unambiguous wording
2. All 4 options are provided and distinct for MCQ types
3. mcscAnswer is a number 1-4 (for mcsc type)
4. mcmcAnswer has 2+ correct options in format "1, 3" (for mcmc type)
5. subjectiveAnswer provides a model response (for subjective type)
6. answerExplanation teaches why the answer is correct
7. Options are grammatically parallel and similar length
8. No "All of the above" or "None of the above" options

**QUALITY CRITERIA (Mark for replacement if multiple fail):**
1. Question tests understanding, not trivia
2. Distractors based on real misconceptions
3. Question is practical/scenario-based where appropriate
4. Explanation is educational, not just "A is correct"
5. Difficulty level is appropriate

═══════════════════════════════════════════════════════════════
📤 OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

Return ONLY valid JSON. Your output must be parseable by JSON.parse().`;
  }

  /**
   * Validates a single question and returns whether it passes validation
   */
  private validateQuestion(q: AssignmentItem, index: number): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Required fields check
    if (!q.contentBody || q.contentBody.trim().length < 10) {
      issues.push(`Q${index + 1}: Question body is missing or too short`);
    }

    if (!q.questionType || !['mcsc', 'mcmc', 'subjective'].includes(q.questionType)) {
      issues.push(`Q${index + 1}: Invalid questionType`);
    }

    // Options validation for MCQ types
    if (q.questionType !== 'subjective') {
      if (!q.options || typeof q.options !== 'object') {
        issues.push(`Q${index + 1}: Options object is missing`);
      } else {
        for (let i = 1; i <= 4; i++) {
          const opt = q.options[i as 1 | 2 | 3 | 4];
          if (!opt || opt.trim().length === 0) {
            issues.push(`Q${index + 1}: Option ${i} is empty`);
          }
          // Check for lazy options
          if (opt && /^(all of the above|none of the above|both a and b|a and b)$/i.test(opt.trim())) {
            issues.push(`Q${index + 1}: Option ${i} uses forbidden pattern "${opt}"`);
          }
        }
      }
    }

    // Answer validation
    if (q.questionType === 'mcsc') {
      if (typeof q.mcscAnswer !== 'number' || q.mcscAnswer < 1 || q.mcscAnswer > 4) {
        issues.push(`Q${index + 1}: mcscAnswer must be number 1-4`);
      }
    } else if (q.questionType === 'mcmc') {
      if (!q.mcmcAnswer || typeof q.mcmcAnswer !== 'string') {
        issues.push(`Q${index + 1}: mcmcAnswer must be a string like "1, 3"`);
      } else {
        const answers = q.mcmcAnswer.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (answers.length < 2) {
          issues.push(`Q${index + 1}: mcmcAnswer must have at least 2 correct options`);
        }
        if (answers.some(a => a < 1 || a > 4)) {
          issues.push(`Q${index + 1}: mcmcAnswer contains invalid option numbers`);
        }
      }
    } else if (q.questionType === 'subjective') {
      if (!q.subjectiveAnswer || q.subjectiveAnswer.trim().length < 20) {
        issues.push(`Q${index + 1}: subjectiveAnswer is missing or too short`);
      }
    }

    // Explanation validation
    if (!q.answerExplanation || q.answerExplanation.trim().length < 20) {
      issues.push(`Q${index + 1}: answerExplanation is missing or too short`);
    }

    // Duplicate detection (basic)
    const bodyNormalized = q.contentBody?.toLowerCase().trim().slice(0, 100);
    if (bodyNormalized && bodyNormalized.length < 15) {
      issues.push(`Q${index + 1}: Question is too short to be meaningful`);
    }

    return { valid: issues.length === 0, issues };
  }

  /**
   * Generates replacement questions for invalid ones
   */
  private async generateReplacements(
    invalidQuestions: { index: number; type: QuestionType; originalQuestion: AssignmentItem }[],
    topic: string,
    subtopics: string,
    existingQuestions: AssignmentItem[],
    signal?: AbortSignal
  ): Promise<AssignmentItem[]> {
    if (invalidQuestions.length === 0) return [];

    // Group by type for efficient generation
    const byType = invalidQuestions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<QuestionType, number>);

    // Create context about existing questions to avoid duplicates
    const existingContext = existingQuestions
      .slice(0, 10)
      .map(q => `- ${q.contentBody.slice(0, 100)}...`)
      .join('\n');

    const prompt = `Generate ${invalidQuestions.length} REPLACEMENT questions for an assessment on "${topic}".

═══════════════════════════════════════════════════════════════
📋 QUESTIONS NEEDED
═══════════════════════════════════════════════════════════════

${Object.entries(byType).map(([type, count]) => `• ${count} ${type} question(s)`).join('\n')}

**Subtopics to cover**: ${subtopics}

═══════════════════════════════════════════════════════════════
⚠️ AVOID DUPLICATES - These questions already exist:
═══════════════════════════════════════════════════════════════

${existingContext || 'None provided'}

═══════════════════════════════════════════════════════════════
📦 REQUIREMENTS
═══════════════════════════════════════════════════════════════

1. Each question MUST be PRACTICAL and SCENARIO-BASED
2. Start with "Given...", "In a scenario where...", "A developer needs to..."
3. Test APPLICATION of knowledge, not definitions
4. ALL options must be plausible (based on real misconceptions)
5. Explanations must TEACH, not just state the answer
6. DIFFERENT from existing questions

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ARRAY)
═══════════════════════════════════════════════════════════════

[
  {
    "questionType": "mcsc|mcmc|subjective",
    "contentBody": "Question text with scenario...",
    "options": {"1": "...", "2": "...", "3": "...", "4": "..."},
    "mcscAnswer": 2,  // Only for mcsc
    "mcmcAnswer": "1, 3",  // Only for mcmc
    "subjectiveAnswer": "...",  // Only for subjective
    "difficultyLevel": 0.5,
    "answerExplanation": "Teaching explanation..."
  }
]

Return ONLY the JSON array. No markdown. No explanations.`;

    try {
      const response = await this.client.generate({
        system: this.getSystemPrompt(),
        messages: [{ role: 'user', content: prompt }],
        model: this.model,
        temperature: 0.7, // Some creativity for diverse questions
        signal
      });

      const text = response.content.find((b: { type: string }) => b.type === 'text')?.text || '[]';
      const replacements = await parseLLMJson<AssignmentItem[]>(text, []);

      // Ensure all replacements have proper structure
      return replacements.map((q, i) => ({
        ...q,
        contentType: 'markdown' as const,
        options: q.options || { 1: '', 2: '', 3: '', 4: '' },
        difficultyLevel: (typeof q.difficultyLevel === 'number' ? q.difficultyLevel : 0.5) as 0 | 0.5 | 1
      }));
    } catch (e) {
      console.error('Failed to generate replacement questions:', e);
      return [];
    }
  }

  /**
   * Main sanitization method - validates all questions and replaces invalid ones
   */
  async sanitize(
    questions: AssignmentItem[],
    topic: string,
    subtopics: string,
    expectedCounts: { mcsc: number; mcmc: number; subjective: number },
    signal?: AbortSignal
  ): Promise<SanitizationResult> {
    const issues: string[] = [];
    const validQuestions: AssignmentItem[] = [];
    const invalidQuestions: { index: number; type: QuestionType; originalQuestion: AssignmentItem }[] = [];

    // Step 1: Validate all questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const validation = this.validateQuestion(q, i);

      if (validation.valid) {
        validQuestions.push(q);
      } else {
        issues.push(...validation.issues);
        invalidQuestions.push({
          index: i,
          type: q.questionType || 'mcsc',
          originalQuestion: q
        });
      }
    }

    // Step 2: Check if we need to add questions to meet counts
    const currentCounts = {
      mcsc: validQuestions.filter(q => q.questionType === 'mcsc').length,
      mcmc: validQuestions.filter(q => q.questionType === 'mcmc').length,
      subjective: validQuestions.filter(q => q.questionType === 'subjective').length
    };

    const missingCounts = {
      mcsc: Math.max(0, expectedCounts.mcsc - currentCounts.mcsc),
      mcmc: Math.max(0, expectedCounts.mcmc - currentCounts.mcmc),
      subjective: Math.max(0, expectedCounts.subjective - currentCounts.subjective)
    };

    // Add missing questions from invalid to replacement queue
    for (const type of ['mcsc', 'mcmc', 'subjective'] as QuestionType[]) {
      for (let i = 0; i < missingCounts[type]; i++) {
        // Check if we already have this type in invalidQuestions
        const existingInvalid = invalidQuestions.filter(q => q.type === type).length;
        if (existingInvalid < missingCounts[type]) {
          invalidQuestions.push({
            index: -1, // New question
            type,
            originalQuestion: { questionType: type } as AssignmentItem
          });
        }
      }
    }

    // Step 3: Generate replacements if needed
    let replacedCount = 0;
    if (invalidQuestions.length > 0) {
      let attempts = 0;
      let remainingInvalid = [...invalidQuestions];

      while (remainingInvalid.length > 0 && attempts < this.maxReplacementAttempts) {
        attempts++;
        console.log(`[AssignmentSanitizer] Replacement attempt ${attempts}/${this.maxReplacementAttempts} for ${remainingInvalid.length} questions`);

        const replacements = await this.generateReplacements(
          remainingInvalid,
          topic,
          subtopics,
          validQuestions,
          signal
        );

        // Validate replacements
        const stillInvalid: typeof remainingInvalid = [];
        for (let i = 0; i < replacements.length && i < remainingInvalid.length; i++) {
          const replacement = replacements[i];
          const validation = this.validateQuestion(replacement, validQuestions.length);

          if (validation.valid) {
            // Ensure the replacement matches the expected type
            if (replacement.questionType === remainingInvalid[i].type) {
              validQuestions.push(replacement);
              replacedCount++;
            } else {
              // Type mismatch, try again
              stillInvalid.push(remainingInvalid[i]);
            }
          } else {
            stillInvalid.push(remainingInvalid[i]);
            issues.push(`Replacement attempt ${attempts} failed: ${validation.issues.join('; ')}`);
          }
        }

        // If we didn't get enough replacements, add the rest back
        for (let i = replacements.length; i < remainingInvalid.length; i++) {
          stillInvalid.push(remainingInvalid[i]);
        }

        remainingInvalid = stillInvalid;
      }

      // If we still have missing questions after max attempts, log error
      if (remainingInvalid.length > 0) {
        issues.push(`Failed to generate ${remainingInvalid.length} replacement questions after ${this.maxReplacementAttempts} attempts`);
      }
    }

    // Step 4: Final count verification and duplicate removal
    const finalQuestions = this.removeDuplicates(validQuestions);
    const duplicatesRemoved = validQuestions.length - finalQuestions.length;
    if (duplicatesRemoved > 0) {
      issues.push(`Removed ${duplicatesRemoved} duplicate questions`);
    }

    // Step 5: Sort by type for consistent output
    finalQuestions.sort((a, b) => {
      const typeOrder = { mcsc: 0, mcmc: 1, subjective: 2 };
      return typeOrder[a.questionType] - typeOrder[b.questionType];
    });

    return {
      questions: finalQuestions,
      removedCount: invalidQuestions.length,
      replacedCount,
      issues
    };
  }

  /**
   * Remove duplicate questions based on content similarity
   */
  private removeDuplicates(questions: AssignmentItem[]): AssignmentItem[] {
    const seen = new Set<string>();
    const unique: AssignmentItem[] = [];

    for (const q of questions) {
      // Create a normalized key from the question body
      const key = q.contentBody
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);

      if (!seen.has(key)) {
        seen.add(key);
        unique.push(q);
      }
    }

    return unique;
  }
}
