# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

New-S13n is an AI-powered educational content authoring tool built with Next.js 14 (Pages Router via App Router). Educators upload source material (PDF, PPTX, Markdown) and generate lecture notes, pre-lecture notes, assignments, and TA session guides using a multi-stage AI pipeline. Content is stored in browser localStorage and can be exported as Markdown, PDF, HTML, or CSV.

## Environment

Requires `MINIMAX_API_KEY` in `.env.local` (see `.env.example`).

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint via next lint
npm run lint:fix     # Auto-fix lint errors
npm run typecheck    # tsc --noEmit
npm run format       # Prettier over src/**/*.{ts,tsx,css}
npm run check        # typecheck + lint + test (CI gate)
npm run test         # vitest run (unit tests)
npm run test:watch   # vitest in watch mode
npm run test:e2e     # Playwright e2e tests
npm run test:e2e:ui  # Playwright with UI
```

Unit test files colocate with source: `*.test.ts` in `src/lib/`.

## Architecture

### AI Pipeline (`src/lib/ai/pipeline.ts`)

Content generation uses a multi-stage pipeline: **Creator -> Reviewer -> Refiner -> Validator** (+ CSV Converter for assignments). The pipeline streams SSE responses from a single API route (`/api/minimax`) that proxies to the MiniMax M2.7 model.

- **Assignments are chunked**: MCQs, MSQs, and Subjective questions are generated in parallel by separate API calls, then stitched together with deduplication logic (`cleanAssignmentStitching`).
- **Review/refine loop**: The reviewer checks generated content; if issues are found (not LGTM), the refiner applies section-level patches (`mergeSectionPatches`) or question-level patches (`mergeQuestionPatches`) rather than regenerating from scratch.
- **Mermaid validation**: A post-pipeline validator checks mermaid diagram blocks and auto-fixes failures.

### Prompt System (`public/Prompts/`)

Prompt templates live as `.md` files in `public/Prompts/` and are fetched at runtime via `loadPrompt()`. Variables use `{{VARIABLE}}` syntax filled by `fillPrompt()`. There's also a user-facing custom prompt template system in `src/lib/prompt-templates.ts` stored in localStorage.

### Key Files & Directories

- `src/app/page.tsx` — Main generation page (form + streaming preview)
- `src/app/content/[id]/page.tsx` — Content viewer/editor with inline AI editing
- `src/app/settings/page.tsx` — Theme, font, accent color, prompt template management
- `src/lib/ai/client.ts` — SSE streaming client with retry logic; handles both OpenAI and Anthropic SSE formats
- `src/lib/ai/inlineEdit.ts` — Inline selection editing (improve/expand/simplify/examples/custom) with context-aware prompts
- `src/lib/parsers/` — File extraction: PDF (pdfjs-dist, chunked), PPTX (JSZip), Markdown/text
- `src/lib/storage.ts` — localStorage CRUD with 5MB limit, import/export, schema guards
- `src/lib/export/` — Export to PDF, CSV, HTML, Markdown, Mermaid rendering
- `src/lib/config.ts` — All magic numbers (rate limits, timeouts, retry delays, storage thresholds) in one place
- `src/components/ui/` — Shared primitives (Button, Card, Modal, Toast, etc.)

### Styling

Tailwind CSS with CSS custom properties for theming (light/dark mode via `.dark` class). Design tokens defined in `src/app/globals.css`. The theme system supports custom accent colors and fonts at runtime via `src/lib/theme-context.tsx`.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Content Types

Four content types: `lecture`, `pre-lecture`, `assignment`, `ta-guide`. Each has its own prompt template in `public/Prompts/`. The `ContentItem` type in `src/lib/types.ts` is the core data model.

### API Route (`/api/minimax`)

The single server-side route proxies to MiniMax M2.7 with:
- In-memory sliding-window rate limiting (10 req/min, 100 req/hour per IP)
- Circuit breaker (5 failures in 30s window)
- `maxDuration = 300` (Vercel streaming timeout)

All content storage is localStorage-based. There is no database.
