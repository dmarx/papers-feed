import { test, expect } from './setup';
import type { Page } from '@playwright/test';

let testLogs: string[] = [];

test.beforeAll(async ({ backgroundPage }) => {
  // Set up logging capture in background page
  await backgroundPage.evaluate(() => {
    const logs: string[] = [];
    // @ts-ignore - window.testLogs is fine for testing
    window.testLogs = logs;
    const originalConsoleLog = console.log;
    console.log = (...args: unknown[]) => {
      logs.push(args.join(' '));
      originalConsoleLog.apply(console, args);
    };
  });
});

test.beforeEach(async ({ page }) => {
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

test.describe('Reading Session Tests', () => {
  test('should start new session on arxiv page', async ({ page, backgroundPage }) => {
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(1000);

    const logs = await backgroundPage.evaluate(() => window.testLogs);
    expect(logs).toContainEqual(expect.stringContaining('Starting new session for: 2401.00001'));
  });

  test('should track reading time', async ({ page, backgroundPage }) => {
    await page.goto('https://arxiv.org/abs/2401.00001');
    
    // Read for 5 seconds
    await page.waitForTimeout(5000);
    
    // Switch to different page
    await page.goto('https://example.com');
    await page.waitForTimeout(1000);

    const logs = await backgroundPage.evaluate(() => window.testLogs);
    const durationLog = logs.find(log => 
      log.includes('Creating reading event with duration:')
    );
    expect(durationLog).toBeDefined();
    
    const duration = parseInt(durationLog!.match(/duration: (\d+)/)![1]);
    expect(duration).toBeGreaterThanOrEqual(4000); // At least 4 seconds
  });

  test('should handle tab switching without ending session', async ({ page, context, backgroundPage }) => {
    // Start on arXiv page
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(1000);

    // Open new tab
    const newPage = await context.newPage();
    await newPage.goto('https://example.com');
    await page.waitForTimeout(1000);

    // Switch back to arXiv
    await page.bringToFront();
    await page.waitForTimeout(1000);

    const logs = await backgroundPage.evaluate(() => window.testLogs);
    const endSessionLogs = logs.filter(log => 
      log.includes('Ending session for: 2401.00001')
    );
    expect(endSessionLogs).toHaveLength(0);
  });
});
