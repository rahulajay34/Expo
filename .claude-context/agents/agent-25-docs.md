# Agent 25: Documentation — Pipeline + Prompts

## Suggestions Covered: S-093, S-094
## Category: Documentation
## Priority: P2
## Dependencies: agent-02 (pipeline split — document the final structure)
## Files to Read Before Starting: src/lib/ai/pipeline.ts (or split modules), src/lib/ai/prompts.ts, src/lib/ai/client.ts, public/Prompts/*.md
## Files to Create: docs/ai-pipeline.md, docs/prompts.md

## Detailed Plan:

### S-093: Document AI pipeline
1. Create `docs/ai-pipeline.md`:
   - Overview: inputs → Creator → Reviewer → Refiner → Validator → output
   - For each stage: what it does, what messages it sends, what it expects back
   - Assignment chunking: MCQ/MSQ/Subjective parallel generation + stitching
   - Patching logic: section-level vs question-level patches
   - Mermaid validation: auto-fix loop
   - Diagram (text-based flowchart)

### S-094: Document prompt templates
1. Create `docs/prompts.md`:
   - List each file in `public/Prompts/`
   - For each: what content type it serves, what `{{VARIABLES}}` it takes, who consumes it
   - Custom prompt template system: how users create/edit templates in settings

## Edge Cases to Handle:
- Keep docs concise — reference code files for implementation details
- Don't document implementation internals that will change

## Testing Plan: Docs are readable and accurate.
## Status: DONE

## Summary

Created `docs/ai-pipeline.md` (S-093) and `docs/prompts.md` (S-094).

`ai-pipeline.md` covers: stage-by-stage breakdown (Creator, Reviewer, Refiner, Validator), inputs/outputs table, assignment chunking logic and the three chunk instructions, stitching/deduplication via `cleanAssignmentStitching`, section-level vs question-level patching with merge algorithm details, mermaid validation auto-fix loop, and a text-based flowchart of the full pipeline. Key source files table included.

`prompts.md` covers: the `{{VARIABLE}}` system and the full variable-to-source mapping, each of the six files in `public/Prompts/` with content type, variables, consumers, and structural rules, and the custom prompt template system (localStorage schema, CRUD API, and how templates are injected into the Creator system prompt).
