// content/index.ts - Main entry point for content script

import { initializeAnnotator } from './annotator';
import { initializeMessageHandlers } from './message_handlers';
import { setupLinkDetection, detectPaperSource, trackPaper } from './paper_detector';
import { fetchPaperMetadata } from './metadata_fetcher';
import './styles.css';

/**
 * Initialize the content script
 */
function initialize(): void {
  console.log('Academic Paper Tracker content script initialized');
  
  // Initialize components
  initializeMessageHandlers();
  initializeAnnotator();
  setupLinkDetection();
  
  // Expose global functions for backward compatibility
  exposeGlobalFunctions();
}

/**
 * Expose critical functions to window for backward compatibility
 * and for access from page context
 */
function exposeGlobalFunctions(): void {
  // Create the global object
  window.paperTracker = {
    detectPaperSource,
    fetchPaperMetadata,
    trackPaper
  };
  
  // Backward compatibility for direct access
  window.trackPaper = trackPaper;
}

// Run initialization when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  // DOM is already loaded, initialize immediately
  initialize();
}
