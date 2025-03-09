// extension/papers/debug.d.ts
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './manager';

// In extension/papers/debug.d.ts, update the global interface
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
                handleUrl: (url: string) => Promise<any>;
            };
        };
    }
}
