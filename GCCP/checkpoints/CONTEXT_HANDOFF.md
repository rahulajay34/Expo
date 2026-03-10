# Context Handoff — Read This to Resume

## Project Summary
GCCP (Generated Course Content Platform) is a fully built Next.js 16 web application for educators. It uses a 7-agent AI pipeline powered by Google Gemini to generate Lecture Notes, Pre-Reads, and Assignments. The app is local-first with IndexedDB storage (no login, no cloud DB). Also includes SheetForge sub-tool for generating Excel grade trackers.

The full spec is in `/documentation.md`. The project uses Next.js 16.1.6, TypeScript 5.9.3, Tailwind CSS v4, shadcn/ui (all 50+ components), Framer Motion, Zustand, Dexie.js, and Google Generative AI SDK.

## Current State (2026-03-06)
**The application is 95% complete.** All pages, components, features, and API routes are implemented. The production build passes with zero errors. The API key has been configured in `.env.local`.

### Build Status:
- `pnpm build` — PASSES (zero errors, 8 routes)
- `npx tsc --noEmit` — PASSES (zero errors)
- `pnpm lint` — 1 warning (TanStack Table upstream issue, not fixable)

### Stats:
- 116 source files
- 85 components
- 17,814 lines of TypeScript/TSX
- 5 pages + 2 API routes

## All Pages Built:
| Route | Status | Description |
|-------|--------|-------------|
| `/` | DONE | Landing page — hero, content modes cards, agent timeline, testimonials, CTA |
| `/editor` | DONE | Main workspace — input zone, content type tabs, toolbar (transcript, export, generate), pipeline stepper (7 agents with live timers), gap analysis panel, split markdown editor/preview (with react-markdown, syntax highlighting, KaTeX), assignment workspace (table + card view) |
| `/archives` | DONE | Library — 3 stat cards, debounced search, filter tabs, generation cards with open/delete, empty states |
| `/settings` | DONE | Storage section (clear data), API config (health check), About section |
| `/sheetforge` | DONE | 4-tab config (Program, Modules, Grading, Extras), floating action bar, ExcelJS .xlsx generation with 3 sheets |
| `/api/generate` | DONE | POST endpoint, SSE streaming, runs 7-agent pipeline, AbortController support |
| `/api/health` | DONE | GET endpoint, checks GEMINI_API_KEY configuration |

## File Map (Key Files):

### App Pages
- `src/app/page.tsx` — Landing page (server component composing sections)
- `src/app/editor/page.tsx` — Editor page wrapper
- `src/app/archives/page.tsx` — Archives page wrapper
- `src/app/settings/page.tsx` — Settings page wrapper
- `src/app/sheetforge/page.tsx` — SheetForge page wrapper
- `src/app/layout.tsx` — Root layout (Inter font, Providers, Sidebar, MainContent)
- `src/app/not-found.tsx` — Custom 404
- `src/app/error.tsx` — Global error boundary

### Core Infrastructure
- `src/lib/types/index.ts` — All TypeScript types (ContentType, AgentName, GenerationRecord, etc.)
- `src/lib/constants/index.ts` — All constants (agent colors, icons, pipeline order, pricing)
- `src/lib/store/index.ts` — Zustand store (useAppStore) with all state and actions
- `src/lib/storage/db.ts` — Dexie IndexedDB (StoredGeneration, CRUD ops, 50-record limit)
- `src/lib/hooks/use-generations.ts` — Hook for reading/managing generations
- `src/lib/hooks/use-pipeline.ts` — Hook for running generation pipeline (SSE client)
- `src/lib/utils/index.ts` — Utilities (formatCost, downloadFile, questionsToCSV, etc.)
- `src/lib/validators/index.ts` — Zod schemas for generation config and SheetForge

### AI Pipeline
- `src/lib/ai/gemini.ts` — Gemini client singleton
- `src/lib/ai/prompts.ts` — All 7 agent prompts (~790 lines, very detailed)
- `src/lib/ai/pipeline.ts` — Pipeline orchestrator (~737 lines, SSE events, cost tracking, abort)
- `src/lib/ai/cache.ts` — In-memory cache with 30-min TTL
- `src/app/api/generate/route.ts` — SSE streaming API route

### Layout Components
- `src/components/layout/sidebar.tsx` — Collapsible sidebar (240px/64px), nav, theme toggle
- `src/components/layout/navbar.tsx` — Top bar (mobile), status indicator, cost display
- `src/components/layout/mobile-sidebar-content.tsx` — Mobile nav drawer
- `src/components/layout/main-content.tsx` — Content wrapper with dynamic margin
- `src/components/providers.tsx` — ThemeProvider + TooltipProvider + Toaster

### Editor Components
- `src/components/features/editor/editor-workspace.tsx` — Main orchestrator
- `src/components/features/editor/input-zone.tsx` — Topic + subtopics inputs
- `src/components/features/editor/content-tabs.tsx` — Lecture/Pre-Read/Assignment tabs
- `src/components/features/editor/toolbar.tsx` — Transcript, export, generate buttons
- `src/components/features/editor/content-area.tsx` — Split pane (editor/preview) or assignment
- `src/components/features/editor/markdown-editor.tsx` — Raw markdown editor with line numbers
- `src/components/features/editor/markdown-preview.tsx` — Rendered preview (react-markdown)
- `src/components/features/editor/assignment-workspace.tsx` — Table + card view for questions
- `src/components/features/editor/gap-analysis-panel.tsx` — Transcript coverage + quality
- `src/components/features/editor/error-banner.tsx` — Error/mismatch display
- `src/components/features/pipeline/pipeline-stepper.tsx` — 7-agent progress tracker

### Landing Page Components
- `src/components/features/landing/hero.tsx` — Hero with gradient background, floating icons
- `src/components/features/landing/content-modes.tsx` — 3 content type cards
- `src/components/features/landing/how-it-works.tsx` — Features + agent timeline + testimonials
- `src/components/features/landing/cta-footer.tsx` — Final CTA section

### Archives & Settings
- `src/components/features/archives/archives-content.tsx` — Full library UI
- `src/components/features/settings/settings-content.tsx` — 3-section settings

### SheetForge
- `src/components/features/sheetforge/sheetforge-workspace.tsx` — Main 4-tab workspace
- `src/components/features/sheetforge/program-tab.tsx` — Program config form
- `src/components/features/sheetforge/modules-tab.tsx` — Dynamic modules with weightage bar
- `src/components/features/sheetforge/grading-tab.tsx` — Grade bands table
- `src/components/features/sheetforge/extras-tab.tsx` — Extrapolation + config preview
- `src/components/features/sheetforge/floating-action-bar.tsx` — Status + download button
- `src/lib/sheetforge/excel-generator.ts` — ExcelJS workbook generation (774 lines)
- `src/lib/sheetforge/store.ts` — Zustand store for SheetForge config

### Design System
- `src/app/globals.css` — Tailwind v4 + oklch colors + custom utilities + animations
- `src/config/site.ts` — Site metadata
- `src/config/navigation.ts` — Nav items

## Critical Decisions Already Made
1. Next.js 16 App Router — needed for server-side API routes (Gemini key security)
2. Tailwind CSS v4 with oklch color system — indigo/violet primary palette
3. shadcn/ui "new-york" style — all components installed
4. Zustand 5 for client state — single useAppStore + separate useSheetForgeStore
5. Dexie.js for IndexedDB — max 50 generations with auto-prune
6. Google Gemini 2.5 Flash as default model — cost-efficient
7. SSE streaming via ReadableStream — not WebSockets
8. Framer Motion ease arrays need `as const` for TypeScript compatibility
9. `useSyncExternalStore` for hydration guards (not useState+useEffect)
10. pnpm as package manager

## Exact Next Steps
1. **Test the app end-to-end** — Start `pnpm dev`, try generating content with the configured API key
2. **Fix any runtime issues** — Check browser console for errors
3. **Visual polish** — Test all pages on mobile/tablet/desktop, check dark mode
4. **Test SheetForge** — Configure modules and download an Excel file
5. **Test exports** — Markdown download, CSV export for assignments
6. **Write tests** — Unit tests with Vitest, E2E tests with Playwright (not yet set up)
7. **Performance optimization** — Lighthouse audit, image optimization
8. **Deploy** — Vercel deployment

## Commands to Get Running
```bash
cd "/Users/rahul/Desktop/New APP"
pnpm dev          # Start dev server at http://localhost:3000
pnpm build        # Production build (zero errors)
pnpm lint         # Lint (1 warning)
npx tsc --noEmit  # Type check (zero errors)
```

## Package.json Key Dependencies
```
next@16.1.6, react@19.2.3, typescript@5.9.3, tailwindcss@4.2.1
zustand@5.0.11, dexie@4.3.0, @google/generative-ai@0.24.1
framer-motion@12.35.0, @tanstack/react-table@8.21.3
react-hook-form@7.71.2, zod@4.3.6, exceljs@4.4.0
lucide-react@0.577.0, recharts@2.15.4, sonner@2.0.7
react-markdown@10.1.0, react-syntax-highlighter@16.1.1
date-fns@4.1.0, cmdk@1.1.1, vaul@1.1.2, next-themes@0.4.6
```
