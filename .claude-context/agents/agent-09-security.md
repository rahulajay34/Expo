# Agent 09: Security — Scrub Error Messages

## Suggestions Covered: S-037
## Category: Security
## Priority: P0
## Dependencies: agent-01 (errors.ts for typed errors)
## Files to Read Before Starting: src/app/api/minimax/route.ts, src/lib/utils.ts
## Files to Modify: src/app/api/minimax/route.ts

## Detailed Plan:
1. In the API route's error handling:
   - When upstream returns non-OK, normalize the response to `{ error: "Generation failed", code: "UPSTREAM_ERROR", requestId: <generated-uuid> }`
   - Do NOT forward the raw upstream error text to the client
   - Log the full upstream error server-side via `console.error` with the requestId for debugging
2. For the outer catch block:
   - Return `{ error: "Internal server error", code: "INTERNAL_ERROR", requestId }`
   - Log full stack server-side
3. Keep the existing specific error messages for validation (400) and missing API key (401) — these are controlled and safe

## Edge Cases to Handle:
- Rate limit errors (429) already have controlled messages — keep as-is
- The `requestId` should be a simple incrementing counter or short uuid, not a full uuid (to keep response small)

## Testing Plan: Trigger an error and verify the response contains no upstream details.
## Status: DONE
## Summary:
Scrubbed all upstream error messages from client responses in `src/app/api/minimax/route.ts`:
- Upstream non-OK: returns `{ error: "Generation failed", code: "UPSTREAM_ERROR", requestId }` instead of forwarding raw status/text
- Empty upstream body: same sanitized response with 502 status
- Outer catch: returns `{ error: "Internal server error", code: "INTERNAL_ERROR", requestId }` instead of `getErrorMessage(err)`
- All raw error details logged server-side via `console.error` with requestId for debugging
- Kept existing safe messages for validation (400), rate limit (429), and missing API key (401)
- Removed unused `getErrorMessage` import
- `requestId` uses existing `requestCounter` variable (format: `req-<counter>`)
- `tsc --noEmit` passes
