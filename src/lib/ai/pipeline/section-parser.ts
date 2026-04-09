/**
 * Section parsing utilities for the generation pipeline.
 *
 * Provides markdown section decomposition (### headers), code-fence masking,
 * and section-level patch merging used by both the refiner and mermaid fixer.
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

/**
 * Merges section-level patches into base content.
 *
 * Rebuilds the document from parsed sections rather than using regex replacement,
 * which avoids the multiline `$` lookahead bug that caused partial matches.
 * Uses fuzzy header matching (strips leading numbers) so "Practice Exercises"
 * matches "4. Practice Exercises".
 */
export function mergeSectionPatches(baseContent: string, patches: string): string {
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
