# Agent 23: Mobile Optimizations

## Suggestions Covered: S-086, S-087, S-088, S-089, S-090, S-091, S-092
## Category: Mobile
## Priority: P2
## Dependencies: none
## Files to Read Before Starting: src/app/layout.tsx, src/app/globals.css, src/components/Sidebar.tsx, src/components/MarkdownPreview.tsx, src/components/ui/Modal.tsx, src/components/InlineAIPopover.tsx, src/components/NotificationCentre.tsx, src/components/ExportMenu.tsx
## Files to Modify: src/app/layout.tsx, src/app/globals.css, src/components/Sidebar.tsx, src/components/MarkdownPreview.tsx, src/components/ui/Modal.tsx, src/components/InlineAIPopover.tsx, src/components/NotificationCentre.tsx, src/components/ExportMenu.tsx

## Detailed Plan:

### S-086: Safe-area-inset
1. In layout.tsx, add `viewport-fit=cover` to viewport meta tag
2. Layout already has `pb-[calc(3.5rem+env(safe-area-inset-bottom))]` — verify coverage
3. Check Sidebar and MobileBottomNav for safe-area padding

### S-087: 100dvh
1. In globals.css, add: `html, body { min-height: 100dvh; }` with fallback `min-height: 100vh`
2. Update any `h-screen` usage to use `min-h-dvh` (Tailwind 3.4+)

### S-088: touch-action: manipulation
1. In globals.css, expand the existing mobile-only rule to all interactive elements at all breakpoints:
   ```css
   button, a, [role="button"], input, select, textarea, label { touch-action: manipulation; }
   ```

### S-089: Responsive mermaid diagrams
1. In globals.css or MarkdownPreview, add:
   ```css
   .mermaid-container { max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }
   ```
2. Add shadow hint on overflow

### S-090: Sidebar icon-rail on tablet
1. In Sidebar, add a `lg:` breakpoint behavior:
   - `md:w-14 lg:w-60` (icon-only rail at md, full sidebar at lg)
   - Between 768-1024px: show only icons, hide labels
   - On hover/focus, expand temporarily

### S-091: Touch targets 44x44
1. Add global CSS rule:
   ```css
   @media (hover: none) and (pointer: coarse) {
     button, a, [role="button"], input[type="checkbox"], input[type="radio"] {
       min-height: 44px; min-width: 44px;
     }
   }
   ```

### S-092: Viewport-aware modals/popovers
1. In Modal.tsx: add `max-height: calc(100dvh - 2rem)` and `overflow-y: auto` to panel
2. In InlineAIPopover: clamp position to viewport bounds (partially exists — verify)
3. In NotificationCentre: add safe-area padding at bottom
4. In ExportMenu: ensure dropdown doesn't overflow bottom of screen

## Edge Cases to Handle:
- Icon-rail sidebar must still show active route indicator
- Touch target rule must not bloat desktop layout (media query scoped)
- Mermaid scroll container must work with the existing MermaidChart component

## Testing Plan: Build passes. Test on mobile viewport in DevTools.
## Status: DONE

## Summary
All 7 mobile optimization suggestions implemented:

- **S-086**: Verified `viewport-fit=cover` already present in layout.tsx. Safe-area padding confirmed on `<main>` (`pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]`) and MobileBottomNav (`paddingBottom: env(safe-area-inset-bottom)`). No changes needed.
- **S-087**: Added `min-height: 100vh` (fallback) + `min-height: 100dvh` to `html, body` in globals.css. Replaced `h-screen` with `min-h-screen min-h-dvh` on `<body>` in layout.tsx and sidebar `<aside>`.
- **S-088**: Expanded `touch-action: manipulation` from mobile-only (`@media max-width: 640px`) to all interactive elements globally (`button, a, [role="button"], input, select, textarea, label`).
- **S-089**: Added responsive mermaid container CSS (`max-width: 100%`, `overflow-x: auto`, `-webkit-overflow-scrolling: touch`) plus scroll shadow hints for both light and dark mode.
- **S-090**: Sidebar icon-rail already implemented via the existing `collapsed` state with `animate={{ width: collapsed ? 56 : 240 }}`. Labels already hidden when collapsed. Active route indicator preserved via `layoutId="sidebarActiveIndicator"`. No additional changes needed.
- **S-091**: Added global `@media (hover: none) and (pointer: coarse)` rule enforcing `min-height: 44px; min-width: 44px` on interactive elements.
- **S-092**: Added `max-height: calc(100dvh - 2rem)` + `overflow-y: auto` to Modal panel, InlineAIPopover, and ExportMenu dropdown. Added safe-area bottom padding + `max-height: 100dvh` to NotificationCentre slide-in panel.

## Changelog
- `src/app/globals.css` — Added 100dvh min-height, global touch-action: manipulation, 44x44 touch targets, responsive mermaid container with scroll shadows
- `src/app/layout.tsx` — Replaced `h-screen` with `min-h-screen min-h-dvh` on body
- `src/components/Sidebar.tsx` — Replaced `h-screen` with `min-h-screen min-h-dvh` on aside
- `src/components/ui/Modal.tsx` — Added viewport-clamped max-height and scrollable content area
- `src/components/InlineAIPopover.tsx` — Added max-height and overflow-y for viewport clamping
- `src/components/ExportMenu.tsx` — Added max-height and overflow-y to dropdown
- `src/components/NotificationCentre.tsx` — Added safe-area bottom padding and max-height to slide-in panel
