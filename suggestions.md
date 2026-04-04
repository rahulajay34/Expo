# UI/UX Enhancement Suggestions Log

**Last Updated:** 2026-04-04

This file tracks all suggestions made during UI/UX enhancement sessions. It prevents duplicate suggestions in future sessions and records decisions.

---

## Implemented Suggestions

These have been built and merged into the codebase.

| # | Name | Date | Impact | Notes |
|---|------|------|--------|-------|
| 2 | Spring-Based Easing (Framer Motion) | 2026-04-04 | High | Foundational — installed framer-motion, migrated Modal, PageTransition, ExportMenu, Sidebar, GenerationForm. Also covered #9 and #15. |
| 3 | Animated Tab/Segment Sliding Indicator | 2026-04-04 | High | layoutId-based sliding pills on content type/date filters, view toggle, theme selector |
| 6 | Adaptive-Speed Streaming Text Fade-In | 2026-04-04 | High | Dynamic animation speed based on token rate (80-200ms). StreamSpeedTracker + pulsing caret. User requested dynamic speed adaptation. |
| 9 | Multi-Step Form Animated Transitions | 2026-04-04 | Med-High | Implemented as part of #2 — directional slide transitions on GenerationForm steps |
| 11 | Frosted Matte Glass (Modals & Dropdowns) | 2026-04-04 | Med-High | User requested: matte frost (not clear), both themes, clearly visible text. `.glass-panel` utility class, 92% opacity base. |
| 12 | Magnetic Hover on Buttons | 2026-04-04 | Med | Cursor-following translate (4px) + radial glow on primary buttons. Spring press/release on all variants. |
| 14 | Radial Cursor Glow on Cards | 2026-04-04 | Med | Replaced holographic rainbow shine with single-color accent glow. 250px diffuse radius. |
| 15 | Sidebar Collapse Animation Polish | 2026-04-04 | Med | Implemented as part of #2 — spring width animation, chevron rotation, nav item hover scales |
| 17 | View Transitions API | 2026-04-04 | Very High | Card-to-page morphing transitions. Manual `document.startViewTransition()` (Next.js 14 doesn't have experimental flag). Graceful Framer Motion fallback. |
| 23 | Parallax Depth Header + Sticky Compressed Bar | 2026-04-04 | Med-High | Parallax title/subtitle at different scroll speeds. Sticky frosted glass bar on scroll past threshold. Applied to all 3 main pages. |
| 24 | Morphing Loading Skeletons | 2026-04-04 | Med-High | ContentReveal wrapper with fade+slide. Staggered card cascade in library. Enhanced skeleton shimmer (faster, accent-tinted). |

---

## Skipped Suggestions

These were presented but skipped by the user. They may be revisited in future sessions but should NOT be re-suggested in the same form. If re-suggesting, present a fresh angle or combine with other ideas.

| # | Name | Impact | Effort | Why Skipped | Revisit? |
|---|------|--------|--------|-------------|----------|
| 1 | Sonner Toast System | High | Very Low | Skipped without comment | Yes — drop-in library replacement, low risk |
| 4 | Focus Ring Polish | Med | Very Low | Skipped without comment | Yes — CSS-only, very low effort |
| 5 | Progressive Scroll Reveal | Med-High | Low | Skipped without comment | Maybe — could combine with another enhancement |
| 7 | Command Palette (Cmd+K) | High | Medium | Skipped without comment | Yes — high utility for power users |
| 8 | Dynamic Island Status Indicator | High | Medium | Skipped without comment | Maybe — interesting but complex state aggregation |
| 10 | Animated Empty States | Med-High | Low-Med | Skipped without comment | Maybe — first-visit experience improvement |
| 13 | Animated Number Counters | Med | Low-Med | Skipped without comment | Maybe — nice polish detail |
| 16 | Contextual Keyboard Shortcut Hints | Low-Med | Low | Skipped without comment | Maybe — productivity feature |
| 18 | Bento Grid for Content Library | High | Medium | Skipped without comment | Maybe — layout change has higher risk |
| 19 | Drag-to-Reorder Content | Med-High | Medium | Skipped without comment | Maybe — touches storage logic |
| 20 | Aurora/Mesh Gradient Backgrounds | High | Low-Med | Skipped without comment | Yes — purely decorative, low risk |
| 21 | Animated Gradient Border on Active States | High | Low | Skipped without comment | Maybe — CSS-only active state indicator |
| 22 | Smooth Content Type Selection Cards | Med-High | Low | Skipped without comment | Maybe — first interaction polish |
| 25 | Ripple Click Feedback | Med | Low | Skipped without comment | Maybe — could feel overdone with existing magnetic hover |
| 26 | Smart Scroll-to-Top FAB | Med | Very Low | Skipped without comment | Yes — genuinely useful UX addition |
| 27 | Contextual Tooltips with Spring Animation | Med | Very Low | Skipped without comment | Yes — helps discoverability of icon-only buttons |

---

## Rejected Suggestions

These were explicitly rejected ("no") by the user. Do NOT re-suggest these.

(none yet)

---

## Future Suggestion Guidelines

When generating new suggestions in future sessions:

1. **Check this file first.** Never re-suggest an implemented or rejected item.
2. **Skipped items can be revisited** but must be presented with a fresh angle, combined with other ideas, or offered only if the user asks.
3. **New ideas should not conflict** with implemented enhancements (e.g., don't suggest replacing the View Transitions system that was just built).
4. **Build on what exists.** New suggestions should leverage the motion system (framer-motion, spring presets in `src/lib/motion.ts`), the `.glass-panel` utility, the `ContentReveal` component, and the `useScrollHeader` hook.
5. **Research fresh trends.** Don't recycle the same 2025 research — look for what's new.
