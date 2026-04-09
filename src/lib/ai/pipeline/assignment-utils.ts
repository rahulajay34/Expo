/**
 * Assignment-specific utilities for the generation pipeline.
 *
 * Handles question counting, validation, patch merging, and post-stitch
 * cleanup for chunked assignment generation.
 */

import { buildCodeFenceMask } from './section-parser';

export type QuestionType = 'MCQ' | 'MSQ' | 'Subjective';

/**
 * Returns true when a reviewer response indicates "looks good, no issues".
 */
export function isLGTM(review: string): boolean {
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
export function mergeQuestionPatches(baseContent: string, patches: string): string {
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
      // No declared type -- append at end
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
export function countAssignmentQuestions(content: string): { mcq: number; msq: number; subjective: number } {
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

export function validateAssignmentCounts(
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
export function cleanAssignmentStitching(
  raw: string,
  questionCounts?: { mcq: number; msq: number; subjective: number },
): string {
  let output = raw;

  // 1. Deduplicate ## Subtopic Coverage Plan -- keep only the FIRST occurrence
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

  // 3. Deduplicate "# Assignment:" or "## Assignment:" title headers -- keep only the first
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
