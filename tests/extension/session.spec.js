// File: tests/extension/session.spec.js
const { test, expect } = require('./fixtures');

test.describe('Reading Session Tracking', () => {
  test('should start new session when navigating to arXiv page', async ({ extensionPage }) => {
    await extensionPage.navigateToArxiv('2401.00001');
    
    const logs = await extensionPage.getLogs();
    expect(logs).toContain(log => 
      log.includes('Starting new session for: 2401.00001')
    );
  });

  test('should end session when leaving arXiv page', async ({ extensionPage }) => {
    // Start session
    await extensionPage.navigateToArxiv('2401.00001');
    await extensionPage.clearLogs();
    
    // Navigate away
    await extensionPage.switchToTab('https://example.com');
    
    const logs = await extensionPage.getLogs();
    expect(logs).toContain(log => 
      log.includes('Ending session for: 2401.00001')
    );
  });

  test('should continue session when switching between PDF and abstract', async ({ extensionPage }) => {
    // Start on abstract page
    await extensionPage.navigateToArxiv('2401.00001');
    await extensionPage.clearLogs();
    
    // Switch to PDF
    await extensionPage.navigateToArxiv('2401.00001.pdf');
    
    const logs = await extensionPage.getLogs();
    expect(logs).not.toContain(log =>
      log.includes('Ending session for: 2401.00001')
    );
  });

  test('should track reading time correctly', async ({ extensionPage }) => {
    await extensionPage.navigateToArxiv('2401.00001');
    
    // Wait for some reading time
    await extensionPage.page.waitForTimeout(5000);
    
    // Navigate away to end session
    await extensionPage.switchToTab('https://example.com');
    
    const logs = await extensionPage.getLogs();
    const durationLog = logs.find(log => 
      log.includes('Creating reading event with duration:')
    );
    
    expect(durationLog).toBeDefined();
    const duration = parseInt(durationLog.match(/duration: (\d+)/)[1]);
    expect(duration).toBeGreaterThan(4000); // At least 4 seconds
  });
});
