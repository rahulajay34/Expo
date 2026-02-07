// @ts-nocheck - This file runs in Deno/Supabase Edge Runtime, not Node.js
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * GCCP Edge Function - Content Generation Orchestrator
 * 
 * This function handles the content generation pipeline in the cloud.
 * It receives a generation_id, runs the agent pipeline, and saves
 * progress via checkpoints for resilience.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

// Pipeline steps for checkpoint tracking
const STEPS = {
  COURSE_DETECTION: { name: 'course_detection', number: 1 },
  GAP_ANALYSIS: { name: 'gap_analysis', number: 2 },
  DRAFT_CREATION: { name: 'draft_creation', number: 3 },
  SANITIZATION: { name: 'sanitization', number: 4 },
  REVIEW_REFINE: { name: 'review_refine', number: 5 },
  FINAL_POLISH: { name: 'final_polish', number: 6 },
  FORMATTING: { name: 'formatting', number: 7 },
  COMPLETE: { name: 'complete', number: 8 },
};

interface GenerationRequest {
  generation_id: string;
  resume_from?: string;
  resume_content?: string;
}

Deno.serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { generation_id, resume_from, resume_content } = await req.json() as GenerationRequest;

    if (!generation_id) {
      return new Response(
        JSON.stringify({ error: "generation_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch the generation record
    const { data: generation, error: fetchError } = await supabase
      .from("generations")
      .select("*")
      .eq("id", generation_id)
      .single();

    if (fetchError || !generation) {
      return new Response(
        JSON.stringify({ error: "Generation not found", details: fetchError }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to processing
    await supabase
      .from("generations")
      .update({ status: "processing", current_step: 1 })
      .eq("id", generation_id);

    // Log helper
    const log = async (agent: string, message: string, type = "info") => {
      await supabase.from("generation_logs").insert({
        generation_id,
        agent_name: agent,
        message,
        log_type: type,
      });
    };

    // Checkpoint helper
    const saveCheckpoint = async (stepName: string, stepNumber: number, content: string, metadata?: Record<string, unknown>) => {
      await supabase.from("checkpoints").insert({
        generation_id,
        step_name: stepName,
        step_number: stepNumber,
        content_snapshot: content,
        metadata,
      });
      await supabase
        .from("generations")
        .update({ current_step: stepNumber })
        .eq("id", generation_id);
    };

    // Check if generation was stopped
    const checkStopped = async (): Promise<boolean> => {
      const { data } = await supabase
        .from("generations")
        .select("status")
        .eq("id", generation_id)
        .single();
      return data?.status === "failed";
    };

    // ========================================
    // GENERATION PIPELINE
    // ========================================

    const { topic, subtopics, mode, transcript } = generation;
    let currentContent = resume_content || "";
    let startStep = resume_from ? getStepNumber(resume_from) : 1;
    let gapAnalysis = null;
    let courseContext = null;

    try {
      // Step 1: Course Detection
      if (startStep <= STEPS.COURSE_DETECTION.number) {
        if (await checkStopped()) throw new Error("Stopped by user");

        await log("CourseDetector", "Analyzing content domain...", "step");

        courseContext = await detectCourse(topic, subtopics, transcript);

        await log("CourseDetector", `Detected domain: ${courseContext.domain} (${Math.round(courseContext.confidence * 100)}% confidence)`, "success");
        await saveCheckpoint(STEPS.COURSE_DETECTION.name, STEPS.COURSE_DETECTION.number, JSON.stringify(courseContext));

        // Update generation with course context
        await supabase
          .from("generations")
          .update({ course_context: courseContext })
          .eq("id", generation_id);
      }

      // Step 2: Gap Analysis (if transcript provided)
      if (startStep <= STEPS.GAP_ANALYSIS.number && transcript) {
        if (await checkStopped()) throw new Error("Stopped by user");

        await log("Analyzer", "Checking transcript coverage...", "step");

        gapAnalysis = await analyzeGaps(subtopics, transcript);

        // Check for mismatch
        const totalSubtopics = gapAnalysis.covered.length + gapAnalysis.notCovered.length + gapAnalysis.partiallyCovered.length;
        const coveredCount = gapAnalysis.covered.length + gapAnalysis.partiallyCovered.length;

        if (totalSubtopics > 0 && coveredCount === 0) {
          await log("Analyzer", "Transcript appears unrelated to topic/subtopics", "warning");
          await supabase
            .from("generations")
            .update({
              status: "failed",
              error_message: "Transcript does not match topic/subtopics"
            })
            .eq("id", generation_id);

          return new Response(
            JSON.stringify({ error: "Transcript mismatch" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        await log("Analyzer", "Gap analysis complete", "success");
        await saveCheckpoint(STEPS.GAP_ANALYSIS.name, STEPS.GAP_ANALYSIS.number, JSON.stringify(gapAnalysis));

        // Update generation with gap analysis
        await supabase
          .from("generations")
          .update({ gap_analysis: gapAnalysis })
          .eq("id", generation_id);
      }

      // Step 3: Draft Creation
      if (startStep <= STEPS.DRAFT_CREATION.number) {
        if (await checkStopped()) throw new Error("Stopped by user");

        await log("Creator", transcript ? "Drafting with transcript..." : "Drafting initial content...", "step");

        // Filter out subtopics that are NOT covered in the transcript
        // This prevents the LLM from trying to hallucinate content for missing topics
        let filteredSubtopics = subtopics;
        if (gapAnalysis && gapAnalysis.notCovered && gapAnalysis.notCovered.length > 0) {
          const notCoveredSet = new Set(gapAnalysis.notCovered.map((s: string) => s.toLowerCase().trim()));
          filteredSubtopics = subtopics
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => !notCoveredSet.has(s.toLowerCase()))
            .join(', ');

          if (filteredSubtopics !== subtopics) {
            await log("Creator", `Filtered out ${gapAnalysis.notCovered.length} subtopics not covered in transcript`, "info");
          }
        }

        currentContent = await createDraft({
          topic,
          subtopics: filteredSubtopics,
          mode,
          transcript,
          gapAnalysis,
          courseContext,
          assignmentCounts: generation.assignment_data?.counts,
        });

        await log("Creator", "Initial draft created", "success");
        await saveCheckpoint(STEPS.DRAFT_CREATION.name, STEPS.DRAFT_CREATION.number, currentContent);
      }

      // Step 4: Sanitization (if transcript)
      if (startStep <= STEPS.SANITIZATION.number && transcript) {
        if (await checkStopped()) throw new Error("Stopped by user");

        await log("Sanitizer", "Verifying facts against transcript...", "step");

        const sanitized = await sanitizeContent(currentContent, transcript);

        if (sanitized !== currentContent) {
          currentContent = sanitized;
          await log("Sanitizer", "Content sanitized", "success");
        } else {
          await log("Sanitizer", "No sanitization needed", "info");
        }

        await saveCheckpoint(STEPS.SANITIZATION.name, STEPS.SANITIZATION.number, currentContent);
      }

      // Step 5: Review & Refine Loop
      if (startStep <= STEPS.REVIEW_REFINE.number) {
        const MAX_LOOPS = 3;
        let loopCount = 0;
        let isQualityMet = false;

        while (loopCount < MAX_LOOPS && !isQualityMet) {
          if (await checkStopped()) throw new Error("Stopped by user");

          loopCount++;

          await log("Reviewer", loopCount > 1 ? `Re-evaluating (Round ${loopCount})...` : "Reviewing content quality...", "step");

          const review = await reviewContent(currentContent, mode, courseContext);

          const qualityThreshold = loopCount === 1 ? 9 : 9;
          const passesThreshold = review.score >= qualityThreshold;

          if (passesThreshold || !review.needsPolish) {
            isQualityMet = true;
            await log("Reviewer", `✅ Draft meets quality threshold (score: ${review.score})`, "success");
            break;
          }

          if (loopCount >= MAX_LOOPS) {
            await log("Reviewer", "⚠️ Max loops reached. Proceeding.", "warning");
            break;
          }

          // Refine
          await log("Refiner", `Refining: ${review.feedback}`, "step");

          currentContent = await refineContent(currentContent, review.feedback, review.detailedFeedback, courseContext);

          await log("Refiner", "Refinement applied", "success");
        }

        await saveCheckpoint(STEPS.REVIEW_REFINE.name, STEPS.REVIEW_REFINE.number, currentContent);
      }

      // Step 6: Final Polish (always run after review passes - this fixes Feature 2)
      if (startStep <= STEPS.FINAL_POLISH.number) {
        if (await checkStopped()) throw new Error("Stopped by user");

        await log("Refiner", "Applying final polish...", "step");

        currentContent = await finalPolish(currentContent, courseContext);

        await log("Refiner", "Final polish complete", "success");
        await saveCheckpoint(STEPS.FINAL_POLISH.name, STEPS.FINAL_POLISH.number, currentContent);
      }

      // Step 7: Formatting (for assignments)
      let formattedContent = null;
      if (startStep <= STEPS.FORMATTING.number && mode === "assignment") {
        if (await checkStopped()) throw new Error("Stopped by user");

        await log("Formatter", "Structuring assignment data...", "step");

        formattedContent = await formatAssignment(currentContent);

        await log("Formatter", "Assignment formatted", "success");
        await saveCheckpoint(STEPS.FORMATTING.name, STEPS.FORMATTING.number, JSON.stringify(formattedContent));
      }

      // Step 8: Complete
      await log("Orchestrator", "Generation completed successfully!", "success");

      // Meta-Quality Analysis
      try {
        await log("MetaQuality", "Running post-generation analysis...", "step");
        const analysis = await analyzeMetaQuality(currentContent, mode, courseContext);
        await saveMetaFeedback(supabase, mode, analysis);
        await supabase.from("generations").update({
          meta_analysis_completed: true,
          meta_analysis_timestamp: new Date().toISOString()
        }).eq("id", generation_id);
        await log("MetaQuality", "Analysis archived", "success");
      } catch (err: any) {
        console.error("Meta Quality Error:", err);
        await log("MetaQuality", `Analysis failed: ${err.message}`, "warning");
      }

      // Update generation with final content
      await supabase
        .from("generations")
        .update({
          status: "completed",
          final_content: currentContent,
          assignment_data: formattedContent || generation.assignment_data,
          current_step: STEPS.COMPLETE.number,
        })
        .eq("id", generation_id);

      return new Response(
        JSON.stringify({
          success: true,
          generation_id,
          status: "completed"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (pipelineError: any) {
      const errorMessage = pipelineError.message || "Pipeline error";
      console.error("[Pipeline Error]", errorMessage);

      await log("Orchestrator", errorMessage, "error");

      await supabase
        .from("generations")
        .update({
          status: "failed",
          error_message: errorMessage
        })
        .eq("id", generation_id);

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err: any) {
    console.error("[Edge Function Error]", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========================================
// HELPER FUNCTIONS - These call xAI Grok API
// ========================================

function getStepNumber(stepName: string): number {
  const step = Object.values(STEPS).find(s => s.name === stepName);
  return step?.number || 1;
}

async function callGemini(messages: any[], systemPrompt?: string, maxTokens = 10000): Promise<string> {
  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

async function detectCourse(topic: string, subtopics: string, transcript?: string | null): Promise<any> {
  const prompt = `Analyze this educational content and determine the subject domain:
Topic: ${topic}
Subtopics: ${subtopics}
${transcript ? `Transcript preview: ${transcript.slice(0, 2000)}` : ''}

Return a JSON object with:
- domain: string (e.g., "computer_science", "mathematics", "biology")
- confidence: number (0-1)
- characteristics: object with exampleTypes, formats, vocabulary, styleHints, relatableExamples arrays
- contentGuidelines: string
- qualityCriteria: string`;

  const result = await callGemini([{ role: "user", content: prompt }]);

  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { domain: "general", confidence: 0.5, characteristics: {} };
  }
}

async function analyzeGaps(subtopics: string, transcript: string): Promise<any> {
  const prompt = `Analyze which subtopics are covered in the transcript:
Subtopics: ${subtopics}
Transcript: ${transcript.slice(0, 50000)}

Return JSON with: covered (array), notCovered (array), partiallyCovered (array), transcriptTopics (array)`;

  const result = await callGemini([{ role: "user", content: prompt }]);

  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { covered: [], notCovered: [], partiallyCovered: [], transcriptTopics: [] };
  }
}

async function createDraft(options: any): Promise<string> {
  const { topic, subtopics, mode, transcript, gapAnalysis, courseContext, assignmentCounts } = options;

  const systemPrompt = `You are an expert educational content creator. Create high-quality ${mode} content for: ${topic}`;

  const prompt = `Create ${mode} content for:
Topic: ${topic}
Subtopics: ${subtopics}
${transcript ? `Based on transcript: ${transcript.slice(0, 30000)}` : ''}
${gapAnalysis ? `Gap analysis: ${JSON.stringify(gapAnalysis)}` : ''}
${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}
${assignmentCounts ? `Assignment counts: MCQ Single: ${assignmentCounts.mcsc}, MCQ Multi: ${assignmentCounts.mcmc}, Subjective: ${assignmentCounts.subjective}` : ''}

Generate comprehensive, well-structured content.`;

  return await callGemini([{ role: "user", content: prompt }], systemPrompt, 8000);
}

async function sanitizeContent(content: string, transcript: string): Promise<string> {
  const prompt = `Review this content against the source transcript. When you find unsupported information, REPLACE it with relevant content from the transcript instead of just removing it.

Content: ${content}

Transcript: ${transcript.slice(0, 40000)}

For any content that contradicts or is not supported by the transcript:
1. Identify what that section was trying to teach
2. Find related content in the transcript
3. Replace with transcript-based content that serves the same educational purpose
4. Maintain natural flow and formatting

Return the enhanced content with replacements (not deletions), keeping only information that can be verified from the transcript but replacing unsupported sections with appropriate transcript content.`;

  return await callGemini([{ role: "user", content: prompt }], undefined, 8000);
}

async function reviewContent(content: string, mode: string, courseContext?: any): Promise<any> {
  const prompt = `Review this ${mode} content for quality:

${content.slice(0, 20000)}

${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Return JSON with: score (1-10), needsPolish (boolean), feedback (string), detailedFeedback (array of strings)`;

  const result = await callGemini([{ role: "user", content: prompt }]);

  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { score: 7, needsPolish: false, feedback: "", detailedFeedback: [] };
  }
}

async function refineContent(content: string, feedback: string, detailedFeedback: string[], courseContext?: any): Promise<string> {
  const prompt = `Improve this content based on feedback:

Content: ${content}

Feedback: ${feedback}
Detailed issues: ${detailedFeedback.join("; ")}

${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Return the improved content.`;

  return await callGemini([{ role: "user", content: prompt }], undefined, 8000);
}

async function finalPolish(content: string, courseContext?: any): Promise<string> {
  const prompt = `Apply final polish to this content - fix any remaining issues, improve flow, and ensure professional quality:

${content}

${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Return the polished content.`;

  return await callGemini([{ role: "user", content: prompt }], undefined, 8000);
}

async function formatAssignment(content: string): Promise<any> {
  const prompt = `Convert this assignment content to structured JSON format:

${content}

Return JSON with: questions array, each containing type, question, options (if MCQ), correctAnswer, explanation`;

  const result = await callGemini([{ role: "user", content: prompt }], undefined, 8000);

  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { questions: [], raw: content };
  }
}

// ========================================
// META-QUALITY HELPERS
// ========================================

async function analyzeMetaQuality(content: string, mode: string, courseContext?: any): Promise<any> {
  const systemPrompt = `You are a Meta-Quality Analyst for an educational content generation system. Your role is to evaluate generated content and identify areas where the generation prompts could be improved.

## Your Evaluation Approach
You are TOPIC-AGNOSTIC: You judge quality mechanics (formatting, structure, pedagogy, factual presentation), NOT subject matter correctness.

## Quality Dimensions (Score 0-10)
1. Formatting: Markdown validity, LaTeX, code blocks
2. Pedagogy: Mode-specific educational principles
3. Clarity: Logical flow, transitions, jargon handling
4. Structure: Hierarchy, balance, completeness
5. Consistency: Terminology, voice, formatting patterns
6. Factual Accuracy Presentation: Citations, uncertainty acknowledgement

## Output Format
Respond ONLY with valid JSON:
{
  "scores": { "formatting": 0-10, "pedagogy": 0-10, "clarity": 0-10, "structure": 0-10, "consistency": 0-10, "factualAccuracy": 0-10 },
  "issues": [
    {
      "category": "formatting|pedagogy|clarity|structure|consistency|factual_errors",
      "severity": "critical|high|medium|low",
      "description": "string",
      "affectedAgent": "Creator|Sanitizer|Refiner|Reviewer|Formatter",
      "suggestedPromptChange": "string",
      "examples": ["string"]
    }
  ],
  "strengths": ["string"],
  "overallAssessment": "string"
}`;

  const prompt = `Analyze this ${mode} content:

${content.slice(0, 30000)}

${courseContext ? `Course Context: ${JSON.stringify(courseContext)}` : ''}

Return JSON analysis.`;

  const result = await callGemini([{ role: "user", content: prompt }], systemPrompt, 4000);

  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return {
      scores: { formatting: 5, pedagogy: 5, clarity: 5, structure: 5, consistency: 5, factualAccuracy: 5 },
      issues: [],
      strengths: [],
      overallAssessment: "Failed to parse analysis"
    };
  }
}

async function saveMetaFeedback(supabase: any, mode: string, analysis: any) {
  // Fetch existing
  const { data: existing } = await supabase
    .from("meta_feedback")
    .select("*")
    .eq("mode", mode)
    .single();

  let updatedContent;
  let newCount = 1;

  if (existing) {
    const current = existing.feedback_content;
    newCount = (existing.generation_count || 0) + 1;

    // Rolling Averages
    const weight = (newCount - 1) / newCount;
    const newWeight = 1 / newCount;

    const updateScore = (k: string) => Math.round(((current.scores[k] || 0) * weight + (analysis.scores[k] || 0) * newWeight) * 10) / 10;

    const newScores = {
      formatting: updateScore('formatting'),
      pedagogy: updateScore('pedagogy'),
      clarity: updateScore('clarity'),
      structure: updateScore('structure'),
      consistency: updateScore('consistency'),
      factualAccuracy: updateScore('factualAccuracy')
    };

    // Trends
    const getTrend = (prev: number, curr: number) => {
      const diff = curr - prev;
      return diff > 0.3 ? "improving" : diff < -0.3 ? "declining" : "stable";
    };

    const scoreTrends = {
      formatting: getTrend(current.scores.formatting, newScores.formatting),
      pedagogy: getTrend(current.scores.pedagogy, newScores.pedagogy),
      clarity: getTrend(current.scores.clarity, newScores.clarity),
      structure: getTrend(current.scores.structure, newScores.structure),
      consistency: getTrend(current.scores.consistency, newScores.consistency),
      factualAccuracy: getTrend(current.scores.factualAccuracy, newScores.factualAccuracy)
    };

    // Merge Issues
    const issuesMap = new Map();
    (current.issuesClusters || []).forEach((c: any) => issuesMap.set(`${c.agent}:${c.category}`, c));

    (analysis.issues || []).forEach((issue: any) => {
      const key = `${issue.affectedAgent}:${issue.category}`;
      const existing = issuesMap.get(key);
      if (existing) {
        existing.frequency++;
        existing.description = issue.description;
        existing.lastSeen = new Date().toISOString();
      } else {
        issuesMap.set(key, {
          agent: issue.affectedAgent,
          category: issue.category,
          frequency: 1,
          severity: issue.severity,
          description: issue.description,
          suggestedFix: issue.suggestedPromptChange,
          examples: issue.examples || [],
          lastSeen: new Date().toISOString()
        });
      }
    });

    updatedContent = {
      scores: newScores,
      previousScores: current.scores,
      scoreTrends,
      issuesClusters: Array.from(issuesMap.values()).slice(0, 20),
      strengths: [...new Set([...(current.strengths || []), ...(analysis.strengths || [])])].slice(0, 10),
      overallAssessment: analysis.overallAssessment
    };
  } else {
    updatedContent = {
      scores: analysis.scores || {},
      scoreTrends: {},
      issuesClusters: (analysis.issues || []).map((i: any) => ({
        agent: i.affectedAgent,
        category: i.category,
        frequency: 1,
        severity: i.severity,
        description: i.description,
        suggestedFix: i.suggestedPromptChange,
        examples: i.examples || [],
        lastSeen: new Date().toISOString()
      })),
      strengths: analysis.strengths || [],
      overallAssessment: analysis.overallAssessment
    };
  }

  await supabase.from("meta_feedback").upsert({
    mode,
    feedback_content: updatedContent,
    generation_count: newCount,
    last_updated: new Date().toISOString()
  }, { onConflict: "mode" });
}
