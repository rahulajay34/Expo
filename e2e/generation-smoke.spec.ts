import { test, expect } from '@playwright/test';

/**
 * Canned Anthropic-format SSE response that mimics what /api/minimax streams.
 * The client reads `content_block_start` (type=text), then `content_block_delta`
 * events carrying `text_delta`, and finally `message_stop`.
 */
const CANNED_SSE = [
  `data: ${JSON.stringify({ type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } })}`,
  `data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '# Introduction to Python\n\n' } })}`,
  `data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: 'Python is a high-level, interpreted programming language known for its clear syntax and readability.\n\n' } })}`,
  `data: ${JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: '## Key Features\n\n- Simple, readable syntax\n- Dynamic typing\n- Large standard library\n' } })}`,
  `data: ${JSON.stringify({ type: 'content_block_stop', index: 0 })}`,
  `data: ${JSON.stringify({ type: 'message_stop' })}`,
].join('\n\n') + '\n\n';

test.describe('Generation smoke test', () => {
  test('generates content and saves to library', async ({ page }) => {
    // Mock the /api/minimax route before navigation
    await page.route('/api/minimax', async (route) => {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'X-Accel-Buffering': 'no',
        },
        body: CANNED_SSE,
      });
    });

    // Load the home (generator) page
    await page.goto('/');

    // Step 1: Select "Lecture Notes" content type card
    await page.getByRole('button', { name: /lecture notes/i }).first().click();

    // After clicking a content type card the form auto-advances to step 2.
    // Fill in the topic field.
    await page.getByPlaceholder(/topic/i).fill('Introduction to Python');

    // Advance to step 3 via the "Continue to Generate" button
    await page.getByRole('button', { name: /continue to generate/i }).click();

    // Click the "Create content" button
    await page.getByRole('button', { name: /create content/i }).click();

    // The preview panel should eventually contain our canned heading
    await expect(page.locator('.markdown-body h1, [class*="markdown"] h1')).toContainText(
      'Introduction to Python',
      { timeout: 30_000 }
    );

    // Wait for generation to finish (button returns to non-loading state)
    await expect(page.getByRole('button', { name: /done/i })).toBeVisible({ timeout: 30_000 });

    // Navigate to the library page and assert the saved item exists
    await page.goto('/content');

    await expect(page.getByText('Introduction to Python')).toBeVisible({ timeout: 10_000 });
  });
});
