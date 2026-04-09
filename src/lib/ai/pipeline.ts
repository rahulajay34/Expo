import { GenerationInput, StreamingState, PipelineStage, ChunkProgress, PIPELINE_STAGES, PipelineStageName } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, getChunkConfig } from './prompts';
import { streamCompletion, StreamChunk } from './client';
import { validateMermaidBlocks } from '../validation/mermaid';

// Sub-module imports (moved out of this file for clarity)
import { mergeSectionPatches } from './pipeline/section-parser';
import { isLGTM, mergeQuestionPatches, validateAssignmentCounts, cleanAssignmentStitching } from './pipeline/assignment-utils';
import { buildMermaidFixMessages } from './pipeline/mermaid-fix';

const PROMPT_FILES: Record<string, string> = {
  lecture: 'lecture notes prompt.md',
  'pre-lecture': 'pre-lecture notes prompt.md',
  assignment: 'assignment prompt.md',
  'assignment-style-buckets': 'assignment style buckets.md',
  'ta-guide': 'ta guide prompt.md',
};

export async function runPipeline(
  input: GenerationInput,
  onState: (state: StreamingState) => void,
  signal?: AbortSignal,
  options?: { onRetry?: (attempt: number) => void }
): Promise<string> {
  const stages: PipelineStage[] = [
    { name: PIPELINE_STAGES.CREATOR, status: 'pending' },
    { name: PIPELINE_STAGES.REVIEWER, status: 'pending' },
    { name: PIPELINE_STAGES.REFINER, status: 'pending' },
    { name: PIPELINE_STAGES.VALIDATOR, status: 'pending' },
    // CSV conversion is handled separately via the export UI, not in the generation pipeline
  ];

  let thinkingAccumulator = '';

  function updateStage(name: PipelineStageName, updates: Partial<PipelineStage>) {
    const idx = stages.findIndex(s => s.name === name);
    if (idx !== -1) stages[idx] = { ...stages[idx], ...updates };
  }

  function emit(content: string, isComplete = false, error?: string, activeChunks?: ChunkProgress[]) {
    onState({ content, thinking: thinkingAccumulator || undefined, stages: [...stages], isComplete, error, activeChunks });
  }

  // ─── Stage 1: Creator (Parallel with Progressive Streaming) ─────────
  updateStage(PIPELINE_STAGES.CREATOR, { status: 'running' });

  let creatorOutput = '';
  try {
    // Assignments also load the style-bucket library so MCQ/MSQ/Subjective
    // chunks share one ~1,800-entry pool for style rotation.
    const [promptTemplate, styleBuckets] = await Promise.all([
      loadPrompt(PROMPT_FILES[input.type]),
      input.type === 'assignment'
        ? loadPrompt(PROMPT_FILES['assignment-style-buckets'])
        : Promise.resolve(undefined),
    ]);
    const chunksConfig = getChunkConfig(input);

    const chunkLabels: Record<string, string> = {
      mcqs: 'MCQ Questions',
      msqs: 'MSQ Questions',
      subjective: 'Subjective Questions',
      all: 'Generating Content',
    };
    const activeChunks: ChunkProgress[] = chunksConfig.map((c) => ({
      id: c.id,
      label: chunkLabels[c.id] ?? c.id,
      status: 'pending',
    }));

    emit('', false, undefined, activeChunks.map((c) => ({ ...c })));

    // Array to hold streaming chunk outputs
    const chunkOutputs = new Array(chunksConfig.length).fill('');

    // Helper: join all chunk outputs and emit current content
    const emitProgressiveContent = () => {
      const combined = chunkOutputs.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
      emit(combined, false, undefined, activeChunks.map((c) => ({ ...c })));
    };

    // Link a local controller to the parent signal so a chunk failure can
    // abort the other in-flight chunks instead of wasting compute.
    const chunkSetController = new AbortController();
    const onParentAbort = () => chunkSetController.abort();
    if (signal) {
      if (signal.aborted) chunkSetController.abort();
      else signal.addEventListener('abort', onParentAbort);
    }

    const chunkPromises = chunksConfig.map((chunkDef, index) => {
      const creatorMessages = buildCreatorMessages(input, promptTemplate, chunkDef.instruction, styleBuckets);

      activeChunks[index].status = 'running';
      emitProgressiveContent();

      if (chunkSetController.signal.aborted) {
        activeChunks[index].status = 'error';
        emitProgressiveContent();
        throw new Error('Generation cancelled');
      }

      return streamCompletion(input.provider, creatorMessages, (chunk: StreamChunk) => {
        if (chunk.thinking) {
          thinkingAccumulator += chunk.thinking;
          emitProgressiveContent();
        }
        if (chunk.delta) {
          chunkOutputs[index] += chunk.delta;
          emitProgressiveContent();
        }
      }, chunkSetController.signal, options).then((result) => {
        activeChunks[index].status = 'done';
        emitProgressiveContent();
        return result;
      }).catch((err) => {
        activeChunks[index].status = 'error';
        emitProgressiveContent();
        // Abort sibling chunks so they don't keep streaming in the background
        if (!chunkSetController.signal.aborted) chunkSetController.abort();
        throw err;
      });
    });

    try {
      if (signal?.aborted) throw new Error('Generation cancelled');
      await Promise.all(chunkPromises);
    } catch (err) {
      if (signal?.aborted) {
        updateStage(PIPELINE_STAGES.CREATOR, { status: 'error', error: 'Generation cancelled' });
        const partial = chunkOutputs.filter(Boolean).join('\n\n');
        emit(partial, false, 'Generation cancelled');
        if (signal) signal.removeEventListener('abort', onParentAbort);
        throw new Error('Generation cancelled');
      }
      if (signal) signal.removeEventListener('abort', onParentAbort);
      throw err;
    }
    if (signal) signal.removeEventListener('abort', onParentAbort);

    // All chunks done — final stitch
    let joinedOutput = chunkOutputs.join('\n\n').replace(/\n{3,}/g, '\n\n');

    // Deduplicate consecutive duplicate section headers
    joinedOutput = joinedOutput.replace(/(^|\n)(### .+)\n\2(\n|$)/gm, '$1$2$3');

    // For assignments: deduplicate coverage plans, strip stray preamble, clean ordering
    if (input.type === 'assignment') {
      joinedOutput = cleanAssignmentStitching(joinedOutput, input.questionCounts);
    }

    creatorOutput = joinedOutput;
    emit(creatorOutput);

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    updateStage(PIPELINE_STAGES.CREATOR, { status: 'error', error: msg });
    emit(creatorOutput, false, msg);
    throw err;
  }

  updateStage(PIPELINE_STAGES.CREATOR, { status: 'done' });
  emit(creatorOutput);

  // ─── Stage 2: Reviewer ────────────────────────────────────────────────
  updateStage(PIPELINE_STAGES.REVIEWER, { status: 'running' });
  emit(creatorOutput);

  let reviewerOutput = '';
  let issuesFound = '';
  try {
    const reviewerMessages = buildReviewerMessages(
      creatorOutput,
      input.type,
      input.type === 'assignment' ? input.questionCounts : undefined,
    );
    reviewerOutput = await streamCompletion(input.provider, reviewerMessages, (chunk: StreamChunk) => {
      if (chunk.thinking) {
        thinkingAccumulator += chunk.thinking;
        emit(creatorOutput);
      }
    }, signal, options);
    issuesFound = reviewerOutput.trim();

    updateStage(PIPELINE_STAGES.REVIEWER, { status: 'done' });
  } catch {
    updateStage(PIPELINE_STAGES.REVIEWER, { status: 'error', error: 'Reviewer failed — using creator output' });
    issuesFound = '';
  }

  emit(creatorOutput);

  // ─── Stage 3: Refiner (only if issues found) ─────────────────────────
  let refinedOutput = creatorOutput;

  if (issuesFound && !isLGTM(issuesFound)) {
    updateStage(PIPELINE_STAGES.REFINER, { status: 'running' });
    emit(creatorOutput);

    try {
      const refinerMessages = buildRefinerMessages(creatorOutput, issuesFound, input.type);
      let rawRefinerPatch = '';
      refinedOutput = await streamCompletion(input.provider, refinerMessages, (chunk: StreamChunk) => {
        if (chunk.thinking) {
          thinkingAccumulator += chunk.thinking;
        }
        if (chunk.delta) {
          rawRefinerPatch += chunk.delta;
          emit(creatorOutput);
        }
      }, signal, options);
      refinedOutput =
        input.type === 'assignment'
          ? mergeQuestionPatches(creatorOutput, rawRefinerPatch.trim())
          : mergeSectionPatches(creatorOutput, rawRefinerPatch.trim());
      updateStage(PIPELINE_STAGES.REFINER, { status: 'done' });
    } catch {
      updateStage(PIPELINE_STAGES.REFINER, { status: 'error', error: 'Refiner failed — using creator output' });
      refinedOutput = creatorOutput;
    }
  } else {
    updateStage(PIPELINE_STAGES.REFINER, { status: 'skipped' });
  }

  // ─── Post-pipeline validation + single auto-retry for assignments ────
  if (input.type === 'assignment' && input.questionCounts) {
    const v1 = validateAssignmentCounts(refinedOutput, input.questionCounts);
    if (!v1.valid && v1.missingChunks.length > 0) {
      try {
        const [promptTemplate, styleBuckets] = await Promise.all([
          loadPrompt(PROMPT_FILES[input.type]),
          loadPrompt(PROMPT_FILES['assignment-style-buckets']),
        ]);
        const retried = await retryMissingChunks(
          input,
          refinedOutput,
          v1.missingChunks,
          promptTemplate,
          styleBuckets,
          signal,
          options,
          (content) => emit(content),
        );
        const rejoined = cleanAssignmentStitching(retried, input.questionCounts);
        const v2 = validateAssignmentCounts(rejoined, input.questionCounts);
        if (v2.valid) {
          refinedOutput = rejoined;
        } else {
          refinedOutput = rejoined;
          emit(refinedOutput, false, `Question count mismatch after retry: expected ${input.questionCounts.mcq} MCQs / ${input.questionCounts.msq} MSQs / ${input.questionCounts.subjective} Subjective, got ${v2.actual.mcq} / ${v2.actual.msq} / ${v2.actual.subjective}`);
        }
      } catch (err) {
        if (signal?.aborted) throw err;
        const msg = err instanceof Error ? err.message : String(err);
        emit(refinedOutput, false, `Auto-retry for missing question chunks failed: ${msg}`);
      }
    }
  }

  // ─── Stage 4: Mermaid validator (terminal, silent auto-fix) ──────────
  // Only runs when the output contains at least one ```mermaid block.
  // Capped at one fix attempt. No re-validation, no user-facing warnings —
  // whatever the model returns is merged and saved.
  try {
    const validation = await validateMermaidBlocks(refinedOutput);
    if (validation.ok) {
      updateStage(PIPELINE_STAGES.VALIDATOR, {
        status: validation.blocks.length === 0 ? 'skipped' : 'done',
      });
    } else {
      updateStage(PIPELINE_STAGES.VALIDATOR, { status: 'running' });
      emit(refinedOutput);

      try {
        const fixMessages = buildMermaidFixMessages(refinedOutput, validation.failures);
        let rawFixPatch = '';
        await streamCompletion(input.provider, fixMessages, (chunk: StreamChunk) => {
          if (chunk.thinking) thinkingAccumulator += chunk.thinking;
          if (chunk.delta) {
            rawFixPatch += chunk.delta;
            emit(refinedOutput);
          }
        }, signal, options);
        const patched = mergeSectionPatches(refinedOutput, rawFixPatch.trim());
        refinedOutput = patched;
        updateStage(PIPELINE_STAGES.VALIDATOR, { status: 'done' });
      } catch (err) {
        if (signal?.aborted) throw err;
        // Silent: save the original (pre-fix) refined output. Mark the stage
        // as errored so the pipeline state is accurate, but do NOT surface
        // an error string — the user sees no warning.
        updateStage(PIPELINE_STAGES.VALIDATOR, { status: 'error' });
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err;
    // Validator itself blew up — mark skipped and continue. Never block save.
    updateStage(PIPELINE_STAGES.VALIDATOR, { status: 'skipped' });
  }

  emit(refinedOutput, true);
  return refinedOutput;
}

/**
 * Re-run Creator for only the affected chunk types and append/merge results
 * into the current content. Runs once (no retry loop). Uses the full assignment
 * prompt template — same code path as the initial creator — with chunk-specific
 * instructions from getChunkConfig.
 */
async function retryMissingChunks(
  input: GenerationInput,
  currentContent: string,
  missing: Array<'mcqs' | 'msqs' | 'subjective'>,
  promptTemplate: string,
  styleBuckets: string | undefined,
  signal: AbortSignal | undefined,
  options: { onRetry?: (attempt: number) => void } | undefined,
  onProgress: (content: string) => void,
): Promise<string> {
  const allChunks = getChunkConfig(input);
  const missingChunks = allChunks.filter((c) => missing.includes(c.id as 'mcqs' | 'msqs' | 'subjective'));
  if (missingChunks.length === 0) return currentContent;

  const retryController = new AbortController();
  const onParentAbort = () => retryController.abort();
  if (signal) {
    if (signal.aborted) retryController.abort();
    else signal.addEventListener('abort', onParentAbort);
  }

  const outputs = new Array(missingChunks.length).fill('');
  try {
    const promises = missingChunks.map((chunkDef, idx) => {
      const messages = buildCreatorMessages(input, promptTemplate, chunkDef.instruction, styleBuckets);
      return streamCompletion(input.provider, messages, (chunk: StreamChunk) => {
        if (chunk.delta) {
          outputs[idx] += chunk.delta;
          onProgress(currentContent + '\n\n' + outputs.filter(Boolean).join('\n\n'));
        }
      }, retryController.signal, options).catch((err) => {
        if (!retryController.signal.aborted) retryController.abort();
        throw err;
      });
    });
    await Promise.all(promises);
  } finally {
    if (signal) signal.removeEventListener('abort', onParentAbort);
  }

  // Merge: drop the wrong-typed/insufficient blocks in currentContent for these
  // missing types first by letting cleanAssignmentStitching handle dedup later.
  // Simplest approach: append retry output so the subsequent
  // cleanAssignmentStitching (with questionCounts) can pick the correct first
  // occurrence by type for each Q number.
  const retried = outputs.join('\n\n');
  return (currentContent + '\n\n' + retried).replace(/\n{3,}/g, '\n\n');
}
