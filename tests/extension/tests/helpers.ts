// tests/extension/tests/helpers.ts
import { Page, BrowserContext, Worker } from '@playwright/test';

/**
 * Get the service worker for the extension
 */
export async function getServiceWorker(context: BrowserContext, timeout = 5000): Promise<Worker> {
  console.log('Looking for service worker...');
  
  // Get current service workers
  const workers = context.serviceWorkers();
  if (workers.length > 0) {
    console.log('Found existing service worker:', workers[0].url());
    return workers[0];
  }
  
  console.log('No existing service worker, waiting for one to be created...');
  const worker = await context.waitForEvent('serviceworker', { timeout });
  console.log('Service worker created:', worker.url());
  return worker;
}

/**
 * Initialize test logging for the given worker
 */
export async function initializeTestLogging(worker: Worker): Promise<void> {
  console.log('Initializing test logging...');
  await worker.evaluate(() => {
    // @ts-ignore
    self.testLogs = [];
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      const message = args.join(' ');
      // @ts-ignore
      self.testLogs.push(message);
      originalConsoleLog.apply(console, args);
    };
    console.log('Test logging initialized');
  });
}

/**
 * Get test logs from the worker
 */
export async function getTestLogs(worker: Worker): Promise<string[]> {
  const logs = await worker.evaluate(() => {
    // @ts-ignore
    return self.testLogs || [];
  });
  console.log('Current test logs:', logs);
  return logs;
}

/**
 * Mock GitHub API responses
 */
export async function mockGitHubAPI(page: Page): Promise<void> {
  await page.route('**/api.github.com/**', async route => {
    const url = route.request().url();
    console.log('Mocking GitHub API request:', url);
    
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        html_url: 'https://github.com/test/test/issues/1',
        number: 1
      })
    });
  });
}

/**
 * Mock arXiv API responses
 */
export async function mockArxivAPI(page: Page): Promise<void> {
  await page.route('**/api/query*', async route => {
    console.log('Mocking arXiv API request:', route.request().url());
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

/**
 * Set up test credentials in storage
 */
export async function setupTestCredentials(worker: Worker): Promise<void> {
  console.log('Setting up test credentials...');
  await worker.evaluate(() => {
    // @ts-ignore
    self.githubToken = 'fake-token';
    // @ts-ignore
    self.githubRepo = 'test/test';
  });
}
