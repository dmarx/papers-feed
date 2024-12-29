// tests/extension/tests/setup.ts
import { test as base, chromium, type BrowserContext, type Page, type Worker } from '@playwright/test';
import path from 'path';
import { getServiceWorker, initializeTestLogging } from './helpers';

interface ExtensionFixtures {
  context: BrowserContext;
  extensionId: string;
  backgroundWorker: Worker;
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
    const worker = await getServiceWorker(context);
    const extensionId = worker.url().split('/')[2];
    await use(extensionId);
  },

  backgroundWorker: async ({ context }, use) => {
    const worker = await getServiceWorker(context);
    await initializeTestLogging(worker);
    await use(worker);
  },
});

export { expect } from '@playwright/test';
