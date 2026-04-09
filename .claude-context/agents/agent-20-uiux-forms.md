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
## Status: DONE

## Summary
- **S-045**: Added `submitAttempted` flag; validation errors for topic (3-200 chars), questionCounts (total >=3), customPrompt (max 2000) are computed as derived values and shown as red `text-xs text-danger` messages below fields with `border-danger` ring on inputs. Submit button stays enabled; "Continue to Generate" also triggers validation and only advances if valid. Draft auto-save is unaffected.
- **S-050**: Active step label gets `border-b-2 border-accent text-accent` underline; pending step labels are `text-text-secondary/60` (muted). Completed steps retain checkmark + `text-accent`. Existing animated connector bar unchanged.
- **S-051**: Step-2 `motion.div` changed from `space-y-5` to `space-y-3`; field groups use `space-y-1`/`space-y-2`; radio group gap `gap-4` → `gap-2`; label margins tightened.
- **S-052**: `loading: boolean` + `files[]` + `parsedSources[]` + `errors[]` replaced with single `fileStates: FileState[]`. Processing is sequential; each file shows `pending` → `processing` → `done`/`error` with spinner/checkmark/X icons inline. Per-file error messages appear below the file row. Clear and remove-individual operations updated accordingly.
