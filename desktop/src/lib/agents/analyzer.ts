import { BaseAgent } from './base-agent';
import type { GapAnalysisResult } from '../../types';
import { parseLLMJson } from './utils/json-parser';

export class AnalyzerAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('Analyzer', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are an expert Educational Content Analyst specializing in curriculum alignment and gap analysis.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You examine transcripts to determine how well they cover requested learning objectives. Your analysis directly impacts content creation quality.

═══════════════════════════════════════════════════════════════
📋 CLASSIFICATION CRITERIA
═══════════════════════════════════════════════════════════════

**FULLY COVERED** - The subtopic must have ALL of:
• Explicit, detailed explanation or definition
• At least one concrete example, demonstration, or application
• Sufficient depth for a student to understand comprehensively

**PARTIALLY COVERED** - The subtopic has ANY of:
• Brief mention without detailed explanation
• Related content that touches on the concept but doesn't fully explain it
• Coverage of some but not all important aspects

⚠️ For "Partially Covered" items, you MUST specify what's missing!

**NOT COVERED** - The subtopic has:
• No mention whatsoever
• Only tangential references that don't help explain the concept

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. EXACT STRING MATCHING: Return subtopics using their EXACT original wording
2. CONSERVATIVE CLASSIFICATION: When uncertain, classify as "partiallyCovered"
3. NO HALLUCINATION: If unsure whether content covers a subtopic, say "partiallyCovered"
4. TRANSCRIPT TOPICS: Identify what the transcript ACTUALLY teaches (5-10 main topics)

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "covered": ["exact subtopic string 1"],
  "notCovered": ["exact subtopic string 2"],
  "partiallyCovered": ["exact subtopic string 3"],
  "missingElements": {
    "exact subtopic string 3": ["missing concept A", "no example of X"]
  },
  "transcriptTopics": ["main topic 1", "main topic 2"]
}

Return ONLY valid JSON. No explanatory text. No markdown wrappers.`;
  }

  formatUserPrompt(subtopics: string, transcript: string): string {
    const subtopicList = subtopics
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(Boolean);

    return `═══════════════════════════════════════════════════════════════
📋 SUBTOPICS TO VERIFY (${subtopicList.length} items)
═══════════════════════════════════════════════════════════════

${subtopicList.map((s, i) => `${i + 1}. "${s}"`).join('\n')}

═══════════════════════════════════════════════════════════════
📝 TRANSCRIPT TO ANALYZE
═══════════════════════════════════════════════════════════════

${transcript}

═══════════════════════════════════════════════════════════════
🔍 YOUR ANALYSIS TASK
═══════════════════════════════════════════════════════════════

For EACH subtopic above, determine coverage level:
• "covered" → Full explanation + example exists
• "partiallyCovered" → Mentioned but not fully explained
• "notCovered" → Not addressed in transcript

⚠️ For "partiallyCovered" items, specify exactly what is MISSING.
Also extract 5-10 main topics that ARE discussed in the transcript.`;
  }

  async analyze(subtopics: string, transcript: string): Promise<GapAnalysisResult> {
    const customPrompt = await this.getCustomPrompt('analyzer');
    const system = customPrompt || this.getSystemPrompt();

    const response = await this.callAI(
      system,
      this.formatUserPrompt(subtopics, transcript),
      { temperature: 0 }
    );

    try {
      const result = await parseLLMJson<any>(response, {});

      const missingElements: Record<string, string[]> = result.missingElements || {};
      const partiallyCovered: string[] = result.partiallyCovered || [];

      for (const topic of partiallyCovered) {
        if (!missingElements[topic] || missingElements[topic].length === 0) {
          missingElements[topic] = ['Specific missing elements not detailed - requires supplementary content'];
        }
      }

      return {
        covered: result.covered || [],
        notCovered: result.notCovered || [],
        partiallyCovered,
        missingElements,
        transcriptTopics: result.transcriptTopics || [],
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      console.error('Failed to parse analyzer response:', e);
      return {
        covered: [],
        notCovered: [],
        partiallyCovered: [],
        missingElements: {},
        transcriptTopics: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
