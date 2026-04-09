# Agent 02: Split pipeline.ts into Focused Modules

## Suggestions Covered: S-061
## Category: Code Quality
## Priority: P0
## Dependencies: agent-01 (uses errors.ts types)
## Files to Read Before Starting: src/lib/ai/pipeline.ts, src/lib/ai/prompts.ts, src/lib/ai/client.ts, src/lib/validation/mermaid.ts, src/lib/types.ts
## Files to Modify: src/lib/ai/pipeline.ts
## Files to Create: src/lib/ai/pipeline/section-parser.ts, src/lib/ai/pipeline/assignment-utils.ts, src/lib/ai/pipeline/mermaid-fix.ts, src/lib/ai/pipeline/index.ts

## Detailed Plan:
1. Create `src/lib/ai/pipeline/section-parser.ts`:
   - Move: `headerCore`, `buildCodeFenceMask`, `parseSections`, `mergeSectionPatches`, `Section` type
   - Export all functions and the `Section` type

2. Create `src/lib/ai/pipeline/assignment-utils.ts`:
   - Move: `isLGTM`, `mergeQuestionPatches`, `countAssignmentQuestions`, `validateAssignmentCounts`, `cleanAssignmentStitching`, `QuestionType` type
   - Export all

3. Create `src/lib/ai/pipeline/mermaid-fix.ts`:
   - Move: `buildMermaidFixMessages` function
   - Import `Message` from `../client`
   - Export function

4. Rewrite `src/lib/ai/pipeline.ts` as thin orchestrator:
   - Import from the three new modules
   - Keep `runPipeline` and `retryMissingChunks` (they are the orchestration)
   - Re-export `runPipeline` as the public API

5. Create `src/lib/ai/pipeline/index.ts` that re-exports `runPipeline` from the parent (optional, for clean import paths)

## Edge Cases to Handle:
- `buildCodeFenceMask` is used by both `parseSections` and `countAssignmentQuestions` — put in section-parser.ts and import in assignment-utils.ts
- Ensure circular imports don't form
- All existing imports of `runPipeline` from `@/lib/ai/pipeline` must still work

## Testing Plan: Build passes. All imports resolve. `runPipeline` still accessible from same path.
## Status: NOT_STARTED
