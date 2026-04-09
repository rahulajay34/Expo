# Agent 19: UI/UX — Error Recovery + Delete Undo + Empty State

## Suggestions Covered: S-039, S-040, S-041, S-042
## Category: UI/UX
## Priority: P1
## Dependencies: agent-01 (typed errors)
## Files to Read Before Starting: src/app/page.tsx, src/app/content/page.tsx, src/app/content/[id]/page.tsx, src/components/ui/Toast.tsx, src/lib/storage.ts, src/lib/errors.ts
## Files to Modify: src/app/page.tsx, src/app/content/page.tsx, src/app/content/[id]/page.tsx

## Detailed Plan:

### S-039: Typed error recovery
1. In page.tsx error display, classify the error:
   - Check `instanceof AIProviderError` → "AI service error. Try again."
   - Check `instanceof RateLimitError` → "Rate limited. Retry in Xs." (show countdown)
   - Check `instanceof TimeoutError` → "Generation timed out. Try again with a shorter topic."
   - Check for "API key" in message → "API key not configured."
   - Default → "Something went wrong. Try again."
2. Each error type shows a specific action button (retry, wait, check settings)

### S-040: Confirmation + 5s undo on delete
1. Toast already supports action buttons (`{ label, onClick }`)
2. In `content/page.tsx` delete handler:
   - Show `Modal` confirmation first
   - On confirm, delete and show toast with "Undo" action that calls `restoreContent`
3. In `content/[id]/page.tsx` delete handler:
   - Same pattern: confirm modal → delete → toast with undo → navigate away
   - Undo navigates back to the item

### S-041: Empty state
1. In `content/page.tsx`, when `items.length === 0` after hydration:
   - Show a centered illustration (simple SVG), one sentence, and a "Generate Content" CTA button
   - Link to `/` (the generate page)

### S-042: Skeleton shimmers
1. In `content/page.tsx`, before `hydrated` is true:
   - Show 6 skeleton cards in a grid matching the real layout
   - Use existing `Skeleton` component

## Edge Cases to Handle:
- Undo on delete: need to keep the deleted item in memory for 5 seconds
- Delete undo from viewer page: if user already navigated away, undo should still restore and navigate back
- Empty state must distinguish "no items ever" from "no results for current filter"

## Testing Plan: Build passes. Test delete flow with undo. Test empty state.
## Status: NOT_STARTED
