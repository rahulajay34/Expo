# Theme Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the "AI-generated" indigo/violet/glassmorphism aesthetic with a clean, editorial, Modern Productivity design (Space Grotesk + Inter, amber accent, flat white surfaces).

**Architecture:** Mostly CSS token replacement in `globals.css` + targeted component edits to remove hardcoded indigo/violet/gradient colors. No layout changes — only visual layer. Font swap from Inter-only to Space Grotesk (headings) + Inter (body/UI).

**Tech Stack:** Next.js App Router, Tailwind CSS 4, CSS custom properties (OKLCH), `next/font/google`, Framer Motion (kept but animations simplified)

**Design doc:** `docs/plans/2026-03-08-theme-overhaul-design.md`

---

## Task 1: Add Space Grotesk Font

**Files:**
- Modify: `src/app/layout.tsx` (lines 13-17, 79)

**Step 1: Add Space Grotesk import alongside Inter**

In `src/app/layout.tsx`, replace the font import block:

```tsx
// BEFORE (lines 13-17):
import { Inter } from 'next/font/google'
const inter = Inter({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap',
})

// AFTER:
import { Inter, Space_Grotesk } from 'next/font/google'

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-display',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})
```

**Step 2: Apply both font variables to body**

Find the `<body>` tag (line ~79) and add both font variables:

```tsx
// BEFORE:
<body className={`${inter.variable} antialiased`}>

// AFTER:
<body className={`${inter.variable} ${spaceGrotesk.variable} antialiased`}>
```

**Step 3: Verify**

Run `pnpm dev` and open browser dev tools. Check that `--font-display` and `--font-sans` CSS variables appear on `<body>`.

**Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(theme): add Space Grotesk as display font"
```

---

## Task 2: Overhaul Color Tokens in globals.css

**Files:**
- Modify: `src/app/globals.css` (lines 79-310)

**Step 1: Replace light theme color tokens (lines 79-142)**

Replace the entire `:root { ... }` block (everything between the `/* Light theme */` comment and the `.dark {` block) with:

```css
:root {
  /* Base */
  --background: oklch(0.979 0.002 247);        /* #FAFAFA */
  --foreground: oklch(0.13 0.01 265);           /* #111111 */

  /* Surfaces */
  --card: oklch(1 0 0);                          /* #FFFFFF */
  --card-foreground: oklch(0.13 0.01 265);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.13 0.01 265);

  /* Brand — Amber accent */
  --primary: oklch(0.637 0.161 49);             /* #D97706 amber */
  --primary-foreground: oklch(1 0 0);

  /* Neutral surfaces */
  --secondary: oklch(0.96 0.004 260);           /* very light gray */
  --secondary-foreground: oklch(0.13 0.01 265);
  --muted: oklch(0.96 0.004 260);
  --muted-foreground: oklch(0.48 0.01 265);     /* #6B7280 */
  --accent: oklch(0.972 0.04 80);               /* #FEF3C7 amber tint */
  --accent-foreground: oklch(0.637 0.161 49);   /* amber text */

  /* Status */
  --destructive: oklch(0.577 0.245 27);
  --destructive-foreground: oklch(0.985 0.002 0);
  --success: oklch(0.55 0.18 155);
  --success-foreground: oklch(1 0 0);
  --warning: oklch(0.637 0.161 49);
  --warning-foreground: oklch(1 0 0);
  --info: oklch(0.58 0.17 230);
  --info-foreground: oklch(1 0 0);

  /* Borders & inputs */
  --border: oklch(0.906 0.006 260);             /* #E5E5E5 */
  --input: oklch(0.906 0.006 260);
  --ring: oklch(0.637 0.161 49);                /* amber focus ring */

  /* Radius */
  --radius: 0.375rem;                            /* 6px — reduced from 10px */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-2xl: 1rem;
  --radius-3xl: 1.25rem;
  --radius-4xl: 1.5rem;

  /* Sidebar */
  --sidebar: oklch(1 0 0);
  --sidebar-foreground: oklch(0.13 0.01 265);
  --sidebar-primary: oklch(0.637 0.161 49);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.96 0.004 260);
  --sidebar-accent-foreground: oklch(0.13 0.01 265);
  --sidebar-border: oklch(0.906 0.006 260);
  --sidebar-ring: oklch(0.637 0.161 49);
}
```

**Step 2: Replace dark theme color tokens (lines 148-209)**

Replace the `.dark { ... }` block with:

```css
.dark {
  --background: oklch(0.13 0.01 265);          /* #111111 */
  --foreground: oklch(0.97 0.004 260);          /* #F9FAFB */
  --card: oklch(0.17 0.01 265);                 /* #1A1A1A */
  --card-foreground: oklch(0.97 0.004 260);
  --popover: oklch(0.17 0.01 265);
  --popover-foreground: oklch(0.97 0.004 260);
  --primary: oklch(0.72 0.155 58);              /* #F59E0B brighter amber */
  --primary-foreground: oklch(0.13 0.01 265);
  --secondary: oklch(0.21 0.01 265);
  --secondary-foreground: oklch(0.97 0.004 260);
  --muted: oklch(0.21 0.01 265);
  --muted-foreground: oklch(0.61 0.01 265);     /* #9CA3AF */
  --accent: oklch(0.22 0.04 60);                /* dark amber tint */
  --accent-foreground: oklch(0.72 0.155 58);
  --destructive: oklch(0.65 0.22 27);
  --destructive-foreground: oklch(0.13 0.01 265);
  --success: oklch(0.65 0.17 155);
  --success-foreground: oklch(0.13 0.01 265);
  --warning: oklch(0.72 0.155 58);
  --warning-foreground: oklch(0.13 0.01 265);
  --info: oklch(0.68 0.16 230);
  --info-foreground: oklch(0.13 0.01 265);
  --border: oklch(0.23 0.01 265);               /* #2A2A2A */
  --input: oklch(0.23 0.01 265);
  --ring: oklch(0.72 0.155 58);
  --sidebar: oklch(0.15 0.01 265);
  --sidebar-foreground: oklch(0.97 0.004 260);
  --sidebar-primary: oklch(0.72 0.155 58);
  --sidebar-primary-foreground: oklch(0.13 0.01 265);
  --sidebar-accent: oklch(0.21 0.01 265);
  --sidebar-accent-foreground: oklch(0.97 0.004 260);
  --sidebar-border: oklch(0.23 0.01 265);
  --sidebar-ring: oklch(0.72 0.155 58);
}
```

**Step 3: Remove / replace accent theme overrides (lines 217-310)**

Delete the entire `[data-accent="blue"]`, `[data-accent="emerald"]`, `[data-accent="rose"]`, `[data-accent="amber"]` blocks. The app now has one accent (amber) built into the base tokens. Replace with a comment:

```css
/* Accent themes removed — amber is the single brand accent */
```

**Step 4: Verify build**

```bash
pnpm build
```
Expected: zero TypeScript errors (this is CSS only, should be clean).

**Step 5: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): replace OKLCH color tokens with editorial amber/neutral palette"
```

---

## Task 3: Update Typography in globals.css

**Files:**
- Modify: `src/app/globals.css` (typography section)

**Step 1: Find the `@layer base` typography block and replace heading styles**

Find where `h1, h2, h3...` are defined and replace:

```css
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
    font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: var(--font-display, var(--font-sans, ui-sans-serif));
    @apply tracking-tight text-foreground;
  }

  h1 {
    @apply text-5xl font-black lg:text-7xl;
    letter-spacing: -0.04em;
    line-height: 1.05;
  }

  h2 {
    @apply text-4xl font-extrabold lg:text-5xl;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  h3 {
    @apply text-2xl font-bold lg:text-3xl;
    letter-spacing: -0.02em;
  }

  h4 {
    @apply text-xl font-semibold lg:text-2xl;
    letter-spacing: -0.01em;
  }

  h5 {
    @apply text-base font-semibold lg:text-lg;
  }

  h6 {
    @apply text-sm font-semibold lg:text-base;
  }

  p {
    line-height: 1.75;
  }
}
```

**Step 2: Add display font utility class**

Add this utility class (can go after the `@layer base` block):

```css
@layer utilities {
  .font-display {
    font-family: var(--font-display, var(--font-sans, ui-sans-serif));
  }

  .font-sans {
    font-family: var(--font-sans, ui-sans-serif, system-ui, sans-serif);
  }
}
```

**Step 3: Verify in browser**

Run `pnpm dev`. Open app. Headings should render in Space Grotesk (geometric, modern). Body text stays Inter.

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): apply Space Grotesk for display headings with tighter tracking"
```

---

## Task 4: Remove Glow, Glass, Gradient Utility Classes from globals.css

**Files:**
- Modify: `src/app/globals.css` (lines 461-534)

**Step 1: Remove glass morphism classes**

Find and delete the `.glass`, `.glass-subtle`, `.glass-strong` blocks (around lines 461-475). Replace with nothing (no equivalent needed).

**Step 2: Remove gradient text and background utilities**

Find and delete `.text-gradient`, `.bg-gradient-primary`, `.bg-gradient-subtle`, `.bg-gradient-mesh` (around lines 476-499).

**Step 3: Remove glow effects**

Find and delete `.glow-primary`, `.glow-secondary`, `.glow-accent`, `.glow-success` (around lines 526-534).

**Step 4: Remove surface elevation overrides with indigo tints**

Find `.surface-0`, `.surface-1`, `.surface-2`, `.surface-3` — if they use colored backgrounds, simplify:

```css
/* Surface levels — flat, border-based */
.surface-0 { @apply bg-background; }
.surface-1 { @apply bg-card; }
.surface-2 { @apply bg-secondary; }
.surface-3 { @apply bg-muted; }
```

**Step 5: Remove `dot-grid-pulse` animation keyframe and class**

Find `@keyframes dot-grid-pulse` and the `.dot-grid-pulse` class that uses it. Delete both (the particle grid is being removed from the hero).

**Step 6: Verify build**

```bash
pnpm build
```

If build errors appear (components reference deleted classes), note the file names — those components will be updated in later tasks.

**Step 7: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): remove glass/glow/gradient utility classes"
```

---

## Task 5: Redesign Sidebar

**Files:**
- Modify: `src/components/layout/sidebar.tsx`

**Step 1: Read the file**

Read `src/components/layout/sidebar.tsx` fully. Understand the JSX structure.

**Step 2: Update logo area (lines ~71-104)**

Replace the gradient logo container:

```tsx
// REMOVE: gradient div wrapping the "G" icon
// REPLACE with:
<div className="flex items-center gap-3 px-4 py-5">
  {/* Black square logo mark */}
  <div className="flex h-7 w-7 items-center justify-center rounded bg-foreground text-background flex-shrink-0">
    <span className="font-display text-xs font-black">G</span>
  </div>
  {isExpanded && (
    <motion.span
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      className="font-display text-base font-bold tracking-tight text-foreground"
    >
      GCCP
    </motion.span>
  )}
</div>
```

**Step 3: Add section label before nav items**

Before the nav links list, add:

```tsx
{isExpanded && (
  <p className="px-4 pb-1 pt-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
    Navigation
  </p>
)}
```

**Step 4: Update nav item active/hover styles**

Find the nav item rendering. Replace any `bg-sidebar-accent` with:

```tsx
// Active item:
className={cn(
  "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
  isActive
    ? "text-foreground font-medium"
    : "text-muted-foreground hover:text-foreground"
)}

// Active amber left indicator:
{isActive && (
  <span className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary" />
)}
```

**Step 5: Remove icon background circles**

Nav icons should be bare — no `bg-*` wrapper div. Just the icon directly with color transition:

```tsx
<Icon className={cn("h-4 w-4 flex-shrink-0", isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")} />
```

**Step 6: Update theme toggle area**

Add section label before theme toggle:

```tsx
{isExpanded && (
  <p className="px-4 pb-1 pt-4 text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
    Preferences
  </p>
)}
```

**Step 7: Update user area**

Remove avatar styling with colored bg. Simplify:

```tsx
<div className="px-4 py-3 border-t border-border">
  <div className="flex items-center gap-2">
    <div className="h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center">
      <span className="text-[10px] font-medium text-muted-foreground">E</span>
    </div>
    {isExpanded && (
      <span className="text-xs text-muted-foreground">Local Session</span>
    )}
  </div>
</div>
```

**Step 8: Update sidebar container border**

Ensure the sidebar wrapper uses `border-r border-border` (not shadow):

```tsx
// On the outer sidebar div, ensure:
className="... border-r border-border bg-sidebar ..."
// Remove any shadow classes
```

**Step 9: Verify visually**

Run `pnpm dev`. Sidebar should look Notion-like: white bg, section labels in small caps, amber left-border active indicator, no icon circles.

**Step 10: Commit**

```bash
git add src/components/layout/sidebar.tsx
git commit -m "feat(theme): redesign sidebar to editorial minimal style"
```

---

## Task 6: Update Navbar

**Files:**
- Modify: `src/components/layout/navbar.tsx`

**Step 1: Remove glass/blur from header container (line ~57)**

```tsx
// BEFORE:
className="... bg-background/80 backdrop-blur-md ..."

// AFTER:
className="... bg-background border-b border-border ..."
```

**Step 2: Update page badge (line ~102)**

```tsx
// BEFORE: uses bg-secondary with some color
// AFTER: plain text, no background pill
<span className="text-xs font-medium text-muted-foreground">{currentPage}</span>
```

**Step 3: Update status indicator (lines ~135-136)**

Remove hardcoded color classes. Use CSS tokens:

```tsx
// Generating state:
className="... bg-warning/10 text-warning ..."

// Ready state:
className="... text-muted-foreground ..."
```

**Step 4: Commit**

```bash
git add src/components/layout/navbar.tsx
git commit -m "feat(theme): clean up navbar — solid bg, remove glass effect"
```

---

## Task 7: Redesign Hero Section

**Files:**
- Modify: `src/components/features/landing/hero-section.tsx`

**Step 1: Read the complete file**

Read `src/components/features/landing/hero-section.tsx` in full.

**Step 2: Remove particle/orb/floating icon components**

Delete or comment out:
- `generateFloatingDots()` function (lines ~43-81)
- `floatingDotElements` memo (lines ~108-134)
- The 3 gradient orb `motion.div` elements (lines ~144-196)
- The dot grid overlay div (lines ~199-227)
- The `floatingIcons` array and its rendering (lines ~29-36, ~240-265)

**Step 3: Simplify background**

Replace the complex background section with:

```tsx
{/* Clean background — one subtle grain texture */}
<div className="absolute inset-0 bg-background" />
{/* Optional: very subtle dot grid, static (no animation) */}
<div
  className="absolute inset-0 opacity-[0.03]"
  style={{
    backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
    backgroundSize: '24px 24px',
  }}
/>
```

**Step 4: Rewrite the hero content section**

Replace the centered layout with left-aligned editorial layout:

```tsx
<section className="relative min-h-[90vh] flex items-center overflow-hidden">
  {/* Background */}
  <div className="absolute inset-0 bg-background" />
  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

  <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 w-full">
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-3xl"
    >
      {/* Label */}
      <p className="mb-6 text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
        AI-Powered Course Content
      </p>

      {/* Headline */}
      <h1 className="font-display text-5xl font-black leading-[1.05] tracking-[-0.04em] text-foreground sm:text-6xl lg:text-7xl">
        Generate{' '}
        <span className="relative">
          Curriculum-Ready
          {/* Amber underline */}
          <span className="absolute bottom-1 left-0 h-[3px] w-full bg-primary opacity-70 rounded-full" />
        </span>
        {' '}Course Content.
      </h1>

      {/* Subheadline */}
      <p className="mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed">
        A 7-agent AI pipeline that generates lecture notes, pre-reads, and assignments — tailored to your curriculum, ready in seconds.
      </p>

      {/* CTA Buttons */}
      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button asChild size="lg" className="bg-foreground text-background hover:bg-foreground/90 rounded-md font-medium">
          <Link href="/editor">Start Generating</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-md border-border text-foreground hover:bg-secondary font-medium">
          <Link href="/archives">View Library</Link>
        </Button>
      </div>

      {/* Stats row */}
      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2">
        {[
          { value: '7', label: 'Agents' },
          { value: '~90s', label: 'Generation time' },
          { value: '3', label: 'Content types' },
          { value: '100%', label: 'Local & private' },
        ].map((stat, i) => (
          <div key={i} className="flex items-baseline gap-1.5">
            <span className="font-display text-xl font-bold text-foreground">{stat.value}</span>
            <span className="text-sm text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  </div>
</section>
```

**Step 5: Verify visually**

Run `pnpm dev`. Navigate to `/`. Hero should be: clean white/near-white bg, large bold left-aligned headline, amber underline on "Curriculum-Ready", clean stat row — no particles, no orbs.

**Step 6: Commit**

```bash
git add src/components/features/landing/hero-section.tsx
git commit -m "feat(theme): redesign hero — remove particles/orbs, editorial left-aligned layout"
```

---

## Task 8: Update Content Modes Section

**Files:**
- Modify: `src/components/features/landing/content-modes-section.tsx`

**Step 1: Read the file**

**Step 2: Replace hardcoded color objects (lines ~11-60)**

The 3 mode objects have hardcoded Tailwind indigo/emerald/amber classes. Replace with neutral + amber:

```tsx
const contentModes = [
  {
    title: 'Lecture Notes',
    tag: 'Deep Dive',
    icon: BookOpen,
    description: 'Comprehensive notes with explanations, analogies, and key takeaways ready for classroom use.',
    features: ['Structured sections', 'Analogies & examples', 'Key takeaways', 'KaTeX math support'],
  },
  {
    title: 'Pre-Reads',
    tag: 'Primer',
    icon: Lightbulb,
    description: 'Introductory material to prime students before class — accessible and engaging.',
    features: ['Prerequisite concepts', 'Common misconceptions', 'Practice questions', 'Mermaid diagrams'],
  },
  {
    title: 'Assignments',
    tag: 'Assessment',
    icon: ClipboardCheck,
    description: "Bloom's taxonomy-aligned assessments with MCSC, MCMC, and subjective questions.",
    features: ["Bloom's taxonomy", 'MCSC / MCMC', 'Subjective questions', 'Answer keys included'],
  },
]
```

**Step 3: Replace card JSX with clean flat design**

```tsx
{contentModes.map((mode, i) => (
  <motion.div
    key={mode.title}
    initial={{ opacity: 0, y: 16 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: i * 0.1, duration: 0.4 }}
    viewport={{ once: true }}
    className="group rounded-lg border border-border bg-card p-6 transition-all duration-150 hover:border-foreground"
  >
    {/* Icon */}
    <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background">
      <mode.icon className="h-4 w-4 text-foreground" />
    </div>

    {/* Tag + title */}
    <div className="mb-1 flex items-center gap-2">
      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-accent text-primary">
        {mode.tag}
      </span>
    </div>
    <h3 className="font-display text-lg font-bold text-foreground">{mode.title}</h3>
    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{mode.description}</p>

    {/* Features */}
    <ul className="mt-4 space-y-1.5">
      {mode.features.map((f) => (
        <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-1 w-1 rounded-full bg-primary flex-shrink-0" />
          {f}
        </li>
      ))}
    </ul>
  </motion.div>
))}
```

**Step 4: Update section heading to use Space Grotesk**

```tsx
<h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
  Three types of content, one pipeline.
</h2>
```

**Step 5: Commit**

```bash
git add src/components/features/landing/content-modes-section.tsx
git commit -m "feat(theme): clean up content modes cards — flat borders, neutral palette"
```

---

## Task 9: Update How It Works Section

**Files:**
- Modify: `src/components/features/landing/how-it-works-section.tsx`

**Step 1: Read the file**

**Step 2: Remove section gradient background (line ~140)**

```tsx
// REMOVE: the gradient div with indigo tints
// REPLACE with: just bg-background or bg-secondary for the section
<section className="bg-background py-20 lg:py-28">
```

**Step 3: Update feature card icons (lines ~34-52)**

Remove colored icon background circles:

```tsx
// BEFORE: <div className="rounded-xl bg-indigo-100 p-3">
// AFTER:
<div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-border">
  <feature.icon className="h-4 w-4 text-foreground" />
</div>
```

**Step 4: Update agent timeline (lines ~60-110)**

Replace rainbow agent colors with monochrome step numbers:

```tsx
{agents.map((agent, i) => (
  <div key={agent.name} className="relative flex gap-4">
    {/* Step number */}
    <div className="relative flex-shrink-0">
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card">
        <span className="font-display text-xs font-bold text-foreground">
          {String(i + 1).padStart(2, '0')}
        </span>
      </div>
      {/* Connector line */}
      {i < agents.length - 1 && (
        <div className="absolute left-1/2 top-9 h-6 w-px -translate-x-1/2 bg-border" />
      )}
    </div>

    {/* Content */}
    <div className="pb-6">
      <p className="font-display text-sm font-semibold text-foreground">{agent.name}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">{agent.description}</p>
    </div>
  </div>
))}
```

**Step 5: Replace the vertical gradient timeline line (line ~223)**

```tsx
// REMOVE: bg-gradient-to-b from-indigo-400 via-indigo-500 to-indigo-600
// Each connector is now just bg-border (handled per step above)
```

**Step 6: Commit**

```bash
git add src/components/features/landing/how-it-works-section.tsx
git commit -m "feat(theme): update how-it-works section — monochrome timeline, flat cards"
```

---

## Task 10: Update CTA Footer Section

**Files:**
- Modify: `src/components/features/landing/cta-footer-section.tsx`

**Step 1: Read the file**

**Step 2: Replace the gradient background (line ~19)**

```tsx
// REMOVE:
// bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700
// REPLACE with:
<section className="bg-foreground py-20 lg:py-28">
```

This gives a pure dark/black section (inverted) which is editorial and striking.

**Step 3: Update all text colors inside CTA section**

Since bg is now `bg-foreground` (dark):
- Main heading: `text-background`
- Sub text: `text-background/70`
- Primary button: `bg-background text-foreground hover:bg-background/90`
- Remove all `text-indigo-*` references

**Step 4: Remove animated orb divs (lines ~25-39)**

Delete the 2-3 `motion.div` orbs inside the CTA section.

**Step 5: Commit**

```bash
git add src/components/features/landing/cta-footer-section.tsx
git commit -m "feat(theme): replace CTA gradient with clean inverted dark section"
```

---

## Task 11: Final Polish — globals.css Scrollbar & Misc

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Update scrollbar colors**

Find the `::-webkit-scrollbar` block and update thumb colors:

```css
::-webkit-scrollbar-thumb {
  background-color: oklch(0.75 0.005 260);  /* neutral gray */
  border-radius: 9999px;
}

.dark ::-webkit-scrollbar-thumb {
  background-color: oklch(0.35 0.008 265);
}
```

**Step 2: Update focus-visible ring**

Ensure focus ring uses amber:

```css
:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

**Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): polish scrollbars and focus ring"
```

---

## Task 12: Verify Full Build & Visual QA

**Step 1: Run full build**

```bash
pnpm build
```
Expected: zero errors, zero TypeScript errors.

**Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: clean.

**Step 3: Run dev server and visually check each route**

```bash
pnpm dev
```

Check in order:
- `/` — Hero (no particles/orbs, big editorial headline), Content Modes (flat cards), How It Works (monochrome timeline), CTA (dark inverted section)
- `/editor` — Sidebar (Notion-like, amber active indicator), Navbar (solid border), Generate button (black)
- `/archives` — Cards with flat borders
- `/settings` — Document-like layout

Dark mode: Toggle dark mode — verify amber transitions correctly, all surfaces readable.

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(theme): complete editorial theme overhaul — Modern Productivity design system"
```

---

## Quick Reference: What Changed

| Before | After |
|--------|-------|
| Indigo/violet/purple primary | Amber `#D97706` primary |
| OKLCH glow effects | No glows — flat 1px borders |
| Glassmorphism | Solid white/background surfaces |
| Gradient mesh hero bg | Clean `#FAFAFA` + subtle static dot grid |
| Floating particles/icons | Removed entirely |
| Inter only | Space Grotesk (display) + Inter (body) |
| 10px border radius | 6px border radius |
| Card box-shadow | No shadow — border only |
| Sidebar icon circles | Bare icons with color transition |
| Sidebar indigo active | Amber 2px left border active |
| Gradient CTA footer | Inverted dark section |
| Rainbow agent colors | Monochrome 01-07 step numbers |
