# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Next.js dev server (http://localhost:3000)
npm run build        # production build
npm run start        # serve production build
npm run lint         # next lint
npx tsc --noEmit     # type-check (no test runner is configured)
```

## Environment

- `MINIMAX_API_KEY` — required. Read by `src/app/api/minimax/route.ts`. Stored in `.env.local`.

## Architecture

Next.js 14 (App Router) educational content authoring tool. User uploads source material (PDF/PPTX/MD/code/text), picks a content type (`lecture`, `pre-lecture`, `assignment`), and the app streams AI-generated markdown through a multi-stage pipeline. Generated items are persisted in browser `localStorage` — there is no database and no test suite.

**Stack:** Next.js 14.2, React 18.3, TypeScript 5.3, Tailwind 3.4, Framer Motion, `pdfjs-dist`, `jszip`, `react-markdown` + rehype/remark plugins, `mermaid`, `katex`.

### Path alias
`@/*` → `./src/*` (configured in `tsconfig.json`).

### Single AI provider
Only **MiniMax** is supported. All AI calls go through `POST /api/minimax`, which proxies to `https://api.minimax.io/anthropic/v1/messages` using the Anthropic message format (`x-api-key` + `anthropic-version`), model `MiniMax-M2.7`, with `thinking.type = 'enabled'` and `stream: true`. The route applies in-memory per-IP sliding-window rate limiting (10/min, 100/hr), opportunistically sweeps stale IPs, relays client `AbortSignal` to upstream (to stop MiniMax generation and save cost), and pipes the upstream SSE stream straight back to the client.

### Generation pipeline (`src/lib/ai/pipeline.ts`)
Three sequential stages, all driven by `runPipeline(input, onState, signal)`:

1. **Creator** — fans out into 1+ parallel `streamCompletion` calls based on `getChunkConfig(input)`:
   - `lecture` / `pre-lecture` → 1 chunk.
   - `assignment` → 3 chunks (`mcqs`, `msqs`, `subjective`), each given a strict `CHUNK TASK` instruction prepended to the prompt so the model only emits its assigned section. Outputs are joined and post-processed by `cleanAssignmentStitching` to dedupe `## Subtopic Coverage Plan` and `# Assignment:` headers and clean spacing.
   - Progress is emitted progressively as chunk deltas arrive (`emit` → `onState`); active-chunk status is reported via `ChunkProgress[]`.
2. **Reviewer** — sends the creator output with a content-type-specific checklist. If the response matches `isLGTM(...)` (any of "LGTM", "LOOKS GOOD", short non-issue replies), the Refiner stage is **skipped**.
3. **Refiner** — only runs when issues are found. The model is instructed to output **only the changed `### Section Name` blocks**, which `mergeSectionPatches` merges into the original document. Merging uses fuzzy header matching (`headerCore` strips leading numbering like `"4. Practice Exercises"` → `"practice exercises"`, also `"Step N:"`, `"Part N:"`, `"**Foo**"`) so refiner output that drops numbering still matches. `### ` matches inside fenced code blocks are ignored via `buildCodeFenceMask`. New (unmatched) sections are appended.

CSV conversion is **not** part of `runPipeline` — it lives in the export UI (`src/lib/export/csv.ts`).

### Prompt loading
Prompt templates live in `public/Prompts/*.md` (note: filenames contain spaces, e.g. `"lecture notes prompt.md"`) and are fetched at runtime via `loadPrompt()` with an in-memory cache. `{{VAR}}` placeholders (`TOPIC`, `TRANSCRIPT`, `SUBTOPICS`, `PREREQUISITES`, `MCQ_COUNT`, etc.) are filled by `fillPrompt()`. User input is passed through `sanitizeShortInput` / `sanitizeTranscript` before substitution. System messages can be augmented with `LENGTH_DIRECTIVES` and user-saved prompt templates from `prompt-templates.ts`.

### Streaming client (`src/lib/ai/client.ts`)
`streamCompletion` POSTs to `/api/minimax` and parses an SSE stream handling **both formats**:
- Anthropic: `content_block_start` / `content_block_delta` with `thinking_delta` and `text_delta`, plus `message_stop`.
- OpenAI fallback: `choices[0].delta.content`.

Text deltas are batched in ~50-char chunks (`CHAR_BATCH`) for smoother UI streaming. Thinking deltas accumulate separately and are surfaced via `StreamingState.thinking`. Network failures and `429/500/502/503` responses get up to 2 retries with 2s/5s backoff (honoring `Retry-After`). Aborts via `AbortSignal` throw `'Generation cancelled'`.

### Storage (`src/lib/storage.ts`)
All content persists in `localStorage` under the key `news13n_content` (5MB browser cap, `WARN_THRESHOLD = 0.8`). Reads are **schema-guarded** — items missing `id`/`markdown`/`createdAt` are silently dropped with a warning (intentional; corrupted items from prior schema changes should never crash the app). Writes that hit `QuotaExceededError` throw a typed `StorageFullError`. After every write, `notifyStorageChanged()` dispatches a window event so components like `StorageWarningBanner` can re-read usage.

### File parsing (`src/lib/parsers/`)
`parseFile(file)` is the entry point. It dispatches by extension: `pdf` → dynamic import of `pdfjs-dist`, `pptx` → dynamic import of `jszip`-based extractor, everything else → `FileReader.readAsText`. Dynamic imports keep PDF/PPTX libs out of the initial bundle. `next.config.js` aliases `canvas` and `pdftk` to `false` to keep `pdfjs-dist` happy in the Next bundler.

### App routes (`src/app/`)
- `/` (`page.tsx`) — generation form + streaming preview. Reads `?regenerate=<id>` to pre-fill from a saved item.
- `/content` — saved content library.
- `/content/[id]` — viewer/editor for a single item.
- `/settings` — theme, accent, font, prompt templates.
- `/api/minimax` — the only API route.

### Theming
`src/lib/theme-context.tsx` defines `Theme` (`light` | `dark` | `system`), 8 `ACCENT_PRESETS`, and 10 `FONT_OPTIONS`. To prevent FOUC, an inline script in `layout.tsx` reads `news13n_theme` / `news13n_accent` / `news13n_font` from `localStorage` and sets `<html>` classes + CSS vars **before** React hydrates. When adding accent presets or fonts, the inline script's `presets` / `fontMap` objects must be kept in sync with the corresponding TS constants.

## Conventions and gotchas

- **All AI work goes through `runPipeline` + `streamCompletion`.** Don't add new fetches to `/api/minimax` directly from components; use the pipeline so retries, abort, and progressive emission are consistent.
- **Refiner output is patches, not full documents.** When changing the refiner prompt or `mergeSectionPatches`, preserve the rule that only `### Section` blocks present in the patch get replaced — unchanged sections in the base must be kept. The fuzzy matcher (`headerCore`) is what allows section numbers to drift between Creator and Refiner outputs.
- **Assignment chunking is order-sensitive.** `getChunkConfig` numbers MSQs as `Q{mcq+1}..` and Subjectives as `Q{mcq+msq+1}..`. If you change the chunk set, also update `cleanAssignmentStitching` (which assumes one Coverage Plan and one `# Assignment:` title).
- **`localStorage` reads must tolerate corrupted entries** — see the `valid.filter(...)` in `getStorage()`. New required fields on `ContentItem` should be added to that filter or handled with sensible defaults.
- **Prompt files have spaces in their names** (e.g. `"lecture notes prompt.md"`); `loadPrompt` URL-encodes them. Don't rename without updating `PROMPT_FILES` in `pipeline.ts`.
- **Reviewer LGTM detection is intentionally lenient** (`isLGTM`) — short, non-critical replies skip the Refiner. If you tighten this, expect more refiner runs and longer total latency.
- **Rate limiter is in-memory** (`ipTimestamps` Map in `route.ts`) — resets on every server restart and won't work across multiple instances. Acceptable for this single-instance app; replace with Redis/KV if deploying multi-instance.
- **Mermaid diagrams** inject styles dynamically that override static CSS. After mermaid changes, verify actual computed values rather than trusting the stylesheet. Detailed design tokens live in `.claude/ui-state.md` — read it before making visual changes.
- **`changes.md` and `suggestions.md`** in the repo root are session logs from UI/UX work (motion, view transitions, parallax headers, frosted glass, etc.), not specs. Useful as context but don't treat them as the source of truth for current behavior — read the code.
- **`template.csv`** in the project root is the schema used by `src/lib/export/csv.ts` for assignment CSV export.

## Working style in this repo

- **Terse responses, no trailing summaries** — the diff speaks for itself.
- **Suggestion batches**: when asked for UI/UX improvements, features, or fixes, present a **numbered list of 5–7 items** with one-line descriptions and wait for explicit approval before implementing. Use parallel background agents for independent approved items.
- **Verify types before using them.** Don't reference TypeScript types, fields, or enum values without first confirming they exist. Run `npx tsc --noEmit` after edits.
- **Search broadly when fixing bugs.** Grep the whole codebase for the same pattern and fix every instance, not just the reported one.

## Custom skills (`.claude/skills/`)

- `/suggest` — generate and delegate improvement suggestions (suggest-approve-delegate workflow)
- `/bugfix` — codebase-wide bug fixing with verification
- `/ui-polish` — iterative UI refinement with design-system compliance
