import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { parseLLMJson } from "./utils/json-parser";
import { GEMINI_MODELS } from "@/lib/gemini/client";

/**
 * CourseContext represents the automatically detected domain context
 * Used to tailor content generation for different educational domains
 */
export interface CourseContext {
  domain: string;              // e.g., "cybersecurity", "software-engineering"
  confidence: number;          // 0-1 confidence score
  characteristics: {
    exampleTypes: string[];    // Types of examples to use
    formats: string[];         // Preferred content formats
    vocabulary: string[];      // Domain-specific terms
    styleHints: string[];      // Writing style guidelines
    relatableExamples: string[]; // Real-world examples students can relate to
  };
  contentGuidelines: string;   // Detailed guidelines for Creator
  qualityCriteria: string;     // Quality criteria for Reviewer
  voiceModel: {
    tone: string;
    exemplarPhrases: string[];
  };
}

export class CourseDetectorAgent extends BaseAgent {
  constructor(client: AnthropicClient) {
    // Using Gemini Flash for detection tasks
    super("CourseDetector", GEMINI_MODELS.flash, client);
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
• Product Management: User stories, roadmaps, stakeholder communication
• AI/ML: Model intuition, training dynamics, ethical considerations
• Business: Case studies, financial scenarios, market analysis
• Sciences: Experimental design, hypothesis testing, real-world phenomena
• Mathematics/Physics: Equations, proofs, worked examples, LaTeX formatting
• Humanities: Critical analysis, primary sources, argumentation
• And any other domain...

═══════════════════════════════════════════════════════════════
📐 MATHEMATICAL CONTENT AWARENESS
═══════════════════════════════════════════════════════════════

For domains involving mathematics, equations, or formulas (math, physics, engineering, statistics, economics, etc.):
• MUST indicate "latex-equations" in formats array
• MUST include style hint about placing math in markdown sections, not HTML
• Examples: differential equations, linear algebra, calculus, statistics, physics equations

═══════════════════════════════════════════════════════════════
📤 OUTPUT REQUIREMENTS
═══════════════════════════════════════════════════════════════

You MUST output ONLY valid JSON. No explanatory text, no markdown wrappers.

Your output directly configures content generation agents, so accuracy and specificity matter.`;
  }

  async detect(topic: string, subtopics: string, transcript?: string): Promise<CourseContext> {
    const prompt = `Analyze this educational content request and determine optimal domain-specific adaptations.

═══════════════════════════════════════════════════════════════
📋 CONTENT REQUEST
═══════════════════════════════════════════════════════════════

**Topic**: ${topic}
**Subtopics**: ${subtopics}
${transcript ? `\n**Transcript Excerpt** (for additional context):\n${transcript.slice(0, 5000)}` : ''}

═══════════════════════════════════════════════════════════════
🔍 ANALYSIS REQUIRED
═══════════════════════════════════════════════════════════════

Based on the content request, determine:

1. **Domain Classification**: What field/discipline is this? Be specific (e.g., "backend-web-development" not just "programming")

2. **Example Strategy**: What types of examples resonate with learners in this domain?
   - Technical domains: code snippets, system diagrams, debugging scenarios
   - Business domains: case studies, financial models, market scenarios
   - Sciences: experimental data, real-world phenomena, research examples

3. **Format Preferences**: What content formats work best?
   - Code-heavy: syntax-highlighted blocks, terminal outputs
   - Conceptual: diagrams, flowcharts, comparison tables
   - Quantitative: formulas, charts, data visualizations
   - Mathematical: LaTeX equations ($...$ inline, $$...$$ block), worked examples, proofs
   - CRITICAL: If content involves math/equations, MUST include "latex-equations" format

4. **Vocabulary**: What domain-specific terms should appear naturally?

5. **Style Adaptations**: How should the writing style adjust?
   - Technical precision vs. accessibility
   - Formal vs. conversational
   - Pace and depth expectations

6. **Relatable Scenarios**: What real-world situations would students connect with?

7. **Voice/Persona**: What professional persona should the content adopt?
   - e.g., "Senior Engineer doing a code review", "Data Scientist explaining a model", "Product Manager describing a roadmap"

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY - MUST PARSE)
═══════════════════════════════════════════════════════════════

{
  "domain": "specific-domain-name (lowercase, hyphenated)",
  "confidence": <0.0-1.0>,
  "characteristics": {
    "exampleTypes": [
      "3-5 SPECIFIC example types ideal for this domain",
      "e.g., 'API request/response examples' not just 'code examples'"
    ],
    "formats": [
      "Preferred formats like 'Python code blocks', 'mermaid flowcharts', 'comparison tables'",
      "MUST include 'latex-equations' if topic involves ANY mathematical formulas or equations"
    ],
    "vocabulary": [
      "5-10 domain-specific terms to use naturally (not define, just use)"
    ],
    "styleHints": [
      "2-4 specific writing style guidelines for this domain"
    ],
    "relatableExamples": [
      "3-5 scenarios students in this field would immediately connect with",
      "Be specific: 'debugging a production API at 2am' not 'solving problems'"
    ]
  },
  "contentGuidelines": "A detailed paragraph (4-6 sentences) explaining HOW to create effective content for this domain. What makes explanations click for these learners? What approaches bore them? What level of formality? What assumptions can you make about their background? DO NOT mention the domain name explicitly—this gets injected into prompts.",
  "qualityCriteria": "A detailed paragraph explaining what HIGH-QUALITY content looks like in this domain. What must reviewers check for? What are red flags? What are signs of excellence? Be specific and actionable.",
  
  "voiceModel": {
    "tone": "Choose ONE: 'confident_practitioner' (experienced pro teaching), 'curious_explorer' (discovering together), 'pragmatic_mentor' (practical wisdom), 'rigorous_academic' (precise and formal)",
    "exemplarPhrases": ["3-5 example sentence starters that sound natural for this domain, e.g., 'In production, you'll find...', 'The key insight here is...', 'What actually happens is...'", "For code review scenarios: 'A check of the logs reveals...'", "For business: 'From a strategic perspective...'"]
  }
}

═══════════════════════════════════════════════════════════════
⚠️ CRITICAL RULES (Violations cause failures)
═══════════════════════════════════════════════════════════════

• Output ONLY the JSON object—no markdown code fences, no explanatory text
• Be SPECIFIC in your recommendations (not generic advice)
• contentGuidelines and qualityCriteria should NOT mention the domain name
• voiceModel phrases MUST be specific to the domain context
• Handle multiline subtopics input - parse each line as a separate concept
• Output must be valid JSON that parses with JSON.parse()`;

    try {
      const response = await this.client.generate({
        system: this.getSystemPrompt(),
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        temperature: 0.3 // Slightly creative but mostly deterministic
      });

      const text = response.content.find((b: { type: string }) => b.type === 'text')?.text || "{}";
      const result = await parseLLMJson<any>(text, {});

      return {
        domain: result.domain || "general",
        confidence: typeof result.confidence === 'number' ? result.confidence : 0.5,
        characteristics: {
          exampleTypes: result.characteristics?.exampleTypes || ["practical examples"],
          formats: result.characteristics?.formats || ["markdown"],
          vocabulary: result.characteristics?.vocabulary || [],
          styleHints: result.characteristics?.styleHints || ["clear and accessible"],
          relatableExamples: result.characteristics?.relatableExamples || []
        },
        contentGuidelines: result.contentGuidelines || "Create clear, engaging educational content with practical examples that help students understand and apply concepts immediately.",
        qualityCriteria: result.qualityCriteria || "Content should be accurate, well-structured, engaging, and free of AI-sounding patterns. Include domain-appropriate examples.",
        voiceModel: {
          tone: result.voiceModel?.tone || "confident_practitioner",
          exemplarPhrases: result.voiceModel?.exemplarPhrases || [
            "In practice, this means...",
            "Consider a scenario where...",
            "The key takeaway is...",
            "You might encounter..."
          ]
        }
      };

    } catch (error) {
      console.error("CourseDetector failed:", error);
      // Return a safe fallback
      return {
        domain: "general",
        confidence: 0.3,
        characteristics: {
          exampleTypes: ["practical examples", "real-world scenarios"],
          formats: ["markdown", "code blocks where relevant"],
          vocabulary: [],
          styleHints: ["clear", "accessible", "engaging"],
          relatableExamples: ["everyday technology use cases"]
        },
        contentGuidelines: "Create clear, well-structured educational content with practical examples that help students understand and apply the concepts. Use concrete scenarios and avoid abstract explanations without grounding.",
        qualityCriteria: "Content should be accurate, logically structured, and free of AI-sounding patterns. Include practical examples that demonstrate concepts in action.",
        voiceModel: {
          tone: "confident_practitioner",
          exemplarPhrases: [
            "In practice...",
            "For example...",
            "Consider this situation...",
            "It's important to note..."
          ]
        }
      };
    }
  }
}
