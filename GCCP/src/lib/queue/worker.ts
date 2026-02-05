/**
 * Server-Side Generation Worker
 * 
 * Processes generation jobs from the queue using the agent pipeline.
 * This runs entirely server-side without requiring browser connection.
 */

import { Orchestrator } from '@/lib/agents/orchestrator';
import { JobQueue, JobConfig, JobEvent, JobResult, getJobQueue } from './job-queue';
import { GenerationParams } from '@/types/content';

interface WorkerMetrics {
  startTime: number;
  totalCost: number;
  totalTokens: { input: number; output: number };
  agentBreakdown: Record<string, { cost: number; tokens: number; duration: number }>;
}

// Step name to number mapping for progress tracking
const STEP_MAP: Record<string, number> = {
  'CourseDetector': 1,
  'Analyzer': 1,
  'Creator': 2,
  'Sanitizer': 3,
  'Reviewer': 4,
  'Refiner': 4,
  'Formatter': 5,
  'AssignmentSanitizer': 6,
  'ImageGenerator': 7,
};

/**
 * GenerationWorker - processes jobs from the queue
 */
export class GenerationWorker {
  private queue: JobQueue;
  private orchestrator: Orchestrator;

  constructor() {
    this.queue = getJobQueue();
    const apiKey = process.env.GEMINI_API_KEY || process.env.XAI_API_KEY || '';
    if (!apiKey) {
      throw new Error('Missing GEMINI_API_KEY for generation worker');
    }
    // Enable image generation for worker-processed jobs (except assignments)
    this.orchestrator = new Orchestrator(apiKey, { enableImageGeneration: true });
  }

  /**
   * Process a single job
   */
  async processJob(job: JobConfig): Promise<JobResult> {
    const metrics: WorkerMetrics = {
      startTime: Date.now(),
      totalCost: 0,
      totalTokens: { input: 0, output: 0 },
      agentBreakdown: {},
    };

    const events: JobEvent[] = [];
    const abortController = new AbortController();
    this.queue.registerAbortController(job.id, abortController);

    let finalContent = '';
    let formattedContent: string | undefined;
    let gapAnalysis: Record<string, unknown> | undefined;

    try {
      // Start processing
      await this.queue.updateStatus(job.id, 'processing', {
        type: 'step',
        agent: 'Worker',
        action: 'started',
        message: 'Processing started',
        timestamp: Date.now(),
      });

      // Run the orchestrator
      const generator = this.orchestrator.generate(job.params, abortController.signal);

      for await (const event of generator) {
        if (abortController.signal.aborted) break;

        // Log events
        const jobEvent: JobEvent = {
          type: event.type === 'step' ? 'step' :
            event.type === 'chunk' ? 'chunk' :
              event.type === 'error' ? 'error' : 'step',
          agent: event.agent || 'System',
          action: event.action || '',
          message: event.message || '',
          timestamp: Date.now(),
        };

        // Update step progress
        if (event.type === 'step' && event.agent) {
          const stepNum = STEP_MAP[event.agent] || 0;
          const statusMap: Record<string, string> = {
            'CourseDetector': 'drafting',
            'Creator': 'drafting',
            'Sanitizer': 'critiquing',
            'Reviewer': 'critiquing',
            'Refiner': 'refining',
            'Formatter': 'formatting',
          };
          const status = statusMap[event.agent] || 'processing';
          await this.queue.updateStep(job.id, stepNum, status);
          await this.queue.logEvent(job.id, jobEvent);
        }

        // Handle different event types
        if (event.type === 'chunk') {
          finalContent += event.content as string || '';
        } else if (event.type === 'replace') {
          finalContent = event.content as string;
        } else if (event.type === 'gap_analysis') {
          gapAnalysis = event.content as Record<string, unknown>;
        } else if (event.type === 'formatted') {
          formattedContent = event.content as string;
        } else if (event.type === 'complete') {
          metrics.totalCost = event.cost as number || 0;
          if (event.content) {
            finalContent = event.content as string;
          }
        } else if (event.type === 'error') {
          throw new Error(event.message as string || 'Unknown error');
        } else if (event.type === 'mismatch_stop') {
          throw new Error(event.message as string || 'Transcript mismatch');
        }

        events.push(jobEvent);
      }

      // Mark as completed
      const result: JobResult = {
        success: true,
        content: finalContent,
        formattedContent,
        gapAnalysis,
        events,
        metrics: {
          totalCost: metrics.totalCost,
          totalTokens: metrics.totalTokens,
          duration: Date.now() - metrics.startTime,
          agentBreakdown: metrics.agentBreakdown,
        },
      };

      await this.queue.saveResult(job.id, result);
      await this.queue.logEvent(job.id, {
        type: 'step',
        agent: 'Worker',
        action: 'completed',
        message: 'Generation completed successfully',
        cost: metrics.totalCost,
        timestamp: Date.now(),
      });

      return result;

    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';

      const result: JobResult = {
        success: false,
        content: finalContent,
        events,
        metrics: {
          totalCost: metrics.totalCost,
          totalTokens: metrics.totalTokens,
          duration: Date.now() - metrics.startTime,
          agentBreakdown: metrics.agentBreakdown,
        },
        error: errorMessage,
      };

      await this.queue.saveResult(job.id, result);
      await this.queue.logEvent(job.id, {
        type: 'error',
        agent: 'Worker',
        action: 'failed',
        message: errorMessage,
        timestamp: Date.now(),
      });

      return result;

    } finally {
      this.queue.unregisterAbortController(job.id);
    }
  }
}

/**
 * Process a job by ID
 * This is the main entry point for the API route
 */
export async function processJobById(jobId: string): Promise<JobResult> {
  const queue = getJobQueue();
  const job = await queue.claimJob(jobId);

  if (!job) {
    throw new Error('Job not found or already claimed');
  }

  const worker = new GenerationWorker();
  return worker.processJob(job);
}
