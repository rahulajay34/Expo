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
## Status: DONE

## Summary
Created Playwright E2E testing infrastructure:
- `playwright.config.ts`: baseURL=http://localhost:3000, chromium-only project, webServer using `npm run dev` with reuseExistingServer for local dev.
- `e2e/generation-smoke.spec.ts`: Mocks `/api/minimax` with a canned Anthropic-format SSE response (content_block_start → content_block_delta text_delta events → message_stop). Navigates the 3-step form (select Lecture Notes card → fill topic → Continue to Generate → Create content), asserts the markdown heading appears in the preview, waits for the Done button, then navigates to /content and asserts the saved item is listed.
- `e2e/visual.spec.ts`: Screenshot baselines for home, library, and settings pages using `toHaveScreenshot()`. Baselines are written on first run; update with `npx playwright test --update-snapshots`.
- `package.json`: Added `@playwright/test ^1.44.0` to devDependencies; added `test:e2e` and `test:e2e:ui` scripts.
