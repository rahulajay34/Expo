# Agent 11: Reliability UI — Mermaid Fallback, Storage-Full Action, Navigation Warning

## Suggestions Covered: S-072, S-074, S-076
## Category: Reliability
## Priority: P1
## Dependencies: agent-01 (errors.ts)
## Files to Read Before Starting: src/lib/export/mermaid-wait.ts, src/components/MarkdownPreview.tsx (or MermaidChart.tsx after split), src/components/StorageWarningBanner.tsx, src/lib/storage.ts, src/app/page.tsx, src/lib/generation-context.tsx
## Files to Modify: src/lib/export/mermaid-wait.ts, src/components/StorageWarningBanner.tsx, src/app/page.tsx, src/lib/generation-context.tsx
## Files to Create: none

## Detailed Plan:

### S-072: Mermaid fallback to raw code block
1. In `mermaid-wait.ts`: if timeout expires, don't reject — resolve and let the raw code block remain
2. In MermaidChart component: if mermaid.render throws, show the raw code in a `<pre><code>` block instead of an error message

### S-074: Storage-full error with clear action
1. In `StorageWarningBanner.tsx`: when storage is >=90%, show a list of the 3 largest items with a "Delete oldest" button
2. Add a `getLargestItems(n: number)` helper to `storage.ts` that returns the N items with most bytes
3. "Delete oldest" calls `deleteContent` on the oldest item, then refreshes stats

### S-076: Navigation warning on unclosed streaming
1. In `page.tsx`: add `beforeunload` listener when `isGenerating` is true
2. Return the standard `event.preventDefault()` pattern
3. Clean up listener when generation completes
4. Also: if user navigates via sidebar while generating, the existing nav guard in Sidebar handles this — verify it works

## Edge Cases to Handle:
- MermaidChart error fallback should still show the error message as a tooltip/title on the code block
- Storage deletion in the banner must trigger re-render of stats
- beforeunload must be cleaned up on unmount

## Testing Plan: Build passes. Manually test: interrupt mermaid render, fill storage, navigate during generation.
## Status: NOT_STARTED
