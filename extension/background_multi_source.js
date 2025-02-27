// extension/background_multi_source.js
// Extension to support multiple paper sources

import { MultiSourceDetector } from './papers/detector';
import { processPaperUrl as processUrl, enhancePaperData } from './papers/process_paper_url';

/**
 * Extracts metadata from the current page if possible
 * 
 * @param {number} tabId - ID of the current tab
 * @returns {Promise<Object|null>} - Extracted metadata or null
 */
async function extractMetadataFromPage(tabId) {
  try {
    const result = await chrome.tabs.executeScript(tabId, {
      code: `
        (function() {
          try {
            // Try to extract from common meta tags first
            const metadata = {
              title: document.querySelector('meta[name="citation_title"]')?.content ||
                     document.querySelector('meta[property="og:title"]')?.content ||
                     document.title,
              authors: document.querySelector('meta[name="citation_author"]')?.content ||
                       document.querySelector('meta[name="citation_authors"]')?.content ||
                       document.querySelector('meta[name="author"]')?.content,
              abstract: document.querySelector('meta[name="description"]')?.content ||
                        document.querySelector('meta[property="og:description"]')?.content ||
                        document.querySelector('meta[name="citation_abstract"]')?.content,
              published_date: document.querySelector('meta[name="citation_publication_date"]')?.content ||
                              document.querySelector('meta[name="citation_date"]')?.content,
              doi: document.querySelector('meta[name="citation_doi"]')?.content
            };
            
            // If metadata not found in meta tags, try common page elements
            if (!metadata.title) {
              const h1 = document.querySelector('h1');
              if (h1) metadata.title = h1.textContent.trim();
            }
            
            if (!metadata.abstract) {
              const abstractEl = document.querySelector('.abstract') || 
                                document.querySelector('#abstract') ||
                                document.querySelector('[class*="abstract"]');
              if (abstractEl) metadata.abstract = abstractEl.textContent.trim();
            }
            
            return metadata;
          } catch (e) {
            console.error('Error extracting metadata:', e);
            return null;
          }
        })();
      `
    });
    
    if (result && result[0]) {
      return result[0];
    }
  } catch (error) {
    console.error('Error executing script:', error);
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
  console.log('Multi-source processing for URL:', url);
  
  // Use detector to identify paper source
  const sourceInfo = MultiSourceDetector.detect(url);
  
  // If not a recognized paper URL, exit
  if (!sourceInfo) {
    console.log('No recognized paper source detected in URL');
    
    // Try legacy arXiv detection as fallback - this will be provided by the background script
    if (typeof processArxivUrl === 'function') {
      return processArxivUrl(url);
    }
    return null;
  }
  
  console.log('Detected paper source:', sourceInfo);
  
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  
  // For arXiv, use the existing well-tested processor if available
  if (sourceType === 'arxiv' && typeof processArxivUrl === 'function') {
    const paperData = await processArxivUrl(url);
    
    // Enhance with multi-source fields if successful
    if (paperData) {
      paperData.source = 'arxiv';
      paperData.sourceId = paperData.arxivId;
      paperData.primary_id = primary_id;
    }
    
    return paperData;
  }
  
  // Delegate to the TypeScript implementation in papers/process_paper_url.ts
  // This uses the imported processUrl function
  try {
    const paperData = await processUrl(url);
    return paperData;
  } catch (error) {
    console.error('Error processing paper URL:', error);
    
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
}

/**
 * Setup listener for new paper sources
 */
function setupMultiSourceListener() {
  // Create a new listener for additional paper sources
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    console.log('Multi-source navigation detected:', details.url);
    
    // Skip arXiv URLs which are handled by the original listener
    if (details.url.includes('arxiv.org')) {
      return;
    }
    
    // Process other paper URLs
    const paperData = await processPaperUrl(details.url);
    if (paperData) {
      console.log('Paper data extracted:', paperData);
      
      // Create or update paper in storage
      // The createGithubIssue function will be provided by the background script
      if (typeof createGithubIssue === 'function') {
        await createGithubIssue(paperData);
      } else {
        console.error('createGithubIssue function not available');
      }
    }
  }, {
    url: [
      { hostSuffix: 'semanticscholar.org' },
      { hostSuffix: 'doi.org' },
      { hostSuffix: 'dl.acm.org' },
      { hostSuffix: 'openreview.net' }
    ]
  });
  
  console.log('Multi-source paper detection enabled');
}

/**
 * Enhanced tab change handler for multiple sources
 * 
 * @param {Object} tab - Current tab data
 * @param {Function} originalHandler - Original handler for legacy support
 */
async function enhancedHandleTabChange(tab, originalHandler) {
  const url = tab?.url || '';
  
  // Use detector to identify paper source
  const sourceInfo = MultiSourceDetector.detect(url);
  const isPaperUrl = !!sourceInfo;
  
  console.log('Tab change detected:', { isPaperUrl, url, sourceInfo });
  
  if (!isPaperUrl) {
    console.log('Not a recognized paper page, ending current session');
    
    // The endCurrentSession function will be provided by the background script
    if (typeof endCurrentSession === 'function') {
      await endCurrentSession();
    }
    return;
  }
  
  // For arXiv papers, use the original handler for full compatibility
  if (sourceInfo.type === 'arxiv' && originalHandler) {
    return originalHandler(tab);
  }
  
  // Background script variables/functions that we need to access
  if (typeof currentSession !== 'undefined' && currentSession) {
    console.log('Ending existing session before starting new one');
    if (typeof endCurrentSession === 'function') {
      await endCurrentSession();
    }
  }
  
  console.log('Processing paper URL for new session');
  const paperData = await processPaperUrl(url);
  
  if (paperData && typeof ReadingSession === 'function' && typeof sessionConfig !== 'undefined') {
    // Use appropriate ID based on availability - maintaining backward compatibility
    const trackingId = paperData.arxivId || paperData.sourceId;
    
    console.log('Starting new session for:', trackingId);
    
    // Set currentPaperData and currentSession - these are global variables in the background script
    if (typeof currentSession !== 'undefined') {
      currentSession = new ReadingSession(trackingId, sessionConfig);
      const metadata = currentSession.getMetadata();
      console.log('New session created:', metadata);
      
      if (typeof startActivityTracking === 'function') {
        startActivityTracking();
      }
    }
    
    if (typeof currentPaperData !== 'undefined') {
      currentPaperData = paperData;
    }
    
    return paperData;
  }
  
  return null;
}

/**
 * Initialize the multi-source support
 */
export function initMultiSourceSupport() {
  // Setup listener for additional paper sources
  setupMultiSourceListener();
  
  console.log('Multi-source paper support initialized');
  
  // Return overrides that can be applied to the main module
  return {
    processPaperUrl,
    enhancedHandleTabChange
  };
}
