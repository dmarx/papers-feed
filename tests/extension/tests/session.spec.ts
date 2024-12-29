// tests/extension/tests/session.spec.ts
import { test, expect } from './setup';
import { mockArxivAPI, mockGitHubAPI, getTestLogs } from './helpers';

test.describe('Reading Session Tests', () => {
  test.beforeEach(async ({ page, backgroundWorker }) => {
    // Set up mocks
    await mockArxivAPI(page);
    await mockGitHubAPI(page);

    // Set up GitHub credentials in storage
    await page.evaluate(() => {
      chrome.storage.sync.set({
        githubToken: 'fake-token',
        githubRepo: 'test/test'
      });
    });

    // Wait for any initialization to complete
    await page.waitForTimeout(1000);
  });

  test('should start new session on arxiv page load', async ({ page, backgroundWorker }) => {
    // Verify initial state
    console.log('Starting arxiv page load test...');
    let logs = await getTestLogs(backgroundWorker);
    console.log('Initial logs:', logs);

    // Navigate to arXiv page
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(2000);

    // Check logs after navigation
    logs = await getTestLogs(backgroundWorker);
    console.log('Logs after navigation:', logs);
    
    expect(logs.some(log => log.includes('Starting new session for: 2401.00001'))).toBeTruthy();
  });

  test('should track minimum reading duration', async ({ page, backgroundWorker }) => {
    console.log('Starting reading duration test...');
    
    // Navigate to arXiv page and wait for minimum session duration
    await page.goto('https://arxiv.org/abs/2401.00001');
    console.log('Waiting for minimum session duration...');
    await page.waitForTimeout(31000); // Wait just over 30s minimum duration
    
    // Navigate away to trigger session end
    console.log('Navigating away...');
    await page.goto('https://example.com');
    await page.waitForTimeout(2000);

    const logs = await getTestLogs(backgroundWorker);
    console.log('Final logs:', logs);
    
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
    console.log('Starting idle timeout test...');
    await page.goto('https://arxiv.org/abs/2401.00001');
    await page.waitForTimeout(1000);

    console.log('Waiting for idle timeout...');
    // Reduce wait time for testing - we'll mock the idle threshold
    await backgroundWorker.evaluate(() => {
      // @ts-ignore
      if (self.sessionConfig) {
        // @ts-ignore
        self.sessionConfig.idleThreshold = 5000; // 5 seconds instead of 5 minutes
      }
    });
    
    await page.waitForTimeout(6000); // Wait just over our new 5s threshold

    const logs = await getTestLogs(backgroundWorker);
    console.log('Final logs:', logs);
    
    expect(logs.some(log => 
      log.includes('Session too short to log:') || 
      log.includes('duration: 0')
    )).toBeTruthy();
  });
});
