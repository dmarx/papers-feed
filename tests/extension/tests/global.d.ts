// tests/extension/tests/global.d.ts

// Extend ServiceWorkerGlobalScope interface for test logging
declare global {
  interface ServiceWorkerGlobalScope {
    testLogs?: string[];
  }
}

export {};
