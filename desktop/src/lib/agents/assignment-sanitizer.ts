import { BaseAgent } from './base-agent';
import type { AssignmentItem, QuestionType } from '../../types';
import { parseLLMJson } from './utils/json-parser';

export interface SanitizationResult {
  questions: AssignmentItem[];
  removedCount: number;
  replacedCount: number;
  issues: string[];
}

export class AssignmentSanitizerAgent extends BaseAgent {
  private maxReplacementAttempts = 3;

  constructor(model: string, provider: string, apiKey: string) {
    super('AssignmentSanitizer', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are an Expert Assessment Quality Specialist responsible for validating and improving educational assessment questions.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

Validate questions for quality, correctness, and educational value. When a question is invalid or low-quality, GENERATE A REPLACEMENT—never leave gaps.

═══════════════════════════════════════════════════════════════
📋 VALIDATION CRITERIA
═══════════════════════════════════════════════════════════════

**MUST PASS:**
1. Clear, unambiguous wording
2. All 4 options are provided and distinct for MCQ types
3. mcscAnswer is a number 1-4 (for mcsc type)
4. mcmcAnswer has 2+ correct options (for mcmc type)
5. subjectiveAnswer provides a model response (for subjective type)
6. answerExplanation teaches why the answer is correct
7. No "All of the above" or "None of the above" options

Return ONLY valid JSON. Your output must be parseable by JSON.parse().`;
  }

  private validateQuestion(q: AssignmentItem, index: number): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!q.contentBody || q.contentBody.trim().length < 10) {
      issues.push(`Q${index + 1}: Question body is missing or too short`);
    }

    if (!q.questionType || !['mcsc', 'mcmc', 'subjective'].includes(q.questionType)) {
      issues.push(`Q${index + 1}: Invalid questionType`);
    }

    if (q.questionType !== 'subjective') {
      if (!q.options || typeof q.options !== 'object') {
        issues.push(`Q${index + 1}: Options object is missing`);
      } else {
        for (let i = 1; i <= 4; i++) {
          const opt = q.options[i as 1 | 2 | 3 | 4];
          if (!opt || opt.trim().length === 0) {
            issues.push(`Q${index + 1}: Option ${i} is empty`);
          }
          if (opt && /^(all of the above|none of the above|both a and b|a and b)$/i.test(opt.trim())) {
            issues.push(`Q${index + 1}: Option ${i} uses forbidden pattern "${opt}"`);
          }
        }
      }
    }

    if (q.questionType === 'mcsc') {
      if (typeof q.mcscAnswer !== 'number' || q.mcscAnswer < 1 || q.mcscAnswer > 4) {
        issues.push(`Q${index + 1}: mcscAnswer must be number 1-4`);
      }
    } else if (q.questionType === 'mcmc') {
      if (!q.mcmcAnswer || typeof q.mcmcAnswer !== 'string') {
        issues.push(`Q${index + 1}: mcmcAnswer must be a string like "1, 3"`);
      } else {
        const answers = q.mcmcAnswer.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (answers.length < 2) issues.push(`Q${index + 1}: mcmcAnswer must have at least 2 correct options`);
        if (answers.some(a => a < 1 || a > 4)) issues.push(`Q${index + 1}: mcmcAnswer contains invalid option numbers`);
      }
    } else if (q.questionType === 'subjective') {
      if (!q.subjectiveAnswer || q.subjectiveAnswer.trim().length < 20) {
        issues.push(`Q${index + 1}: subjectiveAnswer is missing or too short`);
      }
    }

    if (!q.answerExplanation || q.answerExplanation.trim().length < 20) {
      issues.push(`Q${index + 1}: answerExplanation is missing or too short`);
    }

    return { valid: issues.length === 0, issues };
  }

  private async generateReplacements(
    invalidQuestions: { index: number; type: QuestionType; originalQuestion: AssignmentItem }[],
    topic: string,
    subtopics: string,
    existingQuestions: AssignmentItem[]
  ): Promise<AssignmentItem[]> {
    if (invalidQuestions.length === 0) return [];

    const byType = invalidQuestions.reduce((acc, q) => {
      acc[q.type] = (acc[q.type] || 0) + 1;
      return acc;
    }, {} as Record<QuestionType, number>);

    const existingContext = existingQuestions
      .slice(0, 10)
      .map(q => `- ${q.contentBody.slice(0, 100)}...`)
      .join('\n');

    const prompt = `Generate ${invalidQuestions.length} REPLACEMENT questions for an assessment on "${topic}".

Questions needed:
${Object.entries(byType).map(([type, count]) => `• ${count} ${type} question(s)`).join('\n')}

Subtopics to cover: ${subtopics}

Existing questions (avoid duplicates):
${existingContext || 'None'}

Requirements:
1. PRACTICAL and SCENARIO-BASED questions
2. ALL options must be plausible
3. Explanations must TEACH
4. Randomize correct answer position
5. No "All of the above" or "None of the above"

Output format: [{"questionType": "mcsc", "contentBody": "...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "mcscAnswer": 2, "difficultyLevel": 0.5, "answerExplanation": "..."}]

Return ONLY the JSON array.`;

    try {
      const customPrompt = await this.getCustomPrompt('assignment_sanitizer');
      const system = customPrompt || this.getSystemPrompt();
      const response = await this.callAI(system, prompt, { temperature: 0.7 });
      const replacements = await parseLLMJson<AssignmentItem[]>(response, []);

      return replacements.map(q => ({
        ...q,
        contentType: 'markdown' as const,
        options: q.options || { 1: '', 2: '', 3: '', 4: '' },
        difficultyLevel: (typeof q.difficultyLevel === 'number' ? q.difficultyLevel : 0.5) as 0 | 0.5 | 1,
      }));
    } catch (e) {
      console.error('Failed to generate replacement questions:', e);
      return [];
    }
  }

  async sanitize(
    questions: AssignmentItem[],
    topic: string,
    subtopics: string,
    expectedCounts: { mcsc: number; mcmc: number; subjective: number }
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
        invalidQuestions.push({ index: i, type: q.questionType || 'mcsc', originalQuestion: q });
      }
    }

    // Step 2: Check if we need to add questions to meet counts
    const currentCounts = {
      mcsc: validQuestions.filter(q => q.questionType === 'mcsc').length,
      mcmc: validQuestions.filter(q => q.questionType === 'mcmc').length,
      subjective: validQuestions.filter(q => q.questionType === 'subjective').length,
    };

    for (const type of ['mcsc', 'mcmc', 'subjective'] as QuestionType[]) {
      const missing = Math.max(0, expectedCounts[type] - currentCounts[type]);
      if (missing > 0) {
        for (let i = 0; i < missing; i++) {
          invalidQuestions.push({ index: -1, type, originalQuestion: { questionType: type } as AssignmentItem });
        }
        issues.push(`Added ${missing} missing ${type} questions`);
      }
    }

    // Step 3: Generate replacements if needed
    let replacedCount = 0;
    if (invalidQuestions.length > 0) {
      let attempts = 0;
      let remainingInvalid = [...invalidQuestions];

      while (remainingInvalid.length > 0 && attempts < this.maxReplacementAttempts) {
        attempts++;
        console.log(`[AssignmentSanitizer] Attempt ${attempts}/${this.maxReplacementAttempts} for ${remainingInvalid.length} questions`);

        const replacements = await this.generateReplacements(remainingInvalid, topic, subtopics, validQuestions);

        const stillInvalid: typeof remainingInvalid = [];
        for (let i = 0; i < replacements.length && i < remainingInvalid.length; i++) {
          const replacement = replacements[i];
          const validation = this.validateQuestion(replacement, validQuestions.length + i);

          if (validation.valid && replacement.questionType === remainingInvalid[i].type) {
            validQuestions.push(replacement);
            replacedCount++;
          } else {
            stillInvalid.push(remainingInvalid[i]);
          }
        }

        for (let i = replacements.length; i < remainingInvalid.length; i++) {
          stillInvalid.push(remainingInvalid[i]);
        }

        remainingInvalid = stillInvalid;
      }

      if (remainingInvalid.length > 0) {
        issues.push(`Failed to generate ${remainingInvalid.length} replacement questions after ${this.maxReplacementAttempts} attempts`);
      }
    }

    // Step 4: Deduplicate
    const finalQuestions = this.removeDuplicates(validQuestions);
    const duplicatesRemoved = validQuestions.length - finalQuestions.length;
    if (duplicatesRemoved > 0) issues.push(`Removed ${duplicatesRemoved} duplicate questions`);

    // Step 5: Sort by type
    finalQuestions.sort((a, b) => {
      const typeOrder: Record<string, number> = { mcsc: 0, mcmc: 1, subjective: 2 };
      return (typeOrder[a.questionType] || 0) - (typeOrder[b.questionType] || 0);
    });

    return { questions: finalQuestions, removedCount: invalidQuestions.length, replacedCount, issues };
  }

  private removeDuplicates(questions: AssignmentItem[]): AssignmentItem[] {
    const seen = new Set<string>();
    const unique: AssignmentItem[] = [];

    for (const q of questions) {
      const key = q.contentBody.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(q);
      }
    }

    return unique;
  }
}
