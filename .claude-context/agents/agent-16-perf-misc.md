# Agent 16: Performance — Prefetch, localStorage Batching, SVG Sprite

## Suggestions Covered: S-023, S-024, S-021, S-005
## Category: Perf-Frontend
## Priority: P2
## Dependencies: none
## Files to Read Before Starting: src/components/ContentCard.tsx, src/components/ContentListItem.tsx, src/app/content/page.tsx, src/lib/generation-context.tsx, src/lib/storage.ts, src/components/GenerationForm.tsx
## Files to Modify: src/components/ContentCard.tsx, src/components/ContentListItem.tsx, src/lib/generation-context.tsx, src/components/GenerationForm.tsx

## Detailed Plan:

### S-023: Prefetch on hover
1. In ContentCard and ContentListItem, add `onMouseEnter` handler:
   ```ts
   const router = useRouter();
   const handlePrefetch = () => router.prefetch(`/content/${id}`);
   ```
2. Add `onFocus` for keyboard navigation accessibility

### S-024: Batch localStorage reads
1. In generation-context.tsx, add a single `useEffect` on mount that reads all needed localStorage keys in one pass
2. Cache the results in context state
3. Listen for `app-storage-changed` and `storage` events to refresh

### S-021: SVG sprite for illustrations
1. In GenerationForm.tsx, the 4 illustration components are ~15KB of inline JSX
2. Extract to static SVG files in `public/illustrations/`
3. Reference via `<img>` or `<svg><use href>` — use `<img>` for simplicity since they accept a `color` prop (need to evaluate if color customization is needed at runtime)
4. If color prop is used dynamically, keep as React components but memoize them with `React.memo`

### S-005: Virtualize content library
1. Skip for now — the library uses Framer Motion stagger animations extensively, which conflicts with virtualization
2. Alternative: just add `content-visibility: auto` (covered in agent-15)
3. Revisit if users report >100 items causing lag

## Edge Cases to Handle:
- Prefetch should not fire on every mouse move — only on enter
- localStorage batch read must handle SSR (return defaults on server)
- SVG illustrations use `color` prop — check if they use currentColor or explicit fills

## Testing Plan: Build passes. Hover over library items and verify prefetch in DevTools network tab.
## Status: NOT_STARTED
