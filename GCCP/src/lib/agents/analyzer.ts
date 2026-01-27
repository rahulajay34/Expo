import { BaseAgent } from "./base-agent";
import { GapAnalysisResult } from "@/types/content";

export class AnalyzerAgent extends BaseAgent {
  constructor(client: any, model: string = "claude-haiku-4-5-20251001") {
    super("Analyzer", model, client);
  }

  getSystemPrompt(): string {
    return `You are an expert Educational Content Analyst specializing in curriculum alignment and gap analysis.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You are a meticulous analyst who examines transcripts to determine how well they cover requested learning objectives. Your analysis directly impacts content creation quality—downstream agents depend on your accurate categorization.

═══════════════════════════════════════════════════════════════
📋 CLASSIFICATION CRITERIA
═══════════════════════════════════════════════════════════════

**FULLY COVERED** - The subtopic must have:
• Explicit explanation or definition in the transcript
• At least one concrete example, demonstration, or application
• Sufficient depth for a student to understand the concept

**PARTIALLY COVERED** - The subtopic has:
• Brief mention without detailed explanation, OR
• Related content that touches on the concept but doesn't fully explain it, OR
• Enough context to supplement but not enough to stand alone

**NOT COVERED** - The subtopic has:
• No mention whatsoever, OR
• Only tangential references that don't help explain the concept

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. EXACT STRING MATCHING: Return subtopics using their EXACT original wording
2. CONSERVATIVE CLASSIFICATION: When uncertain, classify as "partiallyCovered" rather than "covered"
3. NO HALLUCINATION: If you're unsure whether content covers a subtopic, say "partiallyCovered"
4. TRANSCRIPT TOPICS: Identify what the transcript ACTUALLY teaches (useful if there's a mismatch)

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "covered": ["exact subtopic string 1", "exact subtopic string 2"],
  "notCovered": ["exact subtopic string 3"],
  "partiallyCovered": ["exact subtopic string 4"],
  "transcriptTopics": ["main topic 1", "main topic 2", "main topic 3"]
}

Return ONLY valid JSON. No explanatory text before or after.`;
  }

  formatUserPrompt(subtopics: string, transcript: string): string {
    const subtopicList = subtopics.split(',').map(s => s.trim()).filter(Boolean);

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
• "covered" → Full explanation + example exists in transcript
• "partiallyCovered" → Mentioned but not fully explained
• "notCovered" → Not addressed in transcript

Also extract 5-10 main topics that ARE discussed in the transcript (even if different from requested subtopics).

Think carefully before classifying. When in doubt, use "partiallyCovered".`;
  }

  async analyze(subtopics: string, transcript: string, signal?: AbortSignal): Promise<GapAnalysisResult> {
    const response = await this.client.generate({
      system: this.getSystemPrompt(),
      messages: [{ role: "user", content: this.formatUserPrompt(subtopics, transcript) }],
      model: this.model,
      temperature: 0,
      signal
    });

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    try {
      // Remove markdown code blocks first
      let jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();

      // Try to extract JSON object from any extra text
      // Find the first { and last } to extract just the JSON
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');

      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonStr = jsonStr.slice(firstBrace, lastBrace + 1);
      }

      const result = JSON.parse(jsonStr);

      return {
        covered: result.covered || [],
        notCovered: result.notCovered || [],
        partiallyCovered: result.partiallyCovered || [],
        transcriptTopics: result.transcriptTopics || [],
        timestamp: new Date().toISOString()
      };
    } catch (e) {
      console.error("Failed to parse analyzer response: ", content, e);
      // Fallback
      return {
        covered: [],
        notCovered: [],
        partiallyCovered: [],
        transcriptTopics: [],
        timestamp: new Date().toISOString()
      };
    }
  }
}
