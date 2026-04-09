# Agent 22: UI/UX — Mobile Generation Stage + Stop Button

## Suggestions Covered: S-044, S-095
## Category: UI/UX + AI/ML
## Priority: P2
## Dependencies: agent-10 (timeouts/abort support)
## Files to Read Before Starting: src/app/page.tsx, src/components/PipelineTimeline.tsx, src/lib/ai/pipeline.ts, src/lib/ai/client.ts
## Files to Modify: src/app/page.tsx, src/components/PipelineTimeline.tsx

## Detailed Plan:

### S-044: Mobile generation stage overlay
1. In page.tsx, add a fixed bottom overlay visible only on mobile (`md:hidden`) during generation:
   - Shows current stage name + animated progress indicator
   - Shows elapsed time
   - Stays above the mobile bottom nav
2. Use `AnimatePresence` for enter/exit animation

### S-095: Stop generating button
1. In page.tsx, add a "Stop" button visible during generation
2. Wire to the existing `AbortController` — `abortRef.current?.abort()`
3. On stop: save partial content (already handled in error path), show toast "Generation stopped"
4. Button placement: in the generation strip (desktop) and mobile overlay

## Edge Cases to Handle:
- Stop button must be large enough for touch (44x44 min)
- Partial content save on stop must work correctly
- Mobile overlay must not obscure content being generated

## Testing Plan: Build passes. Test stop button during generation. Test mobile overlay.
## Status: DONE

## Summary

### S-044: Mobile generation stage overlay
- Added `MobileGenerationOverlay` component in `src/app/page.tsx` (co-located with page logic).
- Renders a fixed-bottom pill above the mobile bottom nav (`bottom-14`, `md:hidden`), with `safe-area-inset-bottom` padding for notch devices.
- Shows animated spinner, current stage name (Generating / Reviewing / Refining), elapsed time, and pill-style stage progress dots (active dot expands to 20px width).
- Uses `AnimatePresence` with spring enter/exit animation; respects `useReducedMotion`.
- Rendered only in the `preview` view, inside the preview section's container so it stays in document flow correctly.

### S-095: Stop generation button
- Added `onStop` prop to `CompactGenerationStripProps` interface.
- Desktop strip: animated `<motion.button>` (hidden on mobile via `sm:inline-flex`) with stop square icon, red border style, fades in/out via `AnimatePresence` when `isGenerating`.
- Mobile overlay: 44×44px touch-target stop button with same red styling, inside `MobileGenerationOverlay`.
- `handleStop` function calls `abortRef.current?.abort()`.
- Updated the `'Generation cancelled'` catch branch to save partial content (if >100 chars) and show a toast: "Generation stopped — partial content saved" or "Generation stopped".
