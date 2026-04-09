# New-S13n

AI-powered educational content authoring tool. Educators upload source material (PDF, PPTX, Markdown) and generate structured learning content through a multi-stage AI pipeline.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS with CSS custom properties for theming
- **AI Provider:** MiniMax M2.7 (single provider, SSE streaming)
- **Storage:** Browser localStorage (no database)
- **Rendering:** react-markdown, KaTeX (math), Mermaid (diagrams), highlight.js (code)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env and add your MiniMax API key
cp .env.example .env.local

# 3. Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint (via next lint) |
| `npm run lint:fix` | ESLint with auto-fix |
| `npm run typecheck` | TypeScript type checking (`tsc --noEmit`) |
| `npm run format` | Prettier formatting |
| `npm run check` | Run typecheck + lint |
| `npm run test` | Alias for check (no test framework yet) |

## Content Types

| Type | Description |
|------|-------------|
| `lecture` | Full lecture notes from source material |
| `pre-lecture` | Condensed pre-lecture reading |
| `assignment` | MCQ, MSQ, and subjective questions |
| `ta-guide` | Teaching assistant session guides |

## AI Pipeline

Content flows through a multi-stage pipeline:

```
Source Material
    |
    v
 Creator      — generates initial content
    |
    v
 Reviewer     — checks quality, returns LGTM or issues
    |
    v
 Refiner      — applies section/question patches (not full regen)
    |
    v
 Validator    — validates mermaid diagrams, auto-fixes failures
    |
    v
CSV Converter — (assignments only) converts to CSV format
```

Assignments are chunked: MCQs, MSQs, and Subjective questions run as parallel API calls, then are stitched together with deduplication.

## Key Directories

```
src/
  app/
    page.tsx                  — Main generation page (form + streaming preview)
    content/[id]/page.tsx     — Content viewer/editor with inline AI editing
    settings/page.tsx         — Theme, font, accent color, prompt templates
    api/minimax/              — API route proxying to MiniMax M2.7
  lib/
    ai/pipeline.ts            — Multi-stage pipeline orchestration
    ai/client.ts              — SSE streaming client with retry logic
    ai/prompts.ts             — Prompt loading and variable filling
    storage.ts                — localStorage CRUD (5MB limit, import/export)
    export/                   — PDF, CSV, HTML, Markdown export
    types.ts                  — Core data types (ContentItem, etc.)
  components/ui/              — Shared primitives (Button, Card, Modal, Toast)
public/
  Prompts/                    — Prompt template .md files (fetched at runtime)
```

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for a detailed pipeline diagram and data flow narrative.

## Environment Variables

See [.env.example](./.env.example). Only `MINIMAX_API_KEY` is required.
