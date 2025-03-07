// extension/background_multi_source.js
// Extension to support multiple paper sources

import { MultiSourceDetector } from './papers/detector';
import { processPaperUrl as processUrl, enhancePaperData } from './papers/process_paper_url';
import { loguru } from './utils/logger';
import { formatPrimaryId, isNewFormat } from './papers/source_utils';

const logger = loguru.getLogger('MultiSourceSupport');

/**
 * Context for external functions provided by the background script
 */
let externalContext = {
  createGithubIssue: null,
  endCurrentSession: null,
  EnhancedReadingSession: null,
  sessionConfig: null,
  startActivityTracking: null,
  setCurrentPaperData: null,
  processArxivUrl: null
};

// Track URLs that are being processed to avoid duplicates
const pendingUrls = new Set();

/**
 * Extracts metadata from the current page if possible
 * 
 * @param {number} tabId - ID of the current tab
 * @returns {Promise<Object|null>} - Extracted metadata or null
 */
async function extractMetadataFromPage(tabId) {
  try {
    const result = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        try {
          // Helper function to safely get content from meta tags
          const getMetaContent = (selector) => {
            const element = document.querySelector(selector);
            return element && 'content' in element ? 
              element.content : undefined;
          };

          // Try to extract from common meta tags first
          const metadata = {
            title: getMetaContent('meta[name="citation_title"]') ||
                   getMetaContent('meta[property="og:title"]') ||
                   document.title,
            authors: getMetaContent('meta[name="citation_author"]') ||
                     getMetaContent('meta[name="citation_authors"]') ||
                     getMetaContent('meta[name="author"]'),
            abstract: getMetaContent('meta[name="description"]') ||
                      getMetaContent('meta[property="og:description"]') ||
                      getMetaContent('meta[name="citation_abstract"]'),
            published_date: getMetaContent('meta[name="citation_publication_date"]') ||
                            getMetaContent('meta[name="citation_date"]'),
            doi: getMetaContent('meta[name="citation_doi"]')
          };
          
          // If metadata not found in meta tags, try common page elements
          if (!metadata.title) {
            const h1 = document.querySelector('h1');
            if (h1 && h1.textContent) metadata.title = h1.textContent.trim();
          }
          
          if (!metadata.abstract) {
            const abstractEl = document.querySelector('.abstract') || 
                              document.querySelector('#abstract') ||
                              document.querySelector('[class*="abstract"]');
            if (abstractEl && abstractEl.textContent) metadata.abstract = abstractEl.textContent.trim();
          }
          
          return metadata;
        } catch (e) {
          console.error('Error extracting metadata:', e);
          return null;
        }
      }
    });
    
    if (result && result[0] && result[0].result) {
      return result[0].result;
    }
  } catch (error) {
    logger.error('Error executing script:', error);
  }
  
  return null;
}

/**
 * Enhanced version of processArxivUrl that supports multiple sources
 * 
 * @param {string} url - URL to process
 * @returns {Promise<Object|null>} - Paper data or null
 */
async function processPaperUrl(url) {
  logger.info(`Multi-source processing for URL: ${url}`);
  
  // Prevent duplicate processing
  if (pendingUrls.has(url)) {
    logger.info(`URL already being processed, skipping: ${url}`);
    return null;
  }
  
  // Mark URL as being processed
  pendingUrls.add(url);
  
  try {
    // Use detector to identify paper source
    const sourceInfo = MultiSourceDetector.detect(url);
    
    // If not a recognized paper URL, exit
    if (!sourceInfo) {
      logger.info('No recognized paper source detected in URL');
      
      // Try legacy arXiv detection as fallback
      if (externalContext.processArxivUrl) {
        return externalContext.processArxivUrl(url);
      }
      return null;
    }
    
    logger.info(`Detected paper source: ${sourceInfo.type}:${sourceInfo.id}`);
    
    const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
    
    // For arXiv, use the existing well-tested processor if available
    if (sourceType === 'arxiv' && externalContext.processArxivUrl) {
      const paperData = await externalContext.processArxivUrl(url);
      
      // Ensure it has all required fields
      if (paperData) {
        if (!paperData.source) paperData.source = 'arxiv';
        if (!paperData.sourceId) paperData.sourceId = paperData.arxivId;
        if (!paperData.primary_id) paperData.primary_id = primary_id;
      }
      
      return paperData;
    }
    
    // Delegate to the TypeScript implementation in papers/process_paper_url.ts
    try {
      const paperData = await processUrl(url, externalContext.processArxivUrl);
      
      // Store in GitHub if available - but don't await to avoid race conditions
      if (paperData && externalContext.createGithubIssue) {
        externalContext.createGithubIssue(paperData).catch(e => {
          logger.error('Error storing paper data in GitHub:', e);
        });
      }
      
      return paperData;
    } catch (error) {
      logger.error('Error processing paper URL:', error);
      
      // Create basic paper data as fallback
      return {
        source: sourceType,
        sourceId: sourceId,
        primary_id: primary_id,
        url: url,
        title: `${sourceType.toUpperCase()} Paper: ${sourceId}`,
        timestamp: new Date().toISOString(),
        rating: 'novote'
      };
    }
  } catch (error) {
    logger.error(`Unexpected error in processPaperUrl: ${error}`);
    return null;
  } finally {
    // Remove URL from pending after a delay to prevent immediate reprocessing
    setTimeout(() => {
      pendingUrls.delete(url);
    }, 500);
  }
}

/**
 * Enhanced tab change handler for multiple sources
 * 
 * @param {Object} tab - Current tab data
 * @param {Function} originalHandler - Original handler for legacy support
 */
async function enhancedHandleTabChange(tab, originalHandler) {
  if (!tab || !tab.url) {
    return;
  }
  
  const url = tab.url;
  
  // Prevent duplicate processing
  if (pendingUrls.has(url)) {
    logger.info(`URL already being processed in enhancedHandleTabChange: ${url}`);
    return;
  }
  
  // Mark URL as being processed
  pendingUrls.add(url);
  
  try {
    // Use detector to identify paper source
    const sourceInfo = MultiSourceDetector.detect(url);
    const isPaperUrl = !!sourceInfo;
    
    logger.info(`Tab change detected:`, { isPaperUrl, url, sourceInfo });
    
    if (!isPaperUrl) {
      logger.info('Not a recognized paper page, ending current session');
      
      // End current session if available
      if (externalContext.endCurrentSession) {
        await externalContext.endCurrentSession();
      }
      return;
    }
    
    // For arXiv papers, use the original handler for full compatibility
    if (sourceInfo.type === 'arxiv' && originalHandler) {
      return originalHandler(tab);
    }
    
    // For other sources, end any existing session
    if (externalContext.endCurrentSession) {
      await externalContext.endCurrentSession();
    }
    
    logger.info('Processing paper URL for new session');
    const paperData = await processPaperUrl(url);
    
    if (paperData) {
      logger.info(`Starting new session for: ${paperData.primary_id}`);
      
      if (externalContext.EnhancedReadingSession && externalContext.sessionConfig) {
        // Create a new session with the updated EnhancedReadingSession class
        // which requires paperData instead of just an ID
        const currentSession = new externalContext.EnhancedReadingSession(paperData, externalContext.sessionConfig);
        const metadata = currentSession.getMetadata();
        logger.info('New session created:', metadata);
        
        // Set the current paper data
        if (externalContext.setCurrentPaperData) {
          externalContext.setCurrentPaperData(paperData);
        }
        
        // Start tracking activity
        if (externalContext.startActivityTracking) {
          externalContext.startActivityTracking();
        }
        
        // Return the paper data
        return paperData;
      }
    }
    
    return null;
  } catch (error) {
    logger.error(`Error in enhanced tab change handler: ${error}`);
    return null;
  } finally {
    // Remove URL from pending after a delay
    setTimeout(() => {
      pendingUrls.delete(url);
    }, 500);
  }
}

/**
 * Initialize the multi-source support
 * 
 * @param {Object} context - External functions from background script
 */
export function initMultiSourceSupport(context = {}) {
  // Store external context
  externalContext = {
    ...externalContext,
    ...context
  };
  
  logger.info('Multi-source paper support initialized with context:', 
    Object.keys(externalContext).filter(k => !!externalContext[k]));
  
  // Return overrides that can be applied to the main module
  return {
    processPaperUrl,
    enhancedHandleTabChange
  };
}
