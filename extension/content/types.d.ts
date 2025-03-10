// extension/content/types.d.ts - Type declarations for content script

import { SourceInfo, PaperMetadata } from '../types/common';

/**
 * Paper Tracker API exposed to page scripts
 */
interface PaperTracker {
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
   * Extract metadata from the current page
   * @returns Promise resolving to page metadata
   */
  extractMetadata: () => Promise<any>;
  
  /**
   * Check if a URL is a supported paper source
   * @param url URL to check
   * @returns Promise resolving to true if supported
   */
  isPaperUrl: (url: string) => Promise<boolean>;
  
  /**
   * Process a paper link to add annotation functionality
   * @param link Link element to process
   */
  processPaperLink?: (link: HTMLAnchorElement) => Promise<void>;
}

/**
 * Window interface extended with paper tracker
 */
declare global {
  interface Window {
    /**
     * Paper Tracker API exposed to page scripts
     */
    paperTracker: PaperTracker;
    
    /**
     * Legacy function to track a paper
     * @param url Paper URL to track
     */
    trackPaper: (url: string) => void;
  }
}

// Export empty object to make this a module
export {};
