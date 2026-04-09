# Agent 05: Replace any/as any + Consolidate CSV Heuristics

## Suggestions Covered: S-066, S-067
## Category: Code Quality
## Priority: P1
## Dependencies: agent-01 (errors.ts), agent-02 (pipeline split)
## Files to Read Before Starting: src/lib/parsers/pdf.ts, src/lib/export/mermaid-wait.ts, src/lib/ai/client.ts, src/lib/export/csv.ts
## Files to Modify: src/lib/parsers/pdf.ts, src/lib/export/mermaid-wait.ts, src/lib/ai/client.ts, src/lib/export/csv.ts

## Detailed Plan:

### S-066: Type fixes
1. `src/lib/parsers/pdf.ts`: pdfjs-dist has `@types/pdfjs-dist` — use `PDFDocumentProxy`, `PDFPageProxy`, `TextContent` types from the package
2. `src/lib/export/mermaid-wait.ts`: Replace any `any` casts with `HTMLElement` / `Element` types
3. `src/lib/ai/client.ts`: Type the SSE parsed JSON shapes (define inline interfaces for Anthropic and OpenAI SSE events)

### S-067: Consolidate CSV question classification
1. In `src/lib/export/csv.ts`, group the detection/classification functions:
   - Create a `QuestionClassifier` object or namespace grouping `detectTypeFromHeader`, `detectTypeFromContent`, `isQuestionHeader`
   - Or simply organize them with clear section comments and ensure they're all co-located
   - Extract shared regex constants to the top of the file
2. Keep the file as a single module (the explore agent's split suggestion is overkill for 520 lines that all serve one purpose)

## Edge Cases to Handle:
- pdfjs-dist types may not match the dynamic import pattern — use `typeof import('pdfjs-dist')`
- SSE parsed data can be malformed — keep the try/catch, just type the happy path

## Testing Plan: `tsc --noEmit` passes with no new errors. Build passes.
## Status: NOT_STARTED
