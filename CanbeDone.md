## Performance — Frontend

### Lazy-load mermaid, pdfjs-dist, highlight.js, and katex via dynamic imports

**What:** These four heavy deps are imported at module level in `MarkdownPreview` and parser/export utilities, bloating the initial bundle for every visitor whether or not they render diagrams, PDFs, or math. Move each to `next/dynamic` / `import()` so they fetch only when actually used.
**Where:** `src/components/MarkdownPreview.tsx`, `src/lib/parsers/pdf.ts`, `src/lib/export/pdf.ts`, `src/app/page.tsx`
**Impact:** First-time visitors save ~400–600 KB of JS and first paint is visibly faster.

### Defer pdfjs-dist until a PDF is actually uploaded

**What:** Convert the top-level `pdfjs-dist` import in the PDF parser to an inline `await import()` that runs only inside `extractPDFText()` so users who never upload a PDF never pay its cost.
**Where:** `src/lib/parsers/pdf.ts`, `src/lib/parsers/file.ts`
**Impact:** Most first sessions skip a ~400 KB parser download; faster first paint on mobile.

### Turn on `experimental.optimizePackageImports` for the heavy icon / animation deps

**What:** Add `experimental.optimizePackageImports` in `next.config.js` for `framer-motion`, `react-markdown`, `rehype-highlight`, `highlight.js`, and `mermaid` so Next.js tree-shakes sub-modules aggressively.
**Where:** `next.config.js`
**Impact:** Shaves ~10–15% off the client JS bundle for everyone.

### Code-split the content viewer page

**What:** Break `src/app/content/[id]/page.tsx` (nearly 800 lines) into `<EditPanel>`, `<ExportPanel>`, `<RegenPanel>` so export and regen logic only ship when users click those tabs.
**Where:** `src/app/content/[id]/page.tsx`
**Impact:** Library browsers who only read content load much less JS.

### Virtualize the content library grid/list

**What:** Replace the `.map()` render in the content library with a windowed list (react-window or tanstack-virtual) that only mounts visible rows.
**Where:** `src/app/content/page.tsx`, `src/components/ContentCard.tsx`, `src/components/ContentListItem.tsx`
**Impact:** Power users with 100+ saved items keep smooth scroll instead of growing lag.

### Cache rehype/remark plugin instances across renders of MarkdownPreview

**What:** `MarkdownPreview` re-creates the `remarkMath / remarkGfm / rehypeHighlight / rehypeKatex / rehypeSanitize / rehypeRaw` array on every render. Memoize or hoist so the same plugin instances are reused.
**Where:** `src/components/MarkdownPreview.tsx`
**Impact:** Cuts re-render cost ~40–50% for long docs during live streaming.

### Memoize ContentCard and ContentListItem with a shallow comparator

**What:** Wrap the row components in `React.memo` with a comparator that only re-renders if `id`, `updatedAt`, or `markdown.length` changed.
**Where:** `src/components/ContentCard.tsx`, `src/components/ContentListItem.tsx`
**Impact:** Library filter / sort / view-toggle drops ~70% of re-renders.

### Debounce the markdown editor's preview render on long docs

**What:** Add a 120 ms debounce on the editor → preview state bridge so every keystroke doesn't re-parse thousands of lines through the rehype pipeline.
**Where:** `src/components/MarkdownEditor.tsx`, `src/components/MarkdownPreview.tsx`
**Impact:** Typing stays fluid on long lecture notes, especially on low-end laptops.

### Defer the inline theme-init script out of the critical path

**What:** The ~60-line inline script in `layout.tsx` blocks the parser before first paint. Move theme/accent/font bootstrap into a tiny script tag with `strategy="beforeInteractive"` via `next/script` or a separate file.
**Where:** `src/app/layout.tsx`
**Impact:** First paint ~200–300 ms faster on slow 3G for first-time visitors.

### Replace the CSS `@import` for JetBrains Mono with `next/font/google`

**What:** `globals.css` uses `@import url(...)` for JetBrains Mono, which is render-blocking. Move the font through `next/font/google` like Plus Jakarta so it's preloaded and self-hosted.
**Where:** `src/app/globals.css`, `src/app/layout.tsx`
**Impact:** Removes one render-blocking request; saves ~100 ms on FCP.

### Stop preloading all nine settings fonts on every session

**What:** `preloadAllFonts()` in the theme context runs on mount, downloading nine Google Fonts families even if the user stays on the default. Load the user's currently selected font only; defer the rest until the settings page mounts.
**Where:** `src/lib/theme-context.tsx`, `src/app/settings/page.tsx`
**Impact:** Mobile users on the default font save ~50–80 KB of font bytes.

### Drop the runtime Google Fonts `<link>` in favor of `next/font/google` with all swappable families

**What:** Register the handful of secondary fonts (Inter, Nunito, DM Sans, etc.) via `next/font/google` at build time so they're self-hosted, subset, and preloaded — no third-party fetch at runtime.
**Where:** `src/app/layout.tsx`, `src/lib/theme-context.tsx`
**Impact:** Removes the third-party font hop and its attendant CLS for everyone.

### Use `font-display: optional` for secondary fonts

**What:** Swap `display=swap` for `display=optional` on user-chosen fonts so if the font misses a ~100 ms budget, fallback stays and there is zero font-swap layout shift.
**Where:** `src/lib/theme-context.tsx`, `src/app/layout.tsx`
**Impact:** Eliminates font-swap CLS on slow networks for first-time visitors.

### Add `content-visibility: auto` to off-screen library cards and content sections

**What:** Apply `content-visibility: auto` with an `intrinsic-size` hint on library cards, long markdown sections, and the pipeline timeline so the browser skips layout/paint until they scroll into view.
**Where:** `src/components/ContentCard.tsx`, `src/components/MarkdownPreview.tsx`, `src/components/PipelineTimeline.tsx`
**Impact:** Library and long content pages paint and scroll noticeably faster.

### Gate the PhysicsScroll / parallax layer on a cheap device check

**What:** `PhysicsScroll` runs `useScroll`/`useTransform` unconditionally. Skip it entirely on narrow viewports or when `matchMedia('(max-width: 768px)')` is true so low-end phones don't burn cycles on parallax.
**Where:** `src/components/PhysicsScroll.tsx`, `src/app/page.tsx`, `src/app/content/[id]/page.tsx`
**Impact:** Noticeable battery and FPS win on mid-range Android.

### Replace `backdrop-filter: blur` on dropdowns with a solid surface

**What:** The `.glass-panel` class uses `backdrop-filter: blur(16px) saturate(180%)`. Keep it on modals only; drop it for menus/popovers, where it triggers a GPU recomposite every frame.
**Where:** `src/app/globals.css`
**Impact:** Dropdowns open and animate smoothly on integrated-GPU laptops and budget phones.

### Promote only actively animating elements to their own layer

**What:** Instead of blanket `will-change: transform`, toggle it on in `onAnimationStart` and off in `onAnimationComplete` inside the motion primitives used in `src/lib/motion.ts`.
**Where:** `src/lib/motion.ts`, `src/components/PhysicsScroll.tsx`
**Impact:** Reduces GPU memory overhead and scroll jank on low-end devices.

### Lazy-mount TokenVelocityPulse, CountUp, and LiveContentMetrics only during generation

**What:** These are imported eagerly in `src/app/page.tsx` but only have value while a generation stream is active. Wrap them in `next/dynamic` and mount them only when `streamingState.isStreaming`.
**Where:** `src/app/page.tsx`, `src/components/TokenVelocityPulse.tsx`, `src/components/CountUp.tsx`, `src/components/LiveContentMetrics.tsx`
**Impact:** Home page ships ~15–20 KB less JS for every first-time visitor.

### Conditionally drop rehype plugins that aren't needed for the current doc

**What:** Skip `rehypeKatex` if the markdown has no `$...$`/`$$...$$`, `rehypeHighlight` if there are no fenced code blocks, and `mermaid` rendering when there are no `mermaid` code blocks.
**Where:** `src/components/MarkdownPreview.tsx`
**Impact:** Simple markdown renders ~20–30% faster with no visible change.

### Memoize the mermaid module at module scope

**What:** `MarkdownPreview` re-imports `mermaid` per instance / re-creates local state for each diagram. Load the module once, hoist it, and reuse across diagrams on the page.
**Where:** `src/components/MarkdownPreview.tsx`
**Impact:** Pages with many diagrams become interactive 400–600 ms sooner.

### Inline the top four content-type illustrations in a single sprite or extract to static SVG

**What:** `GenerationForm` inlines ~15 KB of JSX for LectureIllustration, PreLectureIllustration, AssignmentIllustration, TAGuideIllustration per render. Ship them as a single static SVG sprite and reference by `<use href>`.
**Where:** `src/components/GenerationForm.tsx`
**Impact:** Shaves re-render cost on the generation form and ~15 KB of parse cost.

### Decouple AmbientLines from content-type switching

**What:** `AnimatePresence` remounts the entire ambient layer when the user changes content type. Memoize the sprinkle config per type so only the icon that changed re-mounts.
**Where:** `src/components/AmbientLines.tsx`
**Impact:** Removes a frame-jank spike when picking a content type.

### Prefetch `/content/[id]` on hover over a library row

**What:** Wire `router.prefetch()` to the card/row `onMouseEnter` / `onFocus` handler so the detail route is ready by the time the user clicks.
**Where:** `src/components/ContentCard.tsx`, `src/components/ContentListItem.tsx`, `src/app/content/page.tsx`
**Impact:** Opening a saved item feels instant on desktop and fast Wi-Fi.

### Batch and defer localStorage reads inside the generation context

**What:** Content, storage stats, templates, and theme are each read from `localStorage` on mount. Read once on boot, cache in a context, and broadcast via `storage` events so page transitions don't reparse the JSON.
**Where:** `src/lib/generation-context.tsx`, `src/lib/storage.ts`, `src/app/content/page.tsx`
**Impact:** Switching pages and opening settings is snappier with many saved items.

### Move long markdown diff/section parsing off the main thread

**What:** The section-diff and header-patching logic in `src/lib/ai/pipeline.ts` runs on the main thread during streaming. Move the heaviest passes into a Web Worker so typing and scroll stay fluid mid-generation.
**Where:** `src/lib/ai/pipeline.ts`
**Impact:** UI stays responsive during long generations.

### Break long streaming loops with `scheduler.postTask` or `requestIdleCallback`

**What:** The SSE reader in `src/lib/ai/client.ts` aggressively loops; yield to the main thread between chunks when the page is interactive to avoid long tasks.
**Where:** `src/lib/ai/client.ts`, `src/lib/stream-speed.ts`
**Impact:** Lower INP during active generations on mid-range devices.

### Add a bundle analyzer and size budget in CI

**What:** Wire `@next/bundle-analyzer` via `next.config.js` and add a small size-budget check so regressions in the home-page chunk fail the build.
**Where:** `next.config.js`, CI workflow
**Impact:** Stops bundle creep before it ships to users.

### Remove the secondary @keyframes animations that run at rest

**What:** `float-slow`, `float-medium`, `float-fast`, `.caret-pulse`, `.glow-pulse`, and similar run infinite loops on idle elements. Disable them when the user isn't in a generation flow.
**Where:** `src/app/globals.css`, `tailwind.config.ts`
**Impact:** Fewer wake-ups, longer battery life, smoother scroll on low-end hardware.

---

## Performance — Network

### Add `<link rel="preconnect">` for Minimax and any other runtime third parties

**What:** Add `preconnect` hints for the Minimax API host (and for `fonts.googleapis.com`/`fonts.gstatic.com` until fonts are self-hosted).
**Where:** `src/app/layout.tsx`
**Impact:** Shaves ~100–200 ms off the first generation request.

### Add `dns-prefetch` for all third-party domains

**What:** Add `dns-prefetch` hints for any CDN hosts used at runtime (Minimax, Google Fonts, any mermaid CDN fallback) alongside the preconnects.
**Where:** `src/app/layout.tsx`
**Impact:** Parallel DNS resolution cuts another 50–100 ms on cold visits.

### Vendor the PDF.js worker instead of loading it from a CDN

**What:** Replace the CDN URL assignment with a locally-bundled `pdf.worker.min.js` served from `/public` (or from `pdfjs-dist/build/pdf.worker.min.mjs` via a Next.js static import).
**Where:** `src/lib/parsers/pdf.ts`, `public/`
**Impact:** PDF parsing works for users with CDN blocks and avoids the external round-trip.

### Add Brotli/Gzip compression and cache headers in `next.config.js`

**What:** Ensure `compress: true` is explicit and add a `headers()` section with `Cache-Control: public, max-age=31536000, immutable` on `/_next/static/*` and shorter TTLs for HTML.
**Where:** `next.config.js`
**Impact:** Returning visitors skip hundreds of KB of re-downloads.

### Preload the top 2–3 Plus Jakarta font weights

**What:** Next.js already self-hosts Plus Jakarta via `next/font`, but preload hints for weights 400/600/700 make them race against the HTML rather than the CSS.
**Where:** `src/app/layout.tsx`
**Impact:** Eliminates the small fallback flash on first paint.

### Use `fetchpriority="high"` on the above-the-fold hero assets

**What:** Mark the hero illustration / primary heading's critical resources with `fetchpriority="high"` so the browser schedules them ahead of decorative assets.
**Where:** `src/app/page.tsx`, `src/app/layout.tsx`
**Impact:** Faster LCP on the landing page.

### Add Speculation Rules / `router.prefetch` for likely navigations

**What:** Add a small `<script type="speculationrules">` prerendering `/content` from `/` and the three sidebar routes from each other, plus programmatic prefetch of the most-recent content item.
**Where:** `src/app/layout.tsx`, `src/components/Sidebar.tsx`
**Impact:** Navigation feels instant on Chromium browsers.

### Stop the Google Fonts `<link>` injection after theme context hydrates

**What:** The inline head script injects a Google Fonts `<link>` based on localStorage. Even once we migrate to `next/font`, ensure the fallback path doesn't fetch fonts the user never requested.
**Where:** `src/app/layout.tsx`, `src/lib/theme-context.tsx`
**Impact:** Removes an unnecessary third-party request on many sessions.

---

## Security — Application

### Scrub upstream error messages before returning them

**What:** The route currently forwards upstream error text into the response JSON. Normalize it to a short `{ error, code, requestId }` shape so no stack traces or keys leak to clients.
**Where:** `src/app/api/minimax/route.ts`, `src/lib/utils.ts`
**Impact:** Prevents information disclosure from Minimax errors.

### Enforce tight rate-limit persistence across server restarts

**What:** The current limiter is in-memory only; a restart resets it. Swap it for Upstash Redis / KV or sign a short-lived JWT so rate limits survive redeploys.
**Where:** `src/app/api/minimax/route.ts`
**Impact:** Abuse protection doesn't evaporate on every deploy.

---

## Security — Infrastructure

---

## UI/UX

### Redesign the generation error state with typed, actionable recovery

**What:** When generation fails, classify the error (missing API key / rate-limited / timeout / network / upstream 5xx) and show a clear next-action ("Add API key", "Retry in Xs", "Check connection"). Today it shows a raw error string.
**Where:** `src/app/page.tsx`, `src/components/ErrorBoundary.tsx`, `src/lib/utils.ts`
**Impact:** Users know exactly what to do when something goes wrong instead of staring at a red box.

### Add confirmation + 5-second undo on destructive actions

**What:** Any delete (single, bulk, or "clear library") should raise a Modal confirm and, on confirm, emit a toast with an Undo button that restores the item for 5 seconds.
**Where:** `src/app/content/page.tsx`, `src/app/content/[id]/page.tsx`, `src/components/ui/Toast.tsx`, `src/lib/storage.ts`
**Impact:** Users stop losing work to accidental clicks.

### Show a first-class empty state on the content library

**What:** When the library has zero items, replace the empty grid with an illustration, one sentence of context, and a primary CTA to the Generate page.
**Where:** `src/app/content/page.tsx`
**Impact:** First-time users feel guided instead of lost.

### Add skeleton shimmers for the content library grid on initial load

**What:** Render a 6–12 card skeleton placeholder before localStorage is read/parsed so the grid never "pops" in.
**Where:** `src/app/content/page.tsx`, `src/components/ui/Skeleton.tsx`
**Impact:** Perceived load is smoother and avoids CLS on the library page.

### Persist library search / filter / sort / view mode to localStorage

**What:** Move the current sessionStorage-backed search/filter/sort/view state to localStorage so returning users resume exactly where they left off.
**Where:** `src/app/content/page.tsx`
**Impact:** Returning users don't have to re-find their view every visit.

### Show the live generation stage in an overlay on mobile

**What:** The compact strip is hard to see on small screens. Add a bottom-sheet or fixed overlay with the active stage and caret while streaming.
**Where:** `src/app/page.tsx`, `src/components/PipelineTimeline.tsx`
**Impact:** Mobile users see clear progress instead of a tiny collapsed strip.

### Add inline field validation with visible errors, not just a disabled button

**What:** Validate topic length, question counts, and prompt length on change, showing a red border and message under the field. Keep the submit button enabled so users can see the error before trying.
**Where:** `src/components/GenerationForm.tsx`
**Impact:** Users discover why the form won't submit without guessing.

### Add visible "Save" / "Unsaved changes" state in the content editor

**What:** Show a badge near the title that flips between "Saved", "Saving…", and "Unsaved". Today the state is mostly invisible.
**Where:** `src/app/content/[id]/page.tsx`
**Impact:** Users trust their work is persisted.

### Add a hover/Cmd-K copy button on every code block in the preview

**What:** Wrap fenced code blocks with a small `Copy` button that appears on hover and uses `navigator.clipboard`. Inline code should surface a tooltip with click-to-copy on long-press.
**Where:** `src/components/MarkdownPreview.tsx`
**Impact:** Users share code examples faster.

### Reorganize the settings page into tabs

**What:** Break settings into Appearance / Prompts / Storage / About tabs instead of one long scroll.
**Where:** `src/app/settings/page.tsx`
**Impact:** Settings feels scannable, not intimidating, on both desktop and mobile.

### Add tooltips to all icon-only toolbar buttons

**What:** Markdown editor toolbar, export menu, and inline AI popover buttons need `title` / custom tooltips explaining the action on hover and long-press.
**Where:** `src/components/MarkdownEditor.tsx`, `src/components/ExportMenu.tsx`, `src/components/InlineAIPopover.tsx`
**Impact:** First-time users discover features they currently miss.

### Add a visual progress indicator to the step sequence in the generation form

**What:** Mark completed steps with a check, current step bold; right now the steps are flat numbers.
**Where:** `src/components/GenerationForm.tsx`
**Impact:** Users feel forward momentum and know where they are.

### Consolidate spacing tokens across forms

**What:** `GenerationForm` mixes `gap-2`, `gap-3`, `px-2.5`, `px-3`, etc. Define a small scale in Tailwind config and replace ad-hoc values.
**Where:** `src/components/GenerationForm.tsx`, `tailwind.config.ts`, `src/app/globals.css`
**Impact:** UI feels consistent and intentional.

### Show richer file-processing progress on upload

**What:** Replace the generic "Processing files…" text with a per-file progress row and a clear success/fail state.
**Where:** `src/components/FileUpload.tsx`
**Impact:** Users trust large PDFs aren't stuck.

---

## Testing & Quality Assurance

### Add Vitest and a first unit test for the mermaid validator

**What:** Install `vitest` + `@testing-library/react`, wire `npm test`, and seed with a few tests for `src/lib/validation/mermaid.ts` (a pure function with clear inputs).
**Where:** `package.json`, `vitest.config.ts`, `src/lib/validation/mermaid.test.ts`
**Impact:** Establishes the testing muscle and catches regressions in a gnarly parser.

### Unit-test the SSE streaming parser in `src/lib/ai/client.ts`

**What:** Feed `readSSEStream` canned chunks that cover thinking deltas, partial lines, backpressure, and aborts, asserting the callback sequence.
**Where:** `src/lib/ai/client.test.ts`
**Impact:** A notoriously fragile surface gets a safety net.

### Unit-test the pipeline section parser

**What:** The header/section/patch code in `src/lib/ai/pipeline.ts` has lots of edge cases (code fences, markdown decorations, numbered headings). Cover them with tests.
**Where:** `src/lib/ai/pipeline.test.ts`
**Impact:** Reviewers stop breaking the pipeline on small edits.

### Unit-test the CSV assignment parser

**What:** `src/lib/export/csv.ts` classifies question types with several heuristics. Add tests with representative MCQ / MSQ / subjective inputs.
**Where:** `src/lib/export/csv.test.ts`
**Impact:** CSV exports don't silently drift.

### Unit-test the storage layer

**What:** Verify `saveContent`, `getAllContent`, `deleteContent`, `StorageFullError`, and corruption recovery with a localStorage mock.
**Where:** `src/lib/storage.test.ts`
**Impact:** Data-loss bugs are caught locally, not in users' browsers.

### Add a Playwright smoke test for the happy path

**What:** Set up `@playwright/test` with one test: load `/`, fill topic, click Generate (mocked Minimax), assert the library shows the new item.
**Where:** `playwright.config.ts`, `e2e/generation-smoke.spec.ts`
**Impact:** Regressions in the critical flow get caught end-to-end.

### Add `tsc --noEmit` and `next lint` to `npm test`

**What:** The build currently is the only type check. A dedicated `check` script catches errors before commit.
**Where:** `package.json`
**Impact:** Type errors don't hide inside `next build`.

### Add a Playwright visual regression pass on key screens

**What:** Capture screenshots for home, library, content detail, and settings and diff against baselines on each PR.
**Where:** `e2e/visual.spec.ts`
**Impact:** Accidental visual regressions are caught.

---

## Code Quality & Architecture

### Split `src/lib/ai/pipeline.ts` into focused modules

**What:** The file is 800+ lines spanning header parsing, fenced code masking, section patching, mermaid validation wiring, and refiner orchestration. Break it into `pipeline/header-parsing.ts`, `pipeline/section-patching.ts`, `pipeline/refiner.ts`, and a thin orchestrator.
**Where:** `src/lib/ai/pipeline.ts`
**Impact:** The pipeline becomes testable and editable without constant fear of regressions.

### Split `src/app/content/[id]/page.tsx` into EditPanel / ExportPanel / RegenPanel

**What:** The route component is nearly 800 lines and juggles edit, save, export, regen, and navigation. Extract the three concerns into focused components that share a context.
**Where:** `src/app/content/[id]/page.tsx`
**Impact:** Edits in one flow stop breaking the others; the page is hackable again.

### Split `MarkdownPreview` into MermaidTheme / CodeBlock / HtmlSanitizer

**What:** ~750 lines conflating mermaid theming, code-block copy, rehype pipeline config, and sanitization. Extract sub-components.
**Where:** `src/components/MarkdownPreview.tsx`
**Impact:** Each concern becomes reusable and independently testable.

### Introduce a typed `AppError` hierarchy and a single `getErrorMessage` consumer

**What:** Define `StorageFullError`, `TimeoutError`, `ParseError`, `AIProviderError`, `RateLimitError`; use them consistently in `catch` blocks; normalize in `getErrorMessage`.
**Where:** `src/lib/errors.ts`, `src/lib/utils.ts`, `src/lib/ai/client.ts`, `src/lib/parsers/pdf.ts`, `src/lib/storage.ts`
**Impact:** Errors get consistent, actionable shapes everywhere.

### Centralize magic numbers into `src/lib/config.ts`

**What:** Constants like `MAX_BYTES = 5 * 1024 * 1024`, `CHAR_BATCH = 200`, rate-limit windows, and timeout values are scattered across files. Lift them into one tunable config module.
**Where:** `src/lib/config.ts`, `src/lib/storage.ts`, `src/lib/stream-speed.ts`, `src/app/api/minimax/route.ts`
**Impact:** Tuning knobs are discoverable in one place.

### Replace `any` and `as any` casts with proper types

**What:** Audit `src/lib/parsers/pdf.ts`, `src/lib/export/mermaid-wait.ts`, and any `// eslint-disable-next-line @typescript-eslint/no-explicit-any` for real types.
**Where:** `src/lib/parsers/pdf.ts`, `src/lib/export/mermaid-wait.ts`, `src/lib/ai/client.ts`
**Impact:** Catches real bugs at compile time.

### Consolidate question-classification heuristics in the CSV exporter

**What:** `detectTypeFromHeader`, `detectTypeFromContent`, `isQuestionHeader`, and friends live side-by-side in `csv.ts`. Group them into a `QuestionParser` with unit tests.
**Where:** `src/lib/export/csv.ts`
**Impact:** Fewer bugs from fragmented classification logic.

### Extract `rehypeWrapLines` into a reusable plugin module

**What:** The 80+ line HAST manipulation lives inline in `MarkdownPreview`. Move to `src/lib/rehype/wrap-lines.ts`.
**Where:** `src/components/MarkdownPreview.tsx`, `src/lib/rehype/wrap-lines.ts`
**Impact:** Reusable across other renderers and independently testable.

---

## Reliability & Resilience

### Add explicit timeouts on streaming with a clear error

**What:** If no chunk has arrived in ~90 s, abort and surface a typed `TimeoutError` to the UI.
**Where:** `src/lib/ai/client.ts`
**Impact:** Hangs turn into actionable errors.

### Exponential backoff with jitter on retries

**What:** The current retry path uses fixed 2 s / 5 s waits; add jitter (`base * 2^n + random(0, base)`) to avoid thundering herds.
**Where:** `src/lib/ai/client.ts`
**Impact:** Better distributed retries; less upstream load during brief outages.

### Graceful partial-parse fallback for PDFs

**What:** If `extractPDFText` fails mid-document, return the text extracted so far + a typed error so the user can still proceed with what was parsed.
**Where:** `src/lib/parsers/pdf.ts`
**Impact:** One bad page doesn't block an entire import.

### Mermaid render failure falls back to raw code block

**What:** If `waitForMermaidDiagrams` times out or mermaid throws during export, render the original fenced code so the export isn't blocked.
**Where:** `src/lib/export/mermaid-wait.ts`, `src/components/MarkdownPreview.tsx`
**Impact:** A broken diagram doesn't block a whole export.

### Circuit-break after N consecutive upstream 429s/5xx

**What:** Track recent upstream failures in `/api/minimax` and return a typed "degraded" response for 30 s rather than hammering Minimax.
**Where:** `src/app/api/minimax/route.ts`
**Impact:** Protects the quota and gives users a clear status.

### Surface storage-full errors with a clear action

**What:** On `StorageFullError`, show a modal listing the largest items and a one-click "delete oldest" action.
**Where:** `src/components/StorageWarningBanner.tsx`, `src/lib/storage.ts`, `src/app/settings/page.tsx`
**Impact:** Users fix the problem without hunting through settings.

### Chunk very large PDFs by page with a memory check

**What:** For PDFs above ~50 pages, process in page batches and yield between batches so the browser doesn't OOM.
**Where:** `src/lib/parsers/pdf.ts`
**Impact:** Large textbooks can be imported without crashing mobile Safari.

### Detect and warn on unclosed streaming state on navigation

**What:** If the user navigates away with an in-flight stream, warn via `beforeunload` (or at least cancel + show a toast so they can resume).
**Where:** `src/app/page.tsx`, `src/lib/generation-context.tsx`
**Impact:** Users don't accidentally lose in-progress work.

---

## Developer Experience (DX)

### Write a real README

**What:** 60–120 lines covering purpose, tech stack, setup (`npm install`, `.env.local`, `npm run dev`), architecture summary, and the AI pipeline stages.
**Where:** `README.md`
**Impact:** Onboards contributors in minutes instead of hours.

### Add `.env.example`

**What:** Commit a placeholder env file listing `MINIMAX_API_KEY` and any other required values.
**Where:** `.env.example`
**Impact:** New developers know exactly what to configure.

### Add ESLint + Prettier configs and lint/format scripts

**What:** `.eslintrc.json` extending `next/core-web-vitals`, plus `.prettierrc.json`; add `lint:fix` and `format` scripts.
**Where:** `.eslintrc.json`, `.prettierrc.json`, `package.json`
**Impact:** Consistent style across contributors.

### Add a husky + lint-staged pre-commit hook

**What:** Run `eslint --fix` and `prettier --write` on staged files before every commit.
**Where:** `package.json`, `.husky/pre-commit`
**Impact:** Bad code never reaches git.

### Add an ARCHITECTURE.md explaining the pipeline and data flow

**What:** One diagram and a short narrative: inputs → pipeline stages → storage → export. Mention the `@/*` alias and the `src/` layout.
**Where:** `ARCHITECTURE.md`
**Impact:** Contributors build accurate mental models fast.

### Add a `typecheck` script and wire it to CI

**What:** `"typecheck": "tsc --noEmit"` so type errors are catchable independently of build.
**Where:** `package.json`
**Impact:** Fast pre-push feedback.

---

## PWA & Offline

### Ship a service worker with precache + stale-while-revalidate

**What:** Register a service worker that precaches the Next.js static chunks and serves markdown prompt files stale-while-revalidate.
**Where:** `public/service-worker.js`, `src/app/layout.tsx`
**Impact:** The app loads instantly on repeat visits and survives offline.

### Add an "offline" UI state

**What:** Detect `navigator.onLine` and disable generation (which needs the proxy) with a clear "You're offline — saved content is still editable" banner.
**Where:** `src/app/layout.tsx`, `src/app/page.tsx`
**Impact:** Users understand the degraded state.

### Enable offline edits against cached content

**What:** Because the library already lives locally, the content detail page should work offline today; add cache headers and a service-worker route so the HTML shell loads too.
**Where:** `src/app/content/[id]/page.tsx`, service worker
**Impact:** Offline editing actually works.

---

## Mobile Optimization

### Honor `env(safe-area-inset-*)` for the sidebar, mobile nav, and fixed overlays

**What:** Audit all `fixed` / `sticky` UI for safe-area padding; ensure `viewport-fit=cover` is set in the viewport meta tag.
**Where:** `src/app/layout.tsx`, `src/components/Sidebar.tsx`
**Impact:** No content hides behind notches or home bars on iPhones.

### Use `100dvh` instead of `100vh` for full-height layouts

**What:** `h-screen` anchors to static viewport height; use dynamic viewport height so the layout doesn't jump when the mobile address bar hides.
**Where:** `src/app/layout.tsx`, `src/app/globals.css`
**Impact:** No layout jump when scrolling on mobile Safari.

### Apply `touch-action: manipulation` globally to interactive elements

**What:** Move the scoped mobile-only `touch-action` rule into a site-wide rule on buttons, links, inputs, and custom roles.
**Where:** `src/app/globals.css`
**Impact:** Kills the 300 ms tap delay across the app.

### Make mermaid diagrams responsive

**What:** Add CSS so diagrams cap at `max-width: 100%`, scale down on narrow viewports, and wrap overflow in a horizontally-scrollable container with a shadow hint.
**Where:** `src/components/MarkdownPreview.tsx`, `src/app/globals.css`
**Impact:** Diagrams stop overflowing on mobile.

### Collapse the sidebar on tablet breakpoints

**What:** Between 768 px and ~1024 px, turn the sidebar into an icon-only rail so content has breathing room on iPad.
**Where:** `src/components/Sidebar.tsx`, `src/app/globals.css`
**Impact:** 25–30% more content width on tablets.

### Raise all touch targets to 44×44 px on touch devices

**What:** Add a global `@media (hover: none) and (pointer: coarse)` rule enforcing minimum button/input sizes.
**Where:** `src/app/globals.css`
**Impact:** Fewer mis-taps on phones; WCAG compliance.

### Ensure modals and popovers stay inside the viewport on small screens

**What:** Add viewport-aware positioning to `InlineAIPopover`, `NotificationCentre`, and the export menu so they don't spill off-screen on small devices.
**Where:** `src/components/ui/Modal.tsx`, `src/components/InlineAIPopover.tsx`, `src/components/NotificationCentre.tsx`, `src/components/ExportMenu.tsx`
**Impact:** Dialogs are fully visible and dismissible on every screen.

---

## Documentation

### Document the AI pipeline stages and prompt contracts

**What:** Describe what Creator / Reviewer / Refiner / CSV Converter each do, what they expect in, what they emit, and how the patching logic works.
**Where:** `docs/ai-pipeline.md`
**Impact:** New contributors (and future-you) can safely change prompts.

### Document the prompt template files and when each is used

**What:** Walk through `public/Prompts/*.md`, who consumes each, and what variables they take.
**Where:** `docs/prompts.md`
**Impact:** Template edits become intentional, not accidental.

---

## AI/ML Integration

### Add an explicit "stop generating" button that aborts the pipeline

**What:** With the shared `AbortController` from the reliability section, wire a user-visible stop button that cancels the current stage.
**Where:** `src/app/page.tsx`, `src/lib/ai/pipeline.ts`, `src/lib/ai/client.ts`
**Impact:** Users cancel wrong-direction generations without waiting.

---

## Search & Discovery

### Build a lightweight full-text index for the library

**What:** Pre-compute a simple inverted index keyed on words from title + markdown + topic so library search scales beyond a few dozen items.
**Where:** `src/lib/search-index.ts`, `src/lib/storage.ts`, `src/app/content/page.tsx`
**Impact:** Search stays instant as the library grows.

### Add recent searches and autocomplete

**What:** Store the last 10 search queries; show them as suggestions in the library search box.
**Where:** `src/app/content/page.tsx`, `src/lib/storage.ts`
**Impact:** Returning users jump back into filters in one click.

---

## Emerging & Forward-Looking

### Migrate navigation animations to the View Transitions API

**What:** A `view-transitions.ts` helper already exists; audit every `router.push` and replace Framer Motion page transitions with the native API on supported browsers.
**Where:** `src/lib/view-transitions.ts`, `src/components/PageTransition.tsx`, `src/components/Sidebar.tsx`
**Impact:** Page transitions are smoother and cost less JS.

### Use the File System Access API for export when available

**What:** On supporting browsers, use `showSaveFilePicker` so users choose where exports land, instead of forcing a download.
**Where:** `src/lib/export/pdf.ts`, `src/lib/export/html.ts`, `src/lib/export/markdown.ts`, `src/lib/export/csv.ts`
**Impact:** Power users save directly into their real filesystem.

### Add Speculation Rules for prerendering likely routes

**What:** A small `<script type="speculationrules">` that prerenders `/content` from `/` and vice versa.
**Where:** `src/app/layout.tsx`
**Impact:** Navigation feels instant on Chromium browsers.

### Probe OPFS (Origin Private File System) for large file storage

**What:** Use OPFS as an alternative to IndexedDB for multi-hundred-MB imports (large PDFs, pptx) without consuming quota.
**Where:** `src/lib/storage.ts`, `src/lib/parsers/pdf.ts`
**Impact:** Larger imports become feasible without crashing.

### Adopt CSS Anchor Positioning for popovers and tooltips

**What:** Replace JS-based popover positioning with `anchor-name` / `position-anchor` on supporting browsers.
**Where:** `src/components/InlineAIPopover.tsx`, `src/components/ui/Select.tsx`, `src/components/NotificationCentre.tsx`
**Impact:** Simpler code and smoother positioning on modern browsers.
