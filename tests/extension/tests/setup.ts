// tests/extension/tests/setup.ts
import { test as base, chromium, type BrowserContext, type Page } from '@playwright/test';
import path from 'path';
import { getBackgroundServiceWorker, initializeTestLogging } from './helpers';

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  backgroundPage: Page;
}

export const test = base.extend<ExtensionFixtures>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, '../../../extension');
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Required for extensions in most cases
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
    const backgroundPage = await getBackgroundServiceWorker(context);
    const extensionId = backgroundPage.url().split('/')[2];
    await use(extensionId);
  },

  backgroundPage: async ({ context }, use) => {
    const backgroundPage = await getBackgroundServiceWorker(context);
    await initializeTestLogging(backgroundPage);
    await use(backgroundPage);
  },
});

export { expect } from '@playwright/test';
