import { BaseAgent } from "./base-agent";
import { AnthropicClient } from "@/lib/anthropic/client";
import { GEMINI_MODELS } from "@/lib/gemini/client";
import { parseLLMJson } from "./utils/json-parser";

/**
 * Quality dimension scores (0-10)
 */
export interface QualityScores {
    formatting: number;
    pedagogy: number;
    clarity: number;
    structure: number;
    consistency: number;
    factualAccuracy: number;
}

/**
 * Issue categories for quality problems
 */
export type IssueCategory =
    | "formatting"
    | "pedagogy"
    | "clarity"
    | "structure"
    | "consistency"
    | "factual_errors";

/**
 * Severity levels for issues
 */
export type IssueSeverity = "critical" | "high" | "medium" | "low";

/**
 * Individual quality issue identified in content
 */
export interface QualityIssue {
    category: IssueCategory;
    severity: IssueSeverity;
    description: string;
    affectedAgent: string;
    suggestedPromptChange: string;
    examples: string[];
}

/**
 * Complete meta-analysis result
 */
export interface MetaAnalysis {
    scores: QualityScores;
    issues: QualityIssue[];
    strengths: string[];
    overallAssessment: string;
}

/**
 * MetaQualityAgent evaluates generated content post-generation
 * to produce cumulative prompt improvement feedback.
 * 
 * Key characteristics:
 * - Topic-agnostic: Judges quality mechanics, not subject matter correctness
 * - Mode-aware: Applies different educational principles per content type
 * - Prompt-aware: Can suggest specific prompt changes for affected agents
 */
export class MetaQualityAgent extends BaseAgent {
    constructor(client: AnthropicClient) {
        super("MetaQuality", GEMINI_MODELS.flash, client);
    }

    getSystemPrompt(mode?: string): string {
        const modeSpecificPrinciples = this.getModeSpecificPrinciples(mode || "lecture");

        return `You are a Meta-Quality Analyst for an educational content generation system. Your role is to evaluate generated content and identify areas where the generation prompts could be improved.

## Your Evaluation Approach

You are TOPIC-AGNOSTIC: You judge quality mechanics (formatting, structure, pedagogy, factual presentation), NOT subject matter correctness. You don't verify if facts are correct - you check if claims are properly attributed, sources cited, and uncertainty acknowledged.

## Quality Dimensions (Score 0-10)

### 1. Formatting (0-10)
- Markdown validity and consistency
- HTML structure and nesting
- LaTeX/math expression placement and syntax
- Code block formatting and language tags
- Proper heading hierarchy (no skipped levels)

### 2. Pedagogy (0-10)
${modeSpecificPrinciples}

### 3. Clarity (0-10)
- Logical flow between sections
- Smooth transitions
- Example placement (appear after concepts, not before)
- Jargon introduced before use
- Sentence complexity appropriate for educational content

### 4. Structure (0-10)
- Clear section hierarchy
- Balanced section lengths
- Appropriate introduction and conclusion
- Table of contents alignment (if present)
- Completeness (all promised topics covered)

### 5. Consistency (0-10)
- Terminology used consistently throughout
- Voice/tone consistency (formal vs conversational)
- Formatting patterns applied uniformly
- Naming conventions followed

### 6. Factual Accuracy Presentation (0-10)
- Claims properly attributed or qualified
- Sources/references cited where appropriate
- Uncertainty acknowledged ("typically", "often" vs absolute claims)
- No internal contradictions
- Numerical data presented with context

## Agent Identification

When identifying which agent's prompt needs improvement, choose from:
- Creator: Initial content generation
- Sanitizer: Fact verification against transcript
- Refiner: Quality improvements and polish
- Reviewer: Quality assessment
- Formatter: JSON/structured output conversion
- AssignmentSanitizer: Question validation

## Output Format

Respond ONLY with valid JSON matching this structure:
{
  "scores": {
    "formatting": <0-10>,
    "pedagogy": <0-10>,
    "clarity": <0-10>,
    "structure": <0-10>,
    "consistency": <0-10>,
    "factualAccuracy": <0-10>
  },
  "issues": [
    {
      "category": "<formatting|pedagogy|clarity|structure|consistency|factual_errors>",
      "severity": "<critical|high|medium|low>",
      "description": "<clear description of the issue>",
      "affectedAgent": "<Creator|Sanitizer|Refiner|Reviewer|Formatter|AssignmentSanitizer>",
      "suggestedPromptChange": "<specific suggestion for improving the agent's prompt>",
      "examples": ["<excerpt from content showing the issue>"]
    }
  ],
  "strengths": ["<identified strength 1>", "<identified strength 2>"],
  "overallAssessment": "<2-3 sentence summary of content quality and primary areas for improvement>"
}

## Severity Guidelines

- **critical**: Content is unusable or seriously misleading (broken formatting, completely wrong structure)
- **high**: Major quality issue affecting comprehension (missing sections, inconsistent terminology)
- **medium**: Notable issue worth fixing (awkward transitions, minor formatting inconsistencies)
- **low**: Minor polish needed (single typos, slight verbosity)

Limit to maximum 10 issues, prioritizing by severity.`;
    }

    /**
     * Get mode-specific educational principles for evaluation
     */
    private getModeSpecificPrinciples(mode: string): string {
        switch (mode) {
            case "pre-read":
                return `**Pre-Read Mode Principles:**
- Priming not teaching: Brief introductions, not full explanations
- Under 15-minute read time (approximately 2000-3000 words)
- Active engagement elements (questions, reflection prompts, tasks)
- Vocabulary seeding without full definitions
- Creates curiosity and motivation for upcoming lecture
- Links to prior knowledge without assuming mastery`;

            case "lecture":
                return `**Lecture Mode Principles:**
- Synthesis not transcript: Distilled key points, not verbatim notes
- Source of truth: Final artifacts included (formulas, diagrams, code)
- Searchability: Clear headers, bolded key terms, scannable structure
- Actionable bridges: Theory → practice connections explicit
- Curated extensions: Separated from core content, clearly marked
- Complete coverage: All syllabus topics addressed`;

            case "assignment":
                return `**Assignment Mode Principles:**
- Contextual simulation: Realistic workplace/application scenarios
- Artifact generation: Produces tangible deliverables
- Fix-it methodology: Includes repair of broken examples where appropriate
- Constraint engineering: Creative limits that guide without restricting
- Ambiguity handling: Encourages documenting assumptions
- Graduated difficulty: Progressive challenge within question sets`;

            default:
                return `**General Educational Principles:**
- Clear learning objectives stated
- Appropriate scaffolding
- Active learning elements
- Formative assessment opportunities`;
        }
    }

    /**
     * Analyze content quality and generate meta-feedback
     * 
     * @param content - The generated content to analyze
     * @param mode - Content mode (pre-read, lecture, assignment)
     * @param promptsContext - Optional context about current agent prompts (truncated)
     * @returns MetaAnalysis with scores, issues, and assessment
     */
    async analyze(
        content: string,
        mode: string,
        promptsContext?: string
    ): Promise<MetaAnalysis> {
        // Truncate content to stay within token budget (roughly 30k chars = ~7.5k tokens)
        const maxContentLength = 30000;
        const truncatedContent = content.length > maxContentLength
            ? content.slice(0, maxContentLength) + "\n\n[... content truncated for analysis ...]"
            : content;

        // Build user message
        let userMessage = `## Content Mode: ${mode}

## Generated Content to Analyze:

${truncatedContent}`;

        if (promptsContext) {
            // Truncate prompts context as well (roughly 10k chars)
            const maxPromptsLength = 10000;
            const truncatedPrompts = promptsContext.length > maxPromptsLength
                ? promptsContext.slice(0, maxPromptsLength) + "\n\n[... prompts truncated ...]"
                : promptsContext;

            userMessage += `\n\n## Current Agent Prompts (for context on suggested improvements):

${truncatedPrompts}`;
        }

        userMessage += `\n\n## Task

Analyze the content above and provide your quality assessment as JSON. Focus on actionable improvements to the generation prompts.`;

        const response = await this.client.generate({
            system: this.getSystemPrompt(mode),
            messages: [{ role: "user", content: userMessage }],
            model: this.model,
            maxTokens: 4000,
            temperature: 0.3, // Lower temperature for more consistent analysis
        });

        // Extract text from response
        const responseText = response.content
            .filter((block: { type: string }) => block.type === "text")
            .map((block: { text: string }) => block.text)
            .join("");

        // Parse JSON response
        const analysis = await parseLLMJson<MetaAnalysis>(responseText, {
            scores: {
                formatting: 5,
                pedagogy: 5,
                clarity: 5,
                structure: 5,
                consistency: 5,
                factualAccuracy: 5,
            },
            issues: [],
            strengths: [],
            overallAssessment: "Unable to parse analysis response",
        });

        // Validate and clamp scores to 0-10 range
        const validatedScores: QualityScores = {
            formatting: this.clampScore(analysis.scores?.formatting),
            pedagogy: this.clampScore(analysis.scores?.pedagogy),
            clarity: this.clampScore(analysis.scores?.clarity),
            structure: this.clampScore(analysis.scores?.structure),
            consistency: this.clampScore(analysis.scores?.consistency),
            factualAccuracy: this.clampScore(analysis.scores?.factualAccuracy),
        };

        return {
            scores: validatedScores,
            issues: this.validateIssues(analysis.issues || []),
            strengths: analysis.strengths || [],
            overallAssessment: analysis.overallAssessment || "No assessment provided",
        };
    }

    /**
     * Clamp score to valid 0-10 range
     */
    private clampScore(score: number | undefined): number {
        if (score === undefined || isNaN(score)) return 5;
        return Math.max(0, Math.min(10, Math.round(score)));
    }

    /**
     * Validate and clean up issues array
     */
    private validateIssues(issues: QualityIssue[]): QualityIssue[] {
        const validCategories: IssueCategory[] = [
            "formatting",
            "pedagogy",
            "clarity",
            "structure",
            "consistency",
            "factual_errors",
        ];
        const validSeverities: IssueSeverity[] = ["critical", "high", "medium", "low"];
        const validAgents = [
            "Creator",
            "Sanitizer",
            "Refiner",
            "Reviewer",
            "Formatter",
            "AssignmentSanitizer",
        ];

        return issues
            .filter((issue) => issue && typeof issue === "object")
            .map((issue) => ({
                category: validCategories.includes(issue.category)
                    ? issue.category
                    : "clarity",
                severity: validSeverities.includes(issue.severity)
                    ? issue.severity
                    : "medium",
                description: String(issue.description || "No description provided"),
                affectedAgent: validAgents.includes(issue.affectedAgent)
                    ? issue.affectedAgent
                    : "Creator",
                suggestedPromptChange: String(issue.suggestedPromptChange || ""),
                examples: Array.isArray(issue.examples)
                    ? issue.examples.map(String).slice(0, 3)
                    : [],
            }))
            .slice(0, 10); // Limit to 10 issues
    }
}
