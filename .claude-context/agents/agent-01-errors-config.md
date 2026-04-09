# Agent 01: Typed Error Hierarchy + Centralized Config

## Suggestions Covered: S-064, S-065
## Category: Code Quality
## Priority: P0
## Dependencies: none
## Files to Read Before Starting: src/lib/utils.ts, src/lib/storage.ts, src/lib/ai/client.ts, src/lib/parsers/pdf.ts, src/lib/stream-speed.ts, src/app/api/minimax/route.ts
## Files to Modify: src/lib/utils.ts, src/lib/storage.ts, src/lib/ai/client.ts, src/lib/stream-speed.ts, src/app/api/minimax/route.ts
## Files to Create: src/lib/errors.ts, src/lib/config.ts

## Detailed Plan:

### S-064: Typed AppError hierarchy
1. Create `src/lib/errors.ts` with:
   - `AppError extends Error` (base class with `code: string`)
   - `StorageFullError extends AppError` (move from storage.ts, keep `code = 'STORAGE_FULL'`)
   - `TimeoutError extends AppError` (code = 'TIMEOUT')
   - `ParseError extends AppError` (code = 'PARSE_ERROR')
   - `AIProviderError extends AppError` (code = 'AI_PROVIDER_ERROR', with optional `status: number`)
   - `RateLimitError extends AppError` (code = 'RATE_LIMITED', with `retryAfter?: number`)
2. Update `src/lib/storage.ts`: import `StorageFullError` from `errors.ts`, remove local class
3. Update `src/lib/utils.ts` `getErrorMessage()`: add cases for each error type to return actionable messages
4. Update `src/lib/ai/client.ts`: throw `TimeoutError` / `AIProviderError` / `RateLimitError` as appropriate
5. Update `src/lib/parsers/pdf.ts`: throw `ParseError` on failures

### S-065: Centralize magic numbers
1. Create `src/lib/config.ts` with:
   ```ts
   export const STORAGE_MAX_BYTES = 5 * 1024 * 1024;
   export const STORAGE_WARN_THRESHOLD = 0.8;
   export const SSE_CHAR_BATCH = 200;
   export const SSE_MAX_RETRIES = 2;
   export const SSE_RETRY_DELAYS = [2000, 5000];
   export const RATE_LIMIT_MINUTE = { window: 60_000, max: 10 };
   export const RATE_LIMIT_HOUR = { window: 3_600_000, max: 100 };
   export const STREAM_TIMEOUT_MS = 90_000;
   export const CIRCUIT_BREAKER_WINDOW_MS = 30_000;
   export const CIRCUIT_BREAKER_THRESHOLD = 5;
   export const PDF_CHUNK_SIZE = 50; // pages per batch
   ```
2. Update consumers to import from `config.ts` instead of inline constants

## Edge Cases to Handle:
- `StorageFullError` is used in catch blocks by `code` property — maintain backward compat
- `instanceof` checks must still work after moving class to errors.ts
- Re-export `StorageFullError` from `storage.ts` for backward compat of existing imports

## Testing Plan: Build passes. Grep for old constant values to ensure none remain inline.
## Status: DONE

## Summary

### S-064: Typed AppError hierarchy
- Created `src/lib/errors.ts` with the full error hierarchy: `AppError` (base), `StorageFullError`, `TimeoutError`, `ParseError`, `AIProviderError` (with optional `status`), and `RateLimitError` (with optional `retryAfter`).
- Updated `src/lib/storage.ts`: removed local `StorageFullError` class, imports from `errors.ts`, re-exports for backward compat. Existing `instanceof` checks in `src/app/content/[id]/page.tsx` continue to work.
- Updated `src/lib/utils.ts` `getErrorMessage()`: added specific branches for each error type returning actionable user-facing messages, with `AppError` as a catch-all before the generic `Error` fallback.
- Updated `src/lib/ai/client.ts`: non-OK responses now throw `RateLimitError` (429) or `AIProviderError` (other status codes). Missing response body throws `AIProviderError`.
- Updated `src/lib/parsers/pdf.ts`: each failure point (library load, file read, document parse, page extraction) now throws a `ParseError` with a descriptive message.

### S-065: Centralize magic numbers
- Created `src/lib/config.ts` with all constants: `STORAGE_MAX_BYTES`, `STORAGE_WARN_THRESHOLD`, `SSE_CHAR_BATCH`, `SSE_MAX_RETRIES`, `SSE_RETRY_DELAYS`, `RATE_LIMIT_MINUTE`, `RATE_LIMIT_HOUR`, `STREAM_TIMEOUT_MS`, `CIRCUIT_BREAKER_WINDOW_MS`, `CIRCUIT_BREAKER_THRESHOLD`, `PDF_CHUNK_SIZE`.
- Updated `src/lib/storage.ts`: replaced `MAX_BYTES` and `WARN_THRESHOLD` with config imports.
- Updated `src/lib/ai/client.ts`: replaced `CHAR_BATCH = 200`, `attemptNumber < 2`, and inline retry delays with `SSE_CHAR_BATCH`, `SSE_MAX_RETRIES`, `SSE_RETRY_DELAYS`.
- Updated `src/app/api/minimax/route.ts`: replaced inline rate limit objects with `RATE_LIMIT_MINUTE` / `RATE_LIMIT_HOUR` from config.
- Updated `src/app/settings/page.tsx`: replaced inline `5 * 1024 * 1024` with `STORAGE_MAX_BYTES`.

### Verification
- `tsc --noEmit` passes with zero errors.
- Grepped for old inline constants; all now only exist in `config.ts`.
