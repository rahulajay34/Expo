/**
 * Progress Tracker Module for GCCP Edge Function
 * 
 * Provides granular percentage tracking (0-100%) for the content generation pipeline.
 * Uses stage weights from database for dynamic progress calculation.
 */

// Stage weight definitions (matching database stage_weights table)
export const STAGE_WEIGHTS = {
  Initialization: 2,
  CourseDetection: 5,
  GapAnalysis: 5,
  DraftCreation: 35,
  Sanitization: 5,
  Review: 8,
  Refinement: 8,
  FinalPolish: 5,
  Formatting: 8,
  QualityReview: 7,
  Completion: 3,
} as const;

// Stage order for sequential tracking
export const STAGE_ORDER = [
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
] as const;

export type StageName = typeof STAGE_ORDER[number];

// Sub-step configurations for granular tracking within stages
export const SUB_STEP_CONFIG: Record<StageName, { count: number; weightDistribution: number[] }> = {
  Initialization: { count: 2, weightDistribution: [60, 40] }, // Validation (60%), Setup (40%)
  CourseDetection: { count: 3, weightDistribution: [30, 50, 20] }, // Analysis (30%), Detection (50%), Context (20%)
  GapAnalysis: { count: 3, weightDistribution: [30, 50, 20] }, // Parsing (30%), Analysis (50%), Results (20%)
  DraftCreation: { count: 5, weightDistribution: [20, 25, 25, 20, 10] }, // Planning, Drafting sections (x3), Assembly
  Sanitization: { count: 3, weightDistribution: [40, 40, 20] }, // Verification, Sanitization, Review
  Review: { count: 2, weightDistribution: [60, 40] }, // Analysis (60%), Scoring (40%)
  Refinement: { count: 3, weightDistribution: [30, 50, 20] }, // Analysis, Refinement, Verification
  FinalPolish: { count: 2, weightDistribution: [70, 30] }, // Polish (70%), Final review (30%)
  Formatting: { count: 3, weightDistribution: [30, 50, 20] }, // Parsing, Structuring, Validation
  QualityReview: { count: 2, weightDistribution: [60, 40] }, // Analysis (60%), Scoring (40%)
  Completion: { count: 2, weightDistribution: [60, 40] }, // Finalization, Cleanup
};

/**
 * ProgressTracker class for calculating and tracking generation progress
 */
export class ProgressTracker {
  private currentStage: StageName = 'Initialization';
  private currentSubStep: number = 0;
  private stageProgress: number = 0;
  private customWeights: Record<string, number> = {};

  constructor(customWeights?: Record<string, number>) {
    if (customWeights) {
      this.customWeights = customWeights;
    }
  }

  /**
   * Get the weight for a specific stage
   */
  protected getStageWeight(stage: StageName): number {
    return this.customWeights[stage] ?? STAGE_WEIGHTS[stage] ?? 5;
  }

  /**
   * Calculate cumulative progress up to a given stage
   */
  protected getCumulativeWeightUpTo(stage: StageName): number {
    const stageIndex = STAGE_ORDER.indexOf(stage);
    let cumulative = 0;
    
    for (let i = 0; i < stageIndex; i++) {
      cumulative += this.getStageWeight(STAGE_ORDER[i]);
    }
    
    return cumulative;
  }

  /**
   * Get total weight sum (should be 100)
   */
  getTotalWeight(): number {
    return STAGE_ORDER.reduce((sum, stage) => sum + this.getStageWeight(stage), 0);
  }

  /**
   * Set the current stage and reset sub-step progress
   */
  setStage(stage: StageName): void {
    this.currentStage = stage;
    this.currentSubStep = 0;
    this.stageProgress = 0;
  }

  /**
   * Update progress within the current stage based on sub-step completion
   */
  updateSubStep(subStepIndex: number, message?: string): { percent: number; message: string } {
    const config = SUB_STEP_CONFIG[this.currentStage];
    this.currentSubStep = Math.min(subStepIndex, config.count - 1);
    
    // Calculate progress within current stage
    let stageProgressPercent = 0;
    for (let i = 0; i <= this.currentSubStep && i < config.weightDistribution.length; i++) {
      stageProgressPercent += config.weightDistribution[i];
    }
    this.stageProgress = stageProgressPercent;

    return {
      percent: this.calculateTotalPercent(),
      message: message ?? this.getDefaultMessage(),
    };
  }

  /**
   * Set arbitrary progress percentage within current stage (for streaming updates)
   */
  setStageProgress(percent: number, message?: string): { percent: number; message: string } {
    this.stageProgress = Math.max(0, Math.min(100, percent));
    
    return {
      percent: this.calculateTotalPercent(),
      message: message ?? this.getDefaultMessage(),
    };
  }

  /**
   * Calculate total progress percentage (0-100)
   */
  calculateTotalPercent(): number {
    const completedStagesWeight = this.getCumulativeWeightUpTo(this.currentStage);
    const currentStageWeight = this.getStageWeight(this.currentStage);
    const currentStageContribution = (currentStageWeight * this.stageProgress) / 100;
    
    const total = completedStagesWeight + currentStageContribution;
    const totalWeight = this.getTotalWeight();
    
    // Normalize to 0-100
    return Math.round((total / totalWeight) * 100);
  }

  /**
   * Get default progress message for current stage
   */
  public getDefaultMessage(): string {
    const messages: Record<StageName, string[]> = {
      Initialization: ['Validating input...', 'Setting up generation context...'],
      CourseDetection: ['Analyzing content domain...', 'Detecting course context...', 'Building domain profile...'],
      GapAnalysis: ['Parsing transcript...', 'Analyzing coverage gaps...', 'Compiling gap report...'],
      DraftCreation: ['Planning content structure...', 'Drafting section 1...', 'Drafting section 2...', 'Drafting section 3...', 'Assembling final draft...'],
      Sanitization: ['Verifying facts...', 'Sanitizing content...', 'Reviewing changes...'],
      Review: ['Analyzing content quality...', 'Calculating quality scores...'],
      Refinement: ['Analyzing feedback...', 'Applying refinements...', 'Verifying improvements...'],
      FinalPolish: ['Applying final polish...', 'Final quality check...'],
      Formatting: ['Parsing content...', 'Structuring output...', 'Validating format...'],
      QualityReview: ['Running quality assessment...', 'Analyzing feedback scores...'],
      Completion: ['Finalizing generation...', 'Cleaning up...'],
    };

    const stageMessages = messages[this.currentStage] ?? ['Processing...'];
    return stageMessages[Math.min(this.currentSubStep, stageMessages.length - 1)];
  }

  /**
   * Get current stage info
   */
  getCurrentStage(): { name: StageName; subStep: number; stageProgress: number } {
    return {
      name: this.currentStage,
      subStep: this.currentSubStep,
      stageProgress: this.stageProgress,
    };
  }

  /**
   * Create a progress update object for database/realtime broadcast
   */
  createProgressUpdate(additionalData?: Record<string, unknown>): ProgressUpdate {
    return {
      progress_percent: this.calculateTotalPercent(),
      progress_message: this.getDefaultMessage(),
      current_agent: this.currentStage,
      stage_progress: this.stageProgress,
      sub_step: this.currentSubStep,
      timestamp: new Date().toISOString(),
      ...additionalData,
    };
  }

  /**
   * Get estimated time remaining based on historical data
   */
  estimateTimeRemaining(historicalData: HistoricalTimingData[]): number | null {
    const currentIndex = STAGE_ORDER.indexOf(this.currentStage);
    let remainingMs = 0;

    for (let i = currentIndex; i < STAGE_ORDER.length; i++) {
      const stage = STAGE_ORDER[i];
      const historical = historicalData.find(h => h.stage_name === stage);
      
      if (historical) {
        // For current stage, estimate remaining portion
        if (i === currentIndex) {
          remainingMs += historical.avg_duration_ms * (1 - this.stageProgress / 100);
        } else {
          remainingMs += historical.avg_duration_ms;
        }
      }
    }

    return remainingMs > 0 ? Math.round(remainingMs / 1000) : null; // Return seconds
  }
}

/**
 * Interface for progress update data
 */
export interface ProgressUpdate {
  progress_percent: number;
  progress_message: string;
  current_agent: string;
  stage_progress: number;
  sub_step: number;
  timestamp: string;
  partial_content?: string;
  [key: string]: unknown;
}

/**
 * Interface for historical timing data from database
 */
export interface HistoricalTimingData {
  stage_name: string;
  avg_duration_ms: number;
  min_duration_ms: number;
  max_duration_ms: number;
  sample_count: number;
}

/**
 * Assignment progress tracker for one-by-one question generation
 */
export class AssignmentProgressTracker extends ProgressTracker {
  private totalQuestions: number = 0;
  private completedQuestions: number = 0;
  private currentQuestionType: string = '';

  setTotalQuestions(count: number): void {
    this.totalQuestions = count;
  }

  startQuestion(index: number, type: string): void {
    this.completedQuestions = index;
    this.currentQuestionType = type;
  }

  completeQuestion(): void {
    this.completedQuestions++;
  }

  /**
   * Calculate progress within DraftCreation stage for assignment generation
   */
  calculateQuestionProgress(questionIndex: number, questionSubProgress: number = 0): { percent: number; message: string } {
    if (this.totalQuestions === 0) return { percent: 0, message: 'Preparing questions...' };

    // DraftCreation is 40% of total, questions are distributed within that
    const questionProgress = (questionIndex + questionSubProgress / 100) / this.totalQuestions;
    const draftCreationWeight = this.getStageWeight('DraftCreation');
    const completedStagesWeight = this.getCumulativeWeightUpTo('DraftCreation');
    
    const total = completedStagesWeight + (draftCreationWeight * questionProgress);
    const totalWeight = this.getTotalWeight();
    
    const percent = Math.round((total / totalWeight) * 100);
    const message = `Generating question ${questionIndex + 1} of ${this.totalQuestions} (${this.currentQuestionType})...`;

    return { percent, message };
  }
}

/**
 * Resume logic helper for interrupted generations
 */
export class GenerationResumeHelper {
  /**
   * Determine the resume point based on checkpoint data
   */
  static determineResumePoint(
    checkpoints: Array<{ step_name: string; step_number: number; content_snapshot: string }>,
    _lastCheckpointStep: number
  ): { resumeFrom: StageName; resumeContent: string | null; nextStage: StageName } {
    
    if (!checkpoints || checkpoints.length === 0) {
      return { resumeFrom: 'Initialization', resumeContent: null, nextStage: 'CourseDetection' };
    }

    // Sort by step number descending to get most recent
    const sorted = [...checkpoints].sort((a, b) => b.step_number - a.step_number);
    const latest = sorted[0];

    // Map checkpoint step names to StageName
    const stepToStage: Record<string, StageName> = {
      'course_detection': 'CourseDetection',
      'gap_analysis': 'GapAnalysis',
      'draft_creation': 'DraftCreation',
      'sanitization': 'Sanitization',
      'review_refine': 'Review',
      'final_polish': 'FinalPolish',
      'formatting': 'Formatting',
      'complete': 'Completion',
    };

    const resumeStage = stepToStage[latest.step_name] ?? 'Initialization';
    const resumeIndex = STAGE_ORDER.indexOf(resumeStage);
    const nextStage = STAGE_ORDER[Math.min(resumeIndex + 1, STAGE_ORDER.length - 1)];

    return {
      resumeFrom: resumeStage,
      resumeContent: latest.content_snapshot,
      nextStage,
    };
  }

  /**
   * Check if a generation can be resumed
   */
  static canResume(status: string, lastCheckpointStep: number): boolean {
    return status === 'failed' && lastCheckpointStep > 0;
  }

  /**
   * Generate a resume token for client-side recovery
   */
  static generateResumeToken(generationId: string, stage: StageName): string {
    const timestamp = Date.now();
    const data = `${generationId}:${stage}:${timestamp}`;
    // Simple base64 encoding (in production, use proper encryption)
    return btoa(data);
  }

  /**
   * Validate a resume token
   */
  static validateResumeToken(token: string, generationId: string): { valid: boolean; stage?: StageName } {
    try {
      const decoded = atob(token);
      const [genId, stage] = decoded.split(':');
      
      if (genId !== generationId) {
        return { valid: false };
      }

      if (STAGE_ORDER.includes(stage as StageName)) {
        return { valid: true, stage: stage as StageName };
      }

      return { valid: false };
    } catch {
      return { valid: false };
    }
  }
}

// Export default for convenience
export default ProgressTracker;
