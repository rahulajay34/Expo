import { BaseAgent } from "./base-agent";
import { InstructorQualityResult } from "@/types/content";
import { GEMINI_MODELS } from "@/lib/gemini/client";
import { parseLLMJson } from "./utils/json-parser";

/**
 * InstructorQualityAgent - Evaluates teaching effectiveness from transcripts
 * 
 * Analyzes instructor's pedagogical approach across 8 dimensions:
 * 1. Begin with Why (not What)
 * 2. Connect to Student Growth
 * 3. Build Connection & Trust
 * 4. Explain Importance (not just Usage)
 * 5. Beginner's Mindset
 * 6. Real-World Analogies
 * 7. Learning Continuity
 * 8. Engagement Signals
 */
export class InstructorQualityAgent extends BaseAgent {
    constructor(client: any, model: string = GEMINI_MODELS.flash) {
        super("InstructorQuality", model, client);
    }

    getSystemPrompt(): string {
        return `You are an Expert Educational Consultant specializing in teaching effectiveness analysis.

═══════════════════════════════════════════════════════════════
🎯 YOUR ROLE
═══════════════════════════════════════════════════════════════

You evaluate instructor transcripts for PEDAGOGICAL EFFECTIVENESS. Your analysis helps instructors improve their teaching and helps content creators understand the quality of source material.

You are NOT evaluating content accuracy—you're evaluating HOW the instructor teaches.

═══════════════════════════════════════════════════════════════
📊 ASSESSMENT CRITERIA (8 Dimensions)
═══════════════════════════════════════════════════════════════

**1. BEGIN WITH WHY (15%)**
• Does instructor explain WHY before WHAT?
• Is purpose/motivation established before mechanics?
• Are learning objectives connected to real benefits?
• Score 10: Every concept starts with compelling "why"
• Score 5: Sometimes explains why, sometimes jumps to mechanics
• Score 1: Jumps straight into definitions/procedures

**2. CONNECT TO STUDENT GROWTH (10%)**
• Does instructor link learning to career/skill development?
• Are outcomes framed as personal growth opportunities?
• Is there a vision of what students will become?
• Score 10: Clear growth narrative throughout
• Score 5: Occasional mentions of benefits
• Score 1: No connection to student futures

**3. BUILD CONNECTION & TRUST (10%)**
• Is the tone conversational and approachable?
• Does instructor acknowledge questions or difficulties?
• Is there empathy for learner struggles?
• Score 10: Warm, relatable, acknowledges learning challenges
• Score 5: Professional but distant
• Score 1: Purely transactional, no rapport

**4. EXPLAIN IMPORTANCE, NOT JUST USAGE (15%)**
• Does instructor explain WHY concepts matter (not just how to use them)?
• Are implications and consequences discussed?
• Is there depth beyond procedural knowledge?
• Score 10: Deep understanding of significance conveyed
• Score 5: Mix of importance and procedure
• Score 1: Pure how-to without context

**5. BEGINNER'S MINDSET (15%)**
• Does instructor avoid assumed knowledge?
• Are prerequisites explained or acknowledged?
• Is jargon introduced properly?
• Score 10: Assumes nothing, builds from ground up
• Score 5: Some gaps in foundational explanations
• Score 1: Heavy assumed knowledge, insider jargon

**6. REAL-WORLD ANALOGIES (15%)**
• Are abstract concepts connected to familiar experiences?
• Are analogies accurate and helpful?
• Do examples resonate with student experiences?
• Score 10: Rich, memorable analogies throughout
• Score 5: Some analogies, could use more
• Score 1: Abstract explanations only

**7. LEARNING CONTINUITY (10%)**
• Does instructor reference what was learned previously?
• Is there a preview of what's coming next?
• Is current session positioned in a learning journey?
• Score 10: Clear previous → current → next flow
• Score 5: Some references but incomplete arc
• Score 1: Isolated session, no continuity

**8. ENGAGEMENT SIGNALS (10%)**
• Are there questions posed to students?
• Are there checkpoints for understanding?
• Does instructor invite participation?
• Score 10: Frequent engagement opportunities
• Score 5: Occasional engagement
• Score 1: Pure lecture, no interaction

═══════════════════════════════════════════════════════════════
📤 OUTPUT FORMAT (JSON ONLY)
═══════════════════════════════════════════════════════════════

{
  "overallScore": 7.5,
  "breakdown": [
    {
      "criterion": "Begin with Why",
      "score": 8,
      "weight": 15,
      "evidence": "Instructor says 'Before we look at the code, let's understand why this pattern exists...'",
      "suggestion": "Could strengthen by connecting to students' frustrations with alternative approaches"
    },
    // ... 7 more criteria
  ],
  "strengths": [
    "Excellent use of real-world analogies",
    "Strong beginner-friendly explanations"
  ],
  "improvementAreas": [
    "Could reference previous sessions more explicitly",
    "Add more engagement checkpoints"
  ],
  "continuityAnalysis": {
    "previousSessionRef": true,
    "nextSessionPreview": false,
    "details": "References 'last week's database concepts' but doesn't preview next session"
  }
}

CRITICAL:
- Return ONLY valid JSON. No explanatory text before or after.
- Evidence should be brief quotes or specific observations (not long excerpts)
- Suggestions should be actionable and specific
- Calculate overallScore as weighted average of breakdown scores`;
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

For each criterion:
1. Score from 1-10 based on the rubric
2. Provide a brief evidence quote or observation
3. If score < 8, provide a specific improvement suggestion

Then identify:
- Top 2-3 strengths
- Top 2-3 improvement areas
- Learning continuity (references to previous/next sessions)

Calculate the weighted overall score.`;
    }

    async analyze(transcript: string, topic: string, signal?: AbortSignal): Promise<InstructorQualityResult> {
        const response = await this.client.generate({
            system: this.getSystemPrompt(),
            messages: [{ role: "user", content: this.formatUserPrompt(transcript, topic) }],
            model: this.model,
            temperature: 0.3, // Slight creativity for suggestions
            signal
        });

        const content = response.content[0].type === 'text' ? response.content[0].text : '';

        try {
            const result = await parseLLMJson<any>(content);

            // Validate and normalize the result
            const breakdown = (result.breakdown || []).map((item: any) => ({
                criterion: item.criterion || 'Unknown',
                score: Number(item.score) || 5,
                weight: Number(item.weight) || 12.5,
                evidence: item.evidence || 'No specific evidence cited',
                suggestion: item.suggestion
            }));

            // Calculate weighted score if not provided
            let overallScore = result.overallScore;
            if (!overallScore && breakdown.length > 0) {
                const totalWeight = breakdown.reduce((sum: number, b: any) => sum + b.weight, 0);
                overallScore = breakdown.reduce((sum: number, b: any) => sum + (b.score * b.weight), 0) / totalWeight;
            }

            return {
                overallScore: Math.round((overallScore || 5) * 10) / 10,
                breakdown,
                strengths: result.strengths || [],
                improvementAreas: result.improvementAreas || [],
                continuityAnalysis: result.continuityAnalysis ? {
                    previousSessionRef: !!result.continuityAnalysis.previousSessionRef,
                    nextSessionPreview: !!result.continuityAnalysis.nextSessionPreview,
                    details: result.continuityAnalysis.details || ''
                } : undefined,
                timestamp: new Date().toISOString()
            };
        } catch (e) {
            console.error("Failed to parse instructor quality response:", content, e);
            // Return a fallback result
            return {
                overallScore: 0,
                breakdown: [],
                strengths: [],
                improvementAreas: ["Analysis failed - transcript may be too short or unclear"],
                timestamp: new Date().toISOString()
            };
        }
    }
}
