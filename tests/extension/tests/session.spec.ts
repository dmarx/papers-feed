// tests/extension/tests/session.spec.ts
import { test, expect } from '@playwright/test';
import { withFixtures } from './fixtures';

test.describe('Reading Session Tests', () => {
  test('should start new session on arxiv page load', async () => {
    await withFixtures(
      {
        // Mock ArXiv API responses
        mockResponses: async (mockServer) => {
          await mockServer.forGet('/api/query*').thenReply(200, `
            <?xml version="1.0" encoding="UTF-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <title>Test Paper Title</title>
                <summary>Test abstract</summary>
                <author><name>Test Author</name></author>
                <published>2024-01-01T00:00:00Z</published>
                <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI"/>
              </entry>
            </feed>
          `);
        }
      },
      async ({ context, backgroundWorker }) => {
        // Get logs before navigation
        let logs = await backgroundWorker.evaluate(() => {
          // @ts-ignore
          return self.testLogs || [];
        });
        console.log('Initial logs:', logs);

        // Create new page and navigate
        const page = await context.newPage();
        await page.goto('https://arxiv.org/abs/2401.00001');
        await page.waitForTimeout(2000);

        // Get logs after navigation
        logs = await backgroundWorker.evaluate(() => {
          // @ts-ignore
          return self.testLogs || [];
        });
        console.log('Logs after navigation:', logs);

        expect(logs.some(log => log.includes('Starting new session for: 2401.00001'))).toBeTruthy();
      }
    );
  });

  test('should track reading duration', async () => {
    await withFixtures(
      {
        // Add any needed mocks
        mockResponses: async (mockServer) => {
          // Mock ArXiv API
          await mockServer.forGet('/api/query*').thenReply(200, `
            <?xml version="1.0" encoding="UTF-8"?>
            <feed xmlns="http://www.w3.org/2005/Atom">
              <entry>
                <title>Test Paper Title</title>
                <summary>Test abstract</summary>
                <author><name>Test Author</name></author>
                <published>2024-01-01T00:00:00Z</published>
                <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.AI"/>
              </entry>
            </feed>
          `);

          // Mock GitHub API
          await mockServer.forPost('https://api.github.com/repos/*/issues').thenReply(200, {
            html_url: 'https://github.com/test/test/issues/1',
            number: 1
          });
        }
      },
      async ({ context, backgroundWorker }) => {
        // Set test credentials
        await backgroundWorker.evaluate(() => {
          // @ts-ignore
          self.githubToken = 'fake-token';
          // @ts-ignore
          self.githubRepo = 'test/test';
        });

        const page = await context.newPage();
        await page.goto('https://arxiv.org/abs/2401.00001');
        
        // Wait for minimum duration
        await page.waitForTimeout(31000);
        
        // Navigate away
        await page.goto('https://example.com');
        await page.waitForTimeout(2000);

        const logs = await backgroundWorker.evaluate(() => {
          // @ts-ignore
          return self.testLogs || [];
        });

        const durationLog = logs.find(log => log.includes('Creating reading event:'));
        expect(durationLog).toBeDefined();

        if (durationLog) {
          const durationMatch = durationLog.match(/"duration_seconds":\s*(\d+)/);
          expect(durationMatch).toBeTruthy();
          const duration = parseInt(durationMatch![1]);
          expect(duration).toBeGreaterThanOrEqual(30);
        }
      }
    );
  });
});
