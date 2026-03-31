import { GenerationInput, StreamingState, PipelineStage, ChunkProgress, PIPELINE_STAGES, PipelineStageName } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, buildFormatterMessages, getChunkConfig } from './prompts';
import { streamCompletion, StreamChunk } from './client';

/**
 * Strip leading numbering/letter prefix from a section header for fuzzy comparison.
 * "4. Practice Exercises" → "practice exercises"
 * "A. Introduction" → "introduction"
 * "Practice Exercises" → "practice exercises"
 */
function headerCore(header: string): string {
  return header.replace(/^[\dA-Za-z]+[\.\)]\s*/, '').trim().toLowerCase();
}

type Section = { header: string; body: string };

/**
 * Parse text into an array of ### sections.
 * Returns each section's header (text after ###) and body (content until next section).
 */
function parseSections(text: string): Section[] {
  const regex = /^### (.+)$/gm;
  const sections: Section[] = [];
  let bodyStart = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (sections.length > 0) {
      sections[sections.length - 1].body = text.slice(bodyStart, match.index).trim();
    }
    sections.push({ header: match[1].trim(), body: '' });
    bodyStart = text.indexOf('\n', regex.lastIndex);
    bodyStart = bodyStart === -1 ? text.length : bodyStart + 1;
  }

  if (sections.length > 0 && bodyStart <= text.length) {
    sections[sections.length - 1].body = text.slice(bodyStart).trim();
  }

  return sections;
}

/**
 * Merges section-level patches into base content.
 *
 * Rebuilds the document from parsed sections rather than using regex replacement,
 * which avoids the multiline `$` lookahead bug that caused partial matches.
 * Uses fuzzy header matching (strips leading numbers) so "Practice Exercises"
 * matches "4. Practice Exercises".
 */
function mergeSectionPatches(baseContent: string, patches: string): string {
  if (!patches.trim()) return baseContent;

  const norm = (s: string) => s.replace(/\r\n/g, '\n');
  const base = norm(baseContent);
  const patch = norm(patches);

  const patchSections = parseSections(patch);
  if (patchSections.length === 0) return baseContent;

  // Parse base into preamble (everything before first ###) + sections
  const baseSections = parseSections(base);
  const firstH3 = base.match(/^### /m);
  const preamble = firstH3 ? base.slice(0, firstH3.index!).trimEnd() : base;

  // Apply each patch: find matching base section (exact first, then fuzzy) and replace its body
  for (const ps of patchSections) {
    const psCore = headerCore(ps.header);
    const matchIdx =
      baseSections.findIndex((bs) => bs.header === ps.header) !== -1
        ? baseSections.findIndex((bs) => bs.header === ps.header)
        : baseSections.findIndex((bs) => headerCore(bs.header) === psCore);

    if (matchIdx !== -1) {
      // Replace body, keep original header (preserves numbering)
      baseSections[matchIdx].body = ps.body;
    } else {
      baseSections.push({ header: ps.header, body: ps.body });
    }
  }

  // Rebuild document
  const parts = [preamble];
  for (const s of baseSections) {
    parts.push(`### ${s.header}\n${s.body}`);
  }

  return parts.filter(Boolean).join('\n\n').trim();
}

function isLGTM(review: string): boolean {
  const upper = review.toUpperCase();
  return (
    upper.includes('LGTM') ||
    upper.includes('LOOKS GOOD') ||
    upper.includes('NO ISSUES') ||
    upper.includes('ALL GOOD') ||
    upper.includes('EVERYTHING LOOKS') ||
    upper.includes('CONTENT IS ACCURATE') ||
    upper.includes('CONTENT LOOKS CORRECT') ||
    (review.trim().split(/\s+/).length < 12 && !upper.includes('ISSUE') && !upper.includes('FIX') && !upper.includes('INCORRECT'))
  );
}

const PROMPT_FILES: Record<string, string> = {
  lecture: 'lecture notes prompt.md',
  'pre-lecture': 'pre-lecture notes prompt.md',
  assignment: 'assignment prompt.md',
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
    { name: PIPELINE_STAGES.FORMATTER, status: 'pending' },
    ...(input.type === 'assignment' ? [{ name: PIPELINE_STAGES.CSV_CONVERTER, status: 'pending' as const }] : []),
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
    const promptTemplate = await loadPrompt(PROMPT_FILES[input.type]);
    const chunksConfig = getChunkConfig(input);

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

    emit('', false, undefined, activeChunks.map((c) => ({ ...c })));

    // Array to hold streaming chunk outputs
    const chunkOutputs = new Array(chunksConfig.length).fill('');
    const chunkDone = new Array(chunksConfig.length).fill(false);

    // Helper: join all chunk outputs and emit current content
    const emitProgressiveContent = () => {
      const combined = chunkOutputs.filter(Boolean).join('\n\n').replace(/\n{3,}/g, '\n\n');
      emit(combined, false, undefined, activeChunks.map((c) => ({ ...c })));
    };

    // Launch all streams in parallel — stream content progressively as it arrives
    const chunkPromises = chunksConfig.map((chunkDef, index) => {
      const creatorMessages = buildCreatorMessages(input, promptTemplate, chunkDef.instruction);

      activeChunks[index].status = 'running';
      emitProgressiveContent();

      if (signal?.aborted) {
        activeChunks[index].status = 'error';
        emitProgressiveContent();
        throw new Error('Generation cancelled');
      }

      return streamCompletion(input.provider, creatorMessages, (chunk: StreamChunk) => {
        // Accumulate thinking from any chunk
        if (chunk.thinking) {
          thinkingAccumulator += chunk.thinking;
          emitProgressiveContent();
        }
        // Accumulate content and emit progressively
        if (chunk.delta) {
          chunkOutputs[index] += chunk.delta;
          emitProgressiveContent();
        }
      }, signal, options).then((result) => {
        chunkDone[index] = true;
        activeChunks[index].status = 'done';
        emitProgressiveContent();
        return result;
      }).catch((err) => {
        activeChunks[index].status = 'error';
        emitProgressiveContent();
        throw err;
      });
    });

    try {
      if (signal?.aborted) throw new Error('Generation cancelled');
      await Promise.all(chunkPromises);
    } catch (err) {
      if (signal?.aborted) {
        updateStage('creator', { status: 'error', error: 'Generation cancelled' });
        const partial = chunkOutputs.filter(Boolean).join('\n\n');
        emit(partial, false, 'Generation cancelled');
        throw new Error('Generation cancelled');
      }
      throw err;
    }

    // All chunks done — final stitch
    let joinedOutput = chunkOutputs.join('\n\n').replace(/\n{3,}/g, '\n\n');

    // Deduplicate consecutive duplicate section headers
    joinedOutput = joinedOutput.replace(/(^|\n)(### .+)\n\2(\n|$)/gm, '$1$2$3');

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
    const reviewerMessages = buildReviewerMessages(creatorOutput, input.type);
    reviewerOutput = await streamCompletion(input.provider, reviewerMessages, (chunk: StreamChunk) => {
      if (chunk.thinking) {
        thinkingAccumulator += chunk.thinking;
        emit(creatorOutput);
      }
    }, signal, options);
    issuesFound = reviewerOutput.trim();
    updateStage(PIPELINE_STAGES.REVIEWER, { status: 'done' });
  } catch {
    updateStage(PIPELINE_STAGES.REVIEWER, { status: 'error', error: 'Reviewer failed — skipping to formatter' });
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
      refinedOutput = mergeSectionPatches(creatorOutput, rawRefinerPatch.trim());
      updateStage(PIPELINE_STAGES.REFINER, { status: 'done' });
    } catch {
      updateStage(PIPELINE_STAGES.REFINER, { status: 'error', error: 'Refiner failed — using creator output' });
      refinedOutput = creatorOutput;
    }
  } else {
    updateStage(PIPELINE_STAGES.REFINER, { status: 'skipped' });
  }

  emit(refinedOutput);

  // ─── Stage 4: Formatter ───────────────────────────────────────────────
  if (input.type === 'assignment') {
    updateStage(PIPELINE_STAGES.FORMATTER, { status: 'skipped' });
    emit(refinedOutput, true);
    return refinedOutput;
  }

  updateStage(PIPELINE_STAGES.FORMATTER, { status: 'running' });
  emit(refinedOutput);

  let formattedOutput = refinedOutput;
  try {
    const formatterMessages = buildFormatterMessages(refinedOutput, input.type);
    const rawFormatterPatch = await streamCompletion(input.provider, formatterMessages, (chunk: StreamChunk) => {
      if (chunk.thinking) {
        thinkingAccumulator += chunk.thinking;
      }
    }, signal, options);

    const sectionCountInBase = (refinedOutput.match(/^###\s+/gm) || []).length;
    const sectionCountInPatch = (rawFormatterPatch.trim().match(/^###\s+/gm) || []).length;
    const isPatchContent = sectionCountInPatch > 0 && sectionCountInPatch < sectionCountInBase * 0.7;

    if (isPatchContent) {
      formattedOutput = mergeSectionPatches(refinedOutput, rawFormatterPatch.trim());
    } else {
      formattedOutput = rawFormatterPatch.trim() || refinedOutput;
    }
    updateStage(PIPELINE_STAGES.FORMATTER, { status: 'done' });
  } catch {
    updateStage(PIPELINE_STAGES.FORMATTER, { status: 'error', error: 'Formatter failed — using refined output' });
    formattedOutput = refinedOutput;
  }

  emit(formattedOutput, true);
  return formattedOutput;
}
