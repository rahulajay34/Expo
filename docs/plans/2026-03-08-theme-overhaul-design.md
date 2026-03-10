# Theme Overhaul Design — GCCP
**Date:** 2026-03-08
**Status:** Approved
**Direction:** Modern Productivity (Direction A)

---

## Problem Statement

The current GCCP UI gives off "AI generated" vibes — heavy indigo/purple gradients, glowing effects, particle animations, glassmorphism, and floating icons. The goal is a complete theme overhaul to a clean, editorial, typography-first design inspired by Codera (fleet management site) and Buunto (Notion-like workspace).

---

## Design Direction: Modern Productivity

**Inspiration:** Codera × Notion × Linear
**Feeling:** Human, purposeful, typographic — not AI, not bubbly, not glowy

---

## 1. Global Design System

### Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Background | `#FAFAFA` | `#111111` | Page background |
| Surface | `#FFFFFF` | `#1A1A1A` | Cards, panels |
| Text | `#111111` | `#F9FAFB` | Primary text |
| Subtle | `#6B7280` | `#9CA3AF` | Muted text, labels |
| Border | `#E5E5E5` | `#2A2A2A` | All dividers and card borders |
| Accent | `#D97706` | `#F59E0B` | Amber — active states, highlights |
| Accent bg | `#FEF3C7` | `#451A03` | Selected/active backgrounds |
| Destructive | `#DC2626` | `#EF4444` | Error states |

**What's removed:** All indigo/purple/violet colors, all OKLCH glow classes, all gradient meshes, glassmorphism.

### Typography

| Role | Font | Weight | Size | Tracking |
|------|------|--------|------|---------|
| Display (h1) | Space Grotesk | 900 | 64-72px | -0.04em |
| Heading (h2) | Space Grotesk | 800 | 40-48px | -0.03em |
| Sub-heading (h3) | Space Grotesk | 700 | 28-32px | -0.02em |
| UI heading (h4-h6) | Space Grotesk | 600 | 16-22px | -0.01em |
| Body | Inter | 400 | 16px | 0 |
| UI label | Inter | 500 | 14px | 0 |
| Section label | Inter | 500 | 10px | 0.12em uppercase |
| Code | JetBrains Mono | 400 | 14px | 0 |

**Loading:** Space Grotesk via Google Fonts (`next/font/google`)

### Design Tokens

```
Border radius:    6px (reduced from 10px)
Card shadow:      none — 1px border only
Focus ring:       2px solid #D97706
Transition:       150ms ease
Button height:    36px (sm), 40px (default), 44px (lg)
```

---

## 2. Sidebar & Navbar

### Sidebar
- Background: `#FFFFFF`, right border `1px #E5E5E5`
- Logo: "GCCP" in Space Grotesk 800, black square icon
- Section labels: `NAVIGATION`, `PREFERENCES` — Inter 500 10px uppercase, `#6B7280`
- Nav items: No icon background circles; icon 16px `#6B7280` → `#111111` on active
- Active indicator: 2px left border `#D97706` (amber)
- Theme toggle: Minimal text row (Light / Dark / System)
- User area: "Local Session" in 12px `#6B7280`

### Navbar
- Background: `#FFFFFF` solid (no blur/glass)
- Bottom border: `1px #E5E5E5`
- Height: 52px
- Page badge: 12px Inter 500, `#6B7280`
- Cost display: Amber `#D97706` text
- Status: amber "Generating..." / `#6B7280` "Ready"

---

## 3. Landing Page

### Hero Section
- Background: `#FAFAFA` flat — no gradient mesh, no orbs, no particles
- Layout: Left-aligned on desktop
- Headline: Space Grotesk 900, 72px, `#111111`, -0.04em — "Generate Curriculum-Ready Course Content."
- One keyword gets a thin `#D97706` amber underline
- Subheadline: 16px Inter, `#6B7280`, max-width 480px
- CTA buttons: `#111111` fill primary / `1px #E5E5E5` border secondary
- Stats row: "7 Agents · ~90s · 3 Content Types" — Inter 500 small, `#6B7280`, no badge backgrounds
- **Removed:** floating icons, particle dots, gradient orbs, mesh background

### Content Modes Section (3 cards)
- White `#FFFFFF` cards, `1px #E5E5E5` border, 6px radius
- Flat 20px icon in `#111111` — no colored circles
- Hover: border darkens to `#111111`
- Tag pill: 11px uppercase `#D97706` on `#FEF3C7` bg

### How It Works Section
- Step numbers 01-07 in Space Grotesk 700, large `#E5E5E5` behind number
- Clean vertical progress line, no rainbow colors

---

## 4. Editor Workspace

- Generate button: `#111111` fill, white text; amber ring on focus
- Input fields: `1px #E5E5E5` border → darkens to `#111111` on focus
- Tabs: Underline style — 2px `#D97706` amber line on active
- Pipeline stepper: Step numbers 01-07 Space Grotesk, monochrome bars (`#E5E5E5` → `#111111` fill)
- Quality score: "87/100" Space Grotesk 800; bar fills amber
- Cost panel: `#D97706` for total, `#6B7280` for line items
- API key / Error banners: Left-border accent style (no heavy background fills)

---

## 5. Archives & Settings

### Archives
- Cards: `1px #E5E5E5` border, no shadow
- Content type badge: amber for Lecture, gray others
- Search: clean `1px #E5E5E5` border input
- Pagination: text-only "← 1 2 3 →"

### Settings
- Section headers: Space Grotesk 600, `#111111`, with `1px #E5E5E5` divider
- Document-like layout (not card-wrapped)
- API key input: full width, `1px #E5E5E5`, amber focus border

---

## What Gets Removed

- [ ] All `glow-primary`, `glow-secondary`, `glow-accent` CSS classes
- [ ] All gradient mesh / radial orb backgrounds
- [ ] All particle/floating icon animations on landing page
- [ ] Glassmorphism `.glass` class
- [ ] All indigo/purple/violet color references
- [ ] `pulse-border` animation on cards
- [ ] Colored icon background circles in sidebar

---

## Implementation Notes

- Space Grotesk loaded via `next/font/google` in `layout.tsx`
- OKLCH color system kept as the CSS variable format, values replaced
- Dark mode colors updated to match new palette
- All 5 accent theme overrides (`[data-accent]`) updated or removed
- `globals.css` is the primary change surface (~60% of changes)
- Component files that need updates: `sidebar.tsx`, `navbar.tsx`, hero components (4 files), landing page sections
- Editor, archives, settings pages updated via CSS token changes mostly
