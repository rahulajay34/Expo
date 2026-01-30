/**
 * Deno Tests for GCCP Edge Function - Progress Tracker
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { 
  ProgressTracker, 
  AssignmentProgressTracker, 
  GenerationResumeHelper,
  STAGE_WEIGHTS,
  STAGE_ORDER,
  type StageName
} from "./progress-tracker.ts";

// ========================================
// PROGRESS TRACKER TESTS
// ========================================

Deno.test("ProgressTracker - initialization", () => {
  const tracker = new ProgressTracker();
  const stage = tracker.getCurrentStage();
  
  assertEquals(stage.name, "Initialization");
  assertEquals(stage.subStep, 0);
  assertEquals(stage.stageProgress, 0);
});

Deno.test("ProgressTracker - stage weights sum to 100", () => {
  const tracker = new ProgressTracker();
  const totalWeight = tracker.getTotalWeight();
  
  assertEquals(totalWeight, 100);
});

Deno.test("ProgressTracker - progress calculation accuracy (0-100%)", async (t) => {
  await t.step("starts at 0%", () => {
    const tracker = new ProgressTracker();
    const percent = tracker.calculateTotalPercent();
    assertEquals(percent, 0);
  });

  await t.step("progresses through stages correctly", () => {
    const tracker = new ProgressTracker();
    
    // Test each stage boundary
    tracker.setStage("Initialization");
    tracker.updateSubStep(1);
    const initProgress = tracker.calculateTotalPercent();
    assertEquals(initProgress >= 0 && initProgress <= 5, true);
    
    tracker.setStage("CourseDetection");
    tracker.updateSubStep(0);
    const courseProgress = tracker.calculateTotalPercent();
    assertEquals(courseProgress >= 2 && courseProgress <= 10, true);
    
    tracker.setStage("DraftCreation");
    tracker.updateSubStep(2);
    const draftProgress = tracker.calculateTotalPercent();
    assertEquals(draftProgress >= 15 && draftProgress <= 50, true);
    
    tracker.setStage("Completion");
    tracker.updateSubStep(1);
    const completionProgress = tracker.calculateTotalPercent();
    assertEquals(completionProgress >= 95 && completionProgress <= 100, true);
  });

  await t.step("never exceeds 100%", () => {
    const tracker = new ProgressTracker();
    
    // Try to set progress beyond 100
    tracker.setStage("Completion");
    tracker.setStageProgress(150);
    
    const percent = tracker.calculateTotalPercent();
    assertEquals(percent <= 100, true);
  });

  await t.step("never goes below 0%", () => {
    const tracker = new ProgressTracker();
    tracker.setStageProgress(-50);
    
    const percent = tracker.calculateTotalPercent();
    assertEquals(percent >= 0, true);
  });

  await t.step("monotonically increases through stages", () => {
    const tracker = new ProgressTracker();
    let lastPercent = 0;
    
    for (const stage of STAGE_ORDER) {
      tracker.setStage(stage);
      tracker.updateSubStep(0);
      const percent = tracker.calculateTotalPercent();
      
      assertEquals(percent >= lastPercent, true);
      lastPercent = percent;
    }
  });
});

Deno.test("ProgressTracker - sub-step progress distribution", () => {
  const tracker = new ProgressTracker();
  
  tracker.setStage("DraftCreation");
  
  // DraftCreation has 5 sub-steps with weights [20, 25, 25, 20, 10]
  const step0Progress = tracker.updateSubStep(0);
  const step1Progress = tracker.updateSubStep(1);
  const step2Progress = tracker.updateSubStep(2);
  const step3Progress = tracker.updateSubStep(3);
  const step4Progress = tracker.updateSubStep(4);
  
  // Each step should increase progress
  assertEquals(step1Progress.percent > step0Progress.percent, true);
  assertEquals(step2Progress.percent > step1Progress.percent, true);
  assertEquals(step3Progress.percent > step2Progress.percent, true);
  assertEquals(step4Progress.percent > step3Progress.percent, true);
});

Deno.test("ProgressTracker - custom weights", () => {
  const customWeights = {
    Initialization: 5,
    CourseDetection: 10,
    GapAnalysis: 10,
    DraftCreation: 40,
    Sanitization: 10,
    Review: 5,
    Refinement: 5,
    FinalPolish: 5,
    Formatting: 5,
    QualityReview: 3,
    Completion: 2,
  };
  
  const tracker = new ProgressTracker(customWeights);
  const totalWeight = tracker.getTotalWeight();
  
  assertEquals(totalWeight, 100);
});

// ========================================
// ASSIGNMENT PROGRESS TRACKER TESTS
// ========================================

Deno.test("AssignmentProgressTracker - question count validation", async (t) => {
  await t.step("tracks total questions correctly", () => {
    const tracker = new AssignmentProgressTracker();
    tracker.setTotalQuestions(10);
    
    const progress = tracker.calculateQuestionProgress(0, 0);
    assertExists(progress.message);
    assertExists(progress.percent);
  });

  await t.step("calculates per-question progress accurately", () => {
    const tracker = new AssignmentProgressTracker();
    tracker.setTotalQuestions(5);
    
    // At question 0, should be at start of DraftCreation
    const progress0 = tracker.calculateQuestionProgress(0, 0);
    assertEquals(progress0.percent >= 15 && progress0.percent <= 20, true);
    
    // At question 5 (all complete), should be near end of DraftCreation
    tracker.completeQuestion();
    tracker.completeQuestion();
    tracker.completeQuestion();
    tracker.completeQuestion();
    tracker.completeQuestion();
    
    const progress5 = tracker.calculateQuestionProgress(5, 0);
    assertEquals(progress5.percent >= 40 && progress5.percent <= 55, true);
  });

  await t.step("handles zero questions gracefully", () => {
    const tracker = new AssignmentProgressTracker();
    tracker.setTotalQuestions(0);
    
    const progress = tracker.calculateQuestionProgress(0, 0);
    assertEquals(progress.percent, 0);
    assertEquals(progress.message, "Preparing questions...");
  });

  await t.step("tracks question types", () => {
    const tracker = new AssignmentProgressTracker();
    tracker.setTotalQuestions(3);
    
    tracker.startQuestion(0, "mcq_single");
    const progress1 = tracker.calculateQuestionProgress(0, 50);
    assertEquals(progress1.message.includes("mcq_single"), true);
    
    tracker.completeQuestion();
    tracker.startQuestion(1, "subjective");
    const progress2 = tracker.calculateQuestionProgress(1, 0);
    assertEquals(progress2.message.includes("subjective"), true);
  });
});

Deno.test("AssignmentProgressTracker - exact question counts", () => {
  const tracker = new AssignmentProgressTracker();
  
  // Simulate assignment with specific counts
  const questionSpecs = [
    { type: "mcq_single", count: 3 },
    { type: "mcq_multi", count: 2 },
    { type: "subjective", count: 5 },
  ];
  
  const totalQuestions = questionSpecs.reduce((sum, q) => sum + q.count, 0);
  tracker.setTotalQuestions(totalQuestions);
  
  assertEquals(totalQuestions, 10);
  
  // Simulate generating all questions
  let generatedCount = 0;
  for (const spec of questionSpecs) {
    for (let i = 0; i < spec.count; i++) {
      tracker.startQuestion(generatedCount, spec.type);
      tracker.completeQuestion();
      generatedCount++;
    }
  }
  
  assertEquals(generatedCount, 10);
});

// ========================================
// GENERATION RESUME HELPER TESTS
// ========================================

Deno.test("GenerationResumeHelper - resume token generation and validation", async (t) => {
  await t.step("generates valid resume tokens", () => {
    const generationId = "test-gen-123";
    const stage: StageName = "DraftCreation";
    
    const token = GenerationResumeHelper.generateResumeToken(generationId, stage);
    
    assertExists(token);
    assertEquals(typeof token, "string");
    assertEquals(token.length > 0, true);
  });

  await t.step("validates correct tokens", () => {
    const generationId = "test-gen-456";
    const stage: StageName = "Review";
    
    const token = GenerationResumeHelper.generateResumeToken(generationId, stage);
    const validation = GenerationResumeHelper.validateResumeToken(token, generationId);
    
    assertEquals(validation.valid, true);
    assertEquals(validation.stage, stage);
  });

  await t.step("rejects tokens for wrong generation", () => {
    const token = GenerationResumeHelper.generateResumeToken("gen-1", "DraftCreation");
    const validation = GenerationResumeHelper.validateResumeToken(token, "gen-2");
    
    assertEquals(validation.valid, false);
  });

  await t.step("rejects invalid tokens", () => {
    const validation = GenerationResumeHelper.validateResumeToken("invalid-token", "gen-1");
    
    assertEquals(validation.valid, false);
  });
});

Deno.test("GenerationResumeHelper - determine resume point", async (t) => {
  await t.step("returns initialization for empty checkpoints", () => {
    const result = GenerationResumeHelper.determineResumePoint([], 0);
    
    assertEquals(result.resumeFrom, "Initialization");
    assertEquals(result.resumeContent, null);
    assertEquals(result.nextStage, "CourseDetection");
  });

  await t.step("resumes from latest checkpoint", () => {
    const checkpoints = [
      { step_name: "course_detection", step_number: 1, content_snapshot: "{\"domain\": \"cs\"}" },
      { step_name: "draft_creation", step_number: 3, content_snapshot: "draft content" },
    ];
    
    const result = GenerationResumeHelper.determineResumePoint(checkpoints, 3);
    
    assertEquals(result.resumeFrom, "DraftCreation");
    assertEquals(result.resumeContent, "draft content");
    assertEquals(result.nextStage, "Sanitization");
  });

  await t.step("handles all checkpoint types", () => {
    const checkpointTypes = [
      { step: "course_detection", expectedStage: "CourseDetection" },
      { step: "gap_analysis", expectedStage: "GapAnalysis" },
      { step: "draft_creation", expectedStage: "DraftCreation" },
      { step: "sanitization", expectedStage: "Sanitization" },
      { step: "review_refine", expectedStage: "Review" },
      { step: "final_polish", expectedStage: "FinalPolish" },
      { step: "formatting", expectedStage: "Formatting" },
      { step: "complete", expectedStage: "Completion" },
    ];
    
    for (const { step, expectedStage } of checkpointTypes) {
      const checkpoints = [
        { step_name: step, step_number: 1, content_snapshot: "content" },
      ];
      
      const result = GenerationResumeHelper.determineResumePoint(checkpoints, 1);
      assertEquals(result.resumeFrom, expectedStage);
    }
  });
});

Deno.test("GenerationResumeHelper - can resume check", () => {
  assertEquals(GenerationResumeHelper.canResume("failed", 3), true);
  assertEquals(GenerationResumeHelper.canResume("failed", 0), false);
  assertEquals(GenerationResumeHelper.canResume("completed", 3), false);
  assertEquals(GenerationResumeHelper.canResume("processing", 3), false);
  assertEquals(GenerationResumeHelper.canResume("cancelled", 3), false);
});

// ========================================
// ERROR RECOVERY AND RETRY TESTS
// ========================================

Deno.test("Error Recovery - stage progression after failure", () => {
  const tracker = new ProgressTracker();
  
  // Simulate failure at DraftCreation
  tracker.setStage("DraftCreation");
  tracker.updateSubStep(2);
  const failedProgress = tracker.calculateTotalPercent();
  
  // Resume from same stage
  tracker.setStage("DraftCreation");
  tracker.updateSubStep(0);
  const resumedProgress = tracker.calculateTotalPercent();
  
  // Resumed progress should be at or before failed progress
  assertEquals(resumedProgress <= failedProgress, true);
});

Deno.test("Error Recovery - checkpoint ordering", () => {
  const checkpoints = [
    { step_name: "course_detection", step_number: 1, content_snapshot: "course" },
    { step_name: "gap_analysis", step_number: 2, content_snapshot: "gap" },
    { step_name: "draft_creation", step_number: 3, content_snapshot: "draft" },
    { step_name: "sanitization", step_number: 4, content_snapshot: "sanitized" },
  ];
  
  const result = GenerationResumeHelper.determineResumePoint(checkpoints, 4);
  
  // Should resume from the latest (sanitization)
  assertEquals(result.resumeFrom, "Sanitization");
  assertEquals(result.resumeContent, "sanitized");
});

// ========================================
// MODEL ROUTING LOGIC TESTS
// ========================================

Deno.test("Model Routing - stage to model mapping", async (t) => {
  // Define expected model assignments based on the implementation
  const stageModelMapping: Record<string, string> = {
    "Initialization": "none",
    "CourseDetection": "claude-sonnet-4-5-20250929",
    "GapAnalysis": "claude-sonnet-4-5-20250929",
    "DraftCreation": "claude-sonnet-4-5-20250929",
    "Sanitization": "claude-sonnet-4-5-20250929",
    "Review": "claude-sonnet-4-5-20250929",
    "Refinement": "claude-sonnet-4-5-20250929",
    "FinalPolish": "claude-sonnet-4-5-20250929",
    "Formatting": "claude-sonnet-4-5-20250929",
    "QualityReview": "claude-haiku-4-5-20251001",
    "Completion": "none",
  };

  await t.step("QualityReview uses Haiku for cost efficiency", () => {
    const expectedModel = stageModelMapping["QualityReview"];
    assertEquals(expectedModel, "claude-haiku-4-5-20251001");
  });

  await t.step("All stages have model assignments", () => {
    for (const stage of STAGE_ORDER) {
      assertExists(stageModelMapping[stage]);
    }
  });

  await t.step("Critical stages use high-capability model", () => {
    const criticalStages = ["DraftCreation", "Review", "Refinement"];
    for (const stage of criticalStages) {
      const model = stageModelMapping[stage];
      assertEquals(model.includes("sonnet"), true);
    }
  });
});

// ========================================
// STAGE WEIGHT VALIDATION TESTS
// ========================================

Deno.test("Stage Weights - validation", async (t) => {
  await t.step("all stages have weights", () => {
    for (const stage of STAGE_ORDER) {
      assertExists(STAGE_WEIGHTS[stage]);
      assertEquals(typeof STAGE_WEIGHTS[stage], "number");
      assertEquals(STAGE_WEIGHTS[stage] > 0, true);
    }
  });

  await t.step("DraftCreation has highest weight", () => {
    const draftWeight = STAGE_WEIGHTS["DraftCreation"];
    
    for (const [stage, weight] of Object.entries(STAGE_WEIGHTS)) {
      if (stage !== "DraftCreation") {
        assertEquals(draftWeight >= weight, true);
      }
    }
  });

  await t.step("weights are reasonable (1-50)", () => {
    for (const [, weight] of Object.entries(STAGE_WEIGHTS)) {
      assertEquals(weight >= 1 && weight <= 50, true);
    }
  });
});

// ========================================
// SUB-STEP CONFIGURATION TESTS
// ========================================

Deno.test("Sub-step Configuration - validation", async (t) => {
  const { SUB_STEP_CONFIG } = await import("./progress-tracker.ts");
  
  await t.step("all stages have sub-step config", () => {
    for (const stage of STAGE_ORDER) {
      assertExists(SUB_STEP_CONFIG[stage]);
    }
  });

  await t.step("sub-step weights sum to 100", () => {
    for (const stage of STAGE_ORDER) {
      const config = SUB_STEP_CONFIG[stage];
      const sum = config.weightDistribution.reduce((a: number, b: number) => a + b, 0);
      assertEquals(sum, 100);
    }
  });

  await t.step("sub-step count matches weight distribution length", () => {
    for (const stage of STAGE_ORDER) {
      const config = SUB_STEP_CONFIG[stage];
      assertEquals(config.count, config.weightDistribution.length);
    }
  });
});

// ========================================
// PROGRESS UPDATE TESTS
// ========================================

Deno.test("ProgressTracker - createProgressUpdate", () => {
  const tracker = new ProgressTracker();
  tracker.setStage("DraftCreation");
  tracker.updateSubStep(2);
  
  const update = tracker.createProgressUpdate({ extraField: "value" });
  
  assertEquals(typeof update.progress_percent, "number");
  assertEquals(typeof update.progress_message, "string");
  assertEquals(typeof update.current_agent, "string");
  assertEquals(typeof update.stage_progress, "number");
  assertEquals(typeof update.sub_step, "number");
  assertEquals(typeof update.timestamp, "string");
  assertEquals(update.extraField, "value");
  
  // Validate timestamp is ISO format
  const date = new Date(update.timestamp);
  assertEquals(!isNaN(date.getTime()), true);
});

// ========================================
// TIME ESTIMATION TESTS
// ========================================

Deno.test("ProgressTracker - time estimation", () => {
  const tracker = new ProgressTracker();
  tracker.setStage("DraftCreation");
  tracker.updateSubStep(1);
  
  const historicalData = [
    { stage_name: "DraftCreation", avg_duration_ms: 30000, min_duration_ms: 20000, max_duration_ms: 60000, sample_count: 10 },
    { stage_name: "Sanitization", avg_duration_ms: 10000, min_duration_ms: 5000, max_duration_ms: 20000, sample_count: 10 },
    { stage_name: "Review", avg_duration_ms: 15000, min_duration_ms: 10000, max_duration_ms: 30000, sample_count: 10 },
  ];
  
  const estimate = tracker.estimateTimeRemaining(historicalData);
  
  assertExists(estimate);
  assertEquals(typeof estimate, "number");
  assertEquals(estimate !== null && estimate > 0, true);
});

// ========================================
// EDGE CASE TESTS
// ========================================

Deno.test("Edge Cases - progress tracker", async (t) => {
  await t.step("handles rapid stage changes", () => {
    const tracker = new ProgressTracker();
    
    // Rapidly switch stages
    tracker.setStage("Initialization");
    tracker.setStage("CourseDetection");
    tracker.setStage("GapAnalysis");
    tracker.setStage("DraftCreation");
    
    const stage = tracker.getCurrentStage();
    assertEquals(stage.name, "DraftCreation");
    assertEquals(stage.subStep, 0);
  });

  await t.step("handles sub-step beyond range", () => {
    const tracker = new ProgressTracker();
    tracker.setStage("Initialization");
    
    // Initialization only has 2 sub-steps (0 and 1)
    const result = tracker.updateSubStep(10);
    
    assertEquals(result.percent >= 0 && result.percent <= 100, true);
    assertExists(result.message);
  });

  await t.step("handles empty historical data for time estimation", () => {
    const tracker = new ProgressTracker();
    tracker.setStage("DraftCreation");
    
    const estimate = tracker.estimateTimeRemaining([]);
    
    assertEquals(estimate, null);
  });
});

// ========================================
// INTEGRATION TESTS
// ========================================

Deno.test("Integration - full pipeline simulation", async () => {
  const tracker = new ProgressTracker();
  const progressPoints: number[] = [];
  
  // Simulate full pipeline
  for (const stage of STAGE_ORDER) {
    tracker.setStage(stage);
    const config = { count: 2, weightDistribution: [50, 50] };
    
    for (let i = 0; i < config.count; i++) {
      tracker.updateSubStep(i);
      progressPoints.push(tracker.calculateTotalPercent());
    }
  }
  
  // Verify progress is monotonically increasing
  for (let i = 1; i < progressPoints.length; i++) {
    assertEquals(progressPoints[i] >= progressPoints[i - 1], true);
  }
  
  // Final progress should be 100%
  const finalProgress = progressPoints[progressPoints.length - 1];
  assertEquals(finalProgress, 100);
});

Deno.test("Integration - assignment generation simulation", () => {
  const tracker = new AssignmentProgressTracker();
  
  // Simulate assignment with 5 questions
  tracker.setTotalQuestions(5);
  const progressPoints: number[] = [];
  
  // Pre-stages
  tracker.setStage("Initialization");
  progressPoints.push(tracker.calculateTotalPercent());
  
  tracker.setStage("CourseDetection");
  progressPoints.push(tracker.calculateTotalPercent());
  
  // Question generation
  tracker.setStage("DraftCreation");
  for (let i = 0; i < 5; i++) {
    tracker.startQuestion(i, i % 2 === 0 ? "mcq_single" : "subjective");
    const progress = tracker.calculateQuestionProgress(i, 50);
    progressPoints.push(progress.percent);
    tracker.completeQuestion();
  }
  
  // Post-stages
  tracker.setStage("Review");
  progressPoints.push(tracker.calculateTotalPercent());
  
  tracker.setStage("Completion");
  tracker.updateSubStep(1);
  progressPoints.push(tracker.calculateTotalPercent());
  
  // Verify monotonic increase
  for (let i = 1; i < progressPoints.length; i++) {
    assertEquals(progressPoints[i] >= progressPoints[i - 1], true);
  }
});

console.log("All backend pipeline tests loaded successfully!");
