// tests/extension/tests/fixtures.ts
import { chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'path';
import mockttp from 'mockttp';

interface TestOptions {
  mockResponses?: (mockServer: mockttp.Mockttp) => Promise<void>;
}

interface TestContext {
  context: BrowserContext;
  backgroundWorker: Worker;
  mockServer: mockttp.Mockttp;
  extensionId: string;
}

/**
 * Setup and teardown test fixtures
 */
export async function withFixtures(
  options: TestOptions,
  testSuite: (context: TestContext) => Promise<void>
) {
  const mockServer = mockttp.getLocal();
  const pathToExtension = path.join(__dirname, '../../../extension');
  let context: BrowserContext | undefined;

  try {
    // Start mock server
    await mockServer.start(8000);

    // Setup mock responses
    if (options.mockResponses) {
      await options.mockResponses(mockServer);
    }

    // Launch browser with extension
    context = await chromium.launchPersistentContext('', {
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox'
      ],
      headless: true
    });

    // Get the background service worker
    const workers = context.serviceWorkers();
    const backgroundWorker = workers[0];
    const extensionId = backgroundWorker.url().split('/')[2];

    // Initialize test logging
    await backgroundWorker.evaluate(() => {
      // @ts-ignore
      self.testLogs = [];
      const originalConsoleLog = console.log;
      console.log = function(...args) {
        const message = args.join(' ');
        // @ts-ignore
        self.testLogs.push(message);
        originalConsoleLog.apply(console, args);
      };
    });

    // Run test suite
    await testSuite({ 
      context,
      backgroundWorker,
      mockServer,
      extensionId
    });

  } finally {
    // Cleanup
    if (context) {
      await context.close();
    }
    await mockServer.stop();
  }
}
