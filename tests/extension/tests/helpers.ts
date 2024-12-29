// tests/extension/tests/helpers.ts
import { Page, BrowserContext, Worker } from '@playwright/test';

/**
 * Get the service worker for the extension
 */
export async function getServiceWorker(context: BrowserContext, timeout = 5000): Promise<Worker> {
  const workers = context.serviceWorkers();
  if (workers.length > 0) {
    console.log('Found existing service worker');
    return workers[0];
  }
  
  console.log('Waiting for service worker to be created...');
  const worker = await context.waitForEvent('serviceworker', { timeout });
  console.log('Service worker created');
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
 * Create a mock Chrome Event implementation
 */
function createMockChromeEvent<T extends (...args: any[]) => void>(): chrome.events.Event<T> {
  const listeners: T[] = [];
  return {
    addListener: (callback: T) => { listeners.push(callback); },
    removeListener: (callback: T) => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    },
    hasListener: (callback: T) => listeners.includes(callback),
    hasListeners: () => listeners.length > 0,
    addRules: async () => [],
    getRules: async () => [],
    removeRules: async () => {}
  };
}

/**
 * Set up Chrome API mocks in the page context
 */
export async function setupChromeApiMocks(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const mockStorage: chrome.storage.SyncStorageArea = {
      get: async () => ({ githubToken: 'fake-token', githubRepo: 'test/test' }),
      set: async () => {},
      remove: async () => {},
      clear: async () => {},
      getBytesInUse: async () => 0,
      // @ts-ignore - Chrome types are not perfectly aligned
      onChanged: {
        addListener: () => {},
        removeListener: () => {},
        hasListener: () => false,
        hasListeners: () => false,
        addRules: async () => [],
        getRules: async () => [],
        removeRules: async () => {}
      },
      QUOTA_BYTES: 102400,
      QUOTA_BYTES_PER_ITEM: 8192,
      MAX_ITEMS: 512,
      MAX_WRITE_OPERATIONS_PER_HOUR: 1800,
      MAX_WRITE_OPERATIONS_PER_MINUTE: 120,
      MAX_SUSTAINED_WRITE_OPERATIONS_PER_MINUTE: 1000000
    };

    window.chrome = {
      storage: {
        sync: mockStorage,
        // Mock the storage.onChanged event
        onChanged: createMockChromeEvent<(changes: { [key: string]: chrome.storage.StorageChange }) => void>()
      }
    } as typeof chrome;
  });
}

/**
 * Initialize storage in service worker
 */
export async function initializeStorage(worker: Worker): Promise<void> {
  await worker.evaluate(() => {
    // @ts-ignore
    self.githubToken = 'fake-token';
    // @ts-ignore
    self.githubRepo = 'test/test';
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
