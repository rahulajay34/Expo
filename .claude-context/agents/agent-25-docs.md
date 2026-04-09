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
## Status: NOT_STARTED
