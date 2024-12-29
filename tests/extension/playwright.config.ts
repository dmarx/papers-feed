// tests/extension/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'html',
  use: {
    headless: true, // Changed to true for CI
    viewport: { width: 1280, height: 720 },
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx http-server extension -p 8080',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
  timeout: 360000, // 6 minutes for the whole test
  expect: {
    timeout: 10000, // 10 seconds for expect assertions
  },
});
