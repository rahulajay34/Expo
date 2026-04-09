# Agent 20: UI/UX — Form Validation, Steps, Spacing, Upload Progress

## Suggestions Covered: S-045, S-050, S-051, S-052
## Category: UI/UX
## Priority: P2
## Dependencies: none
## Files to Read Before Starting: src/components/GenerationForm.tsx, src/components/FileUpload.tsx, tailwind.config.ts
## Files to Modify: src/components/GenerationForm.tsx, src/components/FileUpload.tsx, tailwind.config.ts

## Detailed Plan:

### S-045: Inline field validation
1. In GenerationForm, add validation state per field:
   - `topic`: min 3 chars, max 200 chars
   - `questionCounts`: each >= 1, total >= 3
   - `customPrompt`: max 2000 chars
2. Show red border + error message below field on invalid
3. Keep submit button enabled but show validation errors on click if invalid

### S-050: Visual step progress
1. Update `StepperNav` component:
   - Completed steps: show a checkmark icon + green accent
   - Current step: bold text + accent color underline
   - Future steps: muted text
2. Already has a `fill` bar animation — enhance with per-step indicators

### S-051: Consolidate spacing
1. In `tailwind.config.ts`, add a `spacing` scale or just document the convention
2. In GenerationForm, normalize: use `gap-3` consistently for form groups, `gap-2` for inline elements, `px-3 py-2` for inputs
3. Light touch — don't refactor every class, just fix obvious inconsistencies

### S-052: Richer file processing progress
1. In FileUpload.tsx, replace single `loading` boolean with per-file progress:
   ```ts
   const [fileStates, setFileStates] = useState<Map<string, 'pending' | 'processing' | 'done' | 'error'>>()
   ```
2. Show each file as a row with name + status icon (spinner, check, X)
3. On error, show the error message inline per file

## Edge Cases to Handle:
- Validation must not block draft auto-save
- Step progress must work with the animated slide transitions
- File processing is sequential — show "pending" for files not yet started

## Testing Plan: Build passes. Test form validation visually.
## Status: NOT_STARTED
