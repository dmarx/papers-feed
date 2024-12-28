// File: tests/extension/fixtures.js
const { test: base } = require('@playwright/test');

// Custom test fixture that includes extension context
exports.test = base.extend({
  context: async ({ context }, use) => {
    // Get the background page
    const backgroundPages = context.backgroundPages();
    const backgroundPage = backgroundPages[0] || await context.waitForEvent('backgroundpage');

    // Store in context for tests to access
    context.backgroundPage = backgroundPage;

    await use(context);
  },
  // Custom extension page helper
  extensionPage: async ({ context, page }, use) => {
    // Helper functions for extension testing
    const helpers = {
      // Get background page logs
      getLogs: async () => {
        const logs = await context.backgroundPage.evaluate(() => {
          return window.testLogs || [];
        });
        return logs;
      },
      // Clear test logs
      clearLogs: async () => {
        await context.backgroundPage.evaluate(() => {
          window.testLogs = [];
        });
      },
      // Simulate navigation to arXiv page
      navigateToArxiv: async (arxivId) => {
        await page.goto(`https://arxiv.org/abs/${arxivId}`);
        // Wait for background script to process
        await page.waitForTimeout(1000);
      },
      // Switch tabs
      switchToTab: async (url) => {
        const newPage = await context.newPage();
        await newPage.goto(url);
        await page.bringToFront();
      }
    };

    await use(helpers);
  }
});
