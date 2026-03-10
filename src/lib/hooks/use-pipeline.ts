'use client';

import { useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { useAppStore } from '@/lib/store';
import { saveGeneration } from '@/lib/storage/db';
import { CONTENT_TYPE_LABELS } from '@/lib/constants';
import { generateTags } from '@/lib/utils/generate-tags';
import {
  requestPermission,
  sendNotification,
} from '@/lib/hooks/use-notifications';
import { clearDraft } from '@/lib/hooks/use-auto-save';

/**
 * Reads an SSE stream from a Response object, parsing each `data:` line into
 * a JSON event and dispatching it to `handleEvent`. Returns when the stream
 * ends.
 */
async function consumeSSEStream(response: Response): Promise<void> {
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));
            handleEvent(event);
          } catch {
            // skip malformed events
          }
        }
      }
    }
  }
}

/**
 * Makes a POST request to /api/generate with the given body and consumes the
 * SSE response. Returns normally when the stream ends or the pipeline pauses.
 * Throws on HTTP errors.
 */
async function callGenerateAPI(
  body: Record<string, unknown>,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    if (response.status === 429) {
      const errorBody = await response.json().catch(() => null);
      const retryAfter = errorBody?.retryAfter as number | undefined;
      const waitMinutes = retryAfter ? Math.ceil(retryAfter / 60) : 'a few';
      toast.error(
        `Rate limit reached — please wait ${waitMinutes} minute${waitMinutes === 1 ? '' : 's'} before generating again`
      );
      throw new Error('Rate limit exceeded');
    }
    throw new Error('Generation failed');
  }

  await consumeSSEStream(response);
}

export function usePipeline() {
  const abortRef = useRef<AbortController | null>(null);
  const store = useAppStore();

  /**
   * Build the common request body from current store state.
   */
  const buildBaseBody = useCallback(() => {
    const state = useAppStore.getState();
    const subtopics = state.subtopics
      .split(/[,\n]/)
      .map((s: string) => s.trim())
      .filter(Boolean);

    return {
      topic: state.topic,
      subtopics,
      contentType: state.contentType,
      transcript: state.transcript || undefined,
      mcscCount: state.mcscCount,
      mcmcCount: state.mcmcCount,
      subjectiveCount: state.subjectiveCount,
      modelName: state.selectedModel,
      outputLanguage: state.outputLanguage !== 'English' ? state.outputLanguage : undefined,
      contentLength: state.contentLength !== 'standard' ? state.contentLength : undefined,
    };
  }, []);

  /**
   * Start generation — Phase 1 (CourseDetector -> Analyzer -> Creator).
   * The pipeline will pause after Creator and wait for the user to resume.
   */
  const startGeneration = useCallback(async () => {
    // On first generation attempt, request notification permission
    void requestPermission();

    // Reset state
    store.resetGeneration();
    store.setIsGenerating(true);
    store.setPipelineExpanded(true);
    store.setCurrentPhase(1);

    // Initialize all pipeline steps
    const agents = [
      'CourseDetector',
      'Analyzer',
      'Creator',
      'Sanitizer',
      'Reviewer',
      'Refiner',
      'Formatter',
    ] as const;

    store.setSteps(
      agents.map((agent) => ({ agent, status: 'pending' as const, action: '' }))
    );

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const body = buildBaseBody();
      await callGenerateAPI({ ...body, phase: 1 }, abort.signal);

      // If we get here and the pipeline is paused, keep isGenerating false
      // (the pause handler already set the paused state)
      const currentState = useAppStore.getState();
      if (!currentState.pipelinePaused) {
        // Stream ended without pause — full pipeline completed
        await saveOnCompletion();

        // Send desktop notification on completion
        const state = useAppStore.getState();
        const label = CONTENT_TYPE_LABELS[state.contentType] ?? state.contentType;
        sendNotification(
          'Generation Complete',
          `Your ${label} notes for '${state.topic}' are ready!`,
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = err.message || 'Generation failed';
        store.setError(errorMsg);
        sendNotification('Generation Failed', errorMsg);
      }
    } finally {
      const currentState = useAppStore.getState();
      if (!currentState.pipelinePaused) {
        store.setIsGenerating(false);
        store.setCurrentAgent(null);
      }
      abortRef.current = null;
    }
  }, [store, buildBaseBody]);

  /**
   * Resume pipeline — calls the next phase based on the current pause state.
   */
  const resumePipeline = useCallback(async () => {
    const state = useAppStore.getState();
    if (!state.pipelinePaused || !state.phaseContext) return;

    const nextPhase = state.pauseReason === 'after-creator' ? 2 : 3;
    store.resumePipeline();
    store.setIsGenerating(true);
    store.setCurrentPhase(nextPhase as 1 | 2 | 3);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const body = buildBaseBody();
      await callGenerateAPI(
        {
          ...body,
          phase: nextPhase,
          // Pass the (possibly user-edited) content from the store
          previousContent: useAppStore.getState().content,
          previousContext: {
            courseContext: state.phaseContext.courseContext,
            gapAnalysis: state.phaseContext.gapAnalysis,
            instructorQuality: state.phaseContext.instructorQuality,
            reviewFeedback: state.phaseContext.reviewFeedback,
            costs: state.phaseContext.costs,
          },
        },
        abort.signal,
      );

      const currentState = useAppStore.getState();
      if (!currentState.pipelinePaused) {
        await saveOnCompletion();

        // Send desktop notification on completion
        const finalState = useAppStore.getState();
        const label = CONTENT_TYPE_LABELS[finalState.contentType] ?? finalState.contentType;
        sendNotification(
          'Generation Complete',
          `Your ${label} notes for '${finalState.topic}' are ready!`,
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = err.message || 'Generation failed';
        store.setError(errorMsg);
        sendNotification('Generation Failed', errorMsg);
      }
    } finally {
      const currentState = useAppStore.getState();
      if (!currentState.pipelinePaused) {
        store.setIsGenerating(false);
        store.setCurrentAgent(null);
      }
      abortRef.current = null;
    }
  }, [store, buildBaseBody]);

  /**
   * Skip remaining agents — keep the current content as-is.
   */
  const skipRemainingAgents = useCallback(async () => {
    store.skipRemainingAgents();
    await saveOnCompletion();
  }, [store]);

  /**
   * Refine content -- re-runs Phase 3 (Refiner + Formatter) on current content.
   * Saves the current content as `previousContent` so the user can undo.
   */
  const refineContent = useCallback(async () => {
    const state = useAppStore.getState();
    if (!state.content || !state.phaseContext) return;

    // Save current content for undo
    store.setPreviousContent(state.content);

    // Reset the Refiner and Formatter steps to pending
    store.updateStep('Refiner', {
      status: 'pending',
      action: '',
      startTime: undefined,
      endTime: undefined,
      tokenUsage: undefined,
      cost: undefined,
      retry: null,
    });
    store.updateStep('Formatter', {
      status: 'pending',
      action: '',
      startTime: undefined,
      endTime: undefined,
      tokenUsage: undefined,
      cost: undefined,
      retry: null,
    });

    store.setIsGenerating(true);
    store.setCurrentPhase(3);
    store.setError(null);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const body = buildBaseBody();
      await callGenerateAPI(
        {
          ...body,
          phase: 3,
          previousContent: state.content,
          previousContext: {
            courseContext: state.phaseContext.courseContext,
            gapAnalysis: state.phaseContext.gapAnalysis,
            instructorQuality: state.phaseContext.instructorQuality,
            reviewFeedback: state.phaseContext.reviewFeedback,
            costs: state.phaseContext.costs,
          },
        },
        abort.signal,
      );

      const currentState = useAppStore.getState();
      if (!currentState.pipelinePaused) {
        await saveOnCompletion();

        const finalState = useAppStore.getState();
        const label =
          CONTENT_TYPE_LABELS[finalState.contentType] ?? finalState.contentType;
        sendNotification(
          'Refinement Complete',
          `Your ${label} notes for '${finalState.topic}' have been refined!`,
        );
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== 'AbortError') {
        const errorMsg = err.message || 'Refinement failed';
        store.setError(errorMsg);
        sendNotification('Refinement Failed', errorMsg);
      }
    } finally {
      const currentState = useAppStore.getState();
      if (!currentState.pipelinePaused) {
        store.setIsGenerating(false);
        store.setCurrentAgent(null);
      }
      abortRef.current = null;
    }
  }, [store, buildBaseBody]);

  /**
   * Batch generation -- runs the full pipeline (no human-in-the-loop pauses)
   * for each topic in the list, sequentially.
   */
  const startBatchGeneration = useCallback(async (topics: string[]) => {
    if (topics.length === 0) return;

    void requestPermission();

    const total = topics.length;
    store.setBatchProgress(0, total);
    store.setIsGenerating(true);

    const abort = new AbortController();
    abortRef.current = abort;

    let completed = 0;

    for (let i = 0; i < topics.length; i++) {
      if (abort.signal.aborted) break;

      const currentTopic = topics[i];

      // Reset generation state for this topic (but keep isGenerating true)
      store.resetGeneration();
      store.setIsGenerating(true);
      store.setPipelineExpanded(true);
      store.setTopic(currentTopic);
      store.setBatchProgress(i, total);

      // Initialize pipeline steps
      const agents = [
        'CourseDetector',
        'Analyzer',
        'Creator',
        'Sanitizer',
        'Reviewer',
        'Refiner',
        'Formatter',
      ] as const;

      store.setSteps(
        agents.map((agent) => ({ agent, status: 'pending' as const, action: '' }))
      );

      try {
        const state = useAppStore.getState();
        const subtopics = state.subtopics
          .split(/[,\n]/)
          .map((s: string) => s.trim())
          .filter(Boolean);

        const body = {
          topic: currentTopic,
          subtopics,
          contentType: state.contentType,
          transcript: state.transcript || undefined,
          mcscCount: state.mcscCount,
          mcmcCount: state.mcmcCount,
          subjectiveCount: state.subjectiveCount,
          modelName: state.selectedModel,
          outputLanguage: state.outputLanguage !== 'English' ? state.outputLanguage : undefined,
          contentLength: state.contentLength !== 'standard' ? state.contentLength : undefined,
          // No phase = full pipeline (skips human-in-the-loop pauses)
        };

        await callGenerateAPI(body, abort.signal);

        // Save this topic's result to archives
        await saveOnCompletion();
        completed++;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          break;
        }
        // Log error for this topic but continue with next
        const errorMsg = err instanceof Error ? err.message : 'Generation failed';
        toast.error(`Failed to generate "${currentTopic}": ${errorMsg}`);
      }
    }

    // Batch complete
    store.setIsGenerating(false);
    store.setCurrentAgent(null);
    store.setBatchProgress(total, total);
    abortRef.current = null;

    if (completed > 0) {
      toast.success(`Batch complete: ${completed}/${total} topic${total === 1 ? '' : 's'} generated`);
      sendNotification(
        'Batch Generation Complete',
        `${completed}/${total} topic${total === 1 ? '' : 's'} generated successfully.`,
      );
    }
  }, [store]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
    store.setIsGenerating(false);
    store.setCurrentAgent(null);
    store.setPipelinePaused(false);
    // Reset batch state on stop
    store.setBatchProgress(0, 0);
  }, [store]);

  return {
    startGeneration,
    stopGeneration,
    resumePipeline,
    skipRemainingAgents,
    refineContent,
    startBatchGeneration,
  };
}

/**
 * Persist the current generation to IndexedDB.
 */
async function saveOnCompletion(): Promise<void> {
  const state = useAppStore.getState();
  const subtopics = state.subtopics
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  // Auto-generate content tags from topic, subtopics, and content type
  const tags = generateTags(state.topic, subtopics, state.contentType);

  await saveGeneration({
    topic: state.topic,
    subtopics,
    contentType: state.contentType,
    content: state.content,
    questions:
      state.questions.length > 0 ? state.questions : undefined,
    gapAnalysis: state.gapAnalysis || undefined,
    instructorQuality: state.instructorQuality || undefined,
    transcript: state.transcript || undefined,
    costDetails: state.costDetails,
    tags,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // Clear the auto-saved draft now that the generation has been persisted
  clearDraft();
}

function handleEvent(event: Record<string, unknown>) {
  const store = useAppStore.getState();
  const setters = {
    setCurrentAgent: useAppStore.getState().setCurrentAgent,
    updateStep: useAppStore.getState().updateStep,
    setContent: useAppStore.getState().setContent,
    setGapAnalysis: useAppStore.getState().setGapAnalysis,
    setInstructorQuality: useAppStore.getState().setInstructorQuality,
    setQuestions: useAppStore.getState().setQuestions,
    setCostDetails: useAppStore.getState().setCostDetails,
    setError: useAppStore.getState().setError,
    setPipelinePaused: useAppStore.getState().setPipelinePaused,
    setPhaseContext: useAppStore.getState().setPhaseContext,
  };

  switch (event.type) {
    case 'agent-start':
      setters.setCurrentAgent(event.agent as Parameters<typeof setters.setCurrentAgent>[0]);
      setters.updateStep(
        event.agent as Parameters<typeof setters.updateStep>[0],
        {
          status: 'working',
          action: event.action as string,
          startTime: Date.now(),
        }
      );
      break;
    case 'agent-complete':
      setters.updateStep(
        event.agent as Parameters<typeof setters.updateStep>[0],
        {
          status: 'complete',
          endTime: Date.now(),
          tokenUsage: event.tokenUsage as { input: number; output: number },
          cost: event.cost as number,
          retry: null,
        }
      );
      break;
    case 'agent-retry': {
      const retryData = event.data as Record<string, unknown> | undefined;
      setters.updateStep(
        event.agent as Parameters<typeof setters.updateStep>[0],
        {
          retry: {
            attempt: (retryData?.attempt as number) ?? 1,
            maxAttempts: (retryData?.maxAttempts as number) ?? 3,
            delay: (retryData?.delay as number) ?? 10,
          },
        }
      );
      break;
    }
    case 'content-chunk': {
      const chunkData = event.data as Record<string, unknown> | undefined;
      if (chunkData?.fullContent) {
        setters.setContent(chunkData.fullContent as string);
      } else if (chunkData?.chunk) {
        setters.setContent(store.content + (chunkData.chunk as string));
      }
      break;
    }
    case 'gap-analysis':
      setters.setGapAnalysis(event.data as Parameters<typeof setters.setGapAnalysis>[0]);
      break;
    case 'instructor-quality':
      setters.setInstructorQuality(event.data as Parameters<typeof setters.setInstructorQuality>[0]);
      break;
    case 'questions':
      setters.setQuestions(event.data as Parameters<typeof setters.setQuestions>[0]);
      break;
    case 'cost-update':
      setters.setCostDetails(event.data as Parameters<typeof setters.setCostDetails>[0]);
      break;
    case 'pipeline-pause': {
      const pauseData = event.data as Record<string, unknown> | undefined;
      const reason = (pauseData?.reason as 'after-creator' | 'after-reviewer') ?? null;
      const message = (pauseData?.message as string) ?? 'Pipeline paused.';
      const phaseContext = pauseData?.phaseContext as Record<string, unknown> | undefined;

      setters.setPipelinePaused(true, reason, message);
      if (phaseContext) {
        setters.setPhaseContext({
          courseContext: phaseContext.courseContext as Record<string, unknown> | undefined,
          gapAnalysis: phaseContext.gapAnalysis as Record<string, unknown> | undefined,
          instructorQuality: phaseContext.instructorQuality as Record<string, unknown> | undefined,
          reviewFeedback: phaseContext.reviewFeedback as string | undefined,
          content: (phaseContext.content as string) ?? store.content,
          costs: phaseContext.costs as Record<string, unknown>,
        });
      }

      // Stop the "generating" spinner but keep the steps visible
      useAppStore.getState().setIsGenerating(false);
      useAppStore.getState().setCurrentAgent(null);
      break;
    }
    case 'error': {
      const errData = event.data as Record<string, unknown> | undefined;
      setters.setError((errData?.message as string) || (event.message as string) || 'Generation failed');
      if (event.agent) {
        setters.updateStep(
          event.agent as Parameters<typeof setters.updateStep>[0],
          { status: 'error' }
        );
      }
      break;
    }
  }
}
