/**
 * Paper tracker API exposed to page scripts
 */
interface PaperTracker {
  extractMetadata: () => Promise<any>;
  trackPaper: (url: string) => void;
  isPaperUrl: (url: string) => Promise<boolean>;
}

declare global {
  interface Window {
    paperTracker: PaperTracker;
    trackPaper: (url: string) => void;
  }
}

export {};
