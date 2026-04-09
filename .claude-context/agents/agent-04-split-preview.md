# Agent 04: Split MarkdownPreview into Sub-components

## Suggestions Covered: S-063, S-068
## Category: Code Quality
## Priority: P0
## Dependencies: none
## Files to Read Before Starting: src/components/MarkdownPreview.tsx (full file)
## Files to Modify: src/components/MarkdownPreview.tsx
## Files to Create: src/lib/rehype/wrap-lines.ts, src/lib/rehype/sanitize-schema.ts, src/components/MermaidChart.tsx

## Detailed Plan:
1. Create `src/lib/rehype/wrap-lines.ts`:
   - Move `rehypeWrapLines` plugin function and `splitIntoLines` helper
   - Export `rehypeWrapLines`

2. Create `src/lib/rehype/sanitize-schema.ts`:
   - Move `sanitizeSchema` constant
   - Export it

3. Create `src/components/MermaidChart.tsx`:
   - Move `MERMAID_THEME_VARS`, `MermaidChart` component, `downloadSvgAsPng`, `downloadSvgFile`
   - Export `MermaidChart` and `MERMAID_THEME_VARS`

4. Slim down `MarkdownPreview.tsx`:
   - Import from the three new modules
   - Keep `SectionSeparator` (small), `MarkdownPreviewImpl`, memo wrapper, `extractTextFromChildren`
   - File should drop from ~745 lines to ~350

## Edge Cases to Handle:
- `MermaidChart` uses `useTheme` — import stays the same
- `rehypeWrapLines` references HAST types — ensure `@types/hast` import works from new location
- `sanitizeSchema` extends `defaultSchema` from `rehype-sanitize` — import must resolve

## Testing Plan: Build passes. Render a doc with mermaid diagrams, code blocks, and math to verify all plugins work.
## Status: DONE

## Summary
Split `MarkdownPreview.tsx` (745 lines) into four files:

1. **`src/lib/rehype/wrap-lines.ts`** (94 lines) — Extracted `rehypeWrapLines` plugin and its `splitIntoLines` helper. Exports `rehypeWrapLines`.
2. **`src/lib/rehype/sanitize-schema.ts`** (35 lines) — Extracted `sanitizeSchema` constant. Imports `defaultSchema` from `rehype-sanitize` directly.
3. **`src/components/MermaidChart.tsx`** (243 lines) — Extracted `MERMAID_THEME_VARS`, `MermaidChart` component, `downloadSvgAsPng`, and `downloadSvgFile`. Exports `MermaidChart` and `MERMAID_THEME_VARS`.
4. **`src/components/MarkdownPreview.tsx`** (379 lines) — Slimmed down. Imports from the three new modules. Retains `SectionSeparator`, `MarkdownPreviewImpl`, memo wrapper, and `extractTextFromChildren`.

All existing functionality preserved. TypeScript compiles clean (`tsc --noEmit` passes with no errors). No changes to the public API (`MarkdownPreview` export unchanged).
