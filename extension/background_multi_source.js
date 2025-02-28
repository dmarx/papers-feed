// extension/background_multi_source.js
// Extension to support multiple paper sources

import { MultiSourceDetector } from './papers/detector';
import { processPaperUrl as processUrl, enhancePaperData } from './papers/process_paper_url';

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
    
    // Try legacy arXiv detection as fallback
    if (externalContext.processArxivUrl) {
      return externalContext.processArxivUrl(url);
    }
    return null;
  }
  
  console.log('Detected paper source:', sourceInfo);
  
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
    
    // Store in GitHub if available
    if (paperData && externalContext.createGithubIssue) {
      try {
        await externalContext.createGithubIssue(paperData);
      } catch (e) {
        console.error('Error storing paper data in GitHub:', e);
      }
    }
    
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
      
      // Create or update paper in GitHub storage
      if (externalContext.createGithubIssue) {
        await externalContext.createGithubIssue(paperData);
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
  
  console.log('Processing paper URL for new session');
  const paperData = await processPaperUrl(url);
  
  if (paperData) {
    // Use appropriate ID based on availability
    const trackingId = paperData.arxivId || paperData.sourceId;
    
    console.log('Starting new session for:', trackingId);
    
    if (externalContext.ReadingSession && externalContext.sessionConfig) {
      // Create a new session
      const currentSession = new externalContext.ReadingSession(trackingId, externalContext.sessionConfig);
      const metadata = currentSession.getMetadata();
      console.log('New session created:', metadata);
      
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
  
  // Setup listener for additional paper sources
  setupMultiSourceListener();
  
  console.log('Multi-source paper support initialized with context:', 
    Object.keys(externalContext).filter(k => !!externalContext[k]));
  
  // Return overrides that can be applied to the main module
  return {
    processPaperUrl,
    enhancedHandleTabChange
  };
