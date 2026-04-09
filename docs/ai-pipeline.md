# AI Pipeline

> Source: `src/lib/ai/pipeline.ts` and `src/lib/ai/pipeline/`

---

## Overview

Every content generation request passes through a four-stage pipeline. Each stage is represented in the `StreamingState` emitted to the UI so progress is visible in real time.

```
GenerationInput
      |
      v
 [Stage 1: Creator]  <-- parallel chunk streams (assignments only)
      |
      v
 [Stage 2: Reviewer] <-- reads Creator output, silent
      |
      |--- LGTM? ---> [Stage 3: Refiner skipped]
      |
      v
 [Stage 3: Refiner]  <-- applies patches to Creator output
      |
      v
 [post-pipeline: assignment count validation + auto-retry]
      |
      v
 [Stage 4: Validator] <-- mermaid block check + silent auto-fix
      |
      v
 final markdown string
```

---

## Inputs and Outputs

| Field | Type | Description |
|---|---|---|
| `input.type` | `'lecture' \| 'pre-lecture' \| 'assignment' \| 'ta-guide'` | Selects prompt file and chunk strategy |
| `input.topic` | string | Sanitized and injected as `{{TOPIC}}` |
| `input.sources` | array | Concatenated into `{{TRANSCRIPT}}` / `{{SOURCE_MATERIAL}}` |
| `input.subtopics` | string[] | Injected as `{{SUBTOPICS}}` |
| `input.prerequisites` | string[] | Injected as `{{PREREQUISITES}}` |
| `input.questionCounts` | `{mcq, msq, subjective}` | Assignment only; drives chunking and count validation |
| `input.contentLength` | ContentLength | Appends a length directive to the Creator system prompt |
| `input.promptTemplateId` | string | Resolves a saved template from localStorage |
| `input.customPrompt` | string | One-time custom instruction appended to system prompt |
| `input.provider` | AIProvider | Currently always `'minimax'` |

**Output**: a single markdown string — the final refined content ready to save.

---

## Stage 1: Creator

**Purpose**: generate the initial draft content.

**Prompt construction** (`src/lib/ai/prompts.ts` → `buildCreatorMessages`):

1. Load the prompt file for the content type (cached after first fetch).
2. Fill `{{VARIABLE}}` placeholders with sanitized input values.
3. For assignments: prepend the chunk instruction (see Chunking below) and append the style-buckets library.
4. Build a system prompt from: base role description + optional length directive + optional custom instructions.

**Streaming**: `streamCompletion` in `src/lib/ai/client.ts` opens an SSE connection to `/api/minimax`. Chunks are emitted in batches of `SSE_CHAR_BATCH` characters to reduce re-render frequency. The UI receives progressive content via `onState`.

---

## Assignment Chunking

Assignments split generation into three parallel API calls so the model can focus on one question type at a time.

| Chunk | ID | Questions generated |
|---|---|---|
| MCQ chunk | `mcqs` | Q1 → Q{mcq_count} |
| MSQ chunk | `msqs` | Q{mcq_count+1} → Q{mcq_count+msq_count} |
| Subjective chunk | `subjective` | Q{mcq_count+msq_count+1} → Q{total} |

Each chunk receives:
- The full assignment prompt (for context).
- A **chunk instruction** prepended at the top, using box-drawing characters so the model sees it as the primary directive. The instruction specifies exactly which question type and numbering range to produce and explicitly forbids the others.
- The style-buckets library appended at the bottom.

For non-assignment types (`lecture`, `pre-lecture`, `ta-guide`) a single chunk with an empty instruction is used.

**Chunk coordination**: a shared `AbortController` links all chunk promises. If one chunk errors, the controller aborts the remaining in-flight chunks.

**Stitching** (`cleanAssignmentStitching` in `pipeline/assignment-utils.ts`):

After all chunks complete, outputs are joined and cleaned:

1. Deduplicate `## Subtopic Coverage Plan` headers (keep only the first).
2. Deduplicate `# Assignment:` / `## Assignment:` title headers.
3. For each `**Question N (TYPE)**` marker, keep only the first occurrence whose type matches the expected type at that position (`MCQ` for Q1–Qn, `MSQ` for Qn+1–Qm, `Subjective` for the rest). Wrong-typed or duplicate markers and their question blocks are removed.
4. Collapse excessive blank lines.

**Post-pipeline auto-retry**: after the Refiner, `validateAssignmentCounts` counts `**Question N (TYPE)**` markers. If any type is short, `retryMissingChunks` reruns the Creator for only the affected chunk types and appends the new output. `cleanAssignmentStitching` is run again to resolve duplicates. One retry only — no retry loop.

---

## Stage 2: Reviewer

**Purpose**: quality-check the Creator output; produce a structured list of issues or respond "LGTM".

**Prompt** (`buildReviewerMessages`): a system message with detailed, content-type-specific review criteria, followed by a user message containing the full Creator output. Criteria vary by type:

- **assignment**: question counts, scenario-based framing, answer key completeness, option balancing, correct-answer position distribution, style diversity.
- **lecture**: mandatory anchors, modular blocks, analogy quality, mermaid diagrams.
- **pre-lecture**: four-part structure, exercise count cap (max 4), curiosity-first framing, mermaid diagram.
- **ta-guide**: session overview table shape, Part 1 count (10 questions), Part 2 count (3 live + 2 take-home), forbidden directive language.

**LGTM detection** (`isLGTM` in `pipeline/assignment-utils.ts`): the reviewer response is scanned for phrases like `LGTM`, `LOOKS GOOD`, `NO ISSUES`, `ALL GOOD`, etc. If matched, the Refiner is skipped.

If the Reviewer call fails, the stage is marked errored, `issuesFound` is set to `""`, and the pipeline continues (Refiner is skipped).

---

## Stage 3: Refiner

**Purpose**: apply targeted fixes to the Creator output based on the Reviewer's issue list. Only runs when the Reviewer found issues.

**Two patching modes**, selected by content type:

### Section-level patches (lecture, pre-lecture, ta-guide, mermaid fixer)

Prompt (`buildRefinerMessages`): instructs the model to output only the `### Section Name` blocks that changed, echoing headers verbatim.

Merging (`mergeSectionPatches` in `pipeline/section-parser.ts`):

1. Parse the base document and the patch into `Section[]` arrays using `parseSections`. A code-fence mask (`buildCodeFenceMask`) prevents `###` lines inside code blocks from being treated as section headers.
2. For each patch section, find the matching base section by exact header match first, then fuzzy match via `headerCore` (strips leading numbering, `Step N:`, `Part N:`, markdown decoration, lowercases).
3. Replace the matched base section's body with the patch body. If no match is found, append as a new section.
4. Reassemble: preamble (text before first `###`) + each section as `### header\nbody`, joined with double newlines.

### Question-level patches (assignment)

Prompt (`buildRefinerMessages` assignment variant): instructs the model to output `<<<PATCH Q{n}>>>`...`<<<END>>>` blocks, one per changed question.

Merging (`mergeQuestionPatches` in `pipeline/assignment-utils.ts`):

1. Parse all `<<<PATCH Q{n}>>>` blocks with a regex.
2. For each, locate the `**Question {n} (TYPE)**` marker in the base content. Find the block end at the next marker or `## H2` boundary. Replace the range.
3. Questions in the patch but not found in the base are appended into the correct type section (`### Multiple Choice Questions`, `### Multiple Select Questions`, or `## Hard Level Question`).

If the Refiner call fails, the stage is marked errored and the Creator output is used as-is.

---

## Stage 4: Validator (Mermaid auto-fix)

**Purpose**: silently fix broken mermaid diagram syntax in the final output. Only active when the output contains at least one ` ```mermaid ` block.

**Flow**:

1. `validateMermaidBlocks` (in `src/lib/validation/mermaid.ts`) parses each mermaid block and returns `ok: boolean` plus a `failures` array of `{source, error}` objects.
2. If `ok` is true (all valid or no blocks), the stage is marked `done` or `skipped` and the output is unchanged.
3. If failures exist, `buildMermaidFixMessages` constructs a targeted system+user prompt listing the broken blocks with parser errors, instructing the model to output only the changed `### Section Name` blocks containing corrected mermaid fences.
4. The fix is applied with `mergeSectionPatches` (same as the Refiner).
5. If the fix call fails, the stage is marked `error` but the pre-fix output is saved — no warning is surfaced to the user.

One fix attempt only. There is no re-validation loop.

---

## Text-Based Flowchart

```
GenerationInput
       │
       ▼
loadPrompt(type)  ──────────────────────────────────────────────────────┐
       │                                                                 │
  assignment?                                                            │
       │ yes                       │ no                                  │
       ▼                           ▼                                     │
getChunkConfig  ──────────────────────────────────────────────────      │
  returns 3 chunks                 returns [{id:'all',instruction:''}]   │
       │                                    │                            │
       ▼                                    │                            │
buildCreatorMessages (×3)  ─────────────────┘                           │
  + chunkInstruction prepended                                           │
  + styleBuckets appended                                                │
       │                                                                 │
       ▼                                                                 │
streamCompletion (×N, parallel)                                          │
  ↳ SSE from /api/minimax                                               │
  ↳ onChunk → emit progressive content                                  │
       │                                                                 │
       ▼                                                                 │
join chunks + cleanAssignmentStitching  (assignment only)               │
       │                                                                 │
       ▼                                                                 │
[Stage 1 DONE]  creatorOutput                                           │
       │                                                                 │
       ▼                                                                 │
buildReviewerMessages(creatorOutput, type)                               │
streamCompletion → reviewerOutput                                        │
       │                                                                 │
  isLGTM(reviewerOutput)?                                               │
       │ yes                       │ no                                  │
       ▼                           ▼                                     │
[Stage 3 SKIPPED]     buildRefinerMessages(creatorOutput, issues, type)  │
       │               streamCompletion → rawPatch                       │
       │               mergeQuestionPatches / mergeSectionPatches        │
       │                           │                                     │
       └───────────────────────────┘                                     │
                   refinedOutput                                         │
                       │                                                 │
              assignment?                                                │
                       │ yes                                             │
                       ▼                                                 │
              validateAssignmentCounts                                   │
                       │ missing chunks?                                 │
                       │ yes                                             │
                       ▼                                                 │
              retryMissingChunks (once)                                  │
              cleanAssignmentStitching                                   │
                       │                                                 │
                       ▼                                                 │
              validateMermaidBlocks(refinedOutput)                       │
                       │                                                 │
                  failures?                                              │
                       │ yes                                             │
                       ▼                                                 │
              buildMermaidFixMessages                                     │
              streamCompletion → rawFixPatch                             │
              mergeSectionPatches                                        │
                       │                                                 │
                       ▼                                                 │
              emit(refinedOutput, isComplete=true)                       │
              return refinedOutput                                       │
```

---

## Key Source Files

| File | Responsibility |
|---|---|
| `src/lib/ai/pipeline.ts` | Orchestrator: stage sequencing, chunk coordination, retry logic |
| `src/lib/ai/pipeline/section-parser.ts` | `parseSections`, `mergeSectionPatches`, `buildCodeFenceMask` |
| `src/lib/ai/pipeline/assignment-utils.ts` | `mergeQuestionPatches`, `cleanAssignmentStitching`, `validateAssignmentCounts`, `isLGTM` |
| `src/lib/ai/pipeline/mermaid-fix.ts` | `buildMermaidFixMessages` |
| `src/lib/ai/prompts.ts` | `loadPrompt`, `fillPrompt`, `buildCreatorMessages`, `buildReviewerMessages`, `buildRefinerMessages`, `getChunkConfig` |
| `src/lib/ai/client.ts` | `streamCompletion`, SSE parsing, retry/backoff |
| `src/lib/validation/mermaid.ts` | `validateMermaidBlocks` |
