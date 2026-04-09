# Agent 15: Performance — CSS & GPU Optimizations

## Suggestions Covered: S-014, S-015, S-016, S-017
## Category: Perf-Frontend
## Priority: P2
## Dependencies: none
## Files to Read Before Starting: src/app/globals.css, src/components/PhysicsScroll.tsx, src/lib/motion.ts, src/components/ContentCard.tsx, src/components/PipelineTimeline.tsx
## Files to Modify: src/app/globals.css, src/components/PhysicsScroll.tsx, src/components/ContentCard.tsx, src/components/MarkdownPreview.tsx, src/components/PipelineTimeline.tsx

## Detailed Plan:

### S-014: content-visibility: auto
1. Add `content-visibility: auto; contain-intrinsic-size: auto 200px;` to ContentCard wrapper
2. Add to MarkdownPreview sections (`.markdown-body > *` below fold)
3. Add to PipelineTimeline when not visible

### S-015: Gate PhysicsScroll on device
1. PhysicsScroll already has `isMobile` check with `MOBILE_FACTOR = 0.5`
2. Enhance: on `matchMedia('(max-width: 768px)')`, skip parallax entirely (return static 0 values)
3. Also skip when `prefers-reduced-motion` is true (already handled)

### S-016: Replace backdrop-filter: blur on dropdowns
1. In globals.css, create `.glass-panel-solid` variant without backdrop-filter
2. Apply to menus/dropdowns, keep `.glass-panel` for modals only
3. Target: ExportMenu dropdown, NotificationCentre panel, InlineAIPopover

### S-017: Toggle will-change on animation
1. motion.ts doesn't use will-change directly — framer-motion manages it
2. For the PhysicsScroll parallax values: since will-change isn't manually set, this is already handled
3. Mark as no-action-needed (framer-motion auto-promotes)

## Edge Cases to Handle:
- `content-visibility: auto` can cause scroll position issues — test with long content
- Solid panel must still look good in both light and dark mode

## Testing Plan: Build passes. Visual check on mobile viewport.
## Status: DONE

## Summary

### S-014: content-visibility: auto
- Added `.cv-auto` utility class to `globals.css` (`content-visibility: auto; contain-intrinsic-size: auto 200px`)
- Applied to ContentCard outer wrapper div
- Applied to PipelineTimeline `motion.div` root
- Added CSS rule in `globals.css` targeting `.markdown-body > *:nth-child(n+3)` to skip paint for below-fold markdown sections (first 2 children remain eager for above-fold rendering)

### S-015: Gate PhysicsScroll on device
- Replaced `isMobile` `window.innerWidth` check + `MOBILE_FACTOR = 0.5` halving with `matchMedia('(max-width: 768px)')` that sets `isDisabled = true` on mobile — parallax returns static 0 values entirely
- Removed unused `MOBILE_FACTOR` constant
- `prefers-reduced-motion` gate was already present via `useReducedMotion()`

### S-016: glass-panel-solid
- Added `.glass-panel-solid` and `.dark .glass-panel-solid` to `globals.css` — same visual as `.glass-panel` but without `backdrop-filter`/`-webkit-backdrop-filter`
- Applied to `ExportMenu` dropdown `motion.div` (was `glass-panel`)
- Applied to `NotificationCentre` slide-in panel `div` (was `glass-panel`)
- `.glass-panel` retained unchanged for modals/InlineAIPopover

### S-017: framer-motion will-change — no action needed
- `src/lib/motion.ts` contains no manual `will-change` properties
- Framer-motion auto-promotes animated elements during active animations and removes the hint when idle
- Confirmed no-op as planned
