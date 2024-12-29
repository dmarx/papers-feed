# File: tests/extension/tests/setup.ts
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';

// Define custom fixture types
interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  backgroundPage: Page;
}

// Create test with extension fixtures
export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../../../extension');
    const context = await chromium.launchPersistentContext('', {
      headless: true,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
        '--no-sandbox',
      ]
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Wait for the background page
    let backgroundPage: Page;
    try {
      backgroundPage = await context.waitForEvent('backgroundpage', { timeout: 5000 });
    } catch (e) {
      throw new Error('Extension background page not found. Make sure the extension is loaded correctly.');
    }

    // Get extension ID from background page URL
    const extensionId = backgroundPage.url().split('/')[2];
    await use(extensionId);
  },

  backgroundPage: async ({ context }, use) => {
    let backgroundPage: Page;
    try {
      backgroundPage = await context.waitForEvent('backgroundpage', { timeout: 5000 });

      // Initialize logging
      await backgroundPage.evaluate(() => {
        window.testLogs = [];
        const originalConsoleLog = console.log;
        console.log = function(...args) {
          window.testLogs.push(args.join(' '));
          originalConsoleLog.apply(console, args);
        };
      });
    } catch (e) {
      throw new Error('Failed to setup background page: ' + e.message);
    }

    await use(backgroundPage);
  },
});

export { expect } from '@playwright/test';
