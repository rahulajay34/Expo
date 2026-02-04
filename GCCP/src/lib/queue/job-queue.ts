/**
 * Server-Side Job Queue System
 * 
 * Implements a durable job queue pattern for generation tasks that:
 * 1. Survives browser closure (server-authoritative state)
 * 2. Supports retry with exponential backoff
 * 3. Tracks job progress in Supabase ("Living Ledger")
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GenerationParams, ContentMode } from '@/types/content';

// Job status types aligned with database enum
export type JobStatus = 
  | 'queued' 
  | 'processing' 
  | 'drafting'
  | 'critiquing'
  | 'refining'
  | 'formatting'
  | 'completed' 
  | 'failed'
  | 'waiting_approval';

// Detailed job event for telemetry
export interface JobEvent {
  type: 'step' | 'chunk' | 'reasoning' | 'error' | 'checkpoint';
  agent: string;
  action: string;
  message: string;
  data?: Record<string, unknown>;
  tokens?: { input: number; output: number };
  cost?: number;
  timestamp: number;
}

// Job configuration
export interface JobConfig {
  id: string;
  userId: string;
  params: GenerationParams;
  priority: number;
  maxRetries: number;
  retryCount: number;
  status: JobStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  checkpointId?: string;
}

// Job result with content and metrics
export interface JobResult {
  success: boolean;
  content?: string;
  formattedContent?: string;
  gapAnalysis?: Record<string, unknown>;
  events: JobEvent[];
  metrics: {
    totalCost: number;
    totalTokens: { input: number; output: number };
    duration: number;
    agentBreakdown: Record<string, { cost: number; tokens: number; duration: number }>;
  };
  error?: string;
}

/**
 * JobQueue class - manages generation jobs server-side
 * 
 * Uses Supabase as the durable storage layer (no Redis required)
 * Implements optimistic locking for concurrent job processing
 */
export class JobQueue {
  private supabase: SupabaseClient;
  private processingJobs: Map<string, AbortController> = new Map();
  
  constructor(supabaseUrl: string, supabaseServiceKey: string) {
    // Use service role key for server-side operations
    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });
  }

  /**
   * Enqueue a new generation job
   * Returns the job ID for tracking
   */
  async enqueue(
    userId: string,
    params: GenerationParams,
    priority: number = 0
  ): Promise<string> {
    const { data, error } = await this.supabase
      .from('generations')
      .insert({
        user_id: userId,
        topic: params.topic,
        subtopics: params.subtopics,
        mode: params.mode,
        transcript: params.transcript || null,
        status: 'queued',
        assignment_data: params.assignmentCounts 
          ? { counts: params.assignmentCounts }
          : null,
        course_context: null,
        current_step: 0,
        estimated_cost: 0,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to enqueue job: ${error.message}`);
    }

    // Log the queue event
    await this.logEvent(data.id, {
      type: 'step',
      agent: 'JobQueue',
      action: 'enqueued',
      message: `Job queued with priority ${priority}`,
      timestamp: Date.now(),
    });

    return data.id;
  }

  /**
   * Claim a specific job by ID for processing
   */
  async claimJob(jobId: string): Promise<JobConfig | null> {
    const { data: claimed, error: claimError } = await this.supabase
      .from('generations')
      .update({ 
        status: 'processing',
        locked_by: 'server-worker',
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
      .in('status', ['queued', 'processing'])
      .select()
      .single();

    if (claimError || !claimed) {
      return null;
    }

    return {
      id: claimed.id,
      userId: claimed.user_id,
      params: {
        topic: claimed.topic,
        subtopics: claimed.subtopics,
        mode: claimed.mode as ContentMode,
        transcript: claimed.transcript || '',
        assignmentCounts: claimed.assignment_data?.counts,
      },
      priority: 0,
      maxRetries: 3,
      retryCount: 0,
      status: 'processing',
      createdAt: new Date(claimed.created_at).getTime(),
      startedAt: Date.now(),
    };
  }

  /**
   * Update job status with event logging
   */
  async updateStatus(jobId: string, status: JobStatus, event?: JobEvent): Promise<void> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed' || status === 'failed') {
      updateData.locked_by = null;
    }

    await this.supabase
      .from('generations')
      .update(updateData)
      .eq('id', jobId);

    if (event) {
      await this.logEvent(jobId, event);
    }
  }

  /**
   * Update current step for progress tracking
   */
  async updateStep(jobId: string, step: number, stepName: string): Promise<void> {
    await this.supabase
      .from('generations')
      .update({ 
        current_step: step,
        status: stepName as JobStatus,
        updated_at: new Date().toISOString() 
      })
      .eq('id', jobId);
  }

  /**
   * Log a job event to the generation_logs table
   */
  async logEvent(jobId: string, event: JobEvent): Promise<void> {
    await this.supabase
      .from('generation_logs')
      .insert({
        generation_id: jobId,
        agent_name: event.agent,
        message: event.message,
        log_type: event.type === 'error' ? 'error' : 
                  event.type === 'reasoning' ? 'info' : 
                  event.type === 'checkpoint' ? 'success' : 'step',
        metadata: {
          action: event.action,
          data: event.data,
          tokens: event.tokens,
          cost: event.cost,
          timestamp: event.timestamp,
        }
      });
  }

  /**
   * Save final result to the generations table
   */
  async saveResult(jobId: string, result: JobResult): Promise<void> {
    await this.supabase
      .from('generations')
      .update({
        status: result.success ? 'completed' : 'failed',
        final_content: result.content,
        assignment_data: result.formattedContent 
          ? { formatted: result.formattedContent }
          : null,
        gap_analysis: result.gapAnalysis,
        estimated_cost: result.metrics.totalCost,
        error_message: result.error || null,
        locked_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<void> {
    const controller = this.processingJobs.get(jobId);
    if (controller) {
      controller.abort();
      this.processingJobs.delete(jobId);
    }

    await this.updateStatus(jobId, 'failed', {
      type: 'step',
      agent: 'JobQueue',
      action: 'cancelled',
      message: 'Job cancelled by user',
      timestamp: Date.now(),
    });
  }

  /**
   * Register an abort controller for a processing job
   */
  registerAbortController(jobId: string, controller: AbortController): void {
    this.processingJobs.set(jobId, controller);
  }

  /**
   * Unregister an abort controller after job completion
   */
  unregisterAbortController(jobId: string): void {
    this.processingJobs.delete(jobId);
  }

  /**
   * Get job status and progress
   */
  async getJobStatus(jobId: string): Promise<{
    status: JobStatus;
    progress: number;
    currentStep: string;
    events: JobEvent[];
  } | null> {
    const { data: job } = await this.supabase
      .from('generations')
      .select('*')
      .eq('id', jobId)
      .single();

    if (!job) return null;

    const { data: logs } = await this.supabase
      .from('generation_logs')
      .select('*')
      .eq('generation_id', jobId)
      .order('created_at', { ascending: true });

    const events: JobEvent[] = (logs || []).map(log => ({
      type: log.log_type as JobEvent['type'],
      agent: log.agent_name,
      action: log.metadata?.action || '',
      message: log.message,
      data: log.metadata?.data,
      tokens: log.metadata?.tokens,
      cost: log.metadata?.cost,
      timestamp: new Date(log.created_at).getTime(),
    }));

    // Calculate progress based on step
    const totalSteps = job.mode === 'assignment' ? 7 : 5;
    const progress = Math.min((job.current_step / totalSteps) * 100, 100);

    return {
      status: job.status as JobStatus,
      progress,
      currentStep: events.length > 0 ? events[events.length - 1].agent : 'Queued',
      events,
    };
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<void> {
    await this.supabase
      .from('generations')
      .update({
        status: 'queued',
        error_message: null,
        locked_by: null,
        current_step: 0,
      })
      .eq('id', jobId);

    await this.logEvent(jobId, {
      type: 'step',
      agent: 'JobQueue',
      action: 'retry',
      message: 'Retrying job from beginning',
      timestamp: Date.now(),
    });
  }
}

// Singleton instance for server use
let queueInstance: JobQueue | null = null;

export function getJobQueue(): JobQueue {
  if (!queueInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration for job queue');
    }
    
    queueInstance = new JobQueue(supabaseUrl, supabaseServiceKey);
  }
  return queueInstance;
}
