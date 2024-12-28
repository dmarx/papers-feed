import { test as base } from '@playwright/test';
import path from 'path';

// Extend basic test with extension context
export const test = base.extend({
  context: async ({ context }, use) => {
    // Load extension
    const extensionPath = path.join(__dirname, '../../extension');
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/88.0.4324.96',
      permissions: ['tabs'],
      // Load extension under test
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });

    await use(context);
    await context.close();
  },
});
