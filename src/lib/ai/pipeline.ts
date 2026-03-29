import { GenerationInput, StreamingState, PipelineStage } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, buildFormatterMessages } from './prompts';
import { streamCompletion, StreamChunk } from './client';

const PROMPT_FILES: Record<string, string> = {
  lecture: 'lecture notes prompt.md',
  'pre-lecture': 'pre-lecture notes prompt.md',
  assignment: 'assignment prompt.md',
};

export async function runPipeline(
  input: GenerationInput,
  onState: (state: StreamingState) => void
): Promise<string> {
  const stages: PipelineStage[] = [
    { name: 'creator', status: 'pending' },
    { name: 'reviewer', status: 'pending' },
    { name: 'refiner', status: 'pending' },
    { name: 'formatter', status: 'pending' },
    ...(input.type === 'assignment' ? [{ name: 'csv-converter' as const, status: 'pending' as const }] : []),
  ];

  function updateStage(name: PipelineStage['name'], updates: Partial<PipelineStage>) {
    const idx = stages.findIndex(s => s.name === name);
    if (idx !== -1) stages[idx] = { ...stages[idx], ...updates };
  }

  function emit(content: string, isComplete = false, error?: string) {
    onState({ content, stages: [...stages], isComplete, error });
  }

  // ─── Stage 1: Creator ────────────────────────────────────────────────────
  updateStage('creator', { status: 'running' });
  emit('');

  let creatorOutput = '';
  try {
    const promptTemplate = await loadPrompt(PROMPT_FILES[input.type]);
    const creatorMessages = buildCreatorMessages(input, promptTemplate);

    creatorOutput = await streamCompletion(input.provider, creatorMessages, (chunk: StreamChunk) => {
      if (chunk.delta) {
        creatorOutput += chunk.delta;
        emit(creatorOutput);
      }
    });
  } catch (err) {
    updateStage('creator', { status: 'error', error: (err as Error).message });
    emit(creatorOutput, false, (err as Error).message);
    throw err;
  }

  updateStage('creator', { status: 'done' });
  emit(creatorOutput);

  // ─── Stage 2: Reviewer ────────────────────────────────────────────────────
  updateStage('reviewer', { status: 'running' });
  emit(creatorOutput);

  let reviewerOutput = '';
  let issuesFound = '';
  try {
    const reviewerMessages = buildReviewerMessages(creatorOutput);
    reviewerOutput = await streamCompletion(input.provider, reviewerMessages, () => {});
    issuesFound = reviewerOutput.trim();
    updateStage('reviewer', { status: 'done' });
  } catch {
    updateStage('reviewer', { status: 'error', error: 'Reviewer failed — skipping to formatter' });
    issuesFound = ''; // Skip refiner, go straight to formatter
  }

  emit(creatorOutput);

  // ─── Stage 3: Refiner (only if issues found) ─────────────────────────────
  let refinedOutput = creatorOutput;

  if (issuesFound && !issuesFound.toUpperCase().includes('LGTM')) {
    updateStage('refiner', { status: 'running' });
    emit(creatorOutput);

    try {
      const refinerMessages = buildRefinerMessages(creatorOutput, issuesFound);
      refinedOutput = '';
      refinedOutput = await streamCompletion(input.provider, refinerMessages, (chunk: StreamChunk) => {
        if (chunk.delta) {
          refinedOutput += chunk.delta;
          emit(refinedOutput);
        }
      });
      updateStage('refiner', { status: 'done' });
    } catch {
      updateStage('refiner', { status: 'error', error: 'Refiner failed — using creator output' });
      refinedOutput = creatorOutput;
    }
  } else {
    updateStage('refiner', { status: 'skipped' });
  }

  emit(refinedOutput);

  // ─── Stage 4: Formatter ───────────────────────────────────────────────────
  updateStage('formatter', { status: 'running' });
  emit(refinedOutput);

  let formattedOutput = refinedOutput;
  try {
    const formatterMessages = buildFormatterMessages(refinedOutput, input.type);
    formattedOutput = '';
    formattedOutput = await streamCompletion(input.provider, formatterMessages, (chunk: StreamChunk) => {
      if (chunk.delta) {
        formattedOutput += chunk.delta;
        emit(formattedOutput);
      }
    });
    updateStage('formatter', { status: 'done' });
  } catch {
    updateStage('formatter', { status: 'error', error: 'Formatter failed — using refined output' });
    formattedOutput = refinedOutput;
  }

  emit(formattedOutput, true);
  return formattedOutput;
}
