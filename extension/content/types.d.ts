// content/types.d.ts - Type declarations for content script

/**
 * Extended Window interface with paper tracker extensions
 */
interface Window {
  /**
   * Paper Tracker API exposed to page scripts
   */
  paperTracker: {
    /**
     * Detect paper source and ID from URL
     * @param url Paper URL to detect
     */
    detectPaperSource: (url: string) => SourceInfo | null;
    
    /**
     * Fetch metadata for a paper
     * @param source Paper source type
     * @param id Paper ID
     */
    fetchPaperMetadata: (source: string, id: string) => Promise<PaperMetadata>;
    
    /**
     * Track paper with the extension
     * @param url Paper URL to track
     */
    trackPaper: (url: string) => void;
    
    /**
     * Process a paper link to add annotation functionality
     * @param link Link element to process
     */
    processPaperLink?: (link: HTMLAnchorElement) => Promise<void>;
  };
  
  /**
   * Legacy function to track a paper
   * @param url Paper URL to track
   */
  trackPaper: (url: string) => void;
}

/**
 * Paper source information
 */
interface SourceInfo {
  type: string;
  id: string;
  url: string;
}

/**
 * Paper metadata
 */
interface PaperMetadata {
  title?: string;
  authors?: string;
  abstract?: string;
  url?: string;
  source?: string;
  id?: string;
  primary_id?: string;
  [key: string]: any;
}
