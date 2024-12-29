// tests/extension/tests/global.d.ts

declare global {
  interface ServiceWorkerGlobalScope {
    testLogs?: string[];
    githubToken?: string;
    githubRepo?: string;
    sessionConfig?: {
      idleThreshold: number;
      minSessionDuration: number;
      activityUpdateInterval: number;
      requireContinuousActivity: boolean;
      logPartialSessions: boolean;
    };
  }

  interface Window {
    chrome: typeof chrome;
  }
}

export {};
