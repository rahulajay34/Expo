/**
 * Mermaid diagram syntax validation.
 *
 * Extracts every ```mermaid ... ``` fenced block from a markdown document and
 * runs each through mermaid's own parser. Used by the generation pipeline as a
 * terminal stage to catch broken diagrams before content is persisted.
 *
 * Mermaid is dynamically imported (ESM-only, browser-oriented) so this module
 * must only be called from client-side code. `mermaid.parse()` with
 * `suppressErrors: true` returns `false` for invalid input and resolves to a
 * `ParseResult` for valid input — it should not throw under that option, but
 * we still catch any stray error and surface its message.
 */

export interface MermaidBlock {
  /** 0-based index among mermaid blocks in the document (not character offset). */
  index: number;
  /** Raw mermaid source (the content between the fence markers). */
  source: string;
  /** Character offset of the opening ```mermaid line in the original markdown. */
  start: number;
  /** Character offset just past the closing ``` line. */
  end: number;
}

export interface MermaidFailure {
  index: number;
  source: string;
  error: string;
}

export type MermaidValidationResult =
  | { ok: true; blocks: MermaidBlock[] }
  | { ok: false; blocks: MermaidBlock[]; failures: MermaidFailure[] };

/**
 * Extract every ```mermaid ... ``` block from markdown.
 *
 * Only matches fences that start at the beginning of a line, to avoid
 * picking up code samples that mention the literal string inside a paragraph.
 */
export function extractMermaidBlocks(markdown: string): MermaidBlock[] {
  const blocks: MermaidBlock[] = [];
  // ^```mermaid\n ... \n```
  const regex = /^```mermaid[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*$/gm;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = regex.exec(markdown)) !== null) {
    blocks.push({
      index: idx++,
      source: m[1],
      start: m.index,
      end: m.index + m[0].length,
    });
  }
  return blocks;
}

let mermaidInitPromise: Promise<typeof import('mermaid').default> | null = null;

/**
 * Load mermaid once and initialise with a minimal config so `parse()` works.
 * Re-used across calls so we don't re-import or re-init on every validation.
 */
async function getMermaid(): Promise<typeof import('mermaid').default> {
  if (!mermaidInitPromise) {
    mermaidInitPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default;
      // Minimal init — parse() needs the parser wired up. startOnLoad: false
      // prevents mermaid from scanning the DOM on load. securityLevel matches
      // MarkdownPreview.tsx so behaviour stays consistent.
      mermaid.initialize({ startOnLoad: false, securityLevel: 'loose' });
      return mermaid;
    });
  }
  return mermaidInitPromise;
}

/**
 * Validate every mermaid block in a markdown document.
 *
 * - If the document has no mermaid blocks, returns `{ ok: true, blocks: [] }`.
 * - Otherwise parses each block. Any block that fails to parse becomes a
 *   `MermaidFailure` entry with the parser's error message.
 */
export async function validateMermaidBlocks(markdown: string): Promise<MermaidValidationResult> {
  const blocks = extractMermaidBlocks(markdown);
  if (blocks.length === 0) return { ok: true, blocks };

  let mermaid: typeof import('mermaid').default;
  try {
    mermaid = await getMermaid();
  } catch (err) {
    // Mermaid failed to load — treat as "cannot validate" rather than failing
    // the pipeline. Upstream will save the content as-is.
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      blocks,
      failures: blocks.map((b) => ({ index: b.index, source: b.source, error: `mermaid load failed: ${msg}` })),
    };
  }

  const failures: MermaidFailure[] = [];
  for (const block of blocks) {
    try {
      const result = await mermaid.parse(block.source, { suppressErrors: true });
      if (result === false) {
        failures.push({ index: block.index, source: block.source, error: 'Invalid mermaid syntax' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Strip mermaid's verbose multi-line prefixes down to the useful first line
      const cleaned = msg.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3).join(' ');
      failures.push({ index: block.index, source: block.source, error: cleaned || 'Parse error' });
    }
  }

  if (failures.length === 0) return { ok: true, blocks };
  return { ok: false, blocks, failures };
}
