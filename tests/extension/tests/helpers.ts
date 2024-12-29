// tests/extension/tests/helpers.ts
import { Page, BrowserContext, Worker } from '@playwright/test';

/**
 * Get the service worker for the extension
 */
export async function getServiceWorker(context: BrowserContext, timeout = 5000): Promise<Worker> {
  // Get current service workers
  const workers = context.serviceWorkers();
  if (workers.length > 0) {
    return workers[0];
  }
  
  // Wait for service worker to be created
  return await context.waitForEvent('serviceworker', { timeout });
}

/**
 * Initialize test logging for the given worker
 */
export async function initializeTestLogging(worker: Worker): Promise<void> {
  await worker.evaluate(() => {
    // @ts-ignore
    self.testLogs = [];
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      // @ts-ignore
      self.testLogs.push(args.join(' '));
      originalConsoleLog.apply(console, args);
    };
  });
}

/**
 * Get test logs from the worker
 */
export async function getTestLogs(worker: Worker): Promise<string[]> {
  return await worker.evaluate(() => {
    // @ts-ignore
    return self.testLogs || [];
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
