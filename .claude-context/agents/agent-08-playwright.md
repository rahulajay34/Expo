# Agent 08: Playwright E2E Tests

## Suggestions Covered: S-058, S-060
## Category: Testing
## Priority: P1
## Dependencies: agent-06 (DX setup)
## Files to Read Before Starting: package.json, src/app/page.tsx, src/app/content/page.tsx
## Files to Modify: package.json
## Files to Create: playwright.config.ts, e2e/generation-smoke.spec.ts, e2e/visual.spec.ts

## Detailed Plan:
1. Add `@playwright/test` to devDependencies
2. Create `playwright.config.ts`:
   - baseURL: `http://localhost:3000`
   - webServer: `npm run dev`
   - projects: chromium only for now
3. Create `e2e/generation-smoke.spec.ts`:
   - Load `/`
   - Select content type
   - Fill topic
   - Mock `/api/minimax` with canned SSE response
   - Click Generate
   - Assert content appears in preview
   - Navigate to library, assert item exists
4. Create `e2e/visual.spec.ts`:
   - Screenshot home page, library, settings
   - Use `toHaveScreenshot()` for baseline comparison
5. Add scripts: `"test:e2e": "playwright test"`, `"test:e2e:ui": "playwright test --ui"`

## Edge Cases to Handle:
- Need to mock the Minimax API route for deterministic tests
- Dev server must be running — use playwright's webServer config
- Visual regression baselines will be empty on first run — document how to update

## Testing Plan: `npm run test:e2e` passes the smoke test.
## Status: NOT_STARTED
