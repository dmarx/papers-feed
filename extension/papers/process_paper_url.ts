// extension/papers/process_paper_url.ts
// Process paper URLs from multiple sources with plugin system integration

import { MultiSourceDetector } from './detector';
import { SourceInfo } from '../types/common';
import { formatPrimaryId } from './source_utils';
import { pluginRegistry } from './plugins/registry';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('PaperProcessor');

/**
 * Metadata extracted from a paper page
 */
interface PageMetadata {
  title?: string;
  authors?: string;
  abstract?: string;
  published_date?: string;
  doi?: string;
  url?: string;
  citations?: number;
}

/**
 * Extract metadata from the current tab's page
 * 
 * @param {number} tabId - Tab ID to extract metadata from
 * @returns {Promise<PageMetadata|null>} Extracted metadata or null
 */
async function extractMetadataFromPage(tabId: number): Promise<PageMetadata | null> {
  try {
    // Use chrome.scripting.executeScript instead of the deprecated chrome.tabs.executeScript
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: () => {
        try {
          // Helper function to safely get content from meta tags
          const getMetaContent = (selector: string): string | undefined => {
            const element = document.querySelector(selector);
            return element && 'content' in element ? 
              (element as HTMLMetaElement).content : undefined;
          };

          // Try to extract from common meta tags first
          const metadata: {
            title?: string;
            authors?: string;
            abstract?: string;
            published_date?: string;
            doi?: string;
            url?: string;
            citations?: number | null;
          } = {
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
            doi: getMetaContent('meta[name="citation_doi"]'),
            url: getMetaContent('meta[property="og:url"]') || window.location.href,
            citations: null
          };
          
          // Source-specific extraction fallbacks
          if (!metadata.title) {
            const h1 = document.querySelector('h1');
            if (h1 && h1.textContent) metadata.title = h1.textContent.trim();
          }
          
          if (!metadata.abstract) {
            // Try common abstract containers
            const abstractEl = document.querySelector('.abstract') || 
                              document.querySelector('#abstract') ||
                              document.querySelector('[class*="abstract"]') ||
                              document.querySelector('[id*="abstract"]');
            if (abstractEl && abstractEl.textContent) metadata.abstract = abstractEl.textContent.trim();
          }
          
          // DOI-specific extraction
          if (!metadata.doi && window.location.href.includes('doi.org')) {
            const match = window.location.href.match(/doi\.org\/(10\.[0-9.]+\/[^\s&/?#]+[^\s&/?#.:])/);
            if (match) metadata.doi = match[1];
          }
          
          // ACM-specific extraction
          if (window.location.href.includes('dl.acm.org')) {
            // Try to get citation count
            const citationEl = document.querySelector('.citation-metrics');
            if (citationEl && citationEl.textContent) {
              const citText = citationEl.textContent;
              const citMatch = citText.match(/(\d+)\s+citations/i);
              if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
            }
            
            // Try to extract DOI from URL or page
            if (!metadata.doi) {
              const doiMatch = window.location.href.match(/dl\.acm\.org\/doi\/(10\.[0-9.]+\/[^\s&/?#]+[^\s&/?#.:])/);
              if (doiMatch) metadata.doi = doiMatch[1];
            }
          }
          
          // Semantic Scholar specific extraction
          if (window.location.href.includes('semanticscholar.org')) {
            // Try to get citation count
            const citationEl = document.querySelector('[data-test-id="citation-count"]');
            if (citationEl && citationEl.textContent) {
              const citText = citationEl.textContent;
              const citMatch = citText.match(/(\d+)/);
              if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
            }
            
            // Format authors if found in a specific format
            const authorElements = document.querySelectorAll('[data-test-id="author-list"] a');
            if (authorElements.length > 0) {
              metadata.authors = Array.from(authorElements)
                .map(el => el.textContent?.trim())
                .filter(Boolean)
                .join(', ');
            }
          }

          // OpenReview specific extraction
          if (window.location.href.includes('openreview.net')) {
            // Try to extract authors from meta tags or DOM
            if (!metadata.authors) {
              const authorElements = document.querySelectorAll('meta[name="citation_author"]');
              if (authorElements.length > 0) {
                metadata.authors = Array.from(authorElements)
                  .map(el => (el as HTMLMetaElement).content)
                  .filter(Boolean)
                  .join(', ');
              } else {
                const authorEl = document.querySelector('.signatures, .author, .authors');
                if (authorEl && authorEl.textContent) {
                  metadata.authors = authorEl.textContent.trim();
                }
              }
            }
            
            // Try to extract abstract from meta tags or DOM
            if (!metadata.abstract) {
              const abstractEl = document.querySelector('strong.note-content-field:contains("Abstract") ~ span.note-content-value');
              if (abstractEl && abstractEl.textContent) {
                metadata.abstract = abstractEl.textContent.trim();
              }
            }
          }
          
          return metadata;
        } catch (e) {
          console.error('Error extracting metadata:', e);
          return null;
        }
      }
    });
    
    if (results && results[0] && results[0].result) {
      const result = results[0].result as {
        title?: string;
        authors?: string;
        abstract?: string;
        published_date?: string;
        doi?: string;
        url?: string;
        citations?: number | null;
      };
      
      // Convert to PageMetadata and ensure citations is properly typed
      const metadata: PageMetadata = {
        title: result.title,
        authors: result.authors,
        abstract: result.abstract,
        published_date: result.published_date,
        doi: result.doi,
        url: result.url,
        citations: result.citations !== null ? result.citations : undefined
      };
      
      return metadata;
    }
  } catch (error) {
    logger.error('Error executing metadata extraction script:', error);
  }
  
  return null;
}

/**
 * Helper function to find the appropriate plugin for a URL
 * 
 * @param {string} url - URL to process
 * @returns {Object|null} - Source information or null
 */
function findPluginForUrl(url: string): (SourceInfo & { plugin?: any }) | null {
  // First try using the plugin registry
  const plugins = pluginRegistry.getAll();
  
  for (const plugin of plugins) {
    for (const pattern of plugin.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        const id = plugin.serviceWorker.detectSourceId(url);
        if (id) {
          return {
            type: plugin.id,
            id: id,
            primary_id: plugin.serviceWorker.formatId ? 
              plugin.serviceWorker.formatId(id) : 
              formatPrimaryId(plugin.id, id),
            url,
            plugin: plugin
          };
        }
      }
    }
  }
  
  // Fallback to legacy detector if no plugin match
  return MultiSourceDetector.detect(url);
}

/**
 * Process a paper URL from any supported source
 * 
 * @param {string} url - The URL to process
 * @param {Function} processArxivUrl - The original arXiv processing function
 * @returns {Promise<any|null>} Paper data or null if not detected
 */
export async function processPaperUrl(
  url: string, 
  processArxivUrl?: (url: string) => Promise<any>
): Promise<any | null> {
  logger.info('Processing URL for multiple sources:', url);
  
  // Detect source and ID from URL
  const sourceInfo = findPluginForUrl(url);
  
  if (!sourceInfo) {
    logger.info('No paper source detected');
    return null;
  }
  
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  logger.info(`Detected ${sourceType} paper with ID: ${sourceId}`);
  
  // First try using plugin if available
  if (sourceInfo.plugin) {
    const plugin = sourceInfo.plugin;
    
    // Try to use plugin's API
    if (plugin.serviceWorker && plugin.serviceWorker.fetchApiData) {
      try {
        logger.info(`Using ${plugin.id} plugin API`);
        const apiData = await plugin.serviceWorker.fetchApiData(sourceId);
        if (Object.keys(apiData).length > 0) {
          // Add required source information
          return {
            ...apiData,
            source: plugin.id,
            sourceId,
            primary_id,
            url
          };
        }
      } catch (error) {
        logger.error(`Error using plugin API: ${error}`);
      }
    }
  }
  
  // For arXiv papers, use the original processor for compatibility if no plugin data
  if (sourceType === 'arxiv' && processArxivUrl) {
    const paperData = await processArxivUrl(url);
    
    // Add multi-source fields if successful
    if (paperData) {
      paperData.source = 'arxiv';
      paperData.sourceId = paperData.arxivId;
      paperData.primary_id = primary_id;
    }
    
    return paperData;
  }
  
  // For other sources, create a basic paper data object
  let paperData: any = {
    source: sourceType,
    sourceId: sourceId,
    primary_id: primary_id, // The standardized format ID
    url: url,
    timestamp: new Date().toISOString(),
    rating: 'novote'
  };
  
  // Try to extract metadata from the page - but handle the case where this fails
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      const metadata = await extractMetadataFromPage(tabs[0].id);
      
      if (metadata) {
        paperData.title = metadata.title || `${sourceType.toUpperCase()} Paper: ${sourceId}`;
        paperData.authors = metadata.authors || '';
        paperData.abstract = metadata.abstract || '';
        paperData.published_date = metadata.published_date || '';
        
        // Add source-specific data
        if (metadata.doi) {
          paperData.doi = metadata.doi;
        }
        
        if (metadata.citations !== undefined) {
          paperData.citations = metadata.citations;
        }
      } else {
        // Default title if metadata extraction fails
        paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
      }
    } else {
      paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
    }
  } catch (error) {
    logger.error('Error extracting metadata:', error);
    // If there's any error in metadata extraction, use a default title
    paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
  }
  
  // Add source-specific identifiers
  paperData.identifiers = {
    original: sourceId,
    url: url
  };
  
  if (sourceType === 'doi' || sourceType === 'acm') {
    paperData.doi = sourceId;
    paperData.identifiers.doi = sourceId;
  } else if (sourceType === 'semanticscholar') {
    paperData.s2Id = sourceId;
    paperData.identifiers.s2 = sourceId;
  }
  
  logger.info('Processed paper data:', paperData);
  return paperData;
}

/**
 * Fetch additional metadata for source types that have APIs
 * This is an optional enhancement that can fetch richer metadata
 * 
 * @param {string} sourceType - Source type (e.g., 'arxiv', 'doi')
 * @param {string} sourceId - Source-specific ID
 * @returns {Promise<any|null>} Additional metadata or null if unavailable
 */
export async function fetchAdditionalMetadata(
  sourceType: string,
  sourceId: string
): Promise<any | null> {
  // First check if we have a plugin for this source
  const plugin = pluginRegistry.get(sourceType);
  
  if (plugin && plugin.serviceWorker && plugin.serviceWorker.fetchApiData) {
    try {
      logger.info(`Using ${plugin.id} plugin API for additional metadata`);
      return await plugin.serviceWorker.fetchApiData(sourceId);
    } catch (error) {
      logger.error(`Error fetching metadata via plugin API: ${error}`);
    }
  }

  // Fall back to built-in API fetchers
  try {
    // Source-specific API calls
    if (sourceType === 'semanticscholar') {
      // Semantic Scholar API
      const response = await fetch(`https://api.semanticscholar.org/v1/paper/${sourceId}`);
      if (response.ok) {
        return await response.json();
      }
    } else if (sourceType === 'doi') {
      // CrossRef API for DOIs
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(sourceId)}`);
      if (response.ok) {
        const data = await response.json();
        return data.message;
      }
    } else if (sourceType === 'openreview') {
      // OpenReview API
      const response = await fetch(`https://api.openreview.net/notes?id=${sourceId}`);
      if (response.ok) {
        return await response.json();
      }
    }
  } catch (error) {
    logger.error(`Error fetching additional metadata for ${sourceType}:${sourceId}:`, error);
  }
  
  return null;
