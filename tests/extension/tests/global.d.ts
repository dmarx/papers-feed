// tests/extension/tests/global.d.ts

// Extend Window interface for test logging
declare global {
  interface Window {
    testLogs?: string[];
  }
}

export {};
