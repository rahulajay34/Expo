# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

New-S13n is an AI-powered educational content authoring tool built with Next.js 14 (Pages Router via App Router). Educators upload source material (PDF, PPTX, Markdown) and generate lecture notes, pre-lecture notes, assignments, and TA session guides using a multi-stage AI pipeline. Content is stored in browser localStorage and can be exported as Markdown, PDF, HTML, or CSV.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint via next lint
```

No test framework is configured.

## Architecture

### AI Pipeline (`src/lib/ai/pipeline.ts`)

Content generation uses a multi-stage pipeline: **Creator -> Reviewer -> Refiner -> Validator** (+ CSV Converter for assignments). The pipeline streams SSE responses from a single API route (`/api/minimax`) that proxies to the MiniMax M2.7 model.

- **Assignments are chunked**: MCQs, MSQs, and Subjective questions are generated in parallel by separate API calls, then stitched together with deduplication logic (`cleanAssignmentStitching`).
- **Review/refine loop**: The reviewer checks generated content; if issues are found (not LGTM), the refiner applies section-level patches (`mergeSectionPatches`) or question-level patches (`mergeQuestionPatches`) rather than regenerating from scratch.
- **Mermaid validation**: A post-pipeline validator checks mermaid diagram blocks and auto-fixes failures.

### Prompt System (`public/Prompts/`)

Prompt templates live as `.md` files in `public/Prompts/` and are fetched at runtime via `loadPrompt()`. Variables use `{{VARIABLE}}` syntax filled by `fillPrompt()`. There's also a user-facing custom prompt template system in `src/lib/prompt-templates.ts` stored in localStorage.

### Key Directories

- `src/app/page.tsx` — Main generation page (form + streaming preview)
- `src/app/content/[id]/page.tsx` — Content viewer/editor with inline AI editing
- `src/app/settings/page.tsx` — Theme, font, accent color, prompt template management
- `src/lib/ai/client.ts` — SSE streaming client with retry logic; handles both OpenAI and Anthropic SSE formats
- `src/lib/storage.ts` — localStorage CRUD with 5MB limit, import/export, schema guards
- `src/lib/export/` — Export to PDF, CSV, HTML, Markdown, Mermaid rendering
- `src/components/ui/` — Shared primitives (Button, Card, Modal, Toast, etc.)

### Styling

Tailwind CSS with CSS custom properties for theming (light/dark mode via `.dark` class). Design tokens defined in `src/app/globals.css`. The theme system supports custom accent colors and fonts at runtime via `src/lib/theme-context.tsx`.

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### Content Types

Four content types: `lecture`, `pre-lecture`, `assignment`, `ta-guide`. Each has its own prompt template in `public/Prompts/`. The `ContentItem` type in `src/lib/types.ts` is the core data model.

### Client-Side Only

All content storage is localStorage-based. The only server component is the `/api/minimax` route that proxies AI requests. There is no database.
