// extension/types/extension.d.ts - Global type declarations for extension

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from '../papers/manager';
import { DetectedSourceInfo } from '../papers/detection_service';

/**
 * Debug objects shared in the ServiceWorker scope
 */
interface DebugAPI {
  paperManager: PaperManager | null;
  getGithubClient: () => PaperManager | null;
  getCurrentPaper: () => any;
  getCurrentSession: () => any;
  getConfig: () => any;
  enhancedServices: {
    urlDetectionService: any;
    getPluginState: () => any;
    handleUrl: (url: string) => Promise<DetectedSourceInfo | null>;
    [key: string]: any;
  };
}

// Global ServiceWorker scope
declare global {
  interface ServiceWorkerGlobalScope {
    __DEBUG__: DebugAPI;
  }
}
