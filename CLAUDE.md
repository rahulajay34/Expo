# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI-powered educational content authoring tool (lecture notes, pre-lecture notes, assignments with MCQ/MSQ/subjective questions). Built with Next.js 14 App Router, TypeScript, TailwindCSS, and Framer Motion. All content stored in browser localStorage (no backend database).

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm run start      # Start production server
npm run lint       # ESLint via next lint (no custom config, uses Next.js defaults)
```

No test framework is configured.

## Architecture

### Content Generation Pipeline (`src/lib/ai/`)

Multi-stage AI pipeline: **Creator** → **Reviewer** → **Refiner** (conditional). Streams responses from MiniMax API (`MiniMax-M2.7`) via `/api/minimax` proxy route with rate limiting (10 req/min, 100 req/hour). Assignments use parallel chunk generation for MCQs, MSQs, and subjective questions.

- `pipeline.ts` — orchestrates multi-stage generation with streaming and partial-save on failure
- `client.ts` — API streaming wrapper with retry logic (429, 5xx)
- `prompts.ts` — prompt templates for each pipeline stage
- `inlineEdit.ts` — inline AI editing within rendered content

### State Management

React Context only (no Redux/Zustand):
- `ThemeProvider` (`lib/theme-context.tsx`) — light/dark/system theme, 8 accent colors, 10 font families; persisted to localStorage
- `GenerationProvider` (`lib/generation-context.tsx`) — tracks generation status and dirty state for unsaved-work warnings
- `ToastProvider` — notification system

### Storage (`src/lib/storage.ts`)

localStorage-based CRUD under key `news13n_content`. 5MB browser limit with 80% warning threshold. Supports search, import/export, duplicate, bulk delete.

### Animation System

- `lib/motion.ts` — Framer Motion spring presets (springSnappy, springGentle, springBouncy, springTab) and reusable variants (fadeInUp, scaleIn, staggerContainer, etc.)
- `lib/stream-speed.ts` — `StreamSpeedTracker` maps token rate to animation duration for adaptive streaming text effects
- `lib/view-transitions.ts` — View Transitions API utilities with Framer Motion fallback

### Design System (CSS custom properties in `globals.css`)

Custom-built component library — no external UI library. Theming via 20+ CSS custom properties (colors, typography scale, accent presets). Frosted glass panels use `backdrop-filter: blur(16px)`. Components: Button, Card, Modal, Input, Badge, Toast, Select, Skeleton.

### File Parsing (`src/lib/parsers/`)

Supports PDF (pdfjs-dist), PPTX, and markdown/text as input sources for content generation.

### Export (`src/lib/export/`)

PDF (smart layout with section/code/table/Mermaid handling), CSV (assignment questions), HTML, Markdown.

## Key Conventions

- Path alias: `@/*` maps to `src/*`
- Server components by default; `'use client'` directive for interactive components
- PascalCase for components, camelCase for files/variables
- All component props have typed interfaces
- Mobile-first responsive design (md: breakpoint at 768px)
- Reduced motion support via `prefers-reduced-motion`

## Environment

`MINIMAX_API_KEY` must be set in `.env.local` for content generation to work.
