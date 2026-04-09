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
