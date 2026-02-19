import { BaseAgent } from './base-agent';
import type { CourseContext } from '../../types';
import { parseLLMJson } from './utils/json-parser';

export class CourseDetectorAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('CourseDetector', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are an Educational Content Domain Specialist with expertise across diverse academic and professional fields.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

Analyze educational content requests to determine the most appropriate domain context. Your analysis helps downstream agents tailor content for maximum relevance and engagement.

You understand the pedagogical needs of various domains:
• Software Engineering: Code examples, design patterns, debugging scenarios
• Cybersecurity: Threat scenarios, attack/defense dynamics, compliance frameworks
• Data Science: Statistical reasoning, visualization, real datasets
• AI/ML: Model intuition, training dynamics, ethical considerations
• Mathematics/Physics: Equations, proofs, worked examples, LaTeX formatting
• And any other domain...

═══════════════════════════════════════════════════════════════
📐 MATHEMATICAL CONTENT AWARENESS
═══════════════════════════════════════════════════════════════

For domains involving mathematics or formulas:
• MUST indicate "latex-equations" in formats array
• MUST include style hint about placing math in markdown sections, not HTML

═══════════════════════════════════════════════════════════════
📤 OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

Output ONLY valid JSON. No explanatory text, no markdown wrappers.`;
  }

  async detect(topic: string, subtopics: string, transcript?: string): Promise<CourseContext> {
    const customPrompt = await this.getCustomPrompt('course_detector');
    const system = customPrompt || this.getSystemPrompt();

    const prompt = `Analyze this educational content request and determine optimal domain-specific adaptations.

═══════════════════════════════════════════════════════════════
📋 CONTENT REQUEST
═══════════════════════════════════════════════════════════════

**Topic**: ${topic}
**Subtopics**: ${subtopics}
${transcript ? `\n**Transcript Excerpt**:\n${transcript.slice(0, 5000)}` : ''}

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "domain": "specific-domain-name",
  "confidence": 0.85,
  "characteristics": {
    "exampleTypes": ["3-5 specific example types"],
    "formats": ["preferred formats - MUST include 'latex-equations' if math involved"],
    "vocabulary": ["5-10 domain-specific terms"],
    "styleHints": ["2-4 writing style guidelines"],
    "relatableExamples": ["3-5 relatable scenarios"]
  },
  "contentGuidelines": "Detailed paragraph on HOW to create effective content for this domain.",
  "qualityCriteria": "Detailed paragraph on what HIGH-QUALITY content looks like."
}

Output ONLY the JSON object. No markdown code fences. No explanatory text.`;

    try {
      const response = await this.callAI(system, prompt, { temperature: 0.3 });
      const result = await parseLLMJson<any>(response, {});

      return {
        domain: result.domain || 'general',
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
        characteristics: {
          exampleTypes: result.characteristics?.exampleTypes || ['practical examples'],
          formats: result.characteristics?.formats || ['markdown'],
          vocabulary: result.characteristics?.vocabulary || [],
          styleHints: result.characteristics?.styleHints || ['clear and accessible'],
          relatableExamples: result.characteristics?.relatableExamples || [],
        },
        contentGuidelines: result.contentGuidelines || 'Create clear, engaging educational content with practical examples.',
        qualityCriteria: result.qualityCriteria || 'Content should be accurate, well-structured, and free of AI-sounding patterns.',
      };
    } catch (error) {
      console.error('CourseDetector failed:', error);
      return {
        domain: 'general',
        confidence: 0.3,
        characteristics: {
          exampleTypes: ['practical examples', 'real-world scenarios'],
          formats: ['markdown', 'code blocks where relevant'],
          vocabulary: [],
          styleHints: ['clear', 'accessible', 'engaging'],
          relatableExamples: ['everyday technology use cases'],
        },
        contentGuidelines: 'Create clear, well-structured educational content with practical examples.',
        qualityCriteria: 'Content should be accurate, logically structured, and free of AI-sounding patterns.',
      };
    }
  }
}
