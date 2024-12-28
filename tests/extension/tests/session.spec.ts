import { test, expect } from '@playwright/test';

test.describe('Reading Session Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock arxiv.org for testing
    await page.route('**/*', async route => {
      const url = route.request().url();
      if (url.includes('arxiv.org')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: `
            <!DOCTYPE html>
            <html>
            <head><title>Test Paper</title></head>
            <body>
              <h1>Test Paper Title</h1>
              <div class="authors">Test Author</div>
              <div class="abstract">Test abstract</div>
            </body>
            </html>
          `
        });
      } else {
        await route.continue();
      }
    });
  });

  test('should start new session on arxiv page', async ({ page }) => {
    await page.goto('https://arxiv.org/abs/2401.00001');
    
    // Wait for extension to process
    await page.waitForTimeout(1000);
    
    // Check extension popup updates
    await page.goto('chrome-extension://[id]/popup.html');
    await expect(
      page.locator('.paper-title')
    ).toContainText('Test Paper Title');
  });

  test('should track reading time', async ({ page }) => {
    await page.goto('https://arxiv.org/abs/2401.00001');
    
    // Read for 5 seconds
    await page.waitForTimeout(5000);
    
    // Switch to different page
    await page.goto('https://example.com');
    
    // Wait for session to end
    await page.waitForTimeout(1000);
  });
});
