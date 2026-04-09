# Agent 03: Split Content Viewer into Sub-components

## Suggestions Covered: S-062, S-004
## Category: Code Quality + Performance
## Priority: P0
## Dependencies: agent-01 (errors.ts)
## Files to Read Before Starting: src/app/content/[id]/page.tsx (full file)
## Files to Modify: src/app/content/[id]/page.tsx
## Files to Create: src/components/content-viewer/ExportHandlers.tsx, src/components/content-viewer/SectionRegenPanel.tsx, src/components/content-viewer/ContentViewerHeader.tsx

## Detailed Plan:
1. Create `src/components/content-viewer/ExportHandlers.tsx`:
   - Extract `useExportHandlers` custom hook containing: `handleExportMarkdown`, `handleCopyMarkdown`, `handleExportPDF`, `handleExportCSV`, `handleExportAICSV`, `handleExportHTML`
   - Takes params: `{ markdown, title, contentType, sources }`
   - Returns all handler functions + loading states (`isExportingCSV`, `isExportingPDF`, `csvExportProgress`)

2. Create `src/components/content-viewer/SectionRegenPanel.tsx`:
   - Extract the section regen modal + `executeSectionRegen` logic
   - Props: `{ markdown, contentType, sources, onMarkdownUpdate, onSave }`
   - Internal state: `regenSection`, `regenInstructions`, `isRegenerating`

3. Create `src/components/content-viewer/ContentViewerHeader.tsx`:
   - Extract the header bar (title, badges, action buttons, more menu)
   - Props: `{ title, contentType, isEditing, isDirty, saveStatus, onSave, onCancel, onEdit, onDelete, viewMode, onViewModeChange }`

4. Slim down `page.tsx`:
   - Import and compose the three extracted pieces
   - Keep top-level state coordination and effects
   - Use `next/dynamic` for `SectionRegenPanel` (only loaded when regen is triggered)

## Edge Cases to Handle:
- Export handlers need access to `showToast` — pass via params or use hook internally
- The autosave timer and beforeunload listener stay in page.tsx (they're page-level concerns)
- The more menu click-outside handler references `moreMenuRef` — keep in page.tsx or pass ref

## Testing Plan: Build passes. Navigate to /content/[id] and verify all actions work.
## Status: DONE
## Summary:
- Created `src/components/content-viewer/ExportHandlers.tsx` — `useExportHandlers` custom hook with all 6 export functions + loading/progress states
- Created `src/components/content-viewer/SectionRegenPanel.tsx` — section regen modal with internal state, dynamically imported via `next/dynamic`
- Created `src/components/content-viewer/ContentViewerHeader.tsx` — header bar with title, badges, save status, view-mode toggles, export/more menus, overflow click-outside handler
- Slimmed `src/app/content/[id]/page.tsx` from ~795 lines to ~310 lines by composing the three extracted pieces
- `tsc --noEmit` passes cleanly
