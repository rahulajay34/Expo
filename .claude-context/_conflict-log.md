# Conflict & Duplication Detection Log

## Overlapping Suggestions (Merged)

### S-004 and S-062: Content viewer code-split
Both suggest splitting `content/[id]/page.tsx` into EditPanel/ExportPanel/RegenPanel. S-004 frames it as performance (code-splitting), S-062 as code quality (architecture). **Resolution:** Implement once under a single agent — split into sub-components AND lazy-load them. Both IDs covered.

### S-012 and S-036: Google Fonts link elimination
S-012 says "drop runtime Google Fonts link, use next/font/google for all". S-036 says "stop the Google Fonts link injection after theme context hydrates". **Resolution:** S-012 is the full solution; S-036 becomes a subset. Implement S-012 first, which automatically resolves S-036.

### S-035 and S-100: Speculation Rules
S-035 (Perf-Network) and S-100 (Emerging) both say "add Speculation Rules for prerendering". **Resolution:** Implement once. Mark both as covered.

### S-010, S-011, S-012, S-013: Font optimization cluster
These four suggestions all touch font loading in `layout.tsx` and `theme-context.tsx`. They must be implemented together to avoid conflicts. **Resolution:** Single agent handles the complete font optimization.

## Partially Existing in Codebase

### S-046: Visible Save/Unsaved state
`content/[id]/page.tsx` already has `saveStatus` state (`idle | unsaved | saving | saved`) and `isDirty` tracking. The suggestion says this is "mostly invisible" — the implementation exists but the UI display may be insufficient. **Resolution:** Audit existing UI and enhance visibility rather than building from scratch.

### S-076: Detect unclosed streaming on navigation
`generation-context.tsx` already tracks streaming state. The suggestion asks for `beforeunload` warning. **Resolution:** Additive — wire existing state to `beforeunload` event.

### S-095: Stop generating button
The pipeline already has `AbortController` support. The suggestion is about surfacing a visible UI button. **Resolution:** Additive — wire UI to existing abort mechanism.

## No Blocking Conflicts Found

All other suggestions are independent and non-conflicting. No blocking questions for Rahul from this analysis.

## Pattern Compliance

All suggestions align with existing codebase patterns:
- React Context for state (not Redux/Zustand — no conflicts)
- Tailwind for styling (no CSS-in-JS suggestions)
- App Router conventions maintained
- `@/*` alias used consistently
- localStorage as storage layer (no DB suggestions except S-038 which is server-side only)
