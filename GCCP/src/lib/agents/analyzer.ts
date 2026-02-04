import { BaseAgent } from "./base-agent";
import { GapAnalysisResult } from "@/types/content";

export class AnalyzerAgent extends BaseAgent {
  constructor(client: any, model: string = "grok-4-1-fast-reasoning-latest") {
    super("Analyzer", model, client);
  }

  getSystemPrompt(): string {
    return `You are an expert Educational Content Analyst specializing in curriculum alignment and gap analysis.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You are a meticulous analyst who examines transcripts to determine how well they cover requested learning objectives. Your analysis directly impacts content creation quality—downstream agents depend on your accurate categorization.

Your analysis should be THOROUGH and DETAILED to ensure content creators have comprehensive understanding of what's covered.

═══════════════════════════════════════════════════════════════
📋 CLASSIFICATION CRITERIA (Be Precise and Detailed)
═══════════════════════════════════════════════════════════════

**FULLY COVERED** - The subtopic must have ALL of:
• Explicit, detailed explanation or definition in the transcript
• At least one concrete example, demonstration, or application with thorough explanation
• Sufficient depth for a student to understand the concept comprehensively
• Multiple aspects or dimensions of the concept discussed

**PARTIALLY COVERED** - The subtopic has ANY of:
• Brief mention without detailed explanation, OR
• Related content that touches on the concept but doesn't fully explain it, OR
• Enough context to supplement but not enough to stand alone, OR
• Coverage of some but not all important aspects of the concept

**NOT COVERED** - The subtopic has:
• No mention whatsoever, OR
• Only tangential references that don't help explain the concept, OR
• References so brief they provide no educational value

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL RULES (Violations cause downstream failures)
═══════════════════════════════════════════════════════════════

1. EXACT STRING MATCHING: Return subtopics using their EXACT original wording
   - Input: "Neural Network Basics" → Output: "Neural Network Basics" (not "neural networks")
   
2. CONSERVATIVE BUT THOROUGH CLASSIFICATION: When uncertain, classify as "partiallyCovered"
   - Better to under-promise than over-promise coverage
   - But provide detailed analysis to guide content creation
   
3. NO HALLUCINATION: If you're unsure whether content covers a subtopic, say "partiallyCovered"

4. HANDLE MULTILINE INPUT: Subtopics may come as newline-separated or comma-separated
   - Treat each line/item as a separate subtopic to analyze

5. TRANSCRIPT TOPICS: Identify what the transcript ACTUALLY teaches (useful for mismatch detection)
   - List 5-10 main topics for comprehensive understanding
   - This helps users understand if there's a topic mismatch and what IS covered

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY - MUST PARSE)
═══════════════════════════════════════════════════════════════

{
  "covered": ["exact subtopic string 1", "exact subtopic string 2"],
  "notCovered": ["exact subtopic string 3"],
  "partiallyCovered": ["exact subtopic string 4"],
  "transcriptTopics": ["main topic 1", "main topic 2", "main topic 3", "main topic 4", "main topic 5"]
}

CRITICAL: Return ONLY valid JSON. No explanatory text before or after. No markdown wrappers.`;
  }

  formatUserPrompt(subtopics: string, transcript: string): string {
    // Normalize subtopics: handle both comma-separated and newline-separated input
    // Also handle mixed formats (commas and newlines together)
    const subtopicList = subtopics
      .split(/[\n,]+/)  // Split on newlines or commas
      .map(s => s.trim())
      .filter(Boolean);  // Remove empty strings

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
