# Agent 10: Reliability — Timeouts, Backoff, Circuit Breaker, PDF Resilience

## Suggestions Covered: S-069, S-070, S-071, S-073, S-075
## Category: Reliability
## Priority: P0
## Dependencies: agent-01 (errors.ts, config.ts)
## Files to Read Before Starting: src/lib/ai/client.ts, src/lib/parsers/pdf.ts, src/app/api/minimax/route.ts, src/lib/config.ts
## Files to Modify: src/lib/ai/client.ts, src/lib/parsers/pdf.ts, src/app/api/minimax/route.ts

## Detailed Plan:

### S-069: Streaming timeout
1. In `readSSEStream`, track `lastChunkTime = Date.now()` after each reader.read()
2. Before each read, check if `Date.now() - lastChunkTime > STREAM_TIMEOUT_MS` (90s from config)
3. If timeout, throw `TimeoutError('No data received for 90 seconds')`

### S-070: Exponential backoff with jitter
1. In `doFetch`, replace fixed delays with: `delay = Math.min(base * 2^attemptNumber, 10000) + Math.random() * base`
2. Where `base = 1000`
3. Keep respecting `Retry-After` header when present

### S-071: Graceful partial PDF parse
1. In `extractPDFText`, wrap per-page extraction in try/catch
2. On page failure, push `[Page N: extraction failed]` to results and continue
3. If any pages failed, return the partial text + append a note about failed pages

### S-073: Circuit breaker
1. In `route.ts`, add module-level state: `let circuitFailures: number[] = []`
2. Before making upstream request, check if recent failures > threshold within window
3. If circuit is open, return 503 with `{ error: "Service temporarily unavailable", code: "CIRCUIT_OPEN", retryAfter: 30 }`
4. On upstream 429/5xx, push `Date.now()` to `circuitFailures`
5. On success, clear `circuitFailures`

### S-075: Chunk large PDFs
1. In `extractPDFText`, for PDFs with >50 pages, process in batches of 50
2. Between batches, yield to main thread with `await new Promise(r => setTimeout(r, 0))`
3. This prevents browser from OOM on very large documents

## Edge Cases to Handle:
- Timeout should respect AbortSignal (don't throw timeout if already aborted)
- Circuit breaker array needs periodic pruning (only keep entries within window)
- PDF partial parse should still throw if zero pages succeeded

## Testing Plan: Build passes. Unit tests for timeout and backoff logic.
## Status: DONE

## Summary:
All five reliability features implemented and `tsc --noEmit` passes:
- **S-069**: `readSSEStream` now tracks `lastChunkTime` and throws `TimeoutError` if no chunk arrives within `STREAM_TIMEOUT_MS` (90s). Respects AbortSignal — won't throw timeout if already aborted.
- **S-070**: Replaced fixed `SSE_RETRY_DELAYS` array with `backoffDelay()` function: `min(1000 * 2^attempt, 10000) + random(0..1000)`. Still respects `Retry-After` header when present.
- **S-071**: Per-page try/catch in `extractPDFText` — failed pages yield `[Page N: extraction failed]` placeholder. Throws only if zero pages succeeded. Appends note about failed page numbers.
- **S-073**: Circuit breaker in `route.ts` — module-level `circuitFailures` array tracks 429/5xx timestamps. Opens circuit (503 + retryAfter:30) when failures exceed threshold within window. Resets on success. Pruned on every check.
- **S-075**: Large PDFs processed in batches of `PDF_CHUNK_SIZE` (50) pages with `setTimeout(0)` yield between batches to prevent main-thread blocking.
