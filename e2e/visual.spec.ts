import { test, expect } from '@playwright/test';

/**
 * Visual regression baselines.
 *
 * First run: baselines do not exist yet, so Playwright will write them and
 * mark the test as "failed" (expected on first run).
 *
 * To update baselines after intentional UI changes:
 *   npx playwright test --update-snapshots
 * or via the UI runner:
 *   npm run test:e2e:ui
 */

test.describe('Visual regression', () => {
  test('home page matches snapshot', async ({ page }) => {
    await page.goto('/');
    // Wait for the stepper / content-type cards to be visible
    await page.waitForSelector('[aria-label="Form steps"]', { timeout: 15_000 });
    await expect(page).toHaveScreenshot('home.png', { fullPage: false });
  });

  test('library page matches snapshot', async ({ page }) => {
    await page.goto('/content');
    // Wait for the header to be rendered
    await page.waitForSelector('h1', { timeout: 15_000 });
    await expect(page).toHaveScreenshot('library.png', { fullPage: false });
  });

  test('settings page matches snapshot', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForSelector('h1', { timeout: 15_000 });
    await expect(page).toHaveScreenshot('settings.png', { fullPage: false });
  });
});
