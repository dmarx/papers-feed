// extension/background_multi_source.js
// Extension to support multiple paper sources

import { MultiSourceDetector } from './papers/detector';
import { processPaperUrl, enhancePaperData } from './papers/process_paper_url';

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
      await createGithubIssue(paperData);
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
    await endCurrentSession();
    return;
  }
  
  // For arXiv papers, use the original handler for full compatibility
  if (sourceInfo.type === 'arxiv' && originalHandler) {
    return originalHandler(tab);
  }
  
  if (currentSession) {
    console.log('Ending existing session before starting new one');
    await endCurrentSession();
  }
  
  console.log('Processing paper URL for new session');
  currentPaperData = await processPaperUrl(url);
  
  if (currentPaperData) {
    // Use appropriate ID based on availability - maintaining backward compatibility
    const trackingId = currentPaperData.arxivId || currentPaperData.sourceId;
    
    console.log('Starting new session for:', trackingId);
    currentSession = new ReadingSession(trackingId, sessionConfig);
    const metadata = currentSession.getMetadata();
    console.log('New session created:', metadata);
    startActivityTracking();
  }
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
