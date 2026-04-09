# Agent 07: Testing Setup — Vitest + Unit Tests

## Suggestions Covered: S-053, S-054, S-055, S-056, S-057, S-059
## Category: Testing
## Priority: P0
## Dependencies: agent-01 (errors.ts), agent-02 (pipeline split for testable modules)
## Files to Read Before Starting: src/lib/validation/mermaid.ts, src/lib/ai/client.ts, src/lib/ai/pipeline.ts (or split modules), src/lib/export/csv.ts, src/lib/storage.ts, package.json
## Files to Modify: package.json
## Files to Create: vitest.config.ts, src/lib/validation/mermaid.test.ts, src/lib/ai/client.test.ts, src/lib/ai/pipeline/section-parser.test.ts, src/lib/export/csv.test.ts, src/lib/storage.test.ts

## Detailed Plan:
1. Install vitest + jsdom (add to devDependencies in package.json)
2. Create `vitest.config.ts` with path aliases matching tsconfig
3. Update package.json: `"test": "vitest run"`, `"test:watch": "vitest"`
4. Write tests:

### mermaid.test.ts
- Test `extractMermaidBlocks`: empty string, no mermaid, single block, multiple blocks, blocks inside code fences (should be excluded), blocks with language tag variations

### client.test.ts
- Test `readSSEStream` (need to export it or test via `streamCompletion` with mocked fetch):
  - OpenAI format chunks
  - Anthropic format with thinking deltas
  - Partial line buffering
  - [DONE] termination
  - Empty/malformed lines skipped

### section-parser.test.ts (after pipeline split)
- Test `headerCore`: numbered headings, bold markup, step/part/section prefixes
- Test `parseSections`: basic sections, code fences ignored, empty input
- Test `mergeSectionPatches`: exact match, fuzzy match, new section appended, preamble replacement

### csv.test.ts
- Test `parseAssignmentMarkdown` with representative MCQ, MSQ, subjective inputs
- Test `detectTypeFromHeader` and `detectTypeFromContent`
- Test `extractOptions`, `extractCorrectAnswers`

### storage.test.ts
- Mock localStorage
- Test `saveContent`, `getAllContent`, `deleteContent`
- Test `StorageFullError` thrown on quota exceeded
- Test schema corruption recovery

5. Update package.json scripts: `"test": "vitest run"`, `"check": "npm run typecheck && npm run lint && npm run test"`

## Edge Cases to Handle:
- `readSSEStream` is not exported — may need to export it or test through `streamCompletion` with fetch mock
- mermaid.ts `validateMermaidBlocks` is async and imports mermaid — test `extractMermaidBlocks` only (pure function)
- localStorage mock needs to simulate QuotaExceededError

## Testing Plan: `npm test` passes all tests.
## Status: NOT_STARTED
