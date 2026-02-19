import { BaseAgent } from './base-agent';
import { parseLLMJson } from './utils/json-parser';
import type { AssignmentItem } from '../../types';

const MAX_INPUT_WORDS = 8000;

export class FormatterAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('Formatter', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are a JSON Validation Specialist who ensures assignment content is valid, parseable JSON.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

Fix and validate JSON structure. Your output MUST pass JSON.parse().

═══════════════════════════════════════════════════════════════
🔴 CRITICAL JSON RULES
═══════════════════════════════════════════════════════════════

1. **NO RAW NEWLINES IN STRINGS**: Replace actual line breaks with \\n
2. **ESCAPE QUOTES**: Use \\" for quotes inside string values
3. **SINGLE-LINE VALUES**: Each JSON string value on one line
4. **CODE BLOCKS**: \`\`\`python\\ncode\\n\`\`\` (all escaped)

═══════════════════════════════════════════════════════════════
✅ VALID JSON EXAMPLE
═══════════════════════════════════════════════════════════════

[{"questionType": "mcsc", "contentBody": "What is 2+2?", "options": {"1": "3", "2": "4", "3": "5", "4": "6"}, "mcscAnswer": 2, "difficultyLevel": "0.3", "answerExplanation": "2+2=4."}]

🚫 DO NOT wrap in markdown code blocks.
📤 Output ONLY raw JSON starting with [ and ending with ].`;
  }

  private summarizeForProcessing(content: string): { content: string; wasSummarized: boolean } {
    const wordCount = content.split(/\s+/).length;
    if (wordCount <= MAX_INPUT_WORDS) {
      return { content, wasSummarized: false };
    }

    console.log(`[Formatter] Input too long (${wordCount} words), summarizing`);

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

    const truncated = content.slice(0, MAX_INPUT_WORDS * 6);
    const lastBrace = truncated.lastIndexOf('}');
    if (lastBrace > truncated.length * 0.5) {
      return { content: truncated.slice(0, lastBrace + 1), wasSummarized: true };
    }

    return { content: truncated, wasSummarized: true };
  }

  private extractJsonArray(text: string): any[] | null {
    let cleaned = text.trim();

    if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
    else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
    if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
    cleaned = cleaned.trim();

    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.questions && Array.isArray(parsed.questions)) return parsed.questions;
      if (typeof parsed === 'object') return [parsed];
    } catch { /* continue */ }

    const arrayStart = cleaned.indexOf('[');
    const arrayEnd = cleaned.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      try {
        const arrayContent = cleaned.slice(arrayStart, arrayEnd + 1);
        const parsed = JSON.parse(arrayContent);
        if (Array.isArray(parsed)) return parsed;
      } catch { /* continue */ }
    }

    const objects: any[] = [];
    const objectRegex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    const matches = cleaned.matchAll(objectRegex);
    for (const match of matches) {
      try {
        const obj = JSON.parse(match[0]);
        if (obj.questionType || obj.contentBody || obj.question) {
          objects.push(obj);
        }
      } catch { /* skip */ }
    }
    if (objects.length > 0) return objects;

    return null;
  }

  private ensureAssignmentItemFormat(items: any[]): AssignmentItem[] {
    if (!Array.isArray(items)) {
      if (items && typeof items === 'object' && (items as any).questionType) {
        return this.ensureAssignmentItemFormat([items]);
      }
      return [];
    }
    return items.map(item => {
      let options = item.options;
      if (Array.isArray(options)) {
        options = { 1: options[0] || '', 2: options[1] || '', 3: options[2] || '', 4: options[3] || '' };
      } else if (!options) {
        options = { 1: '', 2: '', 3: '', 4: '' };
      }

      let questionType = item.questionType || 'mcsc';
      questionType = questionType.toLowerCase();

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

      let contentBody = item.contentBody || item.question_text || '';
      if (typeof contentBody === 'object' && contentBody !== null) {
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

  private generateFallbackStructure(content: string): string {
    console.log('[Formatter] JSON parsing failed, generating fallback structure');
    const questions: any[] = [];
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
        answerExplanation: 'Please review the question and provide the correct answer.',
      });
      idx++;
    }

    if (questions.length > 0) return JSON.stringify(questions, null, 2);
    return '[]';
  }

  async formatAssignment(content: string): Promise<string> {
    const { content: processedContent, wasSummarized } = this.summarizeForProcessing(content);
    if (wasSummarized) console.log('[Formatter] Working with summarized content');

    // FAST PATH: Check if already valid JSON
    try {
      const fastParsed = await parseLLMJson<any[]>(processedContent, []);
      if (fastParsed.length > 0 && (fastParsed[0].questionType || fastParsed[0].contentBody)) {
        const validated = this.ensureAssignmentItemFormat(fastParsed);
        console.log('Formatter: Fast Path - skipping LLM');
        return JSON.stringify(validated, null, 2);
      }
    } catch { /* proceed to LLM */ }

    // Try direct extraction
    const directExtract = this.extractJsonArray(processedContent);
    if (directExtract && directExtract.length > 0) {
      const firstItem = directExtract[0];
      if (firstItem.questionType || firstItem.contentBody || firstItem.question) {
        const validated = this.ensureAssignmentItemFormat(directExtract);
        console.log('[Formatter] Direct extraction successful - skipping LLM');
        return JSON.stringify(validated, null, 2);
      }
    }

    // LLM Path
    const customPrompt = await this.getCustomPrompt('formatter');
    const system = customPrompt || this.getSystemPrompt();

    const prompt = `Fix and validate this assignment content as proper JSON.

═══════════════════════════════════════════════════════════════
📄 CONTENT TO FIX
═══════════════════════════════════════════════════════════════

${processedContent}

═══════════════════════════════════════════════════════════════
📦 REQUIRED STRUCTURE
═══════════════════════════════════════════════════════════════

[{"questionType": "mcsc", "contentBody": "...", "options": {"1": "...", "2": "...", "3": "...", "4": "..."}, "mcscAnswer": 2, "difficultyLevel": "0.5", "answerExplanation": "..."}]

Output the fixed JSON array as RAW JSON ONLY. Start directly with [ and end with ].`;

    try {
      const response = await this.callAI(system, prompt);

      const extracted = this.extractJsonArray(response);
      if (extracted && extracted.length > 0) {
        const formatted = this.ensureAssignmentItemFormat(extracted);
        console.log(`[Formatter] Successfully formatted ${formatted.length} questions`);
        return JSON.stringify(formatted, null, 2);
      }

      const parsed = await parseLLMJson<any[]>(response, []);
      if (parsed.length > 0) {
        const formatted = this.ensureAssignmentItemFormat(parsed);
        return JSON.stringify(formatted, null, 2);
      }

      return this.generateFallbackStructure(content);
    } catch (error: any) {
      console.error('[Formatter] Error:', error.message);
      return this.generateFallbackStructure(content);
    }
  }
}
