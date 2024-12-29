// tests/extension/tests/helpers.ts
import { Page, BrowserContext } from '@playwright/test';

/**
 * Wait for and get the background service worker page
 */
export async function getBackgroundServiceWorker(context: BrowserContext, timeout = 5000): Promise<Page> {
  // Get current service workers
  const workers = context.serviceWorkers();
  if (workers.length > 0) {
    return workers[0];
  }
  
  // Wait for service worker to be created
  const worker = await context.waitForEvent('serviceworker', { timeout });
  return worker;
}

/**
 * Initialize test logging for the background page
 */
export async function initializeTestLogging(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.testLogs = [];
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      window.testLogs.push(args.join(' '));
      originalConsoleLog.apply(console, args);
    };
  });
}

/**
 * Mock arXiv API responses
 */
export async function mockArxivAPI(page: Page): Promise<void> {
  await page.route('**/api/query*', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/xml',
      body: `<?xml version="1.0" encoding="UTF-8"?>
        <feed xmlns="http://www.w3.org/2005/Atom">
          <entry>
            <title>Test Paper Title</title>
            <summary>Test abstract</summary>
            <author><name>Test Author</name></author>
            <published>2024-01-01T00:00:00Z</published>
            <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI"/>
          </entry>
        </feed>`
    });
  });
}
