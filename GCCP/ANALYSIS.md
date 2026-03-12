# GCCP App — Corrections & Feature Recommendations

> Generated: 2026-03-12
> Scope: Full codebase analysis of the GCCP (Generated Course Content Platform)

---

## CRITICAL BUGS / CORRECTIONS

### 1. Assignment with Zero Questions Accepted by API
- **File**: `src/app/api/generate/route.ts` (lines 87–97)
- **Issue**: `mcscCount`, `mcmcCount`, and `subjectiveCount` can all be set to `0`. The API accepts this and runs the pipeline, producing an assignment with no questions.
- **Fix**: Add validation: `if (contentType === 'assignment' && (mcscCount + mcmcCount + subjectiveCount) === 0)` return a 400 error.

### 2. Empty Subtopics Array Accepted
- **File**: `src/app/api/generate/route.ts` (line 74)
- **Issue**: `subtopics` is validated as an array but can be empty `[]`. After filtering blank strings (line 128), it could also become empty.
- **Fix**: After filtering, validate `subtopics.length > 0`.

### 3. Database Pruning Not Atomic (Race Condition)
- **File**: `src/lib/storage/db.ts` (lines 61–71)
- **Issue**: `saveGeneration()` does `count()`, then conditionally `delete()`, then `add()` — three separate operations. If two saves fire concurrently, both could pass the count check and exceed `MAX_GENERATIONS`.
- **Fix**: Wrap in a Dexie transaction:
  ```ts
  await db.transaction('rw', db.generations, async () => { ... });
  ```

### 4. Model Name Not Validated Against Known Models
- **File**: `src/app/api/generate/route.ts` (line 111)
- **Issue**: `modelName` accepts any string. A typo like `"gemini-2.5-flah"` passes validation and fails at runtime when the Gemini API rejects it.
- **Fix**: Validate against the `GEMINI_MODELS` constant or a whitelist of known model IDs.

### 5. No Max-Length Validation on Topic/Subtopic Strings
- **File**: `src/app/api/generate/route.ts` (lines 70–76)
- **Issue**: No length cap on `topic` or individual subtopic strings. A user could paste massive text, causing token explosion in prompts.
- **Fix**: Add `topic.length <= 500` and per-subtopic `length <= 300` checks.

### 6. `contentLength` Defaults to `undefined` Instead of `'standard'`
- **File**: `src/app/api/generate/route.ts` (line 136)
- **Issue**: If `contentLength` is omitted or invalid, it's set to `undefined` rather than `'standard'`. The pipeline works, but the behavior is implicit.
- **Fix**: Default to `'standard'` explicitly.

### 7. `outputLanguage` Accepts Arbitrary Strings
- **File**: `src/app/api/generate/route.ts` (line 115)
- **Issue**: No validation against supported languages. Values like `"Klingon"` are accepted.
- **Fix**: Define a `SUPPORTED_LANGUAGES` array and validate against it.

---

## HIGH PRIORITY IMPROVEMENTS

### 8. Zero Test Coverage
- **Files**: None — no `.test.ts` or `.test.tsx` files exist
- **Issue**: Test infrastructure is installed (`vitest`, `@testing-library/react`, `jsdom`) but there are zero tests.
- **Impact**: The complex 7-agent AI pipeline, Zustand store, database layer, and utility functions are all untested.
- **Recommendation**: Prioritize tests for:
  - `src/lib/utils/rate-limiter.ts` — pure logic, easy to test
  - `src/lib/storage/db.ts` — database CRUD operations
  - `src/app/api/generate/route.ts` — request validation logic
  - `src/lib/ai/pipeline.ts` — pipeline orchestration (mock Gemini calls)
  - Zustand store actions — state transitions

### 9. Heading ID Collision During Streaming
- **File**: `src/components/features/editor/markdown-preview.tsx`
- **Issue**: Heading IDs use a mutable counter (`headingIndexRef`) that resets per render. During streaming, as content arrives incrementally, heading IDs can shift — causing Table of Contents links to point to wrong sections.
- **Fix**: Generate heading IDs from heading text (slugified) rather than index-based counters.

### 10. Pipeline Pause/Resume Context Not Validated
- **File**: `src/lib/hooks/use-pipeline.ts`
- **Issue**: When resuming from a pause point (e.g., `after-reviewer`), the code doesn't verify that `previousContent` and `previousContext` are populated. If somehow empty, Phase 3 processes blank content.
- **Fix**: Guard resume with a check: `if (!previousContent || !previousContext) throw Error(...)`.

### 11. Notification Permission Can Throw
- **File**: `src/lib/hooks/use-notifications.ts`
- **Issue**: `Notification.requestPermission()` can throw in sandboxed or restricted browser environments. No try-catch wraps it.
- **Fix**: `const result = await Notification.requestPermission().catch(() => 'default')`.

### 12. Mermaid Diagram Silent Failures
- **File**: `src/components/features/editor/mermaid-block.tsx`
- **Issue**: If a Mermaid diagram has invalid syntax, the component likely renders a blank space with no user-visible error.
- **Fix**: Add error state display: "Diagram could not be rendered" with the error message.

---

## MISSING FEATURES

### 13. No Search in Archives
- **File**: `src/components/features/archives/archives-content.tsx`
- **Issue**: Archives has filters by content type but no text search. Users with many generations cannot find items by topic name.
- **Recommendation**: Add a search input that filters by `topic` and `subtopics` fields.

### 14. No Draft Recovery Notification
- **File**: `src/lib/hooks/use-auto-save.ts`
- **Issue**: Drafts are auto-saved to localStorage, but when a draft is recovered on app load, there's no visible indicator to the user.
- **Recommendation**: Show a toast: "Draft recovered — you have unsaved work from your previous session."

### 15. No Bulk Export from Archives
- **Issue**: Archives only supports individual item export (PDF/markdown). No way to export multiple or all generations at once.
- **Recommendation**: Add "Export Selected" and "Export All" actions with format selection (PDF, Markdown, ZIP).

### 16. No Undo/Redo for Content Edits
- **Issue**: Only `undoToPrevious()` exists (reverts to pre-generation state). No line-level undo history for manual edits in the markdown editor.
- **Recommendation**: Implement an undo stack using a history array in the Zustand store.

### 17. Question CSV Export Missing Question ID
- **File**: `src/lib/utils/index.ts`
- **Issue**: CSV export of assignment questions doesn't include the `id` field. If re-imported, IDs would be lost.
- **Fix**: Add `id` as the first CSV column.

### 18. No API Key Masking in Settings
- **File**: `src/components/features/settings/settings-content.tsx`
- **Issue**: The Gemini API key input likely shows the key in plain text.
- **Recommendation**: Use `type="password"` with a toggle-visibility button.

### 19. Batch Generation Rate Limit Warning
- **Issue**: Batch generation of multiple items doesn't warn that the batch size might exceed the 12/hour rate limit.
- **Recommendation**: Show a warning if batch count approaches or exceeds the rate limit, with estimated completion time.

---

## ACCESSIBILITY IMPROVEMENTS

### 20. Missing Form Labels
- Textarea inputs (batch topic entry, transcript drop zone) may lack proper `<label>` elements linked via `htmlFor`/`id`.
- Toolbar cooldown state isn't announced to screen readers.
- Delete buttons in assignment workspace should have descriptive `aria-label` attributes (e.g., `aria-label="Delete question 3"`).

### 21. Keyboard Navigation Gaps
- Focus management after pipeline completion — focus should return to a logical element.
- Modal/dialog trap management for insert-image-dialog and other popups.

---

## PERFORMANCE IMPROVEMENTS

### 22. No Response Compression for SSE Stream
- **File**: `src/app/api/generate/route.ts`
- **Issue**: Large markdown content (5000+ words) is sent uncompressed over the SSE stream.
- **Fix**: Enable gzip/brotli compression at the server or middleware level.

### 23. `getTotalCost()` Loads All Records
- **File**: `src/lib/storage/db.ts` (lines 93–96)
- **Issue**: `getTotalCost()` calls `db.generations.toArray()` loading ALL records into memory just to sum costs.
- **Fix**: Use Dexie's `.each()` to iterate without loading all at once, or maintain a running total.

---

## SECURITY CONSIDERATIONS

### 24. Rate Limiter Bypassable via Header Spoofing
- **File**: `src/app/api/generate/route.ts` (lines 28–35)
- **Issue**: Rate limiter trusts `x-forwarded-for` header, which can be spoofed in direct requests.
- **Impact**: Low for local-first app, but if deployed behind a proxy, ensure the proxy strips/rewrites client headers.

### 25. Rate Limiter Lost on Server Restart
- **File**: `src/lib/utils/rate-limiter.ts`
- **Issue**: In-memory `Map` is cleared on every server restart, resetting all rate limits.
- **Impact**: Acceptable for development/local-first, but note for production deployment.

---

## CONFIGURATION IMPROVEMENTS

### 26. No CORS Headers on API Routes
- If the app is ever deployed or accessed cross-origin, `/api/generate` has no CORS configuration.
- **Recommendation**: Add CORS middleware or headers for production deployments.

### 27. Missing `robots.txt` and `sitemap.xml`
- No static files for SEO and crawl management.
- **Recommendation**: Add if the app will be publicly deployed.

---

## SUMMARY TABLE

| Priority | Category | Count |
|----------|----------|-------|
| Critical | Bugs / Corrections | 7 |
| High | Improvements | 5 |
| Medium | Missing Features | 7 |
| Medium | Accessibility | 2 |
| Low | Performance | 2 |
| Low | Security | 2 |
| Low | Configuration | 2 |
| **Total** | | **27** |

---

*The codebase is architecturally solid with good separation of concerns, proper TypeScript usage, and clean component structure. The issues above are refinements rather than fundamental problems. The highest-impact items are the API validation gaps (#1–#7) and the complete absence of tests (#8).*
