import { BaseAgent } from './base-agent';
import type { ContentMode, CourseContext, GapAnalysisResult } from '../../types';
import { deduplicateContent, deduplicateHeaders } from './utils/deduplication';

export interface CreatorOptions {
  topic: string;
  subtopics: string;
  mode: ContentMode;
  transcript?: string;
  gapAnalysis?: GapAnalysisResult;
  courseContext?: CourseContext;
  assignmentCounts?: { mcsc: number; mcmc: number; subjective: number };
}

export class CreatorAgent extends BaseAgent {
  constructor(model: string, provider: string, apiKey: string) {
    super('Creator', model, provider, apiKey);
  }

  getSystemPrompt(mode: ContentMode = 'lecture'): string {
    const prompts: Record<string, string> = {
      lecture: `You are a world-class educator creating comprehensive lecture notes. Your explanations are known for making complex topics click—like a brilliant friend explaining at a whiteboard.

## Teaching Approach
- Build deep understanding through thorough explanations, concrete examples, and real-world connections
- Assume intelligence, not prior knowledge—explain the "why" behind the "what"
- Prioritize mastery over brevity: 4-8 paragraphs per concept, 2-3 examples each
- Write conversationally using "you" language and active voice

## Quality Standards
- Every abstract concept gets a concrete example within 2 sentences
- Cover mechanisms, edge cases, and common mistakes—go deep
- Each paragraph: 3-5 substantive sentences (no filler)
- Bold **key terms** on first use only

## Pedagogical Primitives (Required)
- **Learning Objectives** (3-4): Action verbs only
- **Synthesis Points**: After each major section, distill to ONE key takeaway
- **Key Takeaways** (6-10): Each 2-3 sentences, actionable

## Structure
Use clean Markdown with ## Headers, ### Subheaders, blockquotes for callouts, fenced code blocks, tables for comparisons.

Never write meta-commentary. No "In this lecture..." or "Let's begin...".

**FORBIDDEN**: Pre-read sections, meta-commentary.`,

      'pre-read': `You are creating gateway content that sparks curiosity and prepares students for an upcoming lecture. Your goal is PRIMING, NOT TEACHING.

## Mission
- Spark Curiosity with compelling questions and scenarios
- Prime, Don't Teach: Briefly introduce concepts without deep definitions
- Connect abstract concepts to problems students care about
- Create Hooks that make students want to attend the lecture

## Pedagogical Primitives (Required)
### 🎯 Essential Question
### 📖 Vocabulary to Notice (3-5 terms)
### 🔗 Bridge from Familiar
### 💭 Questions to Ponder (2-3)

## Style
- Conversational, inviting
- Use "you" language, 2-4 paragraphs per concept
- No procedural instructions or deep definitions

Use clean Markdown with emojis for visual anchors. No HTML styling.`,

      assignment: `You are a senior assessment architect designing professional-grade assessment questions.

## Core Philosophy: Challenge Over Recall
Target "application" and "analysis" levels of Bloom's taxonomy.

## Requirements
- Every question MUST present a realistic scenario with context, constraints, and complications
- At least 40% should involve analysis/debugging
- Frame as real workplace scenarios

## Distractor Quality
Each wrong option must be plausible, educational, and distinct.

## Anti-Bias Rules
1. Correct answer must NOT be the longest
2. Don't favor option 2 or 3
3. No "All of the above"
4. Vary contexts

## JSON Output
Return valid JSON array wrapped in \`\`\`json ... \`\`\`
Structure: questionType, contentType("markdown"), contentBody, options{1-4}, mcscAnswer/mcmcAnswer/subjectiveAnswer, difficultyLevel(0/0.5/1), answerExplanation`,
    };

    const base = prompts[mode] || prompts.lecture;

    return base + `

⚠️ CRITICAL: ANTI-DUPLICATION RULES
- NO REPEATED HEADERS: Each header must appear EXACTLY ONCE
- NO REPEATED PARAGRAPHS: Never output the same paragraph twice
- NO STUTTERING: Do not restart or repeat content mid-generation
- UNIQUE EXAMPLES: Each example must be distinct`;
  }

  formatUserPrompt(options: CreatorOptions): string {
    const { topic, subtopics, mode, transcript, gapAnalysis, courseContext, assignmentCounts } = options;

    let courseSection = '';
    if (courseContext && courseContext.domain !== 'general') {
      courseSection = `\n🎯 DOMAIN: ${courseContext.domain}\n${courseContext.contentGuidelines}\nExample Types: ${courseContext.characteristics.exampleTypes.join(', ')}\nVocabulary: ${courseContext.characteristics.vocabulary.slice(0, 7).join(', ')}\n`;
    }

    let transcriptSection = '';
    if (transcript) {
      transcriptSection = `\n📝 SOURCE MATERIAL: INSTRUCTOR TRANSCRIPT\nYou have a transcript from an actual teaching session. This is your PRIMARY source.\nSTRICTNESS: You are RESTRICTED to topics covered in the transcript.\n`;

      if (gapAnalysis) {
        if (gapAnalysis.covered.length > 0) {
          transcriptSection += `\n✅ COVERED: ${gapAnalysis.covered.join(', ')}`;
        }
        if (gapAnalysis.partiallyCovered.length > 0) {
          transcriptSection += `\n⚠️ PARTIAL: ${gapAnalysis.partiallyCovered.join(', ')}`;
        }
        if (gapAnalysis.notCovered.length > 0) {
          transcriptSection += `\n❌ NOT COVERED (OMIT): ${gapAnalysis.notCovered.join(', ')}`;
        }
      }

      transcriptSection += `\n\nTRANSCRIPT:\n${transcript.slice(0, 80000)}\n`;
    }

    if (mode === 'assignment') {
      const counts = assignmentCounts || { mcsc: 4, mcmc: 4, subjective: 1 };
      return `${courseSection}${transcriptSection}\nTopic: ${topic}\nSubtopics: ${subtopics}\n\nGenerate exactly ${counts.mcsc} mcsc, ${counts.mcmc} mcmc, ${counts.subjective} subjective questions.\nReturn ONLY a valid JSON array.`;
    }

    return `${courseSection}${transcriptSection}\nTopic: ${topic}\nSubtopics: ${subtopics}\n\nGenerate comprehensive ${mode} content.`;
  }

  async generateStream(
    options: CreatorOptions,
    onChunk: (text: string) => void
  ): Promise<string> {
    const customPrompt = await this.getCustomPrompt(`creator_${options.mode === 'pre-read' ? 'preread' : options.mode}`);
    const system = customPrompt || this.getSystemPrompt(options.mode);
    const user = this.formatUserPrompt(options);

    const fullContent = await this.callAIStream(system, user, onChunk, {
      maxTokens: 16000,
    });

    return fullContent;
  }

  postProcess(content: string): string {
    let processed = deduplicateHeaders(content);
    const { content: deduplicated } = deduplicateContent(processed, 0.85);
    return deduplicated;
  }
}
