import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { 
  ProgressTracker, 
  AssignmentProgressTracker, 
  GenerationResumeHelper,
  type StageName 
} from "./progress-tracker.ts";

/**
 * GCCP Edge Function - Content Generation Orchestrator (Production v2.0)
 * 
 * This function handles the content generation pipeline in the cloud with:
 * - Real-time progress broadcasting via Supabase Realtime
 * - Granular percentage tracking (0-100%)
 * - Streaming content updates
 * - Resume logic for interrupted generations
 * - One-by-one question generation for assignments
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;

// STEP_TO_STAGE mapping kept for future use (e.g., checkpoint restoration)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const STEP_TO_STAGE: Record<string, StageName> = {
  'course_detection': 'CourseDetection',
  'gap_analysis': 'GapAnalysis',
  'draft_creation': 'DraftCreation',
  'sanitization': 'Sanitization',
  'review_refine': 'Review',
  'final_polish': 'FinalPolish',
  'formatting': 'Formatting',
  'quality_review': 'QualityReview',
  'complete': 'Completion',
};

const STAGE_TO_STEP: Record<StageName, { name: string; number: number }> = {
  'Initialization': { name: 'initialization', number: 0 },
  'CourseDetection': { name: 'course_detection', number: 1 },
  'GapAnalysis': { name: 'gap_analysis', number: 2 },
  'DraftCreation': { name: 'draft_creation', number: 3 },
  'Sanitization': { name: 'sanitization', number: 4 },
  'Review': { name: 'review_refine', number: 5 },
  'Refinement': { name: 'review_refine', number: 5 },
  'FinalPolish': { name: 'final_polish', number: 6 },
  'Formatting': { name: 'formatting', number: 7 },
  'QualityReview': { name: 'quality_review', number: 8 },
  'Completion': { name: 'complete', number: 9 },
};

interface GenerationRequest {
  generation_id: string;
  resume_token?: string;
  resume_from?: string;
}

interface QuestionSpec {
  type: 'mcq_single' | 'mcq_multi' | 'subjective';
  count: number;
}

interface GenerationRecord {
  id: string;
  user_id: string;
  topic: string;
  subtopics: string;
  mode: 'lecture' | 'assignment' | 'notes';
  transcript: string | null;
  assignment_data: { counts?: { mcsc?: number; mcmc?: number; subjective?: number } } | null;
  course_context: Record<string, unknown> | null;
  gap_analysis: Record<string, unknown> | null;
  status: string;
  last_checkpoint_step: number | null;
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
    const { generation_id, resume_token } = await req.json() as GenerationRequest;

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

    // Check for resume capability
    let resumePoint: { resumeFrom: StageName; resumeContent: string | null; nextStage: StageName } | null = null;
    
    if (resume_token) {
      const validation = GenerationResumeHelper.validateResumeToken(resume_token, generation_id);
      if (validation.valid && validation.stage) {
        // Fetch latest checkpoint for this stage
        const { data: checkpoints } = await supabase
          .from("checkpoints")
          .select("*")
          .eq("generation_id", generation_id)
          .order("step_number", { ascending: false })
          .limit(1);
        
        resumePoint = GenerationResumeHelper.determineResumePoint(
          checkpoints || [], 
          generation.last_checkpoint_step || 0
        );
      }
    }

    // Initialize progress tracker
    const progressTracker = generation.mode === 'assignment' 
      ? new AssignmentProgressTracker()
      : new ProgressTracker();

    // Helper to broadcast progress via database update (triggers Realtime)
    const broadcastProgress = async (percent: number, message: string, partialContent?: string) => {
      const update: Record<string, unknown> = {
        progress_percent: percent,
        progress_message: message,
        current_agent: progressTracker.getCurrentStage().name,
      };
      
      if (partialContent) {
        update.partial_content = partialContent;
      }

      await supabase
        .from("generations")
        .update(update)
        .eq("id", generation_id);
    };

    // Helper to record stage metrics
    const recordStageMetric = async (stageName: string, startedAt: Date, completedAt?: Date, metadata?: Record<string, unknown>) => {
      const metric: Record<string, unknown> = {
        generation_id: generation_id,
        stage_name: stageName,
        stage_weight: getStageWeight(stageName),
        started_at: startedAt.toISOString(),
        metadata: metadata || {},
      };

      if (completedAt) {
        metric.completed_at = completedAt.toISOString();
        metric.duration_ms = completedAt.getTime() - startedAt.getTime();
      }

      await supabase.from("generation_metrics").insert(metric);
    };

    // Log helper
    const log = async (agent: string, message: string, type = "info") => {
      await supabase.from("generation_logs").insert({
        generation_id,
        agent_name: agent,
        message,
        log_type: type,
      });
    };

    // Checkpoint helper with progress update
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
        .update({ 
          current_step: stepNumber,
          last_checkpoint_step: stepNumber,
        })
        .eq("id", generation_id);
    };

    // Check if generation was stopped
    const checkStopped = async (): Promise<boolean> => {
      const { data } = await supabase
        .from("generations")
        .select("status")
        .eq("id", generation_id)
        .single();
      return data?.status === 'failed' || data?.status === 'cancelled';
    };

    // Update status to processing and set started_at
    await supabase
      .from("generations")
      .update({ 
        status: "processing", 
        current_step: 0,
        started_at: new Date().toISOString(),
        progress_percent: 0,
        progress_message: "Initializing...",
      })
      .eq("id", generation_id);

    // ========================================
    // GENERATION PIPELINE
    // ========================================
    
    const { topic, subtopics, mode, transcript, assignment_data } = generation as GenerationRecord;
    let currentContent = resumePoint?.resumeContent || "";
    let gapAnalysis: Record<string, unknown> | null = null;
    let courseContext: Record<string, unknown> | null = null;
    let stageStartTime: Date | null = null;

    // Determine starting stage
    const startStage: StageName = resumePoint?.nextStage || 'Initialization';

    try {
      // Stage: Initialization
      if (shouldRunStage('Initialization', startStage)) {
        stageStartTime = new Date();
        progressTracker.setStage('Initialization');
        await broadcastProgress(0, "Initializing generation pipeline...");
        
        await log("Orchestrator", "Starting content generation pipeline", "step");
        await progressTracker.updateSubStep(0, "Validating input parameters...");
        await broadcastProgress(progressTracker.calculateTotalPercent(), progressTracker.getDefaultMessage());
        
        // Small delay to show initialization
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await progressTracker.updateSubStep(1);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Setup complete");
        await recordStageMetric('Initialization', stageStartTime, new Date());
      }

      // Stage: Course Detection
      if (shouldRunStage('CourseDetection', startStage)) {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('CourseDetection');
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Analyzing content domain...");
        
        await log("CourseDetector", "Analyzing content domain...", "step");
        await progressTracker.updateSubStep(0);
        
        courseContext = await detectCourse(topic, subtopics, transcript);
        
        await progressTracker.updateSubStep(1);
        const domain = typeof courseContext.domain === 'string' ? courseContext.domain : 'unknown';
        await broadcastProgress(progressTracker.calculateTotalPercent(), `Detected domain: ${domain}`);
        
        const confidence = typeof courseContext.confidence === 'number' ? courseContext.confidence : 0;
        await log("CourseDetector", `Detected domain: ${domain} (${Math.round(confidence * 100)}% confidence)`, "success");
        await progressTracker.updateSubStep(2);
        
        await saveCheckpoint(STAGE_TO_STEP['CourseDetection'].name, STAGE_TO_STEP['CourseDetection'].number, JSON.stringify(courseContext));
        await recordStageMetric('CourseDetection', stageStartTime, new Date(), { domain, confidence });
        
        // Update generation with course context
        await supabase
          .from("generations")
          .update({ course_context: courseContext })
          .eq("id", generation_id);
      } else if (generation.course_context) {
        courseContext = generation.course_context as Record<string, unknown>;
      }

      // Stage: Gap Analysis (if transcript provided)
      if (shouldRunStage('GapAnalysis', startStage) && transcript) {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('GapAnalysis');
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Checking transcript coverage...");
        
        await log("Analyzer", "Checking transcript coverage...", "step");
        await progressTracker.updateSubStep(0);
        
        gapAnalysis = await analyzeGaps(subtopics, transcript);
        
        await progressTracker.updateSubStep(1);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Analyzing coverage gaps...");
        
        // Check for mismatch
        const covered = Array.isArray(gapAnalysis.covered) ? gapAnalysis.covered : [];
        const notCovered = Array.isArray(gapAnalysis.notCovered) ? gapAnalysis.notCovered : [];
        const partiallyCovered = Array.isArray(gapAnalysis.partiallyCovered) ? gapAnalysis.partiallyCovered : [];
        const totalSubtopics = covered.length + notCovered.length + partiallyCovered.length;
        const coveredCount = covered.length + partiallyCovered.length;
        
        if (totalSubtopics > 0 && coveredCount === 0) {
          await log("Analyzer", "Transcript appears unrelated to topic/subtopics", "warning");
          await supabase
            .from("generations")
            .update({ 
              status: "failed",
              error_message: "Transcript does not match topic/subtopics",
              progress_message: "Transcript mismatch detected",
              completed_at: new Date().toISOString(),
            })
            .eq("id", generation_id);
          
          return new Response(
            JSON.stringify({ error: "Transcript mismatch" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        await progressTracker.updateSubStep(2);
        await broadcastProgress(progressTracker.calculateTotalPercent(), `Gap analysis complete: ${coveredCount}/${totalSubtopics} subtopics covered`);
        
        await log("Analyzer", "Gap analysis complete", "success");
        await saveCheckpoint(STAGE_TO_STEP['GapAnalysis'].name, STAGE_TO_STEP['GapAnalysis'].number, JSON.stringify(gapAnalysis));
        await recordStageMetric('GapAnalysis', stageStartTime, new Date(), { covered: coveredCount, total: totalSubtopics });
        
        // Update generation with gap analysis
        await supabase
          .from("generations")
          .update({ gap_analysis: gapAnalysis })
          .eq("id", generation_id);
      } else if (generation.gap_analysis) {
        gapAnalysis = generation.gap_analysis as Record<string, unknown>;
      }

      // Stage: Draft Creation
      if (shouldRunStage('DraftCreation', startStage)) {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('DraftCreation');
        
        // Filter out subtopics that are NOT covered in the transcript
        let filteredSubtopics = subtopics;
        if (gapAnalysis && gapAnalysis.notCovered && Array.isArray(gapAnalysis.notCovered) && gapAnalysis.notCovered.length > 0) {
          const notCoveredSet = new Set((gapAnalysis.notCovered as string[]).map((s: string) => s.toLowerCase().trim()));
          filteredSubtopics = subtopics
            .split(',')
            .map((s: string) => s.trim())
            .filter((s: string) => !notCoveredSet.has(s.toLowerCase()))
            .join(', ');
          
          if (filteredSubtopics !== subtopics) {
            await log("Creator", `Filtered out ${gapAnalysis.notCovered.length} subtopics not covered in transcript`, "info");
          }
        }

        if (mode === 'assignment' && assignment_data?.counts) {
          // One-by-one question generation for assignments
          await log("Creator", "Starting one-by-one question generation...", "step");
          
          const assignmentTracker = progressTracker as AssignmentProgressTracker;
          const questionSpecs: QuestionSpec[] = ([
            { type: 'mcq_single' as const, count: assignment_data.counts.mcsc || 0 },
            { type: 'mcq_multi' as const, count: assignment_data.counts.mcmc || 0 },
            { type: 'subjective' as const, count: assignment_data.counts.subjective || 0 },
          ] as QuestionSpec[]).filter(q => q.count > 0);
          
          const totalQuestions = questionSpecs.reduce((sum, q) => sum + q.count, 0);
          assignmentTracker.setTotalQuestions(totalQuestions);
          
          const generatedQuestions: unknown[] = [];
          let questionIndex = 0;
          
          for (const spec of questionSpecs) {
            for (let i = 0; i < spec.count; i++) {
              if (await checkStopped()) throw new Error("Stopped by user");
              
              assignmentTracker.startQuestion(questionIndex, spec.type);
              const progress = assignmentTracker.calculateQuestionProgress(questionIndex, 0);
              await broadcastProgress(progress.percent, progress.message);
              
              // Generate single question
              const question = await generateSingleQuestion({
                topic,
                subtopics: filteredSubtopics,
                type: spec.type,
                transcript,
                courseContext,
                gapAnalysis,
                existingQuestions: generatedQuestions,
              });
              
              generatedQuestions.push(question);
              assignmentTracker.completeQuestion();
              
              // Update partial content in real-time
              const partialAssignmentData = {
                questions: generatedQuestions,
                total_expected: totalQuestions,
                generated_count: generatedQuestions.length,
              };
              
              const progressUpdate = assignmentTracker.calculateQuestionProgress(questionIndex + 1, 0);
              await broadcastProgress(
                progressUpdate.percent, 
                progressUpdate.message,
                JSON.stringify(partialAssignmentData)
              );
              
              questionIndex++;
            }
          }
          
          currentContent = JSON.stringify({ questions: generatedQuestions });
          await log("Creator", `Generated ${generatedQuestions.length} questions`, "success");
        } else {
          // Standard content creation
          await log("Creator", transcript ? "Drafting with transcript..." : "Drafting initial content...", "step");
          await progressTracker.updateSubStep(0, "Planning content structure...");
          await broadcastProgress(progressTracker.calculateTotalPercent(), progressTracker.getDefaultMessage());
          
          await progressTracker.updateSubStep(1, "Drafting content...");
          
          // Stream progress during draft creation
          const draftResult = await createDraftWithStreaming({
            topic,
            subtopics: filteredSubtopics,
            mode,
            transcript,
            gapAnalysis,
            courseContext,
            onProgress: (subProgress: number, message: string) => {
              const totalProgress = progressTracker.setStageProgress(20 + subProgress * 0.6, message);
              broadcastProgress(totalProgress.percent, totalProgress.message).catch(console.error);
            },
          });
          
          currentContent = draftResult;
          await progressTracker.updateSubStep(4, "Finalizing draft...");
          await broadcastProgress(progressTracker.calculateTotalPercent(), "Draft creation complete");
          
          await log("Creator", "Initial draft created", "success");
        }
        
        await saveCheckpoint(STAGE_TO_STEP['DraftCreation'].name, STAGE_TO_STEP['DraftCreation'].number, currentContent);
        await recordStageMetric('DraftCreation', stageStartTime, new Date(), { mode, content_length: currentContent.length });
      }

      // Stage: Sanitization (if transcript)
      if (shouldRunStage('Sanitization', startStage) && transcript) {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('Sanitization');
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Verifying facts against transcript...");
        
        await log("Sanitizer", "Verifying facts against transcript...", "step");
        await progressTracker.updateSubStep(0);
        
        const sanitized = await sanitizeContent(currentContent, transcript);
        
        await progressTracker.updateSubStep(1);
        
        if (sanitized !== currentContent) {
          currentContent = sanitized;
          await log("Sanitizer", "Content sanitized", "success");
        } else {
          await log("Sanitizer", "No sanitization needed", "info");
        }
        
        await progressTracker.updateSubStep(2);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Sanitization complete");
        
        await saveCheckpoint(STAGE_TO_STEP['Sanitization'].name, STAGE_TO_STEP['Sanitization'].number, currentContent);
        await recordStageMetric('Sanitization', stageStartTime, new Date());
      }

      // Stage: Review & Refine Loop
      if (shouldRunStage('Review', startStage)) {
        const MAX_LOOPS = 3;
        let loopCount = 0;
        let isQualityMet = false;

        while (loopCount < MAX_LOOPS && !isQualityMet) {
          if (await checkStopped()) throw new Error("Stopped by user");
          
          loopCount++;
          
          // Review sub-stage
          stageStartTime = new Date();
          progressTracker.setStage('Review');
          
          await log("Reviewer", loopCount > 1 ? `Re-evaluating (Round ${loopCount})...` : "Reviewing content quality...", "step");
          await progressTracker.updateSubStep(0);
          await broadcastProgress(progressTracker.calculateTotalPercent(), `Reviewing content quality (iteration ${loopCount})...`);
          
          const review = await reviewContent(currentContent, mode, courseContext);
          
          await progressTracker.updateSubStep(1);
          const score = typeof review.score === 'number' ? review.score : 0;
          await broadcastProgress(progressTracker.calculateTotalPercent(), `Quality score: ${score}/10`);
          
          // Record feedback score for Critic agent
          await supabase.from("feedback_scores").insert({
            generation_id,
            agent_name: 'Reviewer',
            iteration: loopCount,
            overall_score: score / 10,
            feedback_text: typeof review.feedback === 'string' ? review.feedback : '',
            suggestions: Array.isArray(review.detailedFeedback) ? review.detailedFeedback : [],
          });
          
          await recordStageMetric(`Review_${loopCount}`, stageStartTime, new Date(), { score });
          
          const qualityThreshold = loopCount === 1 ? 9 : 8;
          const passesThreshold = score >= qualityThreshold;
          const needsPolish = review.needsPolish === true;

          if (passesThreshold || !needsPolish) {
            isQualityMet = true;
            await log("Reviewer", `✅ Draft meets quality threshold (score: ${score})`, "success");
            break;
          }

          if (loopCount >= MAX_LOOPS) {
            await log("Reviewer", "⚠️ Max loops reached. Proceeding.", "warning");
            break;
          }

          // Refinement sub-stage
          stageStartTime = new Date();
          progressTracker.setStage('Refinement');
          
          const feedbackText = typeof review.feedback === 'string' ? review.feedback : '';
          await log("Refiner", `Refining: ${feedbackText}`, "step");
          await progressTracker.updateSubStep(0);
          await broadcastProgress(progressTracker.calculateTotalPercent(), "Analyzing feedback...");
          
          await progressTracker.updateSubStep(1);
          await broadcastProgress(progressTracker.calculateTotalPercent(), "Applying refinements...");
          
          const detailedFeedback = Array.isArray(review.detailedFeedback) ? review.detailedFeedback as string[] : [];
          currentContent = await refineContent(currentContent, feedbackText, detailedFeedback, courseContext);
          
          await progressTracker.updateSubStep(2);
          await broadcastProgress(progressTracker.calculateTotalPercent(), "Refinement applied");
          
          await log("Refiner", "Refinement applied", "success");
          await saveCheckpoint(STAGE_TO_STEP['Review'].name, STAGE_TO_STEP['Review'].number, currentContent, { loop: loopCount });
          await recordStageMetric(`Refinement_${loopCount}`, stageStartTime, new Date());
        }
      }

      // Stage: Final Polish
      if (shouldRunStage('FinalPolish', startStage)) {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('FinalPolish');
        
        await log("Refiner", "Applying final polish...", "step");
        await progressTracker.updateSubStep(0);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Applying final polish...");
        
        currentContent = await finalPolish(currentContent, courseContext);
        
        await progressTracker.updateSubStep(1);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Final polish complete");
        
        await log("Refiner", "Final polish complete", "success");
        await saveCheckpoint(STAGE_TO_STEP['FinalPolish'].name, STAGE_TO_STEP['FinalPolish'].number, currentContent);
        await recordStageMetric('FinalPolish', stageStartTime, new Date());
      }

      // Stage: Formatting (for assignments)
      let formattedContent: Record<string, unknown> | null = null;
      if (shouldRunStage('Formatting', startStage) && mode === "assignment") {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('Formatting');
        
        await log("Formatter", "Structuring assignment data...", "step");
        await progressTracker.updateSubStep(0);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Parsing content...");
        
        await progressTracker.updateSubStep(1);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Structuring output...");
        
        formattedContent = await formatAssignment(currentContent);
        
        await progressTracker.updateSubStep(2);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Assignment formatted");
        
        await log("Formatter", "Assignment formatted", "success");
        await saveCheckpoint(STAGE_TO_STEP['Formatting'].name, STAGE_TO_STEP['Formatting'].number, JSON.stringify(formattedContent));
        await recordStageMetric('Formatting', stageStartTime, new Date());
      }

      // Stage: Quality Review (Critic Agent)
      if (shouldRunStage('QualityReview', startStage)) {
        if (await checkStopped()) throw new Error("Stopped by user");
        
        stageStartTime = new Date();
        progressTracker.setStage('QualityReview');
        
        await log("Critic", "Running automated quality assessment...", "step");
        await progressTracker.updateSubStep(0);
        await broadcastProgress(progressTracker.calculateTotalPercent(), "Analyzing content quality...");
        
        // Run Critic evaluation
        const criticResult = await evaluateWithCritic(currentContent, mode, transcript);
        
        await progressTracker.updateSubStep(1);
        await broadcastProgress(progressTracker.calculateTotalPercent(), `Quality score: ${criticResult.overall_score}/10`);
        
        // Record detailed feedback scores
        await supabase.from("feedback_scores").insert({
          generation_id,
          agent_name: 'Critic',
          iteration: 1,
          overall_score: criticResult.overall_score / 10,
          completeness_score: criticResult.category_scores.theoretical_practical_balance.score / 10,
          accuracy_score: criticResult.category_scores.accuracy_depth.score / 10,
          pedagogy_score: criticResult.category_scores.clarity_structure.score / 10,
          formatting_score: criticResult.category_scores.engagement_level.score / 10,
          feedback_text: criticResult.feedback_summary,
          suggestions: criticResult.actionable_improvements,
          metadata: {
            category_scores: criticResult.category_scores,
            meets_threshold: criticResult.meets_threshold,
            recommended_action: criticResult.recommended_action,
          },
        });
        
        await recordStageMetric('QualityReview', stageStartTime, new Date(), {
          score: criticResult.overall_score,
          meets_threshold: criticResult.meets_threshold,
          recommended_action: criticResult.recommended_action,
        });
        
        await log("Critic", `Quality assessment complete: ${criticResult.overall_score}/10 - ${criticResult.recommended_action}`,
          criticResult.meets_threshold ? "success" : "warning");
        
        // Check if regeneration is needed
        if (criticResult.recommended_action === "regenerate" && criticResult.overall_score < 6.5) {
          await log("Critic", "Content quality below threshold - flagging for review", "warning");
          // Note: In a full implementation, this could trigger a regeneration loop
          // For now, we flag it in the metadata but continue
        }
        
        await saveCheckpoint(STAGE_TO_STEP['QualityReview'].name, STAGE_TO_STEP['QualityReview'].number, currentContent, {
          critic_feedback: criticResult,
        });
      }

      // Stage: Completion
      stageStartTime = new Date();
      progressTracker.setStage('Completion');
      await progressTracker.updateSubStep(0);
      await broadcastProgress(97, "Finalizing generation...");
      
      await log("Orchestrator", "Generation completed successfully!", "success");
      
      // Generate resume token for future reference
      const finalResumeToken = GenerationResumeHelper.generateResumeToken(generation_id, 'Completion');
      
      // Update generation with final content
      await supabase
        .from("generations")
        .update({ 
          status: "completed",
          final_content: currentContent,
          assignment_data: formattedContent || assignment_data,
          current_step: STAGE_TO_STEP['Completion'].number,
          progress_percent: 100,
          progress_message: "Generation complete!",
          completed_at: new Date().toISOString(),
          resume_token: finalResumeToken,
          partial_content: null, // Clear partial content
        })
        .eq("id", generation_id);
      
      await progressTracker.updateSubStep(1);
      await recordStageMetric('Completion', stageStartTime, new Date());

      return new Response(
        JSON.stringify({ 
          success: true, 
          generation_id,
          status: "completed",
          resume_token: finalResumeToken,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } catch (pipelineError: unknown) {
      const errorMessage = pipelineError instanceof Error ? pipelineError.message : "Pipeline error";
      console.error("[Pipeline Error]", errorMessage);
      
      await log("Orchestrator", errorMessage, "error");
      
      // Generate resume token for recovery
      const errorResumeToken = GenerationResumeHelper.generateResumeToken(
        generation_id, 
        progressTracker.getCurrentStage().name
      );
      
      await supabase
        .from("generations")
        .update({ 
          status: "failed",
          error_message: errorMessage,
          progress_message: `Error: ${errorMessage}`,
          resume_token: errorResumeToken,
          completed_at: new Date().toISOString(),
        })
        .eq("id", generation_id);

      return new Response(
        JSON.stringify({ 
          error: errorMessage,
          resume_token: errorResumeToken,
          can_resume: true,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err: unknown) {
    console.error("[Edge Function Error]", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ========================================
// HELPER FUNCTIONS
// ========================================

function shouldRunStage(stage: StageName, startStage: StageName): boolean {
  const stageOrder: StageName[] = [
    'Initialization',
    'CourseDetection',
    'GapAnalysis',
    'DraftCreation',
    'Sanitization',
    'Review',
    'Refinement',
    'FinalPolish',
    'Formatting',
    'QualityReview',
    'Completion',
  ];
  
  const stageIndex = stageOrder.indexOf(stage);
  const startIndex = stageOrder.indexOf(startStage);
  
  return stageIndex >= startIndex;
}

function getStageWeight(stageName: string): number {
  const weights: Record<string, number> = {
    'Initialization': 2,
    'CourseDetection': 5,
    'GapAnalysis': 5,
    'DraftCreation': 35,
    'Sanitization': 5,
    'Review': 8,
    'Refinement': 8,
    'FinalPolish': 5,
    'Formatting': 8,
    'QualityReview': 7,
    'Completion': 3,
  };
  return weights[stageName] || 5;
}

interface AnthropicMessage {
  role: string;
  content: string;
}

interface AnthropicResponse {
  content: Array<{ text: string }>;
}

async function callAnthropic(messages: AnthropicMessage[], systemPrompt?: string, maxTokens = 10000): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${error}`);
  }

  const data = await response.json() as AnthropicResponse;
  return data.content[0].text;
}

// CourseContext interface kept for type documentation purposes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface CourseContext {
  domain: string;
  confidence: number;
  characteristics?: Record<string, unknown>;
}

async function detectCourse(topic: string, subtopics: string, transcript?: string | null): Promise<Record<string, unknown>> {
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

  const result = await callAnthropic([{ role: "user", content: prompt }]);
  
  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { domain: "general", confidence: 0.5, characteristics: {} };
  }
}

// GapAnalysis interface kept for type documentation purposes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface GapAnalysis {
  covered: string[];
  notCovered: string[];
  partiallyCovered: string[];
  transcriptTopics: string[];
}

async function analyzeGaps(subtopics: string, transcript: string): Promise<Record<string, unknown>> {
  const prompt = `Analyze which subtopics are covered in the transcript:
Subtopics: ${subtopics}
Transcript: ${transcript.slice(0, 50000)}

Return JSON with: covered (array), notCovered (array), partiallyCovered (array), transcriptTopics (array)`;

  const result = await callAnthropic([{ role: "user", content: prompt }]);
  
  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { covered: [], notCovered: [], partiallyCovered: [], transcriptTopics: [] };
  }
}

interface DraftOptions {
  topic: string;
  subtopics: string;
  mode: string;
  transcript?: string | null;
  gapAnalysis?: Record<string, unknown> | null;
  courseContext?: Record<string, unknown> | null;
  onProgress: (progress: number, message: string) => void;
}

async function createDraftWithStreaming(options: DraftOptions): Promise<string> {
  const { topic, subtopics, mode, transcript, gapAnalysis, courseContext, onProgress } = options;
  
  const systemPrompt = `You are an expert educational content creator. Create high-quality ${mode} content for: ${topic}`;
  
  const prompt = `Create ${mode} content for:
Topic: ${topic}
Subtopics: ${subtopics}
${transcript ? `Based on transcript: ${transcript.slice(0, 30000)}` : ''}
${gapAnalysis ? `Gap analysis: ${JSON.stringify(gapAnalysis)}` : ''}
${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Generate comprehensive, well-structured content.`;

  // Simulate streaming progress
  onProgress(10, "Initializing draft creation...");
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress(30, "Generating content structure...");
  const result = await callAnthropic([{ role: "user", content: prompt }], systemPrompt, 8000);
  
  onProgress(80, "Processing generated content...");
  await new Promise(resolve => setTimeout(resolve, 300));
  
  onProgress(100, "Draft creation complete");
  
  return result;
}

interface QuestionOptions {
  topic: string;
  subtopics: string;
  type: string;
  transcript?: string | null;
  courseContext?: Record<string, unknown> | null;
  gapAnalysis?: Record<string, unknown> | null;
  existingQuestions: unknown[];
}

async function generateSingleQuestion(options: QuestionOptions): Promise<Record<string, unknown>> {
  const { topic, subtopics, type, transcript, courseContext, existingQuestions } = options;
  // gapAnalysis is destructured but unused - kept for API compatibility
  void options.gapAnalysis;
  
  const typeDescriptions: Record<string, string> = {
    'mcq_single': 'Multiple choice question with exactly one correct answer',
    'mcq_multi': 'Multiple choice question with one or more correct answers',
    'subjective': 'Open-ended question requiring a written response',
  };
  
  const prompt = `Generate a single ${typeDescriptions[type]} for:
Topic: ${topic}
Subtopics: ${subtopics}
${transcript ? `Based on transcript: ${transcript.slice(0, 15000)}` : ''}
${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}
${existingQuestions.length > 0 ? `Existing questions (avoid duplicating): ${JSON.stringify(existingQuestions.map((q: unknown) => (q as Record<string, unknown>).question))}` : ''}

Return a JSON object with:
- type: "${type}"
- question: string (the question text)
${type.startsWith('mcq') ? '- options: string[] (4 options for MCQ)' : ''}
${type.startsWith('mcq') ? '- correctAnswer: ' + (type === 'mcq_multi' ? 'string[]' : 'string') : ''}
- explanation: string (detailed explanation of the answer)
- difficulty: "easy" | "medium" | "hard"
- topic: string (which subtopic this question covers)`;

  const result = await callAnthropic([{ role: "user", content: prompt }], undefined, 4000);
  
  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { 
      type, 
      question: "Error generating question", 
      explanation: "Please try again",
      difficulty: "medium",
      topic: subtopics.split(',')[0],
    };
  }
}

async function sanitizeContent(content: string, transcript: string): Promise<string> {
  const prompt = `Review this content against the source transcript and remove any information not present in the transcript:

Content: ${content}

Transcript: ${transcript.slice(0, 40000)}

Return the sanitized content, keeping only information that can be verified from the transcript.`;

  return await callAnthropic([{ role: "user", content: prompt }], undefined, 8000);
}

// ReviewResult interface kept for type documentation purposes
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface ReviewResult {
  score: number;
  needsPolish: boolean;
  feedback: string;
  detailedFeedback: string[];
}

async function reviewContent(content: string, mode: string, courseContext?: Record<string, unknown> | null): Promise<Record<string, unknown>> {
  const prompt = `Review this ${mode} content for quality:

${content.slice(0, 20000)}

${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Return JSON with: score (1-10), needsPolish (boolean), feedback (string), detailedFeedback (array of strings)`;

  const result = await callAnthropic([{ role: "user", content: prompt }]);
  
  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { score: 7, needsPolish: false, feedback: "", detailedFeedback: [] };
  }
}

async function refineContent(content: string, feedback: string, detailedFeedback: string[], courseContext?: Record<string, unknown> | null): Promise<string> {
  const prompt = `Improve this content based on feedback:

Content: ${content}

Feedback: ${feedback}
Detailed issues: ${detailedFeedback.join("; ")}

${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Return the improved content.`;

  return await callAnthropic([{ role: "user", content: prompt }], undefined, 8000);
}

async function finalPolish(content: string, courseContext?: Record<string, unknown> | null): Promise<string> {
  const prompt = `Apply final polish to this content - fix any remaining issues, improve flow, and ensure professional quality:

${content}

${courseContext ? `Course context: ${JSON.stringify(courseContext)}` : ''}

Return the polished content.`;

  return await callAnthropic([{ role: "user", content: prompt }], undefined, 8000);
}

async function formatAssignment(content: string): Promise<Record<string, unknown>> {
  const prompt = `Convert this assignment content to structured JSON format:

${content}

Return JSON with: questions array, each containing type, question, options (if MCQ), correctAnswer, explanation`;

  const result = await callAnthropic([{ role: "user", content: prompt }], undefined, 8000);
  
  try {
    return JSON.parse(result.replace(/```json\n?|\n?```/g, ''));
  } catch {
    return { questions: [], raw: content };
  }
}

interface CriticCategoryScore {
  score: number;
  weight: number;
  feedback: string;
}

interface CriticResult {
  overall_score: number;
  category_scores: {
    theoretical_practical_balance: CriticCategoryScore;
    clarity_structure: CriticCategoryScore;
    accuracy_depth: CriticCategoryScore;
    engagement_level: CriticCategoryScore;
  };
  feedback_summary: string;
  actionable_improvements: string[];
  meets_threshold: boolean;
  recommended_action: "publish" | "refine" | "regenerate";
}

/**
 * Critic Agent evaluation function
 * Evaluates content quality and provides structured feedback
 */
async function evaluateWithCritic(
  content: string,
  mode: string,
  transcript?: string | null
): Promise<CriticResult> {
  const systemPrompt = `You are an Expert Content Quality Assessor specializing in educational materials.

Evaluate content on these dimensions:
1. THEORETICAL VS PRACTICAL BALANCE (Target: 20% theory, 80% practical)
2. CLARITY AND STRUCTURE
3. ACCURACY AND DEPTH
4. ENGAGEMENT LEVEL

Return ONLY valid JSON in this format:
{
  "overall_score": <number 1-10>,
  "category_scores": {
    "theoretical_practical_balance": { "score": <1-10>, "weight": 0.25, "feedback": "..." },
    "clarity_structure": { "score": <1-10>, "weight": 0.25, "feedback": "..." },
    "accuracy_depth": { "score": <1-10>, "weight": 0.25, "feedback": "..." },
    "engagement_level": { "score": <1-10>, "weight": 0.25, "feedback": "..." }
  },
  "feedback_summary": "One-paragraph summary",
  "actionable_improvements": ["item 1", "item 2"],
  "meets_threshold": <boolean>,
  "recommended_action": "publish" | "refine" | "regenerate"
}

Thresholds:
- "publish": overall_score >= 8.5
- "refine": overall_score >= 6.5 and < 8.5
- "regenerate": overall_score < 6.5`;

  const transcriptSection = transcript
    ? `\n\nSource Transcript (for accuracy check):\n${transcript.slice(0, 10000)}`
    : "";

  const prompt = `Evaluate this ${mode} content for quality:

${content.slice(0, 15000)}${content.length > 15000 ? "\n...[truncated]" : ""}${transcriptSection}

Provide detailed evaluation across all four dimensions. Be thorough but fair.`;

  // Use Haiku for cost efficiency (evaluation is analytical)
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4000,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    // Return safe fallback on API error
    return {
      overall_score: 7,
      category_scores: {
        theoretical_practical_balance: { score: 7, weight: 0.25, feedback: "Evaluation failed - manual review recommended" },
        clarity_structure: { score: 7, weight: 0.25, feedback: "Evaluation failed - manual review recommended" },
        accuracy_depth: { score: 7, weight: 0.25, feedback: "Evaluation failed - manual review recommended" },
        engagement_level: { score: 7, weight: 0.25, feedback: "Evaluation failed - manual review recommended" },
      },
      feedback_summary: "Automated evaluation encountered an error. Content requires manual review.",
      actionable_improvements: ["Review content manually due to evaluation failure"],
      meets_threshold: false,
      recommended_action: "refine",
    };
  }

  const data = await response.json() as AnthropicResponse;
  const text = data.content[0].text;

  try {
    const result = JSON.parse(text.replace(/```json\n?|\n?```/g, '').trim()) as Partial<CriticResult>;
    
    return {
      overall_score: typeof result.overall_score === "number" ? result.overall_score : 7,
      category_scores: {
        theoretical_practical_balance: result.category_scores?.theoretical_practical_balance || { score: 7, weight: 0.25, feedback: "No feedback" },
        clarity_structure: result.category_scores?.clarity_structure || { score: 7, weight: 0.25, feedback: "No feedback" },
        accuracy_depth: result.category_scores?.accuracy_depth || { score: 7, weight: 0.25, feedback: "No feedback" },
        engagement_level: result.category_scores?.engagement_level || { score: 7, weight: 0.25, feedback: "No feedback" },
      },
      feedback_summary: result.feedback_summary || "Evaluation completed.",
      actionable_improvements: Array.isArray(result.actionable_improvements) ? result.actionable_improvements : [],
      meets_threshold: typeof result.meets_threshold === "boolean" ? result.meets_threshold : (result.overall_score ?? 0) >= 8,
      recommended_action: ["publish", "refine", "regenerate"].includes(result.recommended_action as string)
        ? (result.recommended_action as "publish" | "refine" | "regenerate")
        : ((result.overall_score ?? 0) >= 8.5 ? "publish" : (result.overall_score ?? 0) >= 6.5 ? "refine" : "regenerate"),
    };
  } catch (error) {
    console.error("Failed to parse Critic evaluation:", error);
    
    // Return safe fallback
    return {
      overall_score: 7,
      category_scores: {
        theoretical_practical_balance: { score: 7, weight: 0.25, feedback: "Parse error - manual review recommended" },
        clarity_structure: { score: 7, weight: 0.25, feedback: "Parse error - manual review recommended" },
        accuracy_depth: { score: 7, weight: 0.25, feedback: "Parse error - manual review recommended" },
        engagement_level: { score: 7, weight: 0.25, feedback: "Parse error - manual review recommended" },
      },
      feedback_summary: "Failed to parse evaluation results. Content requires manual review.",
      actionable_improvements: ["Review content manually due to parse error"],
      meets_threshold: false,
      recommended_action: "refine",
    };
  }
}
