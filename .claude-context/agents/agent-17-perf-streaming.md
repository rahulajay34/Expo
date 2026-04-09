# Agent 17: Performance — Streaming & Main Thread Optimization

## Suggestions Covered: S-025, S-026, S-009
## Category: Perf-Frontend
## Priority: P2
## Dependencies: agent-02 (pipeline split)
## Files to Read Before Starting: src/lib/ai/pipeline.ts, src/lib/ai/client.ts, src/lib/stream-speed.ts, src/app/layout.tsx
## Files to Modify: src/lib/ai/client.ts, src/app/layout.tsx

## Detailed Plan:

### S-025: Web Worker for section parsing
1. SKIP — The section parsing runs during the refiner stage, not during streaming to the user. Moving to a Web Worker adds significant complexity (serialization, worker bundling) for minimal gain. The parsing is fast (<5ms for typical docs).

### S-026: Yield to main thread in SSE reader
1. In `readSSEStream`, after processing a batch of lines, check if we've been running for >16ms
2. If so, yield with `await new Promise(r => setTimeout(r, 0))`
3. Use `performance.now()` for timing

### S-009: Defer theme-init script
1. The inline script in layout.tsx prevents FOUC — it MUST run before paint
2. However, the font-loading portion can be deferred
3. Split the script: theme/dark-mode detection stays inline, font/accent loading moves to a `next/script` with `strategy="afterInteractive"`
4. Actually — after S-012 (fonts via next/font), the font-loading part of the script becomes unnecessary. Just keep the dark-mode class toggle inline.

## Edge Cases to Handle:
- Yielding in SSE reader must not lose data — buffer must persist across yields
- Theme script split must not cause FOUC

## Testing Plan: Build passes. No visible FOUC on page load.
## Status: DONE

## Summary
- S-025: Skipped per plan — section parsing is fast, Web Worker complexity not justified.
- S-026: Added `lastYieldTime` tracking via `performance.now()` in `readSSEStream`. After processing each batch of SSE lines, if >16ms have elapsed since the last yield, does `await new Promise<void>((r) => setTimeout(r, 0))` then resets the timer. Buffer and state persist across the yield.
- S-009: Inline theme script in `layout.tsx` already trimmed to essentials by agent-14 (dark-mode class toggle + accent color CSS vars + `--font-custom` CSS variable set via `fontVarMap`). No further changes needed — script has no dead code.
