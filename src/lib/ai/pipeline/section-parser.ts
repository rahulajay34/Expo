/**
 * Section parsing utilities for the generation pipeline.
 *
 * Provides markdown section decomposition (## and ### headers), code-fence
 * masking, and section-level patch merging used by both the refiner and
 * mermaid fixer.
 */

export type Section = { header: string; body: string };

/**
 * Strip leading numbering/letter prefix and common section-word prefixes from a header
 * for fuzzy comparison. Normalises:
 *   "4. Practice Exercises" -> "practice exercises"
 *   "A. Introduction" -> "introduction"
 *   "Step 1: Foo" -> "foo"
 *   "Part 2: Bar" -> "bar"
 *   "Section 3 - Baz" -> "baz"
 *   "**Foo**" -> "foo"
 */
export function headerCore(header: string): string {
  let s = header.trim();
  // Strip leading/trailing markdown decorations (**, *, _, `)
  s = s.replace(/^[*_`]+/, '').replace(/[*_`]+$/, '');
  // Strip "Step N:", "Part N:", "Section N:" (with optional dash/colon)
  s = s.replace(/^(?:step|part|section)\s+\d+\s*[:\-.)]?\s*/i, '');
  // Strip leading numbering/letter prefix like "4. " or "A) "
  s = s.replace(/^[\dA-Za-z]+[\.\)]\s*/, '');
  return s.trim().toLowerCase();
}

/**
 * Build a boolean index marking positions inside fenced code blocks (```...```).
 * Used so ### header matches inside code samples are ignored.
 */
export function buildCodeFenceMask(text: string): boolean[] {
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
      // Close the fence -- mark [fenceStart, end-of-closing-line] as inside
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
export function parseSections(text: string): Section[] {
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

/** Escape special regex characters in a literal string. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Reused across calls — avoids recreating identical RegExp objects on every patch block.
const H2_HEADER_RE = /^## ([^#].*)$/gm;
const NEXT_H2_OR_H3_RE = /^(?:## [^#]|### )/m;

/**
 * Apply ## (double-hash) top-level patches from `patch` into `base`.
 *
 * Each `## Header` block in the patch replaces the corresponding block in base
 * (from the matching `## Header` line to just before the next `## ` line or
 * EOF). Blocks with an empty/whitespace-only body are skipped. Unmatched
 * headers are silently ignored.
 *
 * Returns the modified base and the patch string with all `## ` blocks stripped
 * out so they don't interfere with the subsequent `### ` patch logic.
 */
function applyH2Patches(
  base: string,
  patch: string,
): { base: string; patchWithoutH2: string } {
  type H2Block = { header: string; content: string; rawStart: number; rawEnd: number };
  const blocks: H2Block[] = [];
  let m: RegExpExecArray | null;

  H2_HEADER_RE.lastIndex = 0;
  while ((m = H2_HEADER_RE.exec(patch)) !== null) {
    const headerText = m[1].trim();
    const newlinePos = patch.indexOf('\n', m.index);
    const contentStart = newlinePos === -1 ? patch.length : newlinePos + 1;
    const nextMatch = NEXT_H2_OR_H3_RE.exec(patch.slice(contentStart));
    const contentEnd = nextMatch ? contentStart + nextMatch.index : patch.length;
    blocks.push({
      header: headerText,
      content: patch.slice(contentStart, contentEnd),
      rawStart: m.index,
      rawEnd: contentEnd,
    });
  }

  if (blocks.length === 0) {
    return { base, patchWithoutH2: patch };
  }

  // Strip ## blocks from patch string (reverse order preserves indices).
  let patchWithoutH2 = patch;
  for (let i = blocks.length - 1; i >= 0; i--) {
    patchWithoutH2 =
      patchWithoutH2.slice(0, blocks[i].rawStart) + patchWithoutH2.slice(blocks[i].rawEnd);
  }

  let result = base;
  for (const blk of blocks) {
    if (!blk.content.trim()) continue; // skip empty-body patches

    const headerMatch = new RegExp(`^## ${escapeRegExp(blk.header)}$`, 'm').exec(result);
    if (!headerMatch) continue; // unmatched header — silently ignore

    const afterHeader = result.indexOf('\n', headerMatch.index);
    const blockContentStart = afterHeader === -1 ? result.length : afterHeader + 1;
    const nextH2Match = NEXT_H2_OR_H3_RE.exec(result.slice(blockContentStart));
    const blockEnd = nextH2Match ? blockContentStart + nextH2Match.index : result.length;

    // Preserve a blank line before the next ## heading when the block is not at EOF.
    const trailingBlank = blockEnd < result.length ? '\n\n' : '';
    const replacement = `## ${blk.header}\n${blk.content.trimEnd()}${trailingBlank}`;
    result = result.slice(0, headerMatch.index) + replacement + result.slice(blockEnd);
  }

  return { base: result, patchWithoutH2 };
}

/**
 * Merges section-level patches into base content.
 *
 * Handles both `## ` top-level sections (pre-lecture, TA guide) and `### `
 * subsections. `## ` patches are applied first, then the existing `### ` logic
 * runs on the remainder so behaviour for `### `-only documents is unchanged.
 *
 * Rebuilds the document from parsed sections rather than using regex replacement,
 * which avoids the multiline `$` lookahead bug that caused partial matches.
 * Uses fuzzy header matching (strips leading numbers) so "Practice Exercises"
 * matches "4. Practice Exercises".
 */
export function mergeSectionPatches(baseContent: string, patches: string): string {
  if (!patches.trim()) return baseContent;

  const norm = (s: string) => s.replace(/\r\n/g, '\n');
  const { base, patchWithoutH2: patch } = applyH2Patches(norm(baseContent), norm(patches));

  const patchSections = parseSections(patch);

  // Extract preamble from patch (text before first ###)
  const patchFirstH3 = patch.match(/^### /m);
  const patchPreamble = patchFirstH3
    ? patch.slice(0, patchFirstH3.index!).trimEnd()
    : (patchSections.length === 0 ? patch.trim() : '');

  if (patchSections.length === 0 && !patchPreamble) return base;

  // Parse base into preamble (everything before first ###) + sections
  const baseSections = parseSections(base);
  const firstH3 = base.match(/^### /m);
  let preamble = firstH3 ? base.slice(0, firstH3.index!).trimEnd() : base;

  if (patchPreamble) {
    preamble = patchPreamble;
  }

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

  const parts = [preamble];
  for (const s of baseSections) {
    parts.push(`### ${s.header}\n${s.body}`);
  }

  return parts.filter(Boolean).join('\n\n').trim();
}
