// File: tests/extension/playwright.config.js
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  workers: 1,  // Run tests serially for better debug clarity
  use: {
    headless: false,
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
    // Load extension under test
    contextOptions: {
      extensions: [{
        path: '../extension'
      }]
    }
  },
});
