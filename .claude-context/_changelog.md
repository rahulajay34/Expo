# Changelog

All application file modifications are logged here.

| Timestamp | File | What Changed | Why | Agent |
|-----------|------|-------------|-----|-------|
| (no changes yet — Phase 1 is read-only) | | | | |
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
