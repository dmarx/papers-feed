// tests/extension/tests/session.spec.ts
import { test, expect } from './setup';
import { mockArxivAPI } from './helpers';

test.describe('Reading Session Tests', () => {
  test.beforeEach(async ({ page }) => {
    await mockArxivAPI(page);
  });

  test('should start new session on arxiv page load', async ({ page, backgroundWorker }) => {
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(1000);

    const logs = await backgroundWorker.evaluate(() => {
      // @ts-ignore - testLogs is added to window for testing
      return window.testLogs;
    });
    expect(logs.some(log => log.includes('Starting new session for: 2401.00001'))).toBeTruthy();
  });

  test('should track minimum reading duration', async ({ page, backgroundWorker }) => {
    // Navigate to arXiv page and wait for minimum session duration
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(31000); // Wait just over 30s minimum duration
    
    // Navigate away to trigger session end
    await page.goto('https://example.com');
    await page.waitForTimeout(1000);

    const logs = await backgroundWorker.evaluate(() => {
      // @ts-ignore - testLogs is added to window for testing
      return window.testLogs;
    });
    const durationLog = logs.find(log => log.includes('Creating reading event:'));
    expect(durationLog).toBeDefined();
    
    if (durationLog) {
      const durationMatch = durationLog.match(/"duration_seconds":\s*(\d+)/);
      expect(durationMatch).toBeTruthy();
      const duration = parseInt(durationMatch![1]);
      expect(duration).toBeGreaterThanOrEqual(30);
    }
  });

  test('should handle idle timeout', async ({ page, backgroundWorker }) => {
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(1000);

    // Simulate idle period longer than threshold (5 minutes by default)
    await page.waitForTimeout(301000); // 5 minutes + 1 second

    const logs = await backgroundWorker.evaluate(() => {
      // @ts-ignore - testLogs is added to window for testing
      return window.testLogs;
    });
    expect(logs.some(log => 
      log.includes('Session too short to log:') || 
      log.includes('duration: 0')
    )).toBeTruthy();
  });
});
