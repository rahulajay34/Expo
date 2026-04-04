# UI/UX Enhancement Changes Log

**Session Date:** 2026-04-04
**Total Enhancements Implemented:** 11 (some bundled together)

---

## Dependency Added

| Package | Version | Why | Undo |
|---------|---------|-----|------|
| `framer-motion` | ^12.38.0 | Spring physics animations for React | `npm uninstall framer-motion` then revert all files below |

---

## New Files Created

These files were created from scratch. To undo, simply delete them.

| File | Enhancement | Purpose |
|------|-------------|---------|
| `src/lib/motion.ts` | #2 | Shared spring presets (springSnappy, springGentle, springBouncy, springTab) and reusable animation variants |
| `src/lib/stream-speed.ts` | #6 | `StreamSpeedTracker` class — sliding window token rate tracker for adaptive animation speed |
| `src/lib/view-transitions.ts` | #17 | Utilities: `supportsViewTransitions()`, `navigateWithTransition()`, `vtName()` |
| `src/lib/useScrollHeader.ts` | #23 | Custom hook for parallax header motion values and sticky header visibility |
| `src/components/StickyHeader.tsx` | #23 | Reusable animated sticky header with frosted glass background |
| `src/components/ContentReveal.tsx` | #24 | Content reveal wrapper with staggered animation variants |

---

## Modified Files — Detailed Changes

### `src/app/globals.css`

**Enhancements:** #2, #6, #11, #12, #14, #17, #24

**Changes made:**
- **Removed (by #2):** `.page-transition`, `.page-enter`, `.page-enter-active` classes; `dropdown-animate`, `dropdown-closing`, `dropdown-item`, `dropdown-item-in` keyframes
- **Removed (by #6):** `stream-shimmer`, `shimmer-pulse`, `is-shimmering`, `glow-cursor`, `typewriter-wrapper` CSS, duplicate `content-fade-in` rule
- **Removed (by #14):** `.card-shine::before` rule (holographic rainbow gradient pseudo-element)
- **Added (by #6):** `stream-fade-container` with `--stream-speed` CSS custom property, `stream-chunk-fade` keyframe, `.stream-caret` class, `caret-pulse`/`caret-pulse-dark` keyframes, `stream-caret-exit`, reduced-motion media query for streaming
- **Added (by #11):** `.glass-panel` utility class in `@layer components` with light (rgba(255,255,255,0.92) + blur(16px)) and dark (rgba(30,30,30,0.92) + blur(16px)) variants, includes `-webkit-backdrop-filter`
- **Added (by #12):** `--magnetic-glow-color` CSS custom property in `:root` and `.dark`
- **Added (by #14):** Renamed "Holographic Shine" section to "Radial Cursor Glow"
- **Added (by #17):** View Transitions CSS: `::view-transition-old/new(root)`, `::view-transition-group(*)`, `mix-blend-mode: normal`, reduced-motion query
- **Modified (by #24):** `skeleton-shimmer` animation: 1.2s (was 1.5s), `ease-in-out` (was linear), accent-tinted gradient via `color-mix()`, added reduced-motion media query

**To undo entirely:** Restore from git — `git checkout HEAD -- src/app/globals.css`

---

### `src/components/ui/Modal.tsx`

**Enhancements:** #2, #11

**Changes made:**
- Replaced static `if (!isOpen) return null` with Framer Motion `AnimatePresence` + `motion.div`
- Modal scales in from 0.95 to 1.0 with `springGentle`, backdrop fades
- Added `useReducedMotion()` support
- Replaced `bg-background shadow-xl` with `glass-panel` class on dialog panel

**To undo:** `git checkout HEAD -- src/components/ui/Modal.tsx`

---

### `src/components/PageTransition.tsx`

**Enhancements:** #2, #17

**Changes made:**
- Replaced CSS class-based `page-enter`/`page-enter-active` with Framer Motion `AnimatePresence mode="wait"` + `motion.div`
- Added View Transitions coordination: detects browser support, renders plain `<div>` when native VT available, retains AnimatePresence as fallback
- SSR-safe: `hasNativeVT` starts `false`, switches in `useEffect`

**To undo:** `git checkout HEAD -- src/components/PageTransition.tsx`

---

### `src/components/ExportMenu.tsx`

**Enhancements:** #2, #11

**Changes made:**
- Replaced CSS `dropdown-animate`/`dropdown-closing` with Framer Motion `AnimatePresence` + `dropdownVariants`
- Items stagger in with `staggerContainer`/`staggerItem`
- Removed `closing` state and `setTimeout` pattern
- Replaced `bg-background border border-border shadow-lg` with `glass-panel` class

**To undo:** `git checkout HEAD -- src/components/ExportMenu.tsx`

---

### `src/components/Sidebar.tsx`

**Enhancement:** #2

**Changes made:**
- `<aside>` replaced with `<motion.aside>` with spring-animated width (`animate={{ width: collapsed ? 56 : 240 }}`)
- Chevron icon spring-rotates on collapse
- Nav items have `whileHover`/`whileTap` spring scale
- Text labels fade in with delay when sidebar expands

**To undo:** `git checkout HEAD -- src/components/Sidebar.tsx`

---

### `src/components/GenerationForm.tsx`

**Enhancement:** #2

**Changes made:**
- Steps 1/2/3 wrapped in `AnimatePresence mode="wait"` with directional slide transitions
- Forward slides right, backward slides left
- Added `stepDirection` state + `goToStep` helper for direction tracking

**To undo:** `git checkout HEAD -- src/components/GenerationForm.tsx`

---

### `src/components/MarkdownPreview.tsx`

**Enhancements:** #2, #6

**Changes made:**
- Fixed pre-existing TS error (suppressErrors → removed from MermaidConfig)
- Replaced old shimmer state/effect with caret visibility management
- Added `streamSpeed` prop
- Replaced `stream-shimmer`/`is-shimmering` classes with `stream-fade-container` carrying `--stream-speed` CSS property
- Replaced text `|` glow-cursor with proper `<span class="stream-caret">` element

**To undo:** `git checkout HEAD -- src/components/MarkdownPreview.tsx`

---

### `src/components/ui/Button.tsx`

**Enhancement:** #12

**Changes made:**
- Complete rewrite from `<button>` to Framer Motion `<motion.button>`
- Added `useMagneticHover()` custom hook: cursor-following translate (max 4px) + radial glow overlay
- `whileTap={{ scale: 0.96 }}` with `springSnappy` on all variants
- `whileHover={{ scale: 1.02 }}` on secondary/ghost/danger
- Touch device detection, `useReducedMotion()`, disabled state handling
- Primary button children wrapped in `<span className="relative z-[1]">` above glow overlay

**To undo:** `git checkout HEAD -- src/components/ui/Button.tsx`

---

### `src/components/ContentCard.tsx`

**Enhancements:** #14, #17

**Changes made:**
- Removed `card-shine` CSS class, `--shine-x`/`--shine-y` custom properties
- Added `glowRef` overlay `<div>` with radial gradient glow following cursor (accent blue, 6%/8% opacity light/dark)
- Added `relative overflow-hidden` to inner card div
- Added `viewTransitionName` style to card container, title, and badge (scoped by item ID)
- Wrapped `handleCardClick` and title link click in `navigateWithTransition()`

**To undo:** `git checkout HEAD -- src/components/ContentCard.tsx`

---

### `src/components/ContentListItem.tsx`

**Enhancement:** #17

**Changes made:**
- Wrapped `handleRowClick` in `navigateWithTransition()`
- Wrapped title `<Link>` click in `navigateWithTransition()`
- Added `viewTransitionName` to title and type Badge

**To undo:** `git checkout HEAD -- src/components/ContentListItem.tsx`

---

### `src/components/ui/Badge.tsx`

**Enhancement:** #17

**Changes made:**
- Added optional `style` prop to `BadgeProps` interface and passed through to `<span>`

**To undo:** `git checkout HEAD -- src/components/ui/Badge.tsx`

---

### `src/components/InlineAIPopover.tsx`

**Enhancement:** #11

**Changes made:**
- Replaced `bg-background border border-border shadow-lg` with `glass-panel` class on floating popover

**To undo:** `git checkout HEAD -- src/components/InlineAIPopover.tsx`

---

### `src/components/NotificationCentre.tsx`

**Enhancement:** #11

**Changes made:**
- Replaced `bg-background shadow-xl` with `glass-panel` class on slide-in panel

**To undo:** `git checkout HEAD -- src/components/NotificationCentre.tsx`

---

### `src/app/page.tsx`

**Enhancements:** #6, #23

**Changes made:**
- Added `StreamSpeedTracker` ref and `streamSpeed` state
- In `runPipeline` callback: tracks content length deltas, records chunks in speed tracker, updates `streamSpeed`
- Passes `streamSpeed` prop to `MarkdownPreview`
- Restructured form view: moved header inside scroll container with parallax transforms
- Added `StickyHeader` with "Generate Content" text
- Added `useScrollHeader` hook integration

**To undo:** `git checkout HEAD -- src/app/page.tsx`

---

### `src/app/content/page.tsx`

**Enhancements:** #3, #23, #24

**Changes made:**
- Added sliding pill indicators: content type filter (layoutId="typeFilter"), date filter (layoutId="dateFilter"), grid/list toggle (layoutId="viewToggle")
- Moved header inside scrollable content area with parallax transforms (`motion.div` with `titleY`/`subtitleY`/`headerOpacity`)
- Added `StickyHeader` with title, item count, "Generate New" button
- Wrapped grid/list views in `motion.div` with `staggerRevealContainer` variants
- Each card/list item wrapped in `motion.div` with `staggerRevealItem`
- Dynamic `key` prop for re-triggering stagger on filter/page changes

**To undo:** `git checkout HEAD -- src/app/content/page.tsx`

---

### `src/app/content/[id]/page.tsx`

**Enhancements:** #17, #23, #24

**Changes made:**
- Added matching `viewTransitionName` to page title and type Badge
- Wrapped back-arrow link click in `navigateWithTransition()`
- Added `StickyHeader` inside markdown preview scroll container (preview mode only)
- Wrapped content body in `<ContentReveal>` for fade-in reveal

**To undo:** `git checkout HEAD -- "src/app/content/[id]/page.tsx"`

---

### `src/app/settings/page.tsx`

**Enhancement:** #3

**Changes made:**
- Added sliding pill indicator to theme selector (layoutId="themeToggle")

**To undo:** `git checkout HEAD -- src/app/settings/page.tsx`

---

## How to Undo Everything

To revert ALL changes from this session:

```bash
# Revert all modified files
git checkout HEAD -- src/app/globals.css src/app/page.tsx src/app/layout.tsx \
  "src/app/content/page.tsx" "src/app/content/[id]/page.tsx" \
  src/app/settings/page.tsx \
  src/components/ui/Modal.tsx src/components/ui/Button.tsx src/components/ui/Badge.tsx \
  src/components/PageTransition.tsx src/components/ExportMenu.tsx \
  src/components/Sidebar.tsx src/components/GenerationForm.tsx \
  src/components/MarkdownPreview.tsx src/components/ContentCard.tsx \
  src/components/ContentListItem.tsx src/components/InlineAIPopover.tsx \
  src/components/NotificationCentre.tsx

# Delete new files
rm src/lib/motion.ts src/lib/stream-speed.ts src/lib/view-transitions.ts \
   src/lib/useScrollHeader.ts src/components/StickyHeader.tsx \
   src/components/ContentReveal.tsx

# Uninstall framer-motion
npm uninstall framer-motion
```

## How to Undo a Single Enhancement

Each enhancement section above lists which files it changed. To undo one enhancement:
1. Find its files in the sections above
2. Check if other enhancements also modified those files — if so, you'll need a surgical revert (use `git diff` to identify the specific changes)
3. For files only touched by one enhancement, `git checkout HEAD -- <file>` is safe
4. For new files only used by one enhancement, delete them
5. Run `npx tsc --noEmit && npm run build` after reverting to verify nothing broke
