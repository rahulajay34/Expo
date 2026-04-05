# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server on localhost:3000
npm run build    # Production build
npm run lint     # Next.js ESLint
```

No test framework is configured.

## Architecture

Next.js 14 App Router project (React 18, TypeScript strict mode, Tailwind CSS 3). Educational content authoring platform that generates lecture notes, pre-lecture notes, and assignments via Minimax AI API.

### Path alias

`@/*` maps to `src/*` (configured in tsconfig.json).

### Routes

- `/` — Generation form + live streaming preview
- `/content` — Content library (grid/list with search, filter, sort, pagination)
- `/content/[id]` — Single content detail/edit view
- `/settings` — Theme, accent color, font, storage, prompt templates
- `POST /api/minimax` — Streaming proxy to Minimax API (rate-limited: 10/min, 100/hr per IP)

### AI Pipeline (`src/lib/ai/pipeline.ts`)

Multi-stage generation orchestrated by `runPipeline()`:
1. **Creator** — generates initial content from prompt
2. **Reviewer** — evaluates quality and identifies issues
3. **Refiner** — patches specific `###`-delimited sections using fuzzy header matching
4. **CSV Converter** — extracts questions into CSV format (assignments only)

Content is streamed via `ReadableStream` through the API route. Sections are parsed by `###` headers and patched individually by the refiner (fuzzy matching strips numbering prefixes for comparison).

### Context Providers (wrap app in `layout.tsx`)

- **ThemeProvider** (`src/lib/theme-context.tsx`) — manages theme (light/dark/system), accent color (8 presets), and font family (10 options). Persisted to localStorage keys `news13n_theme`, `news13n_accent`, `news13n_font`. An inline `<script>` in layout.tsx applies the theme before hydration to prevent flash.
- **GenerationProvider** (`src/lib/generation-context.tsx`) — tracks generation state, token velocity (via `StreamSpeedTracker`), and velocity bands (fast/normal/slow/stalled) that drive adaptive UI animations.
- **ToastProvider** (`src/components/ui/Toast.tsx`) — notification system.

### Data Storage

All data is client-side in localStorage under key `news13n_content` (5MB browser limit). CRUD operations in `src/lib/storage.ts`. Core type is `ContentItem` defined in `src/lib/types.ts`.

### Styling

Tailwind with CSS custom properties for dynamic theming (defined in `src/app/globals.css`). Key variables: `--background`, `--accent`, `--accent-rgb`, `--text-primary`, `--card-bg`, `--font-custom`. Dark mode uses `class` strategy. Animations use Framer Motion spring presets from `src/lib/motion.ts`. Respects `prefers-reduced-motion`.

### Markdown Rendering

`react-markdown` with plugins: `remark-gfm`, `remark-math`, `rehype-raw`, `rehype-sanitize`, `rehype-highlight` (highlight.js), `rehype-katex`. Custom styles for markdown elements are in `globals.css`.

### Export (`src/lib/export/`)

PDF (via html2pdf.js with mermaid/katex pre-rendering), HTML, Markdown, CSV.

### File Parsing (`src/lib/parsers/`)

Uploads supported: PDF (pdfjs-dist), PPTX (jszip + XML parsing), TXT/MD.

## Environment

Requires `MINIMAX_API_KEY` in `.env.local`. Other optional keys: `OPENAI_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`.

## Webpack

`canvas` and `pdftk` are aliased to `false` in `next.config.js` (shims for pdfjs-dist server-side).
