import { GenerationInput, StreamingState, PipelineStage, ChunkProgress, PIPELINE_STAGES, PipelineStageName } from '../types';
import { loadPrompt, buildCreatorMessages, buildReviewerMessages, buildRefinerMessages, getChunkConfig } from './prompts';
import { streamCompletion, StreamChunk, Message } from './client';
import { validateMermaidBlocks, MermaidFailure } from '../validation/mermaid';

/**
 * Strip leading numbering/letter prefix and common section-word prefixes from a header
 * for fuzzy comparison. Normalises:
 *   "4. Practice Exercises" → "practice exercises"
 *   "A. Introduction" → "introduction"
 *   "Step 1: Foo" → "foo"
 *   "Part 2: Bar" → "bar"
 *   "Section 3 - Baz" → "baz"
 *   "**Foo**" → "foo"
 */
function headerCore(header: string): string {
  let s = header.trim();
  // Strip leading/trailing markdown decorations (**, *, _, `)
  s = s.replace(/^[*_`]+/, '').replace(/[*_`]+$/, '');
  // Strip "Step N:", "Part N:", "Section N:" (with optional dash/colon)
  s = s.replace(/^(?:step|part|section)\s+\d+\s*[:\-.)]?\s*/i, '');
  // Strip leading numbering/letter prefix like "4. " or "A) "
  s = s.replace(/^[\dA-Za-z]+[\.\)]\s*/, '');
  return s.trim().toLowerCase();
}

type Section = { header: string; body: string };

/**
 * Build a boolean index marking positions inside fenced code blocks (```...```).
 * Used so ### header matches inside code samples are ignored.
 */
function buildCodeFenceMask(text: string): boolean[] {
  const mask = new Array<boolean>(text.length).fill(false);
  const fenceRegex = /^```/gm;
  let inside = false;
  let fenceStart = 0;
  let m;
  while ((m = fenceRegex.exec(text)) !== null) {
    if (!inside) {
      inside = true;
      fenceStart = m.index;
    } else {
      // Close the fence — mark [fenceStart, end-of-closing-line] as inside
      const lineEnd = text.indexOf('\n', m.index);
      const endIdx = lineEnd === -1 ? text.length : lineEnd + 1;
      for (let i = fenceStart; i < endIdx; i++) mask[i] = true;
      inside = false;
    }
  }
  // Unclosed fence: mark through end of text
  if (inside) {
    for (let i = fenceStart; i < text.length; i++) mask[i] = true;
  }
  return mask;
}

/**
 * Parse text into an array of ### sections.
 * Returns each section's header (text after ###) and body (content until next section).
 * Matches inside fenced code blocks are ignored.
 */
function parseSections(text: string): Section[] {
  const regex = /^### (.+)$/gm;
  const mask = buildCodeFenceMask(text);
  const sections: Section[] = [];
  let bodyStart = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (mask[match.index]) continue;
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
    upper.includes('EVERYTHING LOOKS GOOD') ||
    upper.includes('CONTENT IS ACCURATE') ||
    upper.includes('CONTENT LOOKS CORRECT')
  );
}

type QuestionType = 'MCQ' | 'MSQ' | 'Subjective';

/**
 * Merges per-question patches into assignment base content.
 *
 * Patch format:
 *   <<<PATCH Q{n}>>>
 *   **Question {n} ({MCQ|MSQ|Subjective})**
 *   [body]
 *   <<<END>>>
 *
 * Questions not in the patch are left untouched. Questions in the patch but not in
 * the base are appended to the section matching their declared type.
 */
function mergeQuestionPatches(baseContent: string, patches: string): string {
  if (!patches.trim()) return baseContent;

  const patchBlockRegex = /<<<PATCH\s+Q(\d+)>>>\s*([\s\S]*?)\s*<<<END>>>/g;
  const parsed: Array<{ n: number; type: QuestionType | null; replacement: string }> = [];
  let pm;
  while ((pm = patchBlockRegex.exec(patches)) !== null) {
    const n = parseInt(pm[1], 10);
    const body = pm[2].trim();
    // Try to extract declared type from first line
    const typeMatch = body.match(/^\*\*Question\s+\d+\s*\((MCQ|MSQ|Subjective)\)\*\*/i);
    const type = typeMatch ? (typeMatch[1] as string) : null;
    const normalizedType: QuestionType | null = type
      ? ((type.toUpperCase() === 'MCQ' ? 'MCQ' : type.toUpperCase() === 'MSQ' ? 'MSQ' : 'Subjective') as QuestionType)
      : null;
    parsed.push({ n, type: normalizedType, replacement: body });
  }

  if (parsed.length === 0) return baseContent;

  let output = baseContent.replace(/\r\n/g, '\n');

  // Replace existing questions
  const unmatched: typeof parsed = [];
  for (const p of parsed) {
    // Find **Question {n} (TYPE)** marker and replace up to the next **Question N (...)** / ## H2 / EOF
    const startRegex = new RegExp(`\\*\\*Question\\s+${p.n}\\s*\\(([^)]+)\\)\\*\\*`, 'i');
    const startMatch = output.match(startRegex);
    if (!startMatch || startMatch.index === undefined) {
      unmatched.push(p);
      continue;
    }
    const startIdx = startMatch.index;
    const afterStart = output.slice(startIdx + startMatch[0].length);
    // Next boundary: next **Question N (...)** OR next ## (not ###) OR EOF
    const nextQ = afterStart.search(/\*\*Question\s+\d+\s*\([^)]+\)\*\*/);
    const nextH2 = afterStart.search(/\n## [^#]/);
    const candidates = [nextQ, nextH2].filter((i) => i >= 0);
    const rel = candidates.length > 0 ? Math.min(...candidates) : -1;
    const endIdx = rel === -1 ? output.length : startIdx + startMatch[0].length + rel;

    const before = output.slice(0, startIdx);
    const after = output.slice(endIdx);
    // Ensure trailing blank line so spacing stays clean
    const replacement = p.replacement.replace(/\s+$/, '') + '\n\n';
    output = before + replacement + after.replace(/^\n+/, '');
  }

  // Append unmatched new questions into the right section
  for (const p of unmatched) {
    const type = p.type;
    if (!type) {
      // No declared type — append at end
      output = output.replace(/\s+$/, '') + '\n\n' + p.replacement.trim() + '\n';
      continue;
    }
    const anchor =
      type === 'MCQ'
        ? /### Multiple Choice Questions[^\n]*\n/i
        : type === 'MSQ'
        ? /### Multiple Select Questions[^\n]*\n/i
        : /### Subjective Question[^\n]*\n/i;
    const anchorMatch = output.match(anchor);
    if (anchorMatch && anchorMatch.index !== undefined) {
      // Find the end of this section (next ## H2 or ### or EOF)
      const sectionStart = anchorMatch.index + anchorMatch[0].length;
      const rest = output.slice(sectionStart);
      // Insert at end of section: find next ## or ### boundary
      const nextH2 = rest.search(/\n## [^#]/);
      const nextH3 = rest.search(/\n### /);
      const bounds = [nextH2, nextH3].filter((i) => i >= 0);
      const insertAt = bounds.length > 0 ? sectionStart + Math.min(...bounds) : output.length;
      const before = output.slice(0, insertAt).replace(/\s+$/, '');
      const after = output.slice(insertAt);
      output = before + '\n\n' + p.replacement.trim() + '\n\n' + after.replace(/^\n+/, '');
    } else {
      output = output.replace(/\s+$/, '') + '\n\n' + p.replacement.trim() + '\n';
    }
  }

  return output.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Counts **Question N (TYPE)** markers by type, ignoring those inside code fences.
 */
function countAssignmentQuestions(content: string): { mcq: number; msq: number; subjective: number } {
  const mask = buildCodeFenceMask(content);
  const regex = /\*\*Question\s+\d+\s*\((MCQ|MSQ|Subjective)\)\*\*/gi;
  let mcq = 0;
  let msq = 0;
  let subjective = 0;
  let m;
  while ((m = regex.exec(content)) !== null) {
    if (mask[m.index]) continue;
    const t = m[1].toUpperCase();
    if (t === 'MCQ') mcq++;
    else if (t === 'MSQ') msq++;
    else subjective++;
  }
  return { mcq, msq, subjective };
}

function validateAssignmentCounts(
  content: string,
  expected: { mcq: number; msq: number; subjective: number },
): {
  valid: boolean;
  actual: { mcq: number; msq: number; subjective: number };
  missingChunks: Array<'mcqs' | 'msqs' | 'subjective'>;
} {
  const actual = countAssignmentQuestions(content);
  const missingChunks: Array<'mcqs' | 'msqs' | 'subjective'> = [];
  if (actual.mcq < expected.mcq) missingChunks.push('mcqs');
  if (actual.msq < expected.msq) missingChunks.push('msqs');
  if (actual.subjective < expected.subjective) missingChunks.push('subjective');
  const valid =
    actual.mcq === expected.mcq &&
    actual.msq === expected.msq &&
    actual.subjective === expected.subjective;
  return { valid, actual, missingChunks };
}

/**
 * Post-process stitched assignment chunks:
 * 1. Deduplicate ## Subtopic Coverage Plan (keep only the first occurrence)
 * 2. Deduplicate `# Assignment:` title headers
 * 3. Deduplicate and type-correct question blocks using expected counts
 */
function cleanAssignmentStitching(
  raw: string,
  questionCounts?: { mcq: number; msq: number; subjective: number },
): string {
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

  // 4. Deduplicate overlapping question blocks and drop wrong-typed questions.
  //    For each Q number, only the FIRST occurrence whose type matches the expected
  //    type at that position is kept. Later duplicates and wrong-typed questions
  //    are removed.
  if (questionCounts) {
    const { mcq, msq, subjective } = questionCounts;
    const expectedType = (n: number): QuestionType | null => {
      if (n >= 1 && n <= mcq) return 'MCQ';
      if (n >= mcq + 1 && n <= mcq + msq) return 'MSQ';
      if (n >= mcq + msq + 1 && n <= mcq + msq + subjective) return 'Subjective';
      return null;
    };

    const mask = buildCodeFenceMask(output);
    const markerRegex = /\*\*Question\s+(\d+)\s*\((MCQ|MSQ|Subjective)\)\*\*/gi;
    type Marker = { start: number; end: number; n: number; type: QuestionType };
    const markers: Marker[] = [];
    let mm;
    while ((mm = markerRegex.exec(output)) !== null) {
      if (mask[mm.index]) continue;
      const n = parseInt(mm[1], 10);
      const t = mm[2].toUpperCase();
      const type: QuestionType = t === 'MCQ' ? 'MCQ' : t === 'MSQ' ? 'MSQ' : 'Subjective';
      markers.push({ start: mm.index, end: mm.index + mm[0].length, n, type });
    }

    // Decide which markers to remove (and the block they own)
    const kept = new Set<number>();
    const removeRanges: Array<{ start: number; end: number }> = [];
    for (let i = 0; i < markers.length; i++) {
      const mk = markers[i];
      const exp = expectedType(mk.n);
      // Compute block end: up to next marker start, or next ## H2, or EOF
      const nextMarkerStart = i + 1 < markers.length ? markers[i + 1].start : -1;
      const rest = output.slice(mk.end);
      const nextH2Rel = rest.search(/\n## [^#]/);
      const nextH2Abs = nextH2Rel >= 0 ? mk.end + nextH2Rel : -1;
      const ends = [nextMarkerStart, nextH2Abs, output.length].filter((v) => v > 0);
      const blockEnd = Math.min(...ends);

      const alreadyKept = kept.has(mk.n);
      const typeOk = exp !== null && mk.type === exp;

      if (!alreadyKept && typeOk) {
        kept.add(mk.n);
      } else {
        removeRanges.push({ start: mk.start, end: blockEnd });
      }
    }

    // Apply removals back-to-front
    removeRanges.sort((a, b) => b.start - a.start);
    for (const r of removeRanges) {
      const before = output.slice(0, r.start).replace(/\s+$/, '');
      const after = output.slice(r.end).replace(/^\n+/, '');
      output = before + '\n\n' + after;
    }
  }

  // 5. Clean up excessive whitespace from removals
  output = output.replace(/\n{3,}/g, '\n\n').trim();

  return output;
}

const PROMPT_FILES: Record<string, string> = {
  lecture: 'lecture notes prompt.md',
  'pre-lecture': 'pre-lecture notes prompt.md',
  assignment: 'assignment prompt.md',
  'assignment-style-buckets': 'assignment style buckets.md',
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
 * Build a targeted refiner-style prompt that instructs the model to return
 * ONLY corrected ```mermaid blocks as `### Section Name` patches. Reuses the
 * existing section-patch protocol so `mergeSectionPatches` can merge the
 * fixes alongside any other refiner output.
 */
function buildMermaidFixMessages(originalContent: string, failures: MermaidFailure[]): Message[] {
  const failureList = failures
    .map(
      (f, i) =>
        `Broken block #${i + 1}${f.error ? ` — parser error: ${f.error}` : ''}\n\`\`\`mermaid\n${f.source}\n\`\`\``,
    )
    .join('\n\n');

  const system = `You are fixing broken Mermaid diagrams inside an educational markdown document. The Mermaid parser has rejected one or more \`\`\`mermaid blocks in the document.

Your task: fix ONLY the broken mermaid blocks. Do not change anything else about the document.

OUTPUT FORMAT — follow exactly:
- Output each changed section using its \`### Section Name\` header, echoed VERBATIM from the original document (same exact text, numbering, punctuation).
- Under each \`### Section Name\` header, output the FULL replacement body for that section, including the corrected \`\`\`mermaid\` block(s).
- Do NOT include unchanged sections — they will be preserved automatically.
- Do NOT add any preamble, explanation, or closing commentary outside the section blocks.
- Do NOT wrap your output in code fences.
- Keep prose, lists, and other non-diagram content inside the section identical to the original. Only the mermaid block(s) should change.

Rules for the fixed mermaid:
- Must parse cleanly (valid graph type declaration, balanced brackets/quotes, well-formed edge syntax).
- Preserve the original intent of the diagram — do not replace it with a different diagram type unless the original type is unrecoverable.
- Keep node labels and structure as close to the original as possible.`;

  const user = `The following mermaid blocks failed to parse and need to be fixed:

${failureList}

Return ONLY the changed \`### Section Name\` blocks containing the corrected mermaid. Do not change anything else.

ORIGINAL CONTENT:
${originalContent}`;

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
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
