import { GenerationInput, StreamingState, PipelineStage, ChunkProgress } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, buildFormatterMessages, CHUNK_CONFIG } from './prompts';
import { streamCompletion, StreamChunk } from './client';

/**
 * Merges section-level patches into base content.
 * Sections present in patches replace matching sections in base.
 * Sections absent from patches are preserved verbatim.
 */
function mergeSectionPatches(baseContent: string, patches: string): string {
  if (!patches.trim()) return baseContent;

  // Normalize line endings
  const normalize = (s: string) => s.replace(/\r\n/g, '\n');
  const base = normalize(baseContent);
  const patch = normalize(patches);

  // Split patch into sections by ### headers
  const patchSectionRegex = /^### (.+)$/gm;
  type Section = { header: string; body: string };
  const patchSections: Section[] = [];

  let lastIndex = 0;
  let match;
  while ((match = patchSectionRegex.exec(patch)) !== null) {
    const start = match.index;
    if (lastIndex > 0) {
      const prevBody = patch.slice(lastIndex, start).trim();
      if (prevBody && patchSections.length > 0) {
        patchSections[patchSections.length - 1].body = prevBody;
      }
    }
    patchSections.push({ header: match[1].trim(), body: '' });
    lastIndex = patch.indexOf('\n', patchSectionRegex.lastIndex) + 1;
  }

  // Grab the body of the last section
  if (lastIndex > 0 && lastIndex < patch.length) {
    const lastBody = patch.slice(lastIndex).trim();
    if (patchSections.length > 0 && lastBody) {
      patchSections[patchSections.length - 1].body = lastBody;
    }
  }

  // For each patched section, find and replace in base content
  let result = base;
  for (const { header, body } of patchSections) {
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const sectionRegex = new RegExp(`^###\\s+${escapedHeader}(?:\\n[\\s\\S]*?)(?=^###\\s+|\\n##(?!#)\\s+|\\n#(?!#)\\s+|$)`, 'gm');

    if (sectionRegex.test(result)) {
      result = result.replace(sectionRegex, `### ${header}\n${body}\n`);
    } else {
      // Section doesn't exist in base — append it
      result += `\n\n### ${header}\n${body}`;
    }
  }

  return result.trim();
}

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

  function emit(content: string, isComplete = false, error?: string, activeChunks?: ChunkProgress[]) {
    onState({ content, stages: [...stages], isComplete, error, activeChunks });
  }

  // ─── Stage 1: Creator (Parallel) ────────────────────────────────────────────────────
  updateStage('creator', { status: 'running' });

  let creatorOutput = '';
  try {
    const promptTemplate = await loadPrompt(PROMPT_FILES[input.type]);
    const chunksConfig = CHUNK_CONFIG[input.type] || [{ id: 'all', instruction: '' }];

    // Initialize per-chunk progress for the UI loader
    const chunkLabels: Record<string, string> = {
      mcqs: 'MCQ Questions',
      msqs: 'MSQ Questions',
      subjective: 'Subjective Questions',
      'intro-explanation': 'Intro & Explanation',
      'teaser-exercises': "What's Next & Exercises",
      'intro-walkthrough': 'Intro & Walkthrough',
      'tryit-takeaways': 'Try It & Takeaways',
    };
    const activeChunks: ChunkProgress[] = chunksConfig.map((c) => ({
      id: c.id,
      label: chunkLabels[c.id] ?? c.id,
      status: 'pending',
    }));

    // Emit initial state with chunk statuses — UI shows animated loader, no partial content
    emit('', false, undefined, activeChunks.map((c) => ({ ...c })));

    // Array to hold completed chunk outputs
    const chunkOutputs = new Array(chunksConfig.length).fill('');

    // Launch all streams in parallel — NO UI updates until all complete
    const chunkPromises = chunksConfig.map((chunkDef, index) => {
      const creatorMessages = buildCreatorMessages(input, promptTemplate, chunkDef.instruction);

      return streamCompletion(input.provider, creatorMessages, (chunk: StreamChunk) => {
        if (chunk.delta) {
          chunkOutputs[index] += chunk.delta;
        }
      }).then((result) => {
        // Mark this chunk as done once its stream finishes
        activeChunks[index].status = 'done';
        // Emit updated chunk statuses for the loader UI
        emit('', false, undefined, activeChunks.map((c) => ({ ...c })));
        return result;
      }).catch((err) => {
        activeChunks[index].status = 'error';
        emit('', false, undefined, activeChunks.map((c) => ({ ...c })));
        throw err;
      });
    });

    // Wait for all parallel streams to finish
    await Promise.all(chunkPromises);

    // All chunks done — stitch and emit final creator output
    creatorOutput = chunkOutputs.join('\n\n').replace(/\n{3,}/g, '\n\n');
    emit(creatorOutput);

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
      let rawRefinerPatch = '';
      refinedOutput = await streamCompletion(input.provider, refinerMessages, (chunk: StreamChunk) => {
        if (chunk.delta) {
          rawRefinerPatch += chunk.delta;
          emit(creatorOutput); // Keep showing creator content during refinement
        }
      });
      // Merge patches into creator output
      refinedOutput = mergeSectionPatches(creatorOutput, rawRefinerPatch.trim());
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
    let rawFormatterPatch = '';
    formattedOutput = await streamCompletion(input.provider, formatterMessages, (chunk: StreamChunk) => {
      if (chunk.delta) {
        rawFormatterPatch += chunk.delta;
        emit(refinedOutput); // Keep showing content during formatting
      }
    });
    // Merge patches into refined output
    formattedOutput = mergeSectionPatches(refinedOutput, rawFormatterPatch.trim());
    updateStage('formatter', { status: 'done' });
  } catch {
    updateStage('formatter', { status: 'error', error: 'Formatter failed — using refined output' });
    formattedOutput = refinedOutput;
  }

  emit(formattedOutput, true);
  return formattedOutput;
}
