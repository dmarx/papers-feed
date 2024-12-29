import { test, expect } from './setup';

test.describe('Reading Session Tests', () => {
  test.beforeEach(async ({ page, context }) => {
    // Mock arxiv.org responses
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

  test('should start new session on arxiv page', async ({ page, backgroundPage }) => {
    try {
      await page.goto('https://arxiv.org/abs/2401.00001');
      await page.waitForTimeout(1000);

      const logs = await backgroundPage.evaluate(() => window.testLogs);
      expect(logs).toContain(expect.stringContaining('Starting new session for: 2401.00001'));
    } catch (e) {
      console.error('Test failed:', e);
      throw e;
    }
  });

  test('should track reading time', async ({ page, backgroundPage }) => {
    try {
      await page.goto('https://arxiv.org/abs/2401.00001');
      await page.waitForTimeout(5000);
      await page.goto('https://example.com');
      await page.waitForTimeout(1000);

      const logs = await backgroundPage.evaluate(() => window.testLogs);
      const durationLog = logs.find(log => 
        log.includes('Creating reading event with duration:')
      );
      expect(durationLog).toBeDefined();

      const duration = parseInt(durationLog!.match(/duration: (\d+)/)![1]);
      expect(duration).toBeGreaterThanOrEqual(4000);
    } catch (e) {
      console.error('Test failed:', e);
      throw e;
    }
  });

  test('should handle tab switching', async ({ context, page, backgroundPage }) => {
    try {
      await page.goto('https://arxiv.org/abs/2401.00001');
      await page.waitForTimeout(1000);

      const newPage = await context.newPage();
      await newPage.goto('https://example.com');
      await page.waitForTimeout(1000);

      await page.bringToFront();
      await page.waitForTimeout(1000);

      const logs = await backgroundPage.evaluate(() => window.testLogs);
      const endSessionLogs = logs.filter(log => 
        log.includes('Ending session for: 2401.00001')
      );
      expect(endSessionLogs).toHaveLength(0);
    } catch (e) {
      console.error('Test failed:', e);
      throw e;
    }
  });
});
