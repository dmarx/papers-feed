// extension/background_multi_source.js
// Extension to support multiple paper sources

import { MultiSourceDetector } from './papers/detector';

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
          const metadata = {
            title: document.querySelector('meta[name="citation_title"]')?.content ||
                   document.querySelector('meta[property="og:title"]')?.content ||
                   document.title,
            authors: document.querySelector('meta[name="citation_authors"]')?.content ||
                     document.querySelector('meta[name="author"]')?.content,
            abstract: document.querySelector('meta[name="description"]')?.content ||
                      document.querySelector('meta[property="og:description"]')?.content,
            published_date: document.querySelector('meta[name="citation_publication_date"]')?.content
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
    
    // Try legacy arXiv detection as fallback
    return processArxivUrl(url);
  }
  
  console.log('Detected paper source:', sourceInfo);
  
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  
  // For arXiv, use the existing well-tested processor
  if (sourceType === 'arxiv') {
    const paperData = await processArxivUrl(url);
    
    // Enhance with multi-source fields if successful
    if (paperData) {
      paperData.source = 'arxiv';
      paperData.sourceId = paperData.arxivId;
      paperData.primary_id = primary_id;
    }
    
    return paperData;
  }
  
  // For non-arXiv sources, create basic paper data
  const paperData = {
    source: sourceType,
    sourceId: sourceId,
    primary_id: primary_id,
    url: url,
    timestamp: new Date().toISOString(),
    rating: 'novote'
  };
  
  // Try to extract title, authors, etc. from page if possible
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0) {
      const metadata = await extractMetadataFromPage(tabs[0].id);
      if (metadata) {
        paperData.title = metadata.title || `${sourceType.toUpperCase()} Paper: ${sourceId}`;
        paperData.authors = metadata.authors || '';
        paperData.abstract = metadata.abstract || '';
        paperData.published_date = metadata.published_date || '';
      } else {
        paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
      }
    }
  } catch (error) {
    console.error('Error extracting page metadata:', error);
    paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
  }
  
  // Add source-specific identifiers
  if (sourceType === 'doi') {
    paperData.doi = sourceId;
  } else if (sourceType === 'semanticscholar') {
    paperData.s2Id = sourceId;
  }
  
  console.log('Paper data processed:', paperData);
  return paperData;
}

/**
 * Extend the URL listener to detect multiple paper sources
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
      await createGithubIssue(paperData);
    }
  }, {
    url: [
      { hostSuffix: 'semanticscholar.org' },
      { hostSuffix: 'doi.org' },
      { hostSuffix: 'dl.acm.org' }
    ]
  });
  
  console.log('Multi-source paper detection enabled');
}

/**
 * Enhance tab change handler to support multiple sources
 * 
 * @param {Object} tab - Tab data
 */
async function enhancedHandleTabChange(tab) {
  const url = tab?.url || '';
  
  // Use detector to identify paper source
  const sourceInfo = MultiSourceDetector.detect(url);
  const isPaperUrl = !!sourceInfo;
  
  console.log('Tab change detected:', { isPaperUrl, url });
  
  if (!isPaperUrl) {
    console.log('Not a recognized paper page, ending current session');
    await endCurrentSession();
    return;
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
 * Initialize the multi-source extensions
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
