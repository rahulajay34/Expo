import { GenerationInput, StreamingState, PipelineStage, ChunkProgress, PIPELINE_STAGES, PipelineStageName } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, getChunkConfig } from './prompts';
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

  // Extract preamble from patch (text before first ###)
  const patchFirstH3 = patch.match(/^### /m);
  const patchPreamble = patchFirstH3
    ? patch.slice(0, patchFirstH3.index!).trimEnd()
    : (patchSections.length === 0 ? patch.trim() : '');

  if (patchSections.length === 0 && !patchPreamble) return baseContent;

  // Parse base into preamble (everything before first ###) + sections
  const baseSections = parseSections(base);
  const firstH3 = base.match(/^### /m);
  let preamble = firstH3 ? base.slice(0, firstH3.index!).trimEnd() : base;

  // If patch has non-empty preamble, use it to replace the base preamble
  if (patchPreamble) {
    preamble = patchPreamble;
  }

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

/**
 * Post-process stitched assignment chunks:
 * 1. Deduplicate ## Subtopic Coverage Plan (keep only the first occurrence)
 * 2. Strip stray preamble from MSQ/Subjective chunks (text before their expected header)
 * 3. Ensure clean section ordering: Coverage Plan → MCQs → MSQs → Subjective
 */
function cleanAssignmentStitching(raw: string): string {
  let output = raw;

  // 1. Deduplicate ## Subtopic Coverage Plan — keep only the FIRST occurrence
  // Match ## headers (not ###) that contain "Subtopic Coverage" or "Coverage Plan"
  const coveragePlanRegex = /^## .*(?:Subtopic Coverage|Coverage Plan).*$/gim;
  const matches: { index: number; match: string }[] = [];
  let m;
  while ((m = coveragePlanRegex.exec(output)) !== null) {
    matches.push({ index: m.index, match: m[0] });
  }

  if (matches.length > 1) {
    // Remove all but the first coverage plan section
    // A coverage plan section extends from its ## header to the next ## header (or to a --- separator)
    for (let i = matches.length - 1; i >= 1; i--) {
      const startIdx = matches[i].index;
      // Find the end of this coverage plan section: next ## header or --- separator
      const afterStart = output.slice(startIdx + matches[i].match.length);
      const nextSectionMatch = afterStart.match(/\n(?=## [^#]|---)/);
      const endIdx = nextSectionMatch
        ? startIdx + matches[i].match.length + nextSectionMatch.index!
        : startIdx + matches[i].match.length + afterStart.length;

      // Remove the duplicate section (and any leading whitespace)
      const beforeSection = output.slice(0, startIdx).replace(/\n+$/, '');
      const afterSection = output.slice(endIdx).replace(/^\n+/, '');
      output = beforeSection + '\n\n' + afterSection;
    }
  }

  // 2. Strip stray preamble before MSQ and Subjective sections
  // If the MSQ section starts with text before "### Multiple Select Questions" or "## Hard Level",
  // that text is likely leaked preamble from the chunk. But be careful not to strip valid content.

  // Clean up: if "### Multiple Select Questions" appears, remove any ## Subtopic Coverage Plan
  // or other ## headers that appear between the end of MCQs and the MSQ header
  // (these would be stray coverage plans from the MSQ chunk)

  // 3. Deduplicate "# Assignment:" or "## Assignment:" title headers — keep only the first
  const assignmentTitleRegex = /^#{1,2} Assignment:.*$/gim;
  const titleMatches: number[] = [];
  let tm;
  while ((tm = assignmentTitleRegex.exec(output)) !== null) {
    titleMatches.push(tm.index);
  }
  if (titleMatches.length > 1) {
    // Remove all but the first, going backwards
    for (let i = titleMatches.length - 1; i >= 1; i--) {
      const lineStart = titleMatches[i];
      const lineEnd = output.indexOf('\n', lineStart);
      const end = lineEnd === -1 ? output.length : lineEnd + 1;
      output = output.slice(0, lineStart) + output.slice(end);
    }
  }

  // 4. Clean up excessive whitespace from removals
  output = output.replace(/\n{3,}/g, '\n\n').trim();

  return output;
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
    const promptTemplate = await loadPrompt(PROMPT_FILES[input.type]);
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
        updateStage(PIPELINE_STAGES.CREATOR, { status: 'error', error: 'Generation cancelled' });
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

    // For assignments: deduplicate coverage plans, strip stray preamble, clean ordering
    if (input.type === 'assignment') {
      joinedOutput = cleanAssignmentStitching(joinedOutput);
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
      refinedOutput = mergeSectionPatches(creatorOutput, rawRefinerPatch.trim());
      updateStage(PIPELINE_STAGES.REFINER, { status: 'done' });
    } catch {
      updateStage(PIPELINE_STAGES.REFINER, { status: 'error', error: 'Refiner failed — using creator output' });
      refinedOutput = creatorOutput;
    }
  } else {
    updateStage(PIPELINE_STAGES.REFINER, { status: 'skipped' });
  }

  emit(refinedOutput, true);
  return refinedOutput;
}
