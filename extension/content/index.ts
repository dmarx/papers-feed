// extension/content/index.ts
// Main entry point for content script using the plugin system

import { loguru } from '../utils/logger';
import { initializeMessageHandlers, extractCurrentPageMetadata, reportExtractedMetadata } from './message_handlers';
import { setupPaperUIOverlay } from './paper_overlay';
import { detectPaperSource, processPaperLink } from './paper_detector';
import { fetchPaperMetadata } from './metadata_fetcher';
import './styles.css';

const logger = loguru.getLogger('ContentScript');

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
  const paperTracker = {
    // Import functions directly from their modules
    detectPaperSource,
    fetchPaperMetadata,
    processPaperLink,
    
    // Extract metadata from the current page
    extractMetadata: async () => {
      try {
        const metadata = await extractCurrentPageMetadata();
        return metadata;
      } catch (error) {
        logger.error(`Error extracting metadata: ${error}`);
        return null;
      }
    },
    
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
