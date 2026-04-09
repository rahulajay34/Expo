# Agent 13: Performance — Render Optimization

## Suggestions Covered: S-006, S-007, S-008, S-019, S-022, S-028
## Category: Perf-Frontend
## Priority: P1
## Dependencies: agent-04 (MarkdownPreview split)
## Files to Read Before Starting: src/components/MarkdownPreview.tsx, src/components/ContentCard.tsx, src/components/ContentListItem.tsx, src/components/MarkdownEditor.tsx, src/components/AmbientLines.tsx, src/app/globals.css, tailwind.config.ts
## Files to Modify: src/components/MarkdownPreview.tsx, src/components/ContentCard.tsx, src/components/ContentListItem.tsx, src/components/MarkdownEditor.tsx, src/components/AmbientLines.tsx, src/app/globals.css, tailwind.config.ts

## Detailed Plan:

### S-006: Cache rehype/remark plugins
1. In MarkdownPreview, hoist the plugin arrays to module scope:
   ```ts
   const REMARK_PLUGINS = [remarkGfm, remarkMath];
   const REHYPE_PLUGINS = [rehypeRaw, rehypeHighlight, rehypeKatex, rehypeSanitize, rehypeWrapLines];
   ```
2. Use these constants in the `ReactMarkdown` props instead of inline arrays

### S-007: Memoize ContentCard/ContentListItem
1. Both already use `React.memo` with custom comparators — verify the comparators check `id`, `updatedAt`, `selected`
2. If not already optimal, update comparators

### S-008: Debounce editor preview
1. In `MarkdownEditor.tsx`, the editor calls `onChange` directly
2. The debounce should happen at the consumer level (page.tsx), not in the editor
3. In page.tsx where editor value flows to MarkdownPreview, add a 120ms debounce on the preview markdown state

### S-019: Conditionally drop rehype plugins
1. Before rendering, check markdown content:
   - Has `$...$` or `$$...$$`? Include rehypeKatex + remarkMath
   - Has fenced code blocks? Include rehypeHighlight
   - Otherwise use minimal plugin set
2. Use `useMemo` to compute the plugin arrays based on content checks

### S-022: Decouple AmbientLines from type switching
1. Instead of `AnimatePresence mode="wait"` with key on contentType (which remounts everything), memoize the sprinkle config per type
2. Use `useMemo` on the sprinkle positions so only the icon SVGs re-render on type change
3. Animate individual icons in/out rather than the whole layer

### S-028: Remove idle @keyframes
1. In `globals.css`, make `float-slow`, `float-medium`, `float-fast` animations conditional:
   - Add a `.generating` class that enables them
   - Without the class, `animation: none`
2. In `tailwind.config.ts`, keep the keyframe definitions but don't auto-apply them

## Edge Cases to Handle:
- Plugin array references must be stable (same object identity) for React.memo to work
- Debounce must not lose the final keystroke — flush on unmount
- AmbientLines animation change must not cause a jarring visual pop

## Testing Plan: Build passes. Verify no visual regressions in markdown rendering.
## Status: NOT_STARTED
