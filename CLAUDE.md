# CLAUDE.md — Master Context File

## What This Project Is
GCCP (Generated Course Content Platform) is a local-first Next.js web application for educators and course creators. It generates curriculum-ready educational materials (Lecture Notes, Pre-Reads, Assignments) using a 7-agent AI pipeline powered by Google Gemini. Also includes SheetForge, an embedded Excel grade tracker generator. No login required — everything stored in browser IndexedDB.

## Key Context Files
- /documentation.md — Original app specification
- /checkpoints/MASTER_CHECKPOINT.md — Current build state (95% complete)
- /checkpoints/CONTEXT_HANDOFF.md — Resume instructions
- /checkpoints/DECISIONS_LOG.md — Architectural decisions
- /architecture/SYSTEM_ARCHITECTURE.md — System architecture
- /design/PAGE_MAP.md — Routes and pages

## Tech Stack
- **Framework**: Next.js 16.1.6 (App Router + Turbopack)
- **Language**: TypeScript 5.9.3 (strict mode)
- **Runtime**: Node.js 25.6.0
- **Styling**: Tailwind CSS 4.2.1 + shadcn/ui (50+ components)
- **Animations**: Framer Motion 12.35
- **State**: Zustand 5.0.11
- **Storage**: Dexie.js 4.3.0 (IndexedDB)
- **AI**: @google/generative-ai 0.24.1 (Gemini 2.5 Flash)
- **Forms**: React Hook Form 7.71 + Zod 4.3
- **Tables**: TanStack Table 8.21
- **Excel**: ExcelJS 4.4
- **Icons**: Lucide React 0.577
- **Package Manager**: pnpm 10.30.3

## Build Status
- `pnpm build`: PASSES (zero errors)
- `tsc --noEmit`: PASSES (zero errors)
- `pnpm lint`: 1 warning (TanStack Table upstream)
- ~150+ source files, ~25,000+ lines of code (after feature additions)

## Current Phase: Feature Enhancement Complete
- **36 features implemented** across 3 sessions (questionnaire stopped at Q72)
- Full progress tracking: see memory/session-progress.md in Claude's memory

## Features Added (36 total):
- Session 1 (Q1-Q42): 28 features — copy buttons, retry logic, skeletons, rate limiting, error UI, prompt overhaul, cost panel, human-in-the-loop, dark mode, PDF export, streaming, nav bar, notifications, pagination, confirmations, tooltips, auto-save, model selector, accent themes, particles, quality score, question editing, answer toggle, SheetForge, TOC, KaTeX, Mermaid
- Session 2 (incomplete features): 5 features — micro-animations, transcript enhancements, focus mode, language selection, content length control
- Session 3 (Q43-Q72): 3 features via background agents — content tagging (Q52), image embedding (Q57), batch generation (Q61)

## Bug Fixes (2026-03-08):
- Fixed hydration error: `<figure>/<figcaption>` inside `<p>` in markdown-preview.tsx (custom `p` component renders as `<div>` when containing images)

## How to Resume If Context Is Lost
Read this file first. Then check Claude's memory at ~/.claude/projects/-Users-rahul-Desktop-New-APP/memory/session-progress.md for detailed feature status. Then /checkpoints/CONTEXT_HANDOFF.md.

## Commands:
- Dev server: `pnpm dev`
- Build: `pnpm build`
- Lint: `pnpm lint`
- Type check: `npx tsc --noEmit`
