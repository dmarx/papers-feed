// extension/content/index.ts
// Main entry point for content script using the plugin system

import { loguru } from '../utils/logger';
import { initializeMessageHandlers, extractCurrentPageMetadata, reportExtractedMetadata } from './message_handlers';
import { setupPaperUIOverlay } from './paper_overlay';
import './styles.css';

const logger = loguru.getLogger('ContentScript');

/**
 * Paper tracker functionality available to page script
 */
interface PaperTracker {
  extractMetadata: () => Promise<any>;
  trackPaper: (url: string) => void;
  isPaperUrl: (url: string) => Promise<boolean>;
  
  // Include these to be compatible with old interface
  detectPaperSource: (url: string) => any | null;
  fetchPaperMetadata: (source: string, id: string) => Promise<any>;
  processPaperLink?: (link: HTMLAnchorElement) => Promise<void>;
}

/**
 * Initialize the content script
 */
function initialize(): void {
  logger.info('Academic Paper Tracker content script initialized');
  
  // Initialize message handlers
  initializeMessageHandlers();
  
  // Set up paper UI overlay (annotations, etc.)
  setupPaperUIOverlay();
  
  // Analyze the current page
  analyzeCurrentPage();
  
  // Expose global functions for API access
  exposeGlobalFunctions();
}

/**
 * Analyze the current page for paper metadata
 */
async function analyzeCurrentPage(): Promise<void> {
  try {
    logger.info(`Analyzing current page: ${window.location.href}`);
    
    // Try to extract metadata from the current page
    const metadata = await extractCurrentPageMetadata();
    
    if (metadata) {
      logger.info(`Extracted metadata: ${metadata.title || 'Untitled'}`);
      
      // Report extracted metadata to background script
      const success = await reportExtractedMetadata(metadata);
      
      if (success) {
        logger.info('Successfully processed paper metadata');
      } else {
        logger.warning('Failed to process paper metadata');
      }
    } else {
      logger.info('Current page is not a recognized paper or metadata extraction failed');
    }
  } catch (error) {
    logger.error(`Error analyzing current page: ${error}`);
  }
}

/**
 * Expose critical functions to window for API access
 */
function exposeGlobalFunctions(): void {
  // Create the paperTracker API
  const paperTracker: PaperTracker = {
    // Extract metadata from current page
    extractMetadata: extractCurrentPageMetadata,
    
    // Track a paper URL
    trackPaper: (url: string) => {
      chrome.runtime.sendMessage({
        type: 'trackPaper',
        url: url
      }, response => {
        if (response && response.success) {
          logger.info(`Paper tracked: ${response.paperData?.title || url}`);
        } else {
          logger.warning(`Failed to track paper: ${response?.error || 'Unknown error'}`);
        }
      });
    },
    
    // Check if a URL is a supported paper source
    isPaperUrl: async (url: string): Promise<boolean> => {
      return new Promise(resolve => {
        chrome.runtime.sendMessage({
          type: 'detectPaperSource',
          url: url
        }, response => {
          resolve(response && response.success && response.detected);
        });
      });
    }
  };
  
  // Expose the API
  window.paperTracker = paperTracker;
  
  // Legacy support for direct trackPaper function
  window.trackPaper = paperTracker.trackPaper;
}

// Run initialization when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM is already loaded, initialize immediately
  initialize();
}

// Extend Window interface to include our API
// And then update the global declaration:
declare global {
  interface Window {
    paperTracker: PaperTracker;
    trackPaper: (url: string) => void;
  }
}
