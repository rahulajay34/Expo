# UI/UX Overhaul Design — 2026-03-30

## Overview

Implement 20 UI/UX enhancements to the Expo educational content authoring platform. The app is a Next.js 14 (App Router) project with Tailwind CSS and TypeScript. All animations are CSS-only unless noted.

---

## 1. Generate Button → Morphing Progress Bar

**Location:** `src/components/GenerationForm.tsx` (Step 4)

**What:**
- Button has `overflow-hidden` container with inner progress bar (`scaleX` from 0→1 over stage duration)
- On click: button label fades out, a horizontal bar stretches to full-width
- Bar fills segment-by-segment as 4 pipeline stages complete (4 × 25%)
- Each 25% increment is animated with `transition-transform duration-500`
- On 100%: bar turns green, label changes to "Done ✓", button bounces (`scale` 1→1.1→1)
- If error: bar turns red, label "Try again →"

**CSS:** Define `--progress-fill: #6366F1` (indigo) in globals.css. Green = `--success`, Red = `--danger`.

---

## 2. Streaming Typewriter with Glow Cursor

**Location:** `src/components/MarkdownPreview.tsx` (used in content viewer)

**What:**
- Streaming text appends character-by-character with a 15ms stagger per character using `setInterval`
- Cursor: a `|` blink at insertion point, colored `#6366F1`
- Cursor position tracked via `contentEditable` ref
- Bottom of preview area has a `linear-gradient(transparent, white)` fade overlay that shrinks as content fills
- When not streaming: cursor hides, gradient fades out

**Implementation:** Add streaming state (`isStreaming`) to `MarkdownPreview` props. Use `useEffect` with character queue. Cursor is a `<span>` with `animate-pulse`.

---

## 3. Content Card 3D Hover Lift

**Location:** `src/components/ContentCard.tsx`

**What:**
- Card uses `perspective: 800px` on parent grid
- On `mousemove`: calculate `(mouseX - cardCenterX) / cardWidth × 8` for rotateY, same for rotateX (inverted). Clamp max `±8deg`
- `transform-style: preserve-3d` on card
- `box-shadow` increases and moves with tilt direction
- `scale: 1.02` on hover
- On `mousedown`: `scale: 0.98` (press), then on `click` navigate to detail page
- Transition: `transition-transform 0.1s ease-out` for tilt, `transition-all 0.2s ease` for shadow/scale

---

## 4. Pipeline Stage Cascade

**Location:** `src/app/page.tsx` (compact stage display in GenerationForm via `StageIndicator`)

**What:**
- 4 stages: Creator → Reviewer → Refiner → Formatter
- Each stage is a card that animates in: `translateY(20px) → 0` + `opacity: 0 → 1` + spring bounce `cubic-bezier(0.34, 1.56, 0.64, 1)`
- Stagger: 100ms between each stage
- Connecting line between stages: SVG line that fills left-to-right with `stroke-dashoffset` animation
- Active stage: indigo border glow (`box-shadow: 0 0 0 2px var(--accent)`)
- Completed stage: `✓` pops with `scale: 0 → 1.3 → 1` + 4 CSS pseudo-element dots explode outward (`::before`/`::after` animated to cardinal directions)
- Line fill resets between generation runs

---

## 5. Export Dropdown Stagger + Icon Dance

**Location:** `src/components/ExportMenu.tsx`

**What:**
- Dropdown opens: `scaleY(0) → scaleY(1)` from top origin with spring
- Each menu item staggers in: 30ms apart, `translateY(-8px) → 0` + `opacity: 0 → 1`
- Format icons (📄 for MD, 📊 for CSV, 📑 for PDF) bounce on hover: `translateY(-2px)` with spring
- On option click: dropdown snaps shut `scaleY(1) → scaleY(0)` in 100ms, then export begins
- Badge/tick mark animates on selection

---

## 6. Editor Toolbar Micro-interactions

**Location:** `src/components/MarkdownEditor.tsx`

**What:**
- Each toolbar button: on `mousedown` → `scale: 0.92`, on `mouseup` → `scale: 1`
- Bold button: when selected text has `**text**`, button gets `bg-indigo-100 border-indigo-300` glow
- Same for other format buttons when cursor is inside matching syntax
- On insert (H2/H3/code block): button gets indigo ripple (`::after` expanding circle, `opacity: 0.3 → 0`, 300ms)
- `transition-transform 0.1s ease` on all buttons

---

## 7. Ink Blot Navigation Reveal

**Location:** `src/components/Sidebar.tsx`

**What:**
- Sidebar nav links (`href="/", href="/content", href="/settings"`) trigger ink-blot animation
- On click: calculate click coordinates relative to viewport
- Overlay `<div>` fixed fullscreen, `z-index: 9999`, `background: white`
- `clip-path: circle(0px at Xpx Ypx)` animates to `circle(150vmax at Xpx Ypx)` over 400ms `cubic-bezier(0.76, 0, 0.24, 1)`
- After 350ms: `router.push()` fires, overlay stays until new page loads, then fades
- Only applies to sidebar nav links (not card clicks, not back buttons)
- CSS class `.ink-blot-overlay` with the animation keyframe

---

## 8. Holographic Card Shine

**Location:** `src/components/ContentCard.tsx` (same file as 3D hover, combined)

**What:**
- Card has `::before` pseudo-element: `radial-gradient(circle at var(--shine-x, 50%) var(--shine-y, 50%), rgba(99,102,241,0.08) 0%, transparent 60%)`
- On `mousemove`: update `--shine-x` and `--shine-y` CSS variables as percentage coordinates
- Light tint at edges: `rgba(139, 92, 246, 0.06)` (violet edge)
- `pointer-events: none` on the pseudo-element
- `transition: opacity 0.3s` for fade in/out

---

## 9. Ambient Particle Field During Generation

**Location:** `src/app/page.tsx` (generation panel) and `src/components/GenerationForm.tsx`

**What:**
- `<canvas>` overlay, `position: absolute`, `pointer-events: none`, `z-index: 10`
- Canvas sized to generation panel height
- 25 particles (2-3px circles in indigo/violet tones `#6366F1`, `#8B5CF6`, `#A78BFA`)
- Each particle: random x, random upward velocity (0.3–0.8 px/frame), slight horizontal drift
- `requestAnimationFrame` loop while `isGenerating = true`
- Particles fade out when reaching top
- On completion (`isGenerating = false`): all particles scatter outward (`vx *= 3`, `vy *= 3`, fade to 0 over 500ms)
- Canvas cleans up (cancels RAF) when generation stops

---

## 10. SVG Icon Draw-In

**Location:** `src/components/Sidebar.tsx` (nav icons), `src/components/MarkdownEditor.tsx` (toolbar icons), `src/components/ExportMenu.tsx`

**What:**
- Convert sidebar/tollbar icons to inline SVG paths
- Each SVG: `stroke-dasharray` = path length, `stroke-dashoffset` = path length → 0 over 300ms
- `stroke: currentColor`, `fill: none`, `stroke-width: 1.5`
- On hover: icon re-draws (stroke-dashoffset resets then animates again)
- Pipeline status icons (pending → running → done): morph between shapes using `transition: d` or opacity crossfade
- Implementation: wrap icons in `<AnimatedIcon>` component that accepts SVG children and triggers draw-in on mount

---

## 11. Morphing Multi-Step Form

**Location:** `src/components/GenerationForm.tsx`

**What:**
- Container: `transition: height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)` on the form wrapper
- Each step's content: `opacity: 0 → 1` + `translateY: 8px → 0` on active step
- Inactive steps: compress to thin "breadcrumb bar" (title + chevron, 40px tall) instead of `display: none`
- Breadcrumb bar shows: "Step 2: Content type ✓" with indigo checkmark
- On step complete: border-radius of form container does `border-radius: 12px → 14px → 12px` pulse (subtle)
- Step navigation: clicking a completed step's breadcrumb expands it back (smooth morph)

---

## 12. Typography System Overhaul

**Location:** `src/app/layout.tsx`, `src/app/globals.css`

**What:**
- Load **Plus Jakarta Sans** via `next/font/google` with `subsets: ['latin']`
- Keep **JetBrains Mono** for code blocks only
- Define CSS custom properties for 8 type styles:

```css
--font-display:    700 / 48px / -0.02em  /* Page headings */
--font-h1:         700 / 36px / -0.01em
--font-h2:         600 / 28px / -0.01em
--font-h3:         600 / 22px / 0
--font-body-lg:    400 / 18px / 0
--font-body:       400 / 16px / 0
--font-caption:    400 / 13px / 0.01em
--font-label:      500 / 12px / 0.04em  /* uppercase labels */
```

- Apply to: `h1, h2, h3` tags, `.body-lg`, `.body`, `.caption`, `.label` utility classes
- Remove Inter from Google Fonts import (already loaded as fallback)
- Typography scoped to `body { font-family: 'Plus Jakarta Sans', sans-serif }`

---

## 13. Micro-Copy Overhaul

**Location:** All component files

**Changes (key strings):**
| Current | New |
|---------|-----|
| "Enter topic" | "What should students learn? e.g. 'Photosynthesis'" |
| "Generate" | "Create content" |
| "Error generating content" | "Something went wrong with OpenAI — your draft was saved. Try again or switch to Gemini." |
| "Generating..." | "Crafting your content..." |
| (export button) | "Export" stays, but sub-items: "Download Markdown", "Download PDF", "Download CSV", "AI-Parsed CSV" |
| (empty library) | "Your content library is empty. Create your first piece above." |
| (404 content) | "This content was moved or deleted. Check your library for the latest version." |

**Implementation:** Audit all components and replace strings. Store translatable strings in `src/lib/copy.ts` for future i18n, but for now inline replacement.

---

## 14. Skeleton Screens Matched to Content

**Location:** `src/components/ContentCard.tsx`, `src/app/content/page.tsx`, `src/app/content/[id]/page.tsx`, `src/app/page.tsx`, `src/app/settings/page.tsx`

**What:**
- Define reusable `Skeleton` component: `bg-gray-200 rounded animate-pulse` with shimmer sweep (`background: linear-gradient(90deg, gray-200 25%, gray-100 50%, gray-200 75%)` animated with `backgroundPosition`)
- Library skeleton: 6 cards (not 3) matching `ContentCard` proportions — image placeholder, 2 title lines, metadata row
- Content viewer skeleton: title block (wide), metadata row (narrow), 4 body text lines (varying widths)
- Generation form skeleton: 3 step placeholders with compressed breadcrumb bars
- Settings skeleton: section headers + 2 form fields each
- Export skeleton: button + dropdown skeleton
- All skeletons use `aria-hidden="true"` and `role="status"` with `Loading...` label

---

## 15. Error States as Features

**Location:** `src/components/ErrorBoundary.tsx`, all API routes, `src/lib/ai/client.ts`

**What:**
- API route errors return structured JSON: `{ error: true, code: "RATE_LIMIT"|"INVALID_KEY"|"TIMEOUT"|"NETWORK", message: string, savedDraft: boolean }`
- Error boundary catches and displays: specific message + actionable buttons
- "Try again" button retries the exact same request
- "Switch to Gemini" button changes provider and retries
- Network timeout (60s): "Generation timed out — your partial content was saved. [Resume] or [Start over]"
- Invalid API key: "Your API key was rejected — it may have expired. [Test it again] or [Switch to Gemini]"
- Error state has: icon (warning triangle), message, action buttons, and a subtle red left-border

---

## 16. AI-Assisted Form Suggestions

**Location:** `src/components/GenerationForm.tsx` (Step 1 — topic field)

**What:**
- Below topic `<input>`: a "Suggest subtopics" button (with sparkle icon)
- On click: show 3 chips below field with AI suggestions
- Loading state: button shows spinner, chips area shows 3 skeleton chips
- Suggestions appear as: `"Chloroplast structure; Light reactions; Calvin cycle"` (semicolon-separated)
- Each chip is dismissible (× button)
- One chip click fills the topic field with that suggestion
- In-memory session cache: if same topic is queried twice, return cached suggestions
- API call: lightweight single-turn prompt to existing `/api/gemini` route (fastest provider)

---

## 17. Notification Centre

**Location:** `src/components/Header.tsx` (new), `src/app/layout.tsx`, `src/components/Toast.tsx`

**What:**
- Header component (replaces existing inline header in pages) with: logo area, bell icon (with badge count), user avatar area
- Bell icon: `🔔` SVG with `data-unread-count` attribute
- Notification panel: fixed right-side panel, `width: 360px`, slides in with spring (`translateX(100%) → 0`)
- Each notification: icon, message, relative timestamp ("2 min ago"), read/unread state
- Types of notifications:
  - `generation_complete` — "Your content on [topic] is ready"
  - `generation_error` — "Generation failed for [topic]"
  - `export_ready` — "[Topic] exported as [format]"
  - `storage_warning` — "Storage at 80%"
  - `api_key_expired` — "[Provider] key needs renewal"
- Unread count shown as badge on bell (red dot if > 0)
- ToastProvider also writes to notification store (Zustand or React context)
- "Mark all read" and "Clear all" buttons in panel header

---

## 18. Responsive Mobile Experience

**Location:** `src/components/Sidebar.tsx` (new mobile variant), `src/components/ContentCard.tsx`, `src/components/MarkdownEditor.tsx`, all page layouts

**What:**
- Sidebar → bottom tab bar at `md:` breakpoint (768px and below)
- Bottom tab bar: 4 tabs (Generate, Library, Editor, Settings) with icons, 56px tall, `position: fixed bottom-0`, `safe-area-inset-bottom` for notched phones
- Sidebar hidden on mobile
- Content cards: 1 column, full-width list items at `< 640px`
- Editor: fullscreen view, toolbar collapses to icon-only row at bottom
- All touch targets: minimum `44×44px` (`min-h-11 min-w-11`)
- Breakpoints: test at 375px, 390px, 430px

---

## 19. Generation as Theater (Studio Mode)

**Location:** `src/components/GenerationForm.tsx`, `src/app/page.tsx`, new `src/components/GenerationStudio.tsx`

**What:**
- Toggle: "Launch Studio" button at Step 4, opts into full-screen mode
- When active: overlay dims the rest of the page (`background: rgba(0,0,0,0.85)`, `z-index: 1000`)
- Studio panel: centered, `max-width: 900px`, `padding: 48px`
- 4 pipeline stage cards: displayed as large horizontal cards (not compact pills), flip animation on stage change (`rotateY: 0 → 90deg → 0`)
- Streaming content: centered in a "spotlight" area below the pipeline
- Cancel button: bottom center, subtle
- On completion: studio collapses with `scale(1) → scale(0.9)` + `opacity: 1 → 0` over 400ms, then form reappears with finished content
- "Exit Studio" button also available during generation

---

## 20. CSV Export Loading Indicator (Bug Fix)

**Location:** `src/components/ExportMenu.tsx`, `src/lib/export/csv.ts`

**What:**
- When "AI-Parsed CSV" export is clicked and `isExporting = true`:
  - Dropdown button text changes to "Exporting..."
  - A spinner appears next to the button text
  - Dropdown is disabled (no re-click possible)
  - Timeout warning: if > 30s, change text to "Still working... (this can take a few minutes)"
  - On complete: normal export flow (browser download)
  - On error: show inline error state in dropdown
- State managed by `useState` in `ExportMenu` component

---

## Tech Stack Additions

- `framer-motion` — NOT added. All animations remain CSS-only (Tailwind keyframes + `cubic-bezier` easing) or Canvas for particle field
- `next/font/google` — already available, used for Plus Jakarta Sans
- Canvas API — native, no library needed for particle field
- No new dependencies

---

## Priority Order

1. Typography system (foundation — everything uses it)
2. CSS custom properties for colors (already partially exists)
3. Generate button progress bar + Pipeline Stage Cascade
4. Content card effects (3D hover + Holographic shine)
5. Streaming typewriter
6. Export dropdown
7. Editor toolbar
8. Ink blot nav
9. Ambient particle field
10. SVG draw-in icons
11. Morphing multi-step form
12. Micro-copy audit
13. Skeleton screens
14. Error states
15. AI suggestions
16. Notification centre
17. Mobile responsive
18. Studio mode
19. CSV export loading bug fix
20. Final verification pass
