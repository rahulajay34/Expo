# Changelog

All application file modifications are logged here.

| Timestamp | File | What Changed | Why | Agent |
|-----------|------|-------------|-----|-------|
| (no changes yet — Phase 1 is read-only) | | | | |
| 2026-04-10 | `src/app/globals.css` | Added `.glass-panel-solid` variant (no backdrop-filter) for dropdown/panel use; added `.cv-auto` utility class; added `.markdown-body > *:nth-child(n+3)` rule for content-visibility: auto on off-screen markdown sections | S-014, S-016 | Agent-15 |
| 2026-04-10 | `src/components/ContentCard.tsx` | Added `cv-auto` class to outer wrapper div for content-visibility: auto | S-014 | Agent-15 |
| 2026-04-10 | `src/components/PipelineTimeline.tsx` | Added `cv-auto` class to root motion.div for content-visibility: auto | S-014 | Agent-15 |
| 2026-04-10 | `src/components/PhysicsScroll.tsx` | Replaced isMobile/MOBILE_FACTOR halving with matchMedia('(max-width: 768px)') full disable — parallax returns static 0 on mobile; removed unused MOBILE_FACTOR constant | S-015 | Agent-15 |
| 2026-04-10 | `src/components/ExportMenu.tsx` | Changed dropdown from `glass-panel` to `glass-panel-solid` (no backdrop-filter) | S-016 | Agent-15 |
| 2026-04-10 | `src/components/NotificationCentre.tsx` | Changed slide-in panel from `glass-panel` to `glass-panel-solid` (no backdrop-filter) | S-016 | Agent-15 |
| 2026-04-10 | `README.md` | Created | Project README with purpose, tech stack, setup, scripts, architecture summary | Agent-06 |
| 2026-04-10 | `.env.example` | Created | Environment variable template with MINIMAX_API_KEY | Agent-06 |
| 2026-04-10 | `.eslintrc.json` | Created | ESLint config extending next/core-web-vitals | Agent-06 |
| 2026-04-10 | `.prettierrc.json` | Created | Prettier config (singleQuote, trailingComma, printWidth 100) | Agent-06 |
| 2026-04-10 | `ARCHITECTURE.md` | Created | Pipeline diagrams, data flow narrative, system overview | Agent-06 |
| 2026-04-10 | `package.json` | Modified | Added typecheck, lint:fix, format, check, test scripts; added prettier devDep | Agent-06 |
| 2026-04-10 | `src/app/layout.tsx` | Modified | Added JetBrains Mono + 9 secondary fonts via next/font/google; updated inline FOUC script to use CSS variables instead of injecting Google Fonts link tags; all font CSS variable classes applied to html | Agent-14 |
| 2026-04-10 | `src/app/globals.css` | Modified | Removed @import for JetBrains Mono; updated .markdown-body code font-family to use var(--font-jetbrains) | Agent-14 |
| 2026-04-10 | `src/lib/theme-context.tsx` | Modified | Replaced loadGoogleFont() with CSS variable lookup in applyFont(); made preloadAllFonts() a no-op; replaced googleFamily with cssVar in FontOption interface; added FONT_CSS_VARS map | Agent-14 |
| 2026-04-10 | `src/app/settings/page.tsx` | Modified | Updated font picker preview to use font.cssVar for font-family | Agent-14 |
| 2026-04-10 | `tailwind.config.ts` | Modified | Updated font-mono to use var(--font-jetbrains) CSS variable | Agent-14 |
| 2026-04-10 | `src/lib/rehype/wrap-lines.ts` | Created | Extracted `rehypeWrapLines` plugin + `splitIntoLines` helper from MarkdownPreview.tsx | Agent-04 |
| 2026-04-10 | `src/lib/rehype/sanitize-schema.ts` | Created | Extracted `sanitizeSchema` constant from MarkdownPreview.tsx | Agent-04 |
| 2026-04-10 | `src/components/MermaidChart.tsx` | Created | Extracted `MermaidChart` component, `MERMAID_THEME_VARS`, `downloadSvgAsPng`, `downloadSvgFile` from MarkdownPreview.tsx | Agent-04 |
| 2026-04-10 | `src/components/MarkdownPreview.tsx` | Modified | Replaced inline definitions with imports from new modules; reduced from ~745 to 379 lines | Agent-04 |
| 2026-04-10 | `src/lib/errors.ts` | Created | Typed error hierarchy: AppError, StorageFullError, TimeoutError, ParseError, AIProviderError, RateLimitError | Agent-01 |
| 2026-04-10 | `src/lib/config.ts` | Created | Centralized magic numbers: storage limits, SSE params, rate limits, timeouts, circuit breaker, PDF chunk size | Agent-01 |
| 2026-04-10 | `src/lib/storage.ts` | Modified | Removed local StorageFullError class; imports from errors.ts + re-exports; replaced MAX_BYTES/WARN_THRESHOLD with config imports | Agent-01 |
| 2026-04-10 | `src/lib/utils.ts` | Modified | getErrorMessage() now branches on AppError subtypes for actionable messages | Agent-01 |
| 2026-04-10 | `src/lib/ai/client.ts` | Modified | Throws RateLimitError/AIProviderError; uses SSE_CHAR_BATCH, SSE_MAX_RETRIES, SSE_RETRY_DELAYS from config | Agent-01 |
| 2026-04-10 | `src/lib/parsers/pdf.ts` | Modified | Wraps failure points with ParseError throws | Agent-01 |
| 2026-04-10 | `src/app/api/minimax/route.ts` | Modified | Rate limit constants imported from config.ts | Agent-01 |
| 2026-04-10 | `src/app/settings/page.tsx` | Modified | Replaced inline 5*1024*1024 with STORAGE_MAX_BYTES from config | Agent-01 |
| 2026-04-10 | `src/app/api/minimax/route.ts` | Modified | Scrubbed upstream error messages: returns generic error+code+requestId instead of raw upstream text; logs full details server-side; removed unused getErrorMessage import | Agent-09 |
| 2026-04-10 | `src/lib/ai/client.ts` | Modified | S-069: Streaming timeout (throws TimeoutError after STREAM_TIMEOUT_MS with no data); S-070: exponential backoff with jitter replacing fixed SSE_RETRY_DELAYS | Agent-10 |
| 2026-04-10 | `src/lib/parsers/pdf.ts` | Modified | S-071: Per-page try/catch returns partial text on failure; S-075: batch processing in chunks of PDF_CHUNK_SIZE with main-thread yield | Agent-10 |
| 2026-04-10 | `src/app/api/minimax/route.ts` | Modified | S-073: Circuit breaker — tracks 429/5xx failures, opens circuit (503) after threshold, resets on success | Agent-10 |
| 2026-04-10 | `src/components/content-viewer/ExportHandlers.tsx` | Created | `useExportHandlers` custom hook with all export functions + loading states | Agent-03 |
| 2026-04-10 | `src/components/content-viewer/SectionRegenPanel.tsx` | Created | Section regen modal + `executeSectionRegen` logic, dynamically imported | Agent-03 |
| 2026-04-10 | `src/components/content-viewer/ContentViewerHeader.tsx` | Created | Header bar with title, badges, action buttons, overflow menu | Agent-03 |
| 2026-04-10 | `src/app/content/[id]/page.tsx` | Modified | Slimmed from ~795 to ~310 lines by composing ExportHandlers, SectionRegenPanel, ContentViewerHeader | Agent-03 |
| 2026-04-10 | `src/lib/ai/pipeline/section-parser.ts` | Created | Extracted headerCore, buildCodeFenceMask, parseSections, mergeSectionPatches, Section type from pipeline.ts | Agent-02 |
| 2026-04-10 | `src/lib/ai/pipeline/assignment-utils.ts` | Created | Extracted isLGTM, mergeQuestionPatches, countAssignmentQuestions, validateAssignmentCounts, cleanAssignmentStitching, QuestionType from pipeline.ts | Agent-02 |
| 2026-04-10 | `src/lib/ai/pipeline/mermaid-fix.ts` | Created | Extracted buildMermaidFixMessages from pipeline.ts | Agent-02 |
| 2026-04-10 | `src/lib/ai/pipeline/index.ts` | Created | Barrel re-exports for pipeline sub-modules | Agent-02 |
| 2026-04-10 | `src/lib/ai/pipeline.ts` | Modified | Reduced from ~820 to ~270 lines; now thin orchestrator importing from pipeline/ sub-modules | Agent-02 |
| 2026-04-10 | `src/components/MermaidChart.tsx` | Modified | S-072: Added `title={error}` tooltip to `<pre>` in error fallback so raw code block surfaces error on hover | Agent-11 |
| 2026-04-10 | `src/lib/storage.ts` | Modified | S-074: Added `getLargestItems(n)` helper — maps items to serialised byte sizes, sorts descending, returns top N | Agent-11 |
| 2026-04-10 | `src/components/StorageWarningBanner.tsx` | Modified | S-074: When >=90% full, shows top 3 largest items with byte sizes and "Delete oldest" button; imports getLargestItems + deleteContent | Agent-11 |
| 2026-04-10 | `next.config.js` | Modified | S-003: Added `experimental.optimizePackageImports` for framer-motion, react-markdown, rehype-highlight, highlight.js, mermaid | Agent-12 |
| 2026-04-10 | `src/components/MermaidChart.tsx` | Modified | S-020: Replaced per-instance mermaid useState with module-scope singleton promise (`getMermaid()`); consolidated two useEffects into one render effect | Agent-12 |
| 2026-04-10 | `src/app/page.tsx` | Modified | S-018: Replaced static `TokenVelocityPulse` import with `next/dynamic({ ssr: false })` for lazy code-splitting; already conditionally rendered only when isGenerating | Agent-12 |
| 2026-04-10 | `src/lib/parsers/pdf.ts` | Modified | S-066: Replaced `any` cast in content.items.map with `TextItem \| TextMarkedContent` from pdfjs-dist; uses `'str' in item` narrowing | Agent-05 |
| 2026-04-10 | `src/lib/ai/client.ts` | Modified | S-066: Defined inline SSE event interfaces (Anthropic block start/stop/delta, message_stop, thinking/text deltas, OpenAI chunk); JSON.parse result typed as SSEEvent and narrowed per branch | Agent-05 |
| 2026-04-10 | `src/lib/export/csv.ts` | Modified | S-067: Grouped all shared regex constants and detection functions (isQuestionHeader, detectTypeFromHeader, detectTypeFromContent) under one "Question classification" section at top; removed duplicate declarations from extraction helpers | Agent-05 |
| 2026-04-10 | `src/components/MarkdownPreview.tsx` | Modified | S-006: Hoisted remark/rehype plugin arrays to module-scope constants; S-019: Conditional plugin inclusion via useMemo content feature detection (math, code fences) | Agent-13 |
| 2026-04-10 | `src/components/ContentCard.tsx` | Modified | S-007: Extended memo comparator to also check item.title, onSelect, onDuplicate, onRename | Agent-13 |
| 2026-04-10 | `src/components/ContentListItem.tsx` | Modified | S-007: Extended memo comparator to also check item.title, onSelect, onDuplicate, onRename | Agent-13 |
| 2026-04-10 | `src/app/content/[id]/page.tsx` | Modified | S-008: Added 120ms debounced preview markdown state for split-view; editor stays responsive | Agent-13 |
| 2026-04-10 | `src/components/AmbientLines.tsx` | Modified | S-022: Replaced full-layer AnimatePresence remount with per-icon animation; memoized sprinkle config per type | Agent-13 |
| 2026-04-10 | `tailwind.config.ts` | Modified | S-028: Float animations default to paused play-state | Agent-13 |
| 2026-04-10 | `src/app/globals.css` | Modified | S-028: Added .generating class to resume float animation play-state | Agent-13 |
| 2026-04-10 | `package.json` | Modified | S-053/S-059: Added vitest + jsdom devDeps; updated test/test:watch/check scripts | Agent-07 |
| 2026-04-10 | `vitest.config.ts` | Created | S-053: Vitest config with jsdom environment and @/* path alias matching tsconfig | Agent-07 |
| 2026-04-10 | `src/lib/validation/mermaid.test.ts` | Created | S-055: 11 tests for extractMermaidBlocks (empty, single/multi, CRLF, offsets, indented) | Agent-07 |
| 2026-04-10 | `src/lib/ai/pipeline/section-parser.test.ts` | Created | S-056: 33 tests for headerCore, buildCodeFenceMask, parseSections, mergeSectionPatches | Agent-07 |
| 2026-04-10 | `src/lib/export/csv.test.ts` | Created | S-055: 20 tests for parseAssignmentMarkdown (MCQ/MSQ/subjective, options, difficulty, edge cases) | Agent-07 |
| 2026-04-10 | `src/lib/storage.test.ts` | Created | S-057: 25 tests for CRUD, search, import/restore/duplicate, StorageFullError, schema corruption | Agent-07 |
| 2026-04-10 | `src/lib/ai/client.ts` | Modified | S-026: Added main-thread yield in readSSEStream — tracks elapsed time via performance.now(); after each SSE line batch, if >16ms elapsed yields with setTimeout(r,0) to unblock the event loop | Agent-17 |
| 2026-04-10 | `package.json` | Modified | S-058/S-060: Added @playwright/test devDep; added test:e2e and test:e2e:ui scripts | Agent-08 |
| 2026-04-10 | `playwright.config.ts` | Created | S-058: Playwright config — baseURL localhost:3000, chromium project, webServer npm run dev | Agent-08 |
| 2026-04-10 | `e2e/generation-smoke.spec.ts` | Created | S-058: Smoke test mocking /api/minimax with canned Anthropic SSE; exercises 3-step form flow and library assertion | Agent-08 |
| 2026-04-10 | `e2e/visual.spec.ts` | Created | S-060: Visual regression screenshots for home, library, and settings pages using toHaveScreenshot() | Agent-08 |
| 2026-04-10 | `src/app/layout.tsx` | Modified | S-029+S-030: Added preconnect + dns-prefetch for https://api.minimax.io; S-035: Added speculationrules script for /content and /settings | Agent-18 |
| 2026-04-10 | `public/pdf.worker.min.mjs` | Created | S-031: Copied from node_modules/pdfjs-dist/build/ for self-hosted PDF.js worker | Agent-18 |
| 2026-04-10 | `src/lib/parsers/pdf.ts` | Modified | S-031: Worker URL changed from CDN to self-hosted /pdf.worker.min.mjs | Agent-18 |
| 2026-04-10 | `next.config.js` | Modified | S-032: Added compress:true and headers() for /_next/static/:path* with 1-year immutable cache-control | Agent-18 |
| 2026-04-10 | `src/components/Sidebar.tsx` | Modified | S-035: Added router.prefetch('/content') and router.prefetch('/settings') on mount | Agent-18 |
| 2026-04-10 | `src/components/ContentCard.tsx` | Modified | S-023: Added handlePrefetch (useCallback) calling router.prefetch; attached as onMouseEnter and onFocus on root div | Agent-16 |
| 2026-04-10 | `src/components/ContentListItem.tsx` | Modified | S-023: Added useCallback import; handlePrefetch calling router.prefetch; attached as onMouseEnter and onFocus on root div | Agent-16 |
| 2026-04-10 | `src/components/GenerationForm.tsx` | Modified | S-021: Wrapped LectureIllustration, PreLectureIllustration, AssignmentIllustration, TaGuideIllustration with React.memo using named function expressions | Agent-16 |
| 2026-04-10 | `src/app/page.tsx` | Modified | S-039: Typed error recovery — classify errors via instanceof (AIProviderError, RateLimitError, TimeoutError) with specific action buttons and rate-limit countdown timer | Agent-19 |
| 2026-04-10 | `src/app/content/[id]/page.tsx` | Modified | S-040: Added undo-on-delete — snapshots item before delete, shows toast with Undo action that restores via restoreContent and navigates back | Agent-19 |
| 2026-04-10 | `src/app/content/page.tsx` | Modified | S-042: Added 6 skeleton shimmer cards displayed before hydration, matching real grid layout | Agent-19 |
