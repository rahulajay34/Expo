import { BaseAgent } from './base-agent';
import { parseLLMJson } from './utils/json-parser';

export interface QualityScores {
  formatting: number;
  pedagogy: number;
  clarity: number;
  structure: number;
  consistency: number;
  factualAccuracy: number;
}

export type IssueCategory = 'formatting' | 'pedagogy' | 'clarity' | 'structure' | 'consistency' | 'factual_errors';
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface QualityIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  description: string;
  affectedAgent: string;
  suggestedPromptChange: string;
  examples: string[];
}

export interface MetaAnalysis {
  scores: QualityScores;
  issues: QualityIssue[];
  strengths: string[];
  overallAssessment: string;
}

export class MetaQualityAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('MetaQuality', model, provider, apiKey);
  }

  getSystemPrompt(mode?: string): string {
    const modeSpecificPrinciples = this.getModeSpecificPrinciples(mode || 'lecture');

    return `You are a Meta-Quality Analyst for an educational content generation system. Evaluate generated content and identify areas where the generation prompts could be improved.

## Your Evaluation Approach

You are TOPIC-AGNOSTIC: You judge quality mechanics (formatting, structure, pedagogy), NOT subject matter correctness.

## Quality Dimensions (Score 0-10)

### 1. Formatting (0-10)
- Markdown validity and consistency
- HTML structure and nesting
- LaTeX/math expression placement
- Code block formatting and language tags
- Proper heading hierarchy

### 2. Pedagogy (0-10)
${modeSpecificPrinciples}

### 3. Clarity (0-10)
- Logical flow between sections
- Smooth transitions
- Jargon introduced before use

### 4. Structure (0-10)
- Clear section hierarchy
- Balanced section lengths
- Completeness

### 5. Consistency (0-10)
- Terminology used consistently
- Voice/tone consistency
- Formatting patterns applied uniformly

### 6. Factual Accuracy Presentation (0-10)
- Claims properly attributed
- Uncertainty acknowledged
- No internal contradictions

## Output Format

Respond ONLY with valid JSON:
{
  "scores": { "formatting": 8, "pedagogy": 7, "clarity": 8, "structure": 7, "consistency": 8, "factualAccuracy": 7 },
  "issues": [{ "category": "...", "severity": "...", "description": "...", "affectedAgent": "...", "suggestedPromptChange": "...", "examples": ["..."] }],
  "strengths": ["..."],
  "overallAssessment": "2-3 sentence summary"
}

Limit to maximum 10 issues, prioritizing by severity.`;
  }

  private getModeSpecificPrinciples(mode: string): string {
    switch (mode) {
      case 'pre-read':
        return `**Pre-Read Mode**: Priming not teaching, brief introductions, active engagement elements, vocabulary seeding, under 15-minute read time.`;
      case 'lecture':
        return `**Lecture Mode**: Synthesis not transcript, source of truth artifacts, searchability, actionable bridges (theory → practice), complete coverage.`;
      case 'assignment':
        return `**Assignment Mode**: Contextual simulation, artifact generation, constraint engineering, graduated difficulty.`;
      default:
        return `**General**: Clear learning objectives, appropriate scaffolding, active learning elements.`;
    }
  }

  async analyze(content: string, mode: string): Promise<MetaAnalysis> {
    const customPrompt = await this.getCustomPrompt('meta_quality');
    const system = customPrompt || this.getSystemPrompt(mode);

    const maxContentLength = 30000;
    const truncatedContent = content.length > maxContentLength
      ? content.slice(0, maxContentLength) + '\n\n[... content truncated for analysis ...]'
      : content;

    const prompt = `## Content Mode: ${mode}

## Generated Content to Analyze:

${truncatedContent}

## Task

Analyze the content above and provide your quality assessment as JSON.`;

    const response = await this.callAI(system, prompt, { temperature: 0.3, maxTokens: 4000 });

    const analysis = await parseLLMJson<MetaAnalysis>(response, {
      scores: { formatting: 5, pedagogy: 5, clarity: 5, structure: 5, consistency: 5, factualAccuracy: 5 },
      issues: [],
      strengths: [],
      overallAssessment: 'Unable to parse analysis response',
    });

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
      overallAssessment: analysis.overallAssessment || 'No assessment provided',
    };
  }

  private clampScore(score: number | undefined): number {
    if (score === undefined || isNaN(score)) return 5;
    return Math.max(0, Math.min(10, Math.round(score)));
  }

  private validateIssues(issues: QualityIssue[]): QualityIssue[] {
    const validCategories: IssueCategory[] = ['formatting', 'pedagogy', 'clarity', 'structure', 'consistency', 'factual_errors'];
    const validSeverities: IssueSeverity[] = ['critical', 'high', 'medium', 'low'];
    const validAgents = ['Creator', 'Sanitizer', 'Refiner', 'Reviewer', 'Formatter', 'AssignmentSanitizer'];

    return issues
      .filter(issue => issue && typeof issue === 'object')
      .map(issue => ({
        category: validCategories.includes(issue.category) ? issue.category : 'clarity',
        severity: validSeverities.includes(issue.severity) ? issue.severity : 'medium',
        description: String(issue.description || 'No description provided'),
        affectedAgent: validAgents.includes(issue.affectedAgent) ? issue.affectedAgent : 'Creator',
        suggestedPromptChange: String(issue.suggestedPromptChange || ''),
        examples: Array.isArray(issue.examples) ? issue.examples.map(String).slice(0, 3) : [],
      }))
      .slice(0, 10);
  }
}
