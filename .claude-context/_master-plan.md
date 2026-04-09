# Master Plan — New-S13n Improvements

**Last updated:** Phase 2 complete — ready for Phase 3 execution.

---

## Codebase Architecture

- **Framework:** Next.js 14 (App Router), React 18, TypeScript 5
- **Styling:** Tailwind CSS 3.4 + CSS custom properties (light/dark mode via `.dark` class)
- **State:** React Context (`GenerationProvider`, `ThemeProvider`), localStorage for persistence
- **AI Pipeline:** Multi-stage (Creator -> Reviewer -> Refiner -> Validator -> CSV Converter), SSE streaming via `/api/minimax` proxy to MiniMax M2.7
- **Routing:** App Router — `/` (generate), `/content` (library), `/content/[id]` (viewer/editor), `/settings`
- **Fonts:** Plus Jakarta Sans via `next/font/google`, JetBrains Mono via CSS `@import`
- **Exports:** PDF, HTML, Markdown, CSV
- **Storage:** Browser localStorage (5MB limit), no database
- **Path alias:** `@/*` -> `./src/*`

### Key File Sizes (complexity indicators)
- `src/app/page.tsx` — ~37KB (generation page)
- `src/components/GenerationForm.tsx` — ~55KB
- `src/components/MarkdownPreview.tsx` — ~29KB
- `src/lib/ai/pipeline.ts` — ~800 lines (section parsing, patching, orchestration)
- `src/app/content/[id]/page.tsx` — ~800 lines (viewer/editor)
- `src/app/globals.css` — ~32KB (massive CSS)

### Project Tree (depth 3, excluding node_modules/.next/.git)
```
src/
  app/
    api/minimax/route.ts
    content/[id]/page.tsx, loading.tsx
    content/page.tsx, loading.tsx
    settings/page.tsx
    error.tsx, globals.css, layout.tsx, not-found.tsx, page.tsx
  components/
    ui/ (AnimatedSVG, Badge, Button, Card, Input, Modal, Select, Skeleton, Toast)
    AmbientLines, AssignmentViewer, ContentCard, ContentListItem, ContentReveal,
    CountUp, CustomSelect, ErrorBoundary, ExportMenu, FileUpload, GenerationForm,
    GenerationSkeleton, InlineAIPopover, KeyboardShortcutsModal, LiveContentMetrics,
    MarkdownEditor, MarkdownPreview, NotificationCentre, PageTransition, PhysicsScroll,
    PipelineTimeline, ReadingProgressBar, RouteProgressBar, Sidebar, StorageWarningBanner,
    TokenVelocityPulse
  lib/
    ai/ (client.ts, inlineEdit.ts, pipeline.ts, prompts.ts)
    export/ (csv.ts, html.ts, markdown.ts, mermaid-wait.ts, pdf.ts)
    parsers/ (file.ts, pdf.ts, pptx.ts)
    validation/ (mermaid.ts)
    generation-context.tsx, motion.ts, prompt-templates.ts, storage.ts,
    stream-speed.ts, theme-context.tsx, types.ts, utils.ts, view-transitions.ts
public/Prompts/ (6 prompt template .md files)
```

---

## Suggestion Registry (70 total)

| ID | Summary | Category |
|----|---------|----------|
| S-001 | Lazy-load mermaid, pdfjs, hljs, katex via dynamic imports | Perf-Frontend |
| S-002 | Defer pdfjs-dist until PDF actually uploaded | Perf-Frontend |
| S-003 | Turn on experimental.optimizePackageImports | Perf-Frontend |
| S-004 | Code-split content viewer into EditPanel/ExportPanel/RegenPanel | Perf-Frontend + CodeQuality |
| S-005 | Virtualize content library grid/list | Perf-Frontend |
| S-006 | Cache rehype/remark plugin instances across renders | Perf-Frontend |
| S-007 | Memoize ContentCard and ContentListItem | Perf-Frontend |
| S-008 | Debounce markdown editor preview render | Perf-Frontend |
| S-009 | Defer inline theme-init script out of critical path | Perf-Frontend |
| S-010 | Replace CSS @import JetBrains Mono with next/font/google | Perf-Frontend |
| S-011 | Stop preloading all nine settings fonts on every session | Perf-Frontend |
| S-012 | Drop runtime Google Fonts link, use next/font/google for all | Perf-Frontend |
| S-013 | Use font-display: optional for secondary fonts | Perf-Frontend |
| S-014 | Add content-visibility: auto to off-screen elements | Perf-Frontend |
| S-015 | Gate PhysicsScroll/parallax on cheap device check | Perf-Frontend |
| S-016 | Replace backdrop-filter: blur on dropdowns with solid surface | Perf-Frontend |
| S-017 | Promote only actively animating elements to own layer | Perf-Frontend |
| S-018 | Lazy-mount TokenVelocityPulse, CountUp, LiveContentMetrics | Perf-Frontend |
| S-019 | Conditionally drop rehype plugins not needed for current doc | Perf-Frontend |
| S-020 | Memoize mermaid module at module scope | Perf-Frontend |
| S-021 | Inline top 4 content-type illustrations as SVG sprite | Perf-Frontend |
| S-022 | Decouple AmbientLines from content-type switching | Perf-Frontend |
| S-023 | Prefetch /content/[id] on hover | Perf-Frontend |
| S-024 | Batch and defer localStorage reads in generation context | Perf-Frontend |
| S-025 | Move long markdown diff/section parsing off main thread | Perf-Frontend |
| S-026 | Break long streaming loops with scheduler.postTask | Perf-Frontend |
| S-027 | Add bundle analyzer and size budget in CI | Perf-Frontend |
| S-028 | Remove secondary @keyframes that run at rest | Perf-Frontend |
| S-029 | Add preconnect for Minimax and third parties | Perf-Network |
| S-030 | Add dns-prefetch for all third-party domains | Perf-Network |
| S-031 | Vendor PDF.js worker instead of CDN | Perf-Network |
| S-032 | Add Brotli/Gzip compression and cache headers | Perf-Network |
| S-033 | Preload top 2-3 Plus Jakarta font weights | Perf-Network |
| S-034 | Use fetchpriority="high" on above-the-fold hero | Perf-Network |
| S-035 | Add Speculation Rules / router.prefetch for navigations | Perf-Network |
| S-036 | Stop Google Fonts link injection after theme hydrates | Perf-Network |
| S-037 | Scrub upstream error messages before returning | Security |
| S-038 | Enforce tight rate-limit persistence across restarts | Security |
| S-039 | Redesign generation error state with typed recovery | UI/UX |
| S-040 | Add confirmation + 5s undo on destructive actions | UI/UX |
| S-041 | Show first-class empty state on content library | UI/UX |
| S-042 | Add skeleton shimmers for content library grid | UI/UX |
| S-043 | Persist library search/filter/sort/view to localStorage | UI/UX |
| S-044 | Show live generation stage in overlay on mobile | UI/UX |
| S-045 | Add inline field validation with visible errors | UI/UX |
| S-046 | Add visible Save/Unsaved state in content editor | UI/UX |
| S-047 | Add hover/Cmd-K copy button on code blocks | UI/UX |
| S-048 | Reorganize settings page into tabs | UI/UX |
| S-049 | Add tooltips to all icon-only toolbar buttons | UI/UX |
| S-050 | Add visual progress indicator to generation form steps | UI/UX |
| S-051 | Consolidate spacing tokens across forms | UI/UX |
| S-052 | Show richer file-processing progress on upload | UI/UX |
| S-053 | Add Vitest and first unit test for mermaid validator | Testing |
| S-054 | Unit-test SSE streaming parser | Testing |
| S-055 | Unit-test pipeline section parser | Testing |
| S-056 | Unit-test CSV assignment parser | Testing |
| S-057 | Unit-test storage layer | Testing |
| S-058 | Add Playwright smoke test for happy path | Testing |
| S-059 | Add tsc --noEmit and next lint to npm test | Testing |
| S-060 | Add Playwright visual regression pass | Testing |
| S-061 | Split pipeline.ts into focused modules | CodeQuality |
| S-062 | Split content/[id]/page.tsx into EditPanel/ExportPanel/RegenPanel | CodeQuality |
| S-063 | Split MarkdownPreview into sub-components | CodeQuality |
| S-064 | Introduce typed AppError hierarchy | CodeQuality |
| S-065 | Centralize magic numbers into config.ts | CodeQuality |
| S-066 | Replace any/as any casts with proper types | CodeQuality |
| S-067 | Consolidate question-classification heuristics in CSV exporter | CodeQuality |
| S-068 | Extract rehypeWrapLines into reusable plugin module | CodeQuality |
| S-069 | Add explicit timeouts on streaming | Reliability |
| S-070 | Exponential backoff with jitter on retries | Reliability |
| S-071 | Graceful partial-parse fallback for PDFs | Reliability |
| S-072 | Mermaid render failure falls back to raw code block | Reliability |
| S-073 | Circuit-break after N consecutive upstream failures | Reliability |
| S-074 | Surface storage-full errors with clear action | Reliability |
| S-075 | Chunk very large PDFs by page with memory check | Reliability |
| S-076 | Detect and warn on unclosed streaming on navigation | Reliability |
| S-077 | Write a real README | DX |
| S-078 | Add .env.example | DX |
| S-079 | Add ESLint + Prettier configs and lint/format scripts | DX |
| S-080 | Add husky + lint-staged pre-commit hook | DX |
| S-081 | Add ARCHITECTURE.md | DX |
| S-082 | Add typecheck script and wire to CI | DX |
| S-083 | Ship service worker with precache + stale-while-revalidate | PWA |
| S-084 | Add "offline" UI state | PWA |
| S-085 | Enable offline edits against cached content | PWA |
| S-086 | Honor env(safe-area-inset-*) for sidebar/nav/overlays | Mobile |
| S-087 | Use 100dvh instead of 100vh | Mobile |
| S-088 | Apply touch-action: manipulation globally | Mobile |
| S-089 | Make mermaid diagrams responsive | Mobile |
| S-090 | Collapse sidebar on tablet breakpoints | Mobile |
| S-091 | Raise all touch targets to 44x44 on touch devices | Mobile |
| S-092 | Ensure modals/popovers stay inside viewport on small screens | Mobile |
| S-093 | Document AI pipeline stages and prompt contracts | Docs |
| S-094 | Document prompt template files and usage | Docs |
| S-095 | Add explicit "stop generating" button | AI/ML |
| S-096 | Build lightweight full-text search index for library | Search |
| S-097 | Add recent searches and autocomplete | Search |
| S-098 | Migrate navigation animations to View Transitions API | Emerging |
| S-099 | Use File System Access API for export | Emerging |
| S-100 | Add Speculation Rules for prerendering | Emerging |
| S-101 | Probe OPFS for large file storage | Emerging |
| S-102 | Adopt CSS Anchor Positioning for popovers | Emerging |

---

## Category Summary

| Category | Count | Suggestions |
|----------|-------|-------------|
| Perf-Frontend | 28 | S-001 through S-028 |
| Perf-Network | 8 | S-029 through S-036 |
| Security | 2 | S-037, S-038 |
| UI/UX | 14 | S-039 through S-052 |
| Testing | 8 | S-053 through S-060 |
| Code Quality | 8 | S-061 through S-068 |
| Reliability | 8 | S-069 through S-076 |
| DX | 6 | S-077 through S-082 |
| PWA & Offline | 3 | S-083 through S-085 |
| Mobile | 7 | S-086 through S-092 |
| Documentation | 2 | S-093, S-094 |
| AI/ML | 1 | S-095 |
| Search | 2 | S-096, S-097 |
| Emerging | 5 | S-098 through S-102 |

**Total: 102 suggestions**

---

## Proposed Execution Order

1. **Code Quality & Architecture** (S-061..S-068) — Foundation: split large files, create shared types/config. Everything else benefits from cleaner modules.
2. **DX** (S-077..S-082) — Setup testing/linting infrastructure so we can verify as we go.
3. **Testing** (S-053..S-060) — Write tests against newly-split modules; establish safety net.
4. **Security** (S-037, S-038) — Small, critical, low-risk.
5. **Reliability** (S-069..S-076) — Error handling and resilience improvements.
6. **Performance - Frontend** (S-001..S-028) — Largest category; depends on clean modules.
7. **Performance - Network** (S-029..S-036) — Mostly config/layout changes.
8. **UI/UX** (S-039..S-052) — Feature additions and UX polish.
9. **Mobile** (S-086..S-092) — CSS and responsive adjustments.
10. **AI/ML** (S-095) — Stop button, depends on reliability work.
11. **Search** (S-096, S-097) — New feature, low coupling.
12. **PWA & Offline** (S-083..S-085) — New feature, additive.
13. **Documentation** (S-093, S-094) — Written last when everything is final.
14. **Emerging** (S-098..S-102) — Experimental/progressive enhancement, lowest priority.

---

## Skipped Suggestions (per Rahul's decision)

S-027, S-038, S-083, S-084, S-085, S-098, S-099, S-100, S-101, S-102 (10 total)
- S-038: Redis rate limiting — external dependency
- S-027: Bundle analyzer CI budget — no CI exists
- S-083..S-085: PWA/Service Worker — risk of stale caching
- S-098..S-102: Emerging APIs — experimental, low priority

**Active suggestions: 92**

---

## Wave Execution Plan (25 agents)

### Wave 1 — Foundational (no dependencies, can run in parallel)
| Agent | Name | Suggestions | Files Created |
|-------|------|-------------|---------------|
| 01 | Errors + Config | S-064, S-065 | errors.ts, config.ts |
| 04 | Split MarkdownPreview | S-063, S-068 | MermaidChart.tsx, rehype/*.ts |
| 06 | DX Setup | S-077..S-082 | README, .env.example, eslint, prettier, ARCHITECTURE |
| 14 | Font Optimization | S-010..S-013, S-036 | (modifies layout, theme-context, globals.css) |

### Wave 2 — Depends on Wave 1
| Agent | Name | Depends On |
|-------|------|-----------|
| 02 | Split Pipeline | 01 |
| 03 | Split Content Viewer | 01 |
| 09 | Security: Scrub Errors | 01 |
| 10 | Reliability: Timeouts/Backoff/Circuit | 01 |

### Wave 3 — Depends on Waves 1+2
| Agent | Name | Depends On |
|-------|------|-----------|
| 05 | Type Fixes + CSV | 01, 02 |
| 07 | Vitest + Unit Tests | 01, 02 |
| 11 | Reliability UI | 01 |
| 12 | Lazy Imports + Package Opt | 04 |
| 13 | Render Optimization | 04 |

### Wave 4 — Depends on Waves 1-3
| Agent | Name | Depends On |
|-------|------|-----------|
| 08 | Playwright E2E | 06 |
| 15 | CSS/GPU Optimizations | — |
| 16 | Prefetch + localStorage | — |
| 17 | Streaming + Theme Script | 02, 14 |
| 18 | Network Optimizations | 14 |
| 19 | UI/UX Errors + Delete + Empty | 01 |

### Wave 5 — Depends on Waves 1-4
| Agent | Name | Depends On |
|-------|------|-----------|
| 20 | Form Validation + Steps | — |
| 21 | Viewer + Settings Tabs | 03, 04 |
| 22 | Mobile Gen Stage + Stop | 10 |
| 23 | Mobile Optimizations | — |
| 24 | Search Index | — |
| 25 | Documentation | 02 |

---

## Phase Status

| Phase | Status |
|-------|--------|
| Phase 0 — Context Infrastructure | DONE |
| Phase 1.1 — Read ALL suggestions | DONE |
| Phase 1.2 — Understand codebase | DONE |
| Phase 1.3 — Categorize suggestions | DONE |
| Phase 1.4 — Conflict & Duplication Detection | DONE |
| Phase 1.5 — Present plan for approval | DONE — APPROVED |
| Phase 2.1 — Agent task specs | DONE (25 agents) |
| Phase 2.2 — Dependency graph & waves | DONE (5 waves) |
| Phase 2.3 — Pre-flight checks | DONE |
| Phase 3 — Execution | STARTING |
| Phase 4 — Verification | NOT_STARTED |
| Phase 5 — Final Report | NOT_STARTED |
