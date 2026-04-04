# UI Enhancement State File

## Last Updated: 2026-04-04

---

## Tech Stack Summary

- **Framework:** Next.js 14.2.20 (App Router), React 18.3.1, TypeScript 5.3.3
- **Styling:** Tailwind CSS 3.4.1, CSS custom properties for theming, PostCSS
- **Font:** Plus Jakarta Sans (Google Fonts), JetBrains Mono (code)
- **Animation:** CSS keyframes + Framer Motion ^12.38.0 (spring presets in src/lib/motion.ts)
- **Markdown:** react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight, mermaid
- **State:** React Context (Theme, Generation, Toast), localStorage
- **API:** MiniMax M2.7 via SSE streaming proxy at /api/minimax

## Design System

### Colors (CSS Variables)
- Light: bg #FFFFFF, sidebar #F7F6F3, border #E8E8E8, accent #2383E2, text #37352F
- Dark: bg #1E1E1E, sidebar #252525, border #353535, accent #6BA3E8, text #E8E8E8
- Success: #3DAF4B / #5CC97A | Warning: #D97706 / #F0A030 | Danger: #DC2626 / #EF5555

### Typography Scale
- display: 48px/700, h1: 36px/700, h2: 28px/600, h3: 22px/600
- body-lg: 18px/400, body: 16px/400, caption: 13px/400, label: 12px/500

### Spacing: Tailwind 4px baseline
### Radii: 4px, 6px, 8px, 999px
### Shadows: Subtle (0 1px 2px rgba(0,0,0,0.05))

## Component Inventory

### Pages
- `/` — Generation form (multi-step: type → topic → upload → options)
- `/content` — Library (grid/list, search, filter, sort, pagination, bulk ops)
- `/content/[id]` — Viewer/Editor (markdown preview, split editor, export)
- `/settings` — Theme, storage management, backup/restore

### Key Components
- Sidebar (collapsible, mobile bottom nav)
- GenerationForm (4-step, pipeline stage visualization)
- MarkdownPreview (syntax highlight, mermaid, KaTeX)
- MarkdownEditor (toolbar, inline AI popover)
- ContentCard (3D hover lift, radial cursor glow)
- ContentListItem (table row)
- AssignmentViewer (interactive Q&A)
- PageTransition (fade on route change)
- RouteProgressBar (navigation progress)
- ReadingProgressBar (scroll progress)
- AmbientParticles (canvas animation during generation)
- Toast system (success/error/info, auto-dismiss)
- NotificationCentre
- ExportMenu (MD, PDF, HTML, CSV)
- InlineAIPopover (text enhancement)
- KeyboardShortcutsModal

### UI Primitives
- Button (primary/secondary/ghost/danger, sm/md/lg)
- Card, Badge, Input, Modal, Select, Skeleton, AnimatedSVG

## Existing Animations
- stage-in (0.4s bouncy cascade)
- pop-in (0.35s scale for checkmarks)
- particle burst (4-directional)
- dropdown (Framer Motion spring — replaced CSS dropdown-in/out)
- icon-bounce
- ripple-out
- border-pulse
- slide-in-right (notifications)
- stream-chunk-fade (adaptive speed via --stream-speed)
- caret-pulse / caret-pulse-dark (streaming caret glow)
- thinking-fade-in
- shimmer (skeleton loading)
- toast-in/out
- glow-pulse
- float-slow/medium/fast
- ContentCard 3D perspective tilt + radial cursor glow
- PageTransition spring fade-in/out (Framer Motion AnimatePresence)
- Modal spring scale-in (Framer Motion AnimatePresence)
- Sidebar spring collapse/expand (Framer Motion animate width)
- GenerationForm directional slide transitions (Framer Motion AnimatePresence)
- ExportMenu staggered spring dropdown (Framer Motion)
- ContentReveal fade-in + slide-up on page content mount (Framer Motion)
- Staggered card/list reveal in Content Library (Framer Motion staggerChildren)
- Enhanced skeleton shimmer (faster 1.2s, accent-tinted gradient)

## Performance Notes
- Framer Motion used for layout animations (spring physics, layoutId)
- GPU-accelerated transforms used
- Canvas for particles (off-main-thread)
- Potential bottleneck: react-markdown re-renders on every keystroke for large docs
- localStorage JSON.stringify on every save

---

## Enhancement Backlog (Ranked by ROI)

### Priority 1 — High Impact, Low Effort
| # | Enhancement | Impact | Effort | Status |
|---|------------|--------|--------|--------|
| 1 | Sonner Toast System | High | Very Low | ⏳ Pending |
| 2 | Spring-Based Easing (Framer Motion) | High | Low | ✅ Completed (2026-04-04) |
| 3 | Animated Tab/Segment Sliding Indicator | High | Low | ✅ Completed (2026-04-04) |
| 4 | Focus Ring Polish | Med | Very Low | ⏳ Pending |
| 5 | Progressive Scroll Reveal | Med-High | Low | ⏳ Pending |

### Priority 2 — High Impact, Medium Effort
| # | Enhancement | Impact | Effort | Status |
|---|------------|--------|--------|--------|
| 6 | Adaptive-Speed Streaming Text Fade-In | High | Medium | ✅ Completed (2026-04-04) |
| 7 | Command Palette (Cmd+K) | High | Medium | ⏳ Pending |
| 8 | Dynamic Island Status Indicator | High | Medium | ⏳ Pending |
| 9 | Multi-Step Form Animated Transitions | Med-High | Medium | ✅ Completed (2026-04-04, as part of #2) |
| 10 | Animated Empty States | Med-High | Low-Med | ⏳ Pending |

### Priority 3 — Medium Impact, Various Effort
| # | Enhancement | Impact | Effort | Status |
|---|------------|--------|--------|--------|
| 11 | Frosted Matte Glass (Modals & Dropdowns) | Med-High | Very Low | ✅ Completed (2026-04-04) |
| 12 | Magnetic Hover on Buttons | Med | Low-Med | ✅ Completed (2026-04-04) |
| 13 | Animated Number Counters | Med | Low-Med | ⏳ Pending |
| 14 | Radial Cursor Glow on Cards | Med | Low-Med | ✅ Completed (2026-04-04) |
| 15 | Sidebar Collapse Animation Polish | Med | Medium | ✅ Completed (2026-04-04, as part of #2) |
| 16 | Contextual Keyboard Shortcut Hints | Low-Med | Low | ⏳ Pending |
| 17 | View Transitions API | Very High | Medium | ✅ Completed (2026-04-04) |
| 18 | Bento Grid for Content Library | High | Medium | ⏳ Pending |
| 19 | Drag-to-Reorder Content | Med-High | Medium | ⏳ Pending |
| 20 | Aurora/Mesh Gradient Backgrounds | High | Low-Med | ⏳ Pending |

### Priority 4 — Additional Enhancements
| # | Enhancement | Impact | Effort | Status |
|---|------------|--------|--------|--------|
| 23 | Parallax Depth Header + Sticky Compressed Bar | Med-High | Medium | ✅ Completed (2026-04-04) |
| 24 | Morphing Loading Skeletons | Med-High | Low-Med | ✅ Completed (2026-04-04) |

---

## Completed Enhancements

### #2 — Spring-Based Easing with Framer Motion (2026-04-04)
- **What:** Installed framer-motion and migrated 5 key components from CSS transitions/keyframes to spring physics animations. Created shared motion config with reusable spring presets and animation variants.
- **Files changed:**
  - `src/lib/motion.ts` — Created shared motion config with spring presets (springSnappy, springGentle, springBouncy, springTab) and reusable variants (scaleIn, backdropFade, dropdownVariants, staggerContainer, staggerItem, slideRight, slideLeft, fadeInUp)
  - `src/components/ui/Modal.tsx` — Migrated to AnimatePresence + motion.div with springGentle scale-in (0.95->1.0), backdrop fade, useReducedMotion support
  - `src/components/PageTransition.tsx` — Replaced CSS class-based fade with Framer Motion AnimatePresence mode="wait", spring-timed opacity+y transition on route change
  - `src/components/ExportMenu.tsx` — Replaced CSS dropdown-animate/dropdown-closing with Framer Motion AnimatePresence + dropdownVariants, staggered item entry with staggerContainer/staggerItem, removed closing state and setTimeout pattern
  - `src/components/Sidebar.tsx` — Added spring width animation on collapse/expand using motion.aside animate={{ width }}, spring-animated chevron rotation, whileHover/whileTap spring scale on nav items
  - `src/components/GenerationForm.tsx` — Added directional slide transitions (right for forward, left for back) using AnimatePresence mode="wait" with direction tracking (stepDirection state + goToStep helper)
  - `src/app/globals.css` — Removed replaced CSS: page-transition/page-enter/page-enter-active classes, dropdown-animate/dropdown-closing/dropdown-item-in keyframes
  - `src/components/MarkdownPreview.tsx` — Fixed pre-existing TS error (suppressErrors property not in MermaidConfig type)
- **Dependencies added:** framer-motion ^12.38.0 (+ motion-dom, motion-utils as transitive deps)
- **Notes:**
  - All animations respect `prefers-reduced-motion` via Framer Motion's `useReducedMotion()` hook, with instant (duration: 0) fallback transitions
  - Only `transform` and `opacity` are animated — no width/height/top/left/margin animations (sidebar width is animated via Framer Motion's optimized transform-based layout system)
  - Dark mode unaffected — no color/theme changes made
  - No layout shifts — all animations use transform-based positioning
  - CSS keyframes for icon-bounce, export-item hover effects preserved (still useful)
  - ExportMenu simplified: removed `closing` state and `setTimeout` pattern since AnimatePresence handles exit animation natively

### #3 — Animated Tab/Segment Sliding Indicator (2026-04-04)
- **What:** Added Framer Motion `layoutId`-based sliding pill indicators to all tab/segment controls
- **Files changed:**
  - `src/lib/motion.ts` — Added `springTab` transition preset (stiffness: 500, damping: 35)
  - `src/app/content/page.tsx` — Added sliding indicators to: content type filter tabs (layoutId="typeFilter"), date filter tabs (layoutId="dateFilter"), grid/list view toggle (layoutId="viewToggle")
  - `src/app/settings/page.tsx` — Added sliding indicator to theme selector (layoutId="themeToggle")
- **Dependencies added:** None (uses existing `framer-motion` ^12.38.0)
- **Notes:** Uses `motion.span` with `absolute inset-0` positioning behind text/icons (which sit at `relative z-10`). Spring physics give a satisfying settle effect. Pill color uses `bg-accent` which already adapts to dark mode via CSS custom properties. Framer Motion's layout animations use `transform` only — no layout-triggering properties animated. `prefers-reduced-motion` is handled automatically by Framer Motion.

### #6 — Adaptive-Speed Streaming Text Fade-In (2026-04-04)
- **What:** Replaced the static `stream-shimmer` text-shadow animation with an adaptive-speed system that tracks incoming token rate via a sliding window and dynamically adjusts the fade-in animation duration. Slow streams (10 chars/sec) get a gentle 200ms fade; fast streams (80+ chars/sec) get a snappy 80ms fade. Added a glowing pulsing caret that appears during streaming and fades out on completion.
- **Files changed:**
  - `src/lib/stream-speed.ts` — **NEW** — `StreamSpeedTracker` class: sliding window (2s) rate tracker with exponential smoothing, clamped linear interpolation mapping rate to animation duration (200ms slow, 80ms fast)
  - `src/components/MarkdownPreview.tsx` — Replaced old shimmer state/effect with caret visibility state management. Added `streamSpeed` prop. Removed `stream-shimmer`/`is-shimmering` classes, replaced with `stream-fade-container` that carries `--stream-speed` CSS custom property. Replaced text `|` glow-cursor with proper `<span class="stream-caret">` element that fades out on stream end.
  - `src/app/page.tsx` — Added `StreamSpeedTracker` ref and `streamSpeed` state. In the `runPipeline` callback, tracks content length deltas, records chunks in the speed tracker, and updates `streamSpeed` state. Passes `streamSpeed` to `MarkdownPreview`.
  - `src/app/globals.css` — Removed old `stream-shimmer`, `shimmer-pulse`, `is-shimmering`, `glow-cursor`, `typewriter-wrapper`, `content-fade-in` (duplicate selector) CSS. Added new `stream-fade-container` with `--stream-speed` custom property, `stream-chunk-fade` keyframe (opacity 0.4->1 + translateY 3px->0), applied to `.is-streaming > *:last-child` and `:nth-last-child(2)`. Added `caret-pulse`/`caret-pulse-dark` keyframes (box-shadow glow), `stream-caret` class (2px wide, accent-colored, pulsing), `stream-caret-exit` fade-out. Added `prefers-reduced-motion` media query to disable all streaming animations.
- **Dependencies added:** None
- **Notes:**
  - Only `transform` and `opacity` are animated (plus `box-shadow` for caret glow) — no layout-triggering properties
  - `prefers-reduced-motion` fully handled: fade-in animations disabled, caret shown static
  - Dark mode works via CSS custom properties (accent color adapts, separate caret-pulse-dark keyframe for glow colors)
  - No layout shifts: fade-in starts at opacity 0.4 (not 0) to avoid content jump perception; translateY is only 3px
  - Performance: StreamSpeedTracker uses `performance.now()` and array slice pruning — O(n) where n is chunks in 2s window (typically <40 entries)
  - The `--stream-speed` custom property is set as an inline style on the container, inherited by the CSS animation duration via `var()`
  - react-markdown re-renders on each chunk, which naturally re-triggers CSS animations on newly created DOM nodes (the `:last-child` selector catches the latest block-level element)

### #11 — Frosted Matte Glass (Modals & Dropdowns) (2026-04-04)
- **What:** Applied a heavy matte frosted glass effect to all floating UI layers (modals, dropdowns, popovers, notification panel). Background shows through as soft color/light blurs but is never legible. 92% opacity base ensures all text stays fully readable.
- **Files changed:**
  - `src/app/globals.css` — Added `.glass-panel` utility class in `@layer components` with light mode (rgba(255,255,255,0.92) + blur(16px) saturate(180%) + subtle border/shadow) and dark mode (rgba(30,30,30,0.92) + matching dark border/shadow). Includes `-webkit-backdrop-filter` for Safari.
  - `src/components/ui/Modal.tsx` — Replaced `bg-background shadow-xl` on dialog panel with `glass-panel` class. Backdrop overlay unchanged (still dark scrim with backdrop-blur-sm).
  - `src/components/ExportMenu.tsx` — Replaced `bg-background border border-border shadow-lg` on dropdown with `glass-panel` class.
  - `src/components/InlineAIPopover.tsx` — Replaced `bg-background border border-border shadow-lg` on floating popover with `glass-panel` class.
  - `src/components/NotificationCentre.tsx` — Replaced `bg-background shadow-xl` on slide-in panel with `glass-panel` class.
  - `src/components/KeyboardShortcutsModal.tsx` — No changes needed; inherits glass effect from Modal component.
- **Dependencies added:** None
- **Notes:**
  - `.glass-panel` is a reusable utility class — can be applied to any future floating UI element
  - Light mode: rgba(255,255,255,0.92), blur(16px) saturate(180%), border rgba(0,0,0,0.08), shadow 0 8px 32px rgba(0,0,0,0.08)
  - Dark mode: rgba(30,30,30,0.92), blur(16px) saturate(180%), border rgba(255,255,255,0.08), shadow 0 8px 32px rgba(0,0,0,0.3)
  - All text remains high-contrast in both themes — verified text-primary, text-secondary, accent colors against the 92% opacity frosted surface
  - Input fields within the popover retain their own solid `bg-background` so text entry contrast is unaffected
  - `<kbd>` elements in KeyboardShortcutsModal have `bg-sidebar` which provides solid contrast against the frost
  - No z-index changes, no layout shifts, no new dependencies

### #12 — Magnetic Hover on Buttons (2026-04-04)
- **What:** Added magnetic cursor-following hover effect with radial glow on primary buttons, spring-based press/release on all variants, and subtle hover scale on non-primary variants. Uses Framer Motion `motion.button`, `useMotionValue`, and `useSpring` for smooth reactive transforms.
- **Files changed:**
  - `src/components/ui/Button.tsx` — Rewrote to use `motion.button` from Framer Motion. Added `useMagneticHover()` custom hook that tracks cursor position relative to button center and applies clamped `transform: translate(dx, dy)` (max 4px) via spring-animated motion values. Added cursor-following radial glow overlay (inner `<span>` with `radial-gradient` at cursor position, uses `--magnetic-glow-color` CSS variable). Added `whileTap={{ scale: 0.96 }}` with `springSnappy` for all variants. Added `whileHover={{ scale: 1.02 }}` for secondary/ghost/danger variants. Touch device detection via `matchMedia('(hover: hover)')` disables magnetic pull and glow on touch. `useReducedMotion()` disables all effects. Disabled buttons get no effects. Added `'use client'` directive. Exported `ButtonProps` type.
  - `src/app/globals.css` — Added `--magnetic-glow-color` CSS custom property in `:root` (rgba(255,255,255,0.10)) and `.dark` (rgba(255,255,255,0.12)) for the radial glow overlay color.
- **Dependencies added:** None (uses existing `framer-motion` ^12.38.0)
- **Notes:**
  - Magnetic pull: only on primary variant, non-disabled, non-touch, non-reduced-motion. Displacement is normalized to button dimensions and clamped to 4px max. Springs back to (0,0) on mouse leave with spring physics (stiffness: 300, damping: 20, mass: 0.5).
  - Radial glow: follows cursor position inside the button. Uses `position: absolute; inset: 0; pointer-events: none; border-radius: inherit` overlay with `transition-opacity duration-200` for smooth fade in/out. Dark mode uses slightly higher opacity (12% vs 10%).
  - Press/release spring: `whileTap={{ scale: 0.96 }}` with `springSnappy` on all variants (disabled gets no tap). Replaces the old `active:bg-accent/80` Tailwind class on primary. The scale-down provides more tactile press feedback than a color change.
  - Hover scale: `whileHover={{ scale: 1.02 }}` on secondary/ghost/danger only (primary uses magnetic pull instead).
  - Primary button children are wrapped in `<span className="relative z-[1]">` to sit above the glow overlay. Non-primary buttons render children directly.
  - Only `transform` and `opacity` are animated — no layout-triggering properties. No layout shifts.
  - All existing props (onClick, className, disabled, ref, etc.) still pass through correctly.
  - TypeScript: proper types for hook return, ButtonProps extends HTMLMotionProps with Omit for conflicting event handler types.
  - Build passes, no TypeScript errors, no lint errors.

### #14 — Radial Cursor Glow on Cards (2026-04-04)
- **What:** Replaced the holographic rainbow shine CSS pseudo-element (`::before` with `radial-gradient` using `--shine-x`/`--shine-y` custom properties) with a cleaner, single-color radial cursor glow. The new glow is a 250px diffuse radial gradient centered on the cursor position, using the accent blue at low opacity. Fades in on hover and out on mouse leave with a 200ms transition.
- **Files changed:**
  - `src/components/ContentCard.tsx` — Removed `card-shine` CSS class from the inner card div. Added `glowRef` for a new overlay `<div>` with `pointer-events: none`, `position: absolute; inset: 0`, `border-radius: inherit`, `z-index: 1`, and `transition-opacity duration-200`. On mouse move, the overlay's `background` is set to `radial-gradient(250px circle at ${pxX}px ${pxY}px, glowColor, transparent 60%)` with opacity 1. On mouse leave, opacity fades to 0. Dark mode detection via `document.documentElement.classList.contains('dark')` selects the appropriate glow color. Removed `--shine-x`/`--shine-y` custom property usage. Added `relative overflow-hidden` to inner card div to contain the overlay. Added `GLOW_LIGHT` and `GLOW_DARK` constants.
  - `src/app/globals.css` — Removed `.card-shine::before` rule (the old holographic pseudo-element with rainbow gradient). Renamed section header from "Holographic Shine" to "Radial Cursor Glow". Kept `.card-3d` class (still needed for `transform-style: preserve-3d` and `will-change: transform`).
- **Dependencies added:** None
- **Notes:**
  - Light mode glow: `rgba(35, 131, 226, 0.06)` — subtle blue accent at 6% opacity
  - Dark mode glow: `rgba(107, 163, 232, 0.08)` — slightly stronger at 8% opacity for visibility against dark backgrounds
  - 3D perspective tilt effect fully preserved (unchanged)
  - Dynamic shadow on hover fully preserved (unchanged)
  - Touch device detection reused from existing `isTouchDevice` ref — glow disabled on touch
  - `prefers-reduced-motion` handled via Tailwind's `motion-reduce:transition-none` on the overlay — glow still appears but fade transition is instant
  - No layout shifts — overlay is absolutely positioned with `inset: 0`
  - No dead code — all `--shine-x`/`--shine-y` references and `.card-shine::before` CSS fully removed
  - Cards remain fully clickable, selectable, renamable, duplicatable — `pointer-events: none` on overlay ensures no interference

### #17 — View Transitions API (2026-04-04)
- **What:** Added native View Transitions API support for card-to-page morphing transitions. When clicking a content card in the library, the card title and type badge visually morph into their counterparts on the detail page. Navigating back reverses the morph. Falls back to Framer Motion AnimatePresence on browsers without View Transitions support.
- **Approach:** Manual `document.startViewTransition()` wrapping — Next.js 14.2.20 does not have `experimental.viewTransition` (that shipped in Next.js 15). Navigation calls (`router.push()`) are wrapped via a `navigateWithTransition()` helper that calls `document.startViewTransition()` when available, otherwise calls the navigate callback directly.
- **Files changed:**
  - `src/lib/view-transitions.ts` — **NEW** — Utility module with `supportsViewTransitions()` (feature detection), `navigateWithTransition()` (wraps navigation in `startViewTransition`), and `vtName()` (generates unique `view-transition-name` strings scoped to content item IDs).
  - `src/components/ContentCard.tsx` — Import `navigateWithTransition` and `vtName`. Wrapped `handleCardClick` `router.push()` in `navigateWithTransition()`. Wrapped title `<Link>` click in `navigateWithTransition()` (with `preventDefault`). Added `viewTransitionName` style to: card container (`content-card-{id}`), title link (`content-title-{id}`), type Badge (`content-badge-{id}`).
  - `src/components/ContentListItem.tsx` — Same treatment as ContentCard: wrapped `handleRowClick` in `navigateWithTransition()`, wrapped title `<Link>` click, added `viewTransitionName` to title and type Badge.
  - `src/components/ui/Badge.tsx` — Added optional `style` prop to BadgeProps interface and passed through to the `<span>` element.
  - `src/app/content/[id]/page.tsx` — Import `vtName` and `navigateWithTransition`. Added matching `viewTransitionName` to the page title `<h1>` (`content-title-{id}`) and type Badge (`content-badge-{id}`). Wrapped back-arrow `<Link>` click in `navigateWithTransition()` for reverse morph.
  - `src/components/PageTransition.tsx` — Added View Transitions coordination: detects browser support via `supportsViewTransitions()` in a `useEffect`. When native VT is available, renders children in a plain `<div>` (no Framer Motion animation) to prevent double-transition. On unsupported browsers, retains the existing AnimatePresence fade as fallback.
  - `src/app/globals.css` — Added View Transitions CSS section: `::view-transition-old/new(root)` at 250ms with ease, `::view-transition-group(*)` at 300ms for morph interpolation, `::view-transition-old/new(*)` at 250ms for crossfade, `mix-blend-mode: normal` for clean blending, and `prefers-reduced-motion` media query that sets all VT animation durations to 0.01ms.
- **Dependencies added:** None
- **Browser support:** Chrome 111+, Edge 111+, Opera 97+, Safari 18+. Firefox and older browsers fall back to Framer Motion AnimatePresence page transition.
- **Notes:**
  - `view-transition-name` values use content item UUIDs (hex + hyphens) which are valid CSS custom idents
  - Each card's transition names are unique on the library page (scoped by ID), preventing the "duplicate name" error
  - On the detail page only one set of names exists (the viewed item), so back-navigation morphs correctly to the matching card
  - The `::view-transition-group(*)` wildcard selector applies uniform timing to all named transition groups
  - No layout shifts — view transitions operate on snapshot images overlaid by the browser compositor
  - Dark mode unaffected — no color/theme changes; the browser captures snapshots in whatever theme is active
  - No `!important` except in the `prefers-reduced-motion` media query (standard pattern for view transitions)
  - PageTransition fallback is SSR-safe: `hasNativeVT` starts as `false` (renders Framer Motion path) and switches in `useEffect` after hydration

### #23 — Parallax Depth Header + Sticky Compressed Bar (2026-04-04)
- **What:** Added parallax depth effect on page headers where title and subtitle move at different scroll speeds, creating a subtle 3D illusion. When the user scrolls past the header, a compact sticky bar with frosted glass background slides into view with key navigation elements and actions.
- **Approach:** Created a reusable `useScrollHeader` hook that tracks scroll position on a container element (not window, since the app uses inner scroll containers) via Framer Motion's `useMotionValue` and `useTransform`. Created a `StickyHeader` component with `AnimatePresence` spring animation. The headers were moved inside scroll containers on pages where parallax applies, and the sticky bar uses `position: sticky` to naturally respect the sidebar layout.
- **Files changed:**
  - `src/lib/useScrollHeader.ts` — **NEW** — Custom hook providing `isCompact` boolean, `titleY`/`subtitleY`/`headerOpacity` motion values for parallax transforms, and a `scrollRef` callback ref. Accepts `threshold` (default 200) and `prefersReducedMotion` parameters. Uses passive scroll listeners on the container element.
  - `src/components/StickyHeader.tsx` — **NEW** — Reusable animated sticky header component. Uses `position: sticky; top: 0` inside scroll containers, `.glass-panel` class for frosted glass effect, `AnimatePresence` with spring animation for show/hide, reduced motion support (instant show/hide, no slide).
  - `src/app/content/page.tsx` — Moved header inside the scrollable content area. Applied `motion.div` with `titleY`/`subtitleY`/`headerOpacity` transforms on header elements for parallax. Added `StickyHeader` with title, item count, and "Generate New" button. Filters remain outside the scroll container (pinned above). Attached `scrollRef` to the content scroll container.
  - `src/app/content/[id]/page.tsx` — Added `StickyHeader` inside the markdown preview scroll container (only in non-editing preview mode). Sticky bar shows back arrow, truncated title, Edit button, and ExportMenu. Does not affect editing mode, split view, or assignment interactive view.
  - `src/app/page.tsx` — Restructured form view: moved header inside the scroll container with parallax transforms. Added `StickyHeader` with "Generate Content" text. Preview mode header remains static (complex status bars should not be parallaxed).
- **Dependencies added:** None (uses existing `framer-motion` ^12.38.0)
- **Notes:**
  - Parallax speed: title at 0.7x scroll speed (30% displacement), subtitle at 0.85x (15% displacement), header fades to 0 opacity at 75% of threshold
  - Sticky bar: 48px height, `z-30`, `glass-panel` class for frosted background, `springSnappy` transition for slide-in
  - `prefers-reduced-motion`: parallax transforms output [0, 0] (no movement), sticky bar appears/disappears instantly via `reducedMotionTransition`
  - Scroll container architecture: app uses inner `overflow-auto` divs (not `window.scrollY`), so the hook uses a ref callback to attach listeners to the correct scroll element
  - The `position: sticky` approach avoids needing to know the sidebar width — the sticky bar naturally fills the content area within `<main>`
  - No layout shifts: parallax uses `transform: translateY()` only, sticky bar is inside scroll flow
  - Dark mode works: `.glass-panel` already has dark mode variant, all text uses CSS custom property colors
  - Mobile responsive: sticky bar is full-width inside the content area, no sidebar offset needed on mobile
  - Content detail page: sticky bar only appears in preview mode, not during editing or interactive assignment view
  - All interactive elements (buttons, links, back arrow, ExportMenu) work correctly in the sticky bar
  - Content Library header threshold: 120px. Content Detail threshold: 100px. Generation form threshold: 100px.
  - Build passes with no TypeScript errors

### #24 — Morphing Loading Skeletons (2026-04-04)
- **What:** Added smooth content reveal animations that create the perception of content "materializing" from skeleton loading states. Instead of an abrupt swap when real content replaces skeletons, the real content fades in with a subtle slide-up. The Content Library grid/list uses staggered reveals where each card cascades into view with 40ms delays. The content detail page body fades in after the header (which morphs via View Transitions). Enhanced the skeleton shimmer to be faster (1.2s instead of 1.5s) with a subtle accent-tinted gradient highlight.
- **Files changed:**
  - `src/components/ContentReveal.tsx` — **NEW** — Reusable `ContentReveal` wrapper component (fade-in + slide-up via Framer Motion, 300ms duration, Material Design standard easing). Coordinates with View Transitions API (no delay when native VT available, 50ms delay otherwise to avoid overlap with PageTransition's Framer fade). Exports `staggerRevealContainer` and `staggerRevealItem` variants for cascading grid/list reveals. Full `prefers-reduced-motion` support via `useReducedMotion()`.
  - `src/app/content/page.tsx` — Wrapped grid view in `motion.div` with `staggerRevealContainer` variants; each card wrapped in `motion.div` with `staggerRevealItem`. Same treatment for list view. Used dynamic `key` prop (page/filter/search combination) so stagger re-triggers on filter/page changes.
  - `src/app/content/[id]/page.tsx` — Wrapped content body (preview mode and assignment interactive mode) in `<ContentReveal>`. Header is not wrapped (it uses View Transitions for morph). Creates a top-down reveal sequence.
  - `src/app/globals.css` — Enhanced `skeleton-shimmer` class: faster animation (1.2s, was 1.5s), `ease-in-out` timing (was linear), accent-tinted gradient highlight using `color-mix()`. Added `prefers-reduced-motion` media query to disable shimmer animation.
- **Dependencies added:** None (uses existing `framer-motion` ^12.38.0)
- **Notes:**
  - Only `opacity` and `transform` (translateY) are animated — no layout-triggering properties
  - No layout shifts — fade starts at opacity 0; translateY is only 8px
  - Dark mode unaffected — accent-tinted shimmer gradient adapts via CSS custom properties
  - View Transitions coordination: `ContentReveal` detects native VT support and adjusts delay accordingly
  - Stagger key includes currentPage, filterType, debouncedSearch, dateFilter so cascade re-triggers on filter/page changes
  - `useReducedMotion()` skips all animations; skeleton shimmer has `prefers-reduced-motion` fallback

## Rejected Suggestions
(none yet)

## Dependencies Added
- **framer-motion** ^12.38.0 — Spring physics animation library for React. Added 2026-04-04 for enhancement #2 (Spring-Based Easing). Also used by #3 (Tab Sliding Indicators).

## Conflicts & Notes
- Framer Motion (#2) is now installed — subsequent enhancements can leverage spring presets from src/lib/motion.ts
- View Transitions (#17) requires Next.js experimental flag — may conflict with page transitions
- Sonner (#1) would replace existing Toast system — clean migration needed
- Command Palette (#7) depends on new package (cmdk) — adds routing shortcuts
