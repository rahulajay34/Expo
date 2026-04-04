# CLAUDE.md - S13N Content Platform

## Project Overview

**Name:** S13N (new-s13n) - Educational content generation platform
**Stack:** Next.js 14.2 (App Router), React 18.3, TypeScript 5.3, Tailwind CSS 3.4
**AI:** MiniMax M2.7 via SSE streaming proxy at `/api/minimax`
**Storage:** localStorage (no database, no test suite)
**Fonts:** Plus Jakarta Sans (body), JetBrains Mono (code)
**Animation:** Framer Motion + CSS keyframes

## Routes

| Route | Purpose |
|-------|---------|
| `/` | 4-step generation form (type -> topic -> upload -> options) |
| `/content` | Library (grid/list, search, filter, sort, pagination) |
| `/content/[id]` | Viewer/Editor (markdown preview, split editor, export) |
| `/settings` | Theme, storage, backup/restore |
| `/api/minimax` | SSE streaming proxy for MiniMax M2.7 |

## Key Directories

- `src/components/` - 20 feature components + 9 UI primitives in `ui/`
- `src/lib/ai/` - API client, inline editing, generation pipeline, prompts
- `src/lib/export/` - CSV, HTML, Markdown, PDF, mermaid-wait
- `src/lib/parsers/` - file, PDF, PPTX parsing
- `src/lib/` root - types, storage, theme context, generation context, utils

## Development Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npx tsc --noEmit     # Type check (no test suite exists)
```

## Design System

- **Light:** bg #FFFFFF, sidebar #F7F6F3, border #E8E8E8, accent #2383E2, text #37352F
- **Dark:** bg #1E1E1E, sidebar #252525, border #353535, accent #6BA3E8, text #E8E8E8
- **Radii:** 4px, 6px, 8px, 999px. **Shadows:** subtle (0 1px 2px rgba(0,0,0,0.05))
- **Typography:** display 48px/700 -> h1 36px -> h2 28px -> h3 22px -> body 16px -> caption 13px

## Interaction Style

- When asked for batches of suggestions (UI/UX improvements, features, fixes), present as a **numbered list of 5-7 items** with one-line descriptions. Wait for approval before implementing. Do NOT start implementing without explicit go-ahead.
- When approved items need implementation, use **parallel background agents** for independent tasks.
- Keep responses terse. No trailing summaries of what was done - the diff speaks for itself.

## Bug Fixing Rules

- **Search broadly first.** Before fixing a bug, grep the ENTIRE codebase for all instances of the same pattern. Fix ALL of them, not just the one mentioned.
- Never use types, fields, or enum values without first verifying they exist in the codebase.
- Always run `npx tsc --noEmit` after TypeScript edits to catch type errors immediately.

## UI/Styling Rules

- Mermaid diagrams use dynamically injected styles that override static CSS. After mermaid changes, verify actual computed values.
- This project has detailed design tokens in `.claude/ui-state.md` - read it before making visual changes.
- Provide concrete CSS values when making styling changes; do not guess at visual intent.

## Content Generation

- When generating CSV files from assignment markdown, read the template CSV first, then each assignment file fully. Do not pause to ask clarifying questions - just produce the CSVs.
- Template CSV is at `template.csv` in the project root.

## Custom Skills

The following skills are available in `.claude/skills/`:
- `/suggest` - Generate and delegate improvement suggestions (the suggest-approve-delegate workflow)
- `/bugfix` - Thorough codebase-wide bug fixing with verification
- `/ui-polish` - Iterative UI refinement with design system compliance
