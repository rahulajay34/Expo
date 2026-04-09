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
## Status: NOT_STARTED
