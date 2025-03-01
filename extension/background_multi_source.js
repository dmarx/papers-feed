// extension/background_multi_source.js
// Extension to support multiple paper sources

import { MultiSourceDetector } from './papers/detector';
import { processPaperUrl as processUrl } from './papers/process_paper_url';
import { loguru } from './utils/logger';

const logger = loguru.getLogger('MultiSourceSupport');

/**
 * Context for external functions provided by the background script
 */
let externalContext = {
  createGithubIssue: null,
  endCurrentSession: null,
  ReadingSession: null,
  sessionConfig: null,
  startActivityTracking: null,
  setCurrentPaperData: null,
  processArxivUrl: null
};

// Track URLs that are being processed to avoid duplicates
const pendingUrls = new Set();

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
      
      // Enhance with multi-source fields if successful
      if (paperData) {
        paperData.source = 'arxiv';
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = primary_id;
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
    processPaperUrl
  };
}
