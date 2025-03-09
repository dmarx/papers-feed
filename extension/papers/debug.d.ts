// extension/papers/debug.d.ts
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './manager';
import { DetectedSourceInfo } from './url_detection_service';

// In service workers, we use 'self' instead of 'window'
declare global {
    // For service worker context
    var __DEBUG__: {
        paperManager: PaperManager | null;
        getGithubClient: () => GitHubStoreClient | undefined;
        getCurrentPaper: () => any;
        getCurrentSession: () => any;
        getConfig: () => any;
        enhancedServices?: {
            urlDetectionService: any;
            getPluginState: () => any;
            handleUrl: (url: string) => Promise<DetectedSourceInfo | null>;
        };
    };
}

// To make TypeScript accept the self.__DEBUG__ usage in background.js and other service worker scripts
interface ServiceWorkerGlobalScope {
    __DEBUG__: {
        paperManager: PaperManager | null;
        getGithubClient: () => GitHubStoreClient | undefined;
        getCurrentPaper: () => any;
        getCurrentSession: () => any;
        getConfig: () => any;
        enhancedServices?: {
            urlDetectionService: any;
            getPluginState: () => any;
            handleUrl: (url: string) => Promise<DetectedSourceInfo | null>;
        };
    };
}
