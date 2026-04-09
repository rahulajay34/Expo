# Agent 21: UI/UX — Viewer Improvements + Settings Tabs

## Suggestions Covered: S-043, S-046, S-047, S-048, S-049
## Category: UI/UX
## Priority: P2
## Dependencies: agent-03 (viewer split), agent-04 (preview split)
## Files to Read Before Starting: src/app/content/page.tsx, src/app/content/[id]/page.tsx, src/components/MarkdownPreview.tsx, src/app/settings/page.tsx, src/components/MarkdownEditor.tsx, src/components/ExportMenu.tsx, src/components/InlineAIPopover.tsx
## Files to Modify: src/app/content/page.tsx, src/app/content/[id]/page.tsx, src/components/MarkdownPreview.tsx, src/app/settings/page.tsx, src/components/MarkdownEditor.tsx, src/components/ExportMenu.tsx, src/components/InlineAIPopover.tsx

## Detailed Plan:

### S-043: Persist library state to localStorage
1. In content/page.tsx, change `sessionStorage` to `localStorage` for: `filterType`, `sort`, `viewMode`
2. Key names: `news13n_lib_filter`, `news13n_lib_sort`, `news13n_lib_view`

### S-046: Visible save state
1. In content/[id]/page.tsx, the `saveStatus` state already exists (`idle | unsaved | saving | saved`)
2. Add a small badge near the title showing the current status with appropriate styling:
   - `saved`: green check + "Saved"
   - `unsaved`: amber dot + "Unsaved changes"
   - `saving`: spinner + "Saving..."

### S-047: Copy button on code blocks
1. In MarkdownPreview's component map for `code`, add a copy button that appears on hover
2. Use `navigator.clipboard.writeText()` with the code content
3. Show a brief "Copied!" tooltip on success

### S-048: Settings tabs
1. In settings/page.tsx, add tab navigation at the top: Appearance | Prompts | Storage | About
2. Each tab renders only its section's cards
3. Use `useState` for active tab, persist to sessionStorage
4. Keep the existing card components but wrap in tab panels

### S-049: Tooltips on icon-only buttons
1. Add `title` attribute to all icon-only buttons in:
   - MarkdownEditor toolbar buttons
   - ExportMenu trigger button
   - InlineAIPopover action buttons

## Edge Cases to Handle:
- localStorage persistence must handle SSR (read after mount)
- Code block copy button must not interfere with code selection
- Settings tabs must preserve state when switching tabs

## Testing Plan: Build passes. Test each improvement visually.
## Status: NOT_STARTED
