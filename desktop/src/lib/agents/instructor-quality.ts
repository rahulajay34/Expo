import { BaseAgent } from './base-agent';
import type { InstructorQualityResult } from '../../types';
import { parseLLMJson } from './utils/json-parser';

export class InstructorQualityAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('InstructorQuality', model, provider, apiKey);
  }

  getSystemPrompt(): string {
    return `You are an Expert Educational Consultant specializing in teaching effectiveness analysis.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

Evaluate instructor transcripts for PEDAGOGICAL EFFECTIVENESS. You are NOT evaluating content accuracy—you're evaluating HOW the instructor teaches.

═══════════════════════════════════════════════════════════════
📊 ASSESSMENT CRITERIA (8 Dimensions)
═══════════════════════════════════════════════════════════════

1. **BEGIN WITH WHY (15%)** - Does instructor explain WHY before WHAT?
2. **CONNECT TO STUDENT GROWTH (10%)** - Links learning to career/skill development?
3. **BUILD CONNECTION & TRUST (10%)** - Conversational, approachable tone?
4. **EXPLAIN IMPORTANCE (15%)** - WHY concepts matter, not just how to use them?
5. **BEGINNER'S MINDSET (15%)** - Avoids assumed knowledge? Introduces jargon properly?
6. **REAL-WORLD ANALOGIES (15%)** - Abstract concepts connected to familiar experiences?
7. **LEARNING CONTINUITY (10%)** - References previous/next sessions?
8. **ENGAGEMENT SIGNALS (10%)** - Questions posed? Checkpoints for understanding?

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "overallScore": 7.5,
  "summary": "One sentence summary.",
  "breakdown": [
    {
      "criterion": "Begin with Why",
      "score": 8,
      "weight": 15,
      "evidence": "Brief quote or observation",
      "suggestion": "Specific improvement suggestion"
    }
  ],
  "strengths": ["strength 1", "strength 2"],
  "improvementAreas": ["area 1", "area 2"],
  "continuityAnalysis": {
    "previousSessionRef": true,
    "nextSessionPreview": false,
    "details": "Details about continuity"
  }
}

Return ONLY valid JSON. Calculate overallScore as weighted average.`;
  }

  formatUserPrompt(transcript: string, topic: string): string {
    return `═══════════════════════════════════════════════════════════════
📝 TRANSCRIPT TO EVALUATE
═══════════════════════════════════════════════════════════════

Topic: ${topic}

${transcript.slice(0, 50000)}
${transcript.length > 50000 ? '\n... [transcript truncated]' : ''}

═══════════════════════════════════════════════════════════════
🔍 YOUR TASK
═══════════════════════════════════════════════════════════════

Evaluate this instructor's teaching effectiveness across ALL 8 criteria.
Score each from 1-10, provide evidence, and identify strengths + improvement areas.
Calculate the weighted overall score.`;
  }

  async analyze(transcript: string, topic: string): Promise<InstructorQualityResult> {
    const customPrompt = await this.getCustomPrompt('instructor_quality');
    const system = customPrompt || this.getSystemPrompt();

    const response = await this.callAI(
      system,
      this.formatUserPrompt(transcript, topic),
      { temperature: 0.3 }
    );

    try {
      const result = await parseLLMJson<any>(response);

      const breakdown = (result.breakdown || []).map((item: any) => ({
        criterion: item.criterion || 'Unknown',
        score: Number(item.score) || 5,
        weight: Number(item.weight) || 12.5,
        evidence: item.evidence || 'No specific evidence cited',
        suggestion: item.suggestion,
      }));

      let overallScore = result.overallScore;
      if (!overallScore && breakdown.length > 0) {
        const totalWeight = breakdown.reduce((sum: number, b: any) => sum + b.weight, 0);
        overallScore = breakdown.reduce((sum: number, b: any) => sum + (b.score * b.weight), 0) / totalWeight;
      }

      return {
        overallScore: Math.round((overallScore || 5) * 10) / 10,
        summary: result.summary || 'No summary provided',
        dimensions: breakdown.reduce((acc: Record<string, number>, item: any) => {
          acc[item.criterion] = item.score;
          return acc;
        }, {}),
        breakdown,
        strengths: result.strengths || [],
        improvementAreas: result.improvementAreas || [],
        improvements: result.improvementAreas || [],
        continuityAnalysis: result.continuityAnalysis ? {
          previousSessionRef: !!result.continuityAnalysis.previousSessionRef,
          nextSessionPreview: !!result.continuityAnalysis.nextSessionPreview,
          details: result.continuityAnalysis.details || '',
        } : undefined,
        timestamp: new Date().toISOString(),
      };
    } catch (e) {
      console.error('Failed to parse instructor quality response:', e);
      return {
        overallScore: 0,
        summary: 'Analysis failed',
        dimensions: {},
        breakdown: [],
        strengths: [],
        improvementAreas: ['Analysis failed - transcript may be too short or unclear'],
        improvements: [],
        timestamp: new Date().toISOString(),
      };
    }
  }
}
