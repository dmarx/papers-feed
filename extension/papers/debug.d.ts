// extension/papers/debug.d.ts
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './manager';
import { DetectedSourceInfo } from './url_detection_service';

declare global {
    interface Window {
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
    
    const __DEBUG__: Window['__DEBUG__'];
}
