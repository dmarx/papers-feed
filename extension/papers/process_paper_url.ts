// extension/papers/process_paper_url.ts
// Process paper URLs from multiple sources

import { MultiSourceDetector } from './detector';
import { SourceInfo } from './types';

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
    // Execute script to extract metadata
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
              doi: document.querySelector('meta[name="citation_doi"]')?.content,
              url: document.querySelector('meta[property="og:url"]')?.content || window.location.href,
              citations: null
            };
            
            // Source-specific extraction fallbacks
            if (!metadata.title) {
              const h1 = document.querySelector('h1');
              if (h1) metadata.title = h1.textContent.trim();
            }
            
            if (!metadata.abstract) {
              // Try common abstract containers
              const abstractEl = document.querySelector('.abstract') || 
                                document.querySelector('#abstract') ||
                                document.querySelector('[class*="abstract"]') ||
                                document.querySelector('[id*="abstract"]');
              if (abstractEl) metadata.abstract = abstractEl.textContent.trim();
            }
            
            // DOI-specific extraction
            if (!metadata.doi && window.location.href.includes('doi.org')) {
              const match = window.location.href.match(/doi\\.org\\/(10\\.[0-9.]+\\/[^\\s&/?#]+[^\\s&/?#.:])/);
              if (match) metadata.doi = match[1];
            }
            
            // ACM-specific extraction
            if (window.location.href.includes('dl.acm.org')) {
              // Try to get citation count
              const citationEl = document.querySelector('.citation-metrics');
              if (citationEl) {
                const citText = citationEl.textContent;
                const citMatch = citText?.match(/(\\d+)\\s+citations/i);
                if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
              }
              
              // Try to extract DOI from URL or page
              if (!metadata.doi) {
                const doiMatch = window.location.href.match(/dl\\.acm\\.org\\/doi\\/(10\\.[0-9.]+\\/[^\\s&/?#]+[^\\s&/?#.:])/);
                if (doiMatch) metadata.doi = doiMatch[1];
              }
            }
            
            // Semantic Scholar specific extraction
            if (window.location.href.includes('semanticscholar.org')) {
              // Try to get citation count
              const citationEl = document.querySelector('[data-test-id="citation-count"]');
              if (citationEl) {
                const citText = citationEl.textContent;
                const citMatch = citText?.match(/(\\d+)/);
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
            
            return metadata;
          } catch (e) {
            console.error('Error extracting metadata:', e);
            return null;
          }
        })();
      `
    });
    
    if (result && result[0]) {
      return result[0] as PageMetadata;
    }
  } catch (error) {
    console.error('Error executing metadata extraction script:', error);
  }
  
  return null;
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
  console.log('Processing URL for multiple sources:', url);
  
  // Detect source and ID from URL
  const sourceInfo: SourceInfo | null = MultiSourceDetector.detect(url);
  
  if (!sourceInfo) {
    console.log('No paper source detected, falling back to arXiv-only processing');
    // Try the original arXiv processor as fallback
    return processArxivUrl ? processArxivUrl(url) : null;
  }
  
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  console.log(`Detected ${sourceType} paper with ID: ${sourceId}`);
  
  // For arXiv papers, use the original processor for compatibility
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
    primary_id: primary_id,
    url: url,
    timestamp: new Date().toISOString(),
    rating: 'novote'
  };
  
  // Try to extract metadata from the page
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
        
        if (metadata.citations) {
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
    console.error('Error extracting metadata:', error);
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
  
  console.log('Processed paper data:', paperData);
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
    }
  } catch (error) {
    console.error(`Error fetching additional metadata for ${sourceType}:${sourceId}:`, error);
  }
  
  return null;
}

/**
 * Enhance paper data with additional metadata from APIs
 * 
 * @param {any} paperData - Basic paper data
 * @returns {Promise<any>} Enhanced paper data
 */
export async function enhancePaperData(paperData: any): Promise<any> {
  if (!paperData.source || !paperData.sourceId) {
    return paperData;
  }
  
  try {
    const additionalData = await fetchAdditionalMetadata(
      paperData.source,
      paperData.sourceId
    );
    
    if (additionalData) {
      // Source-specific data enhancement
      if (paperData.source === 'semanticscholar') {
        // Update with S2 data
        if (!paperData.title && additionalData.title) {
          paperData.title = additionalData.title;
        }
        
        if (!paperData.abstract && additionalData.abstract) {
          paperData.abstract = additionalData.abstract;
        }
        
        if (!paperData.authors && additionalData.authors) {
          paperData.authors = additionalData.authors
            .map((author: any) => author.name)
            .join(', ');
        }
        
        // Add identifiers
        if (additionalData.doi) {
          paperData.doi = additionalData.doi;
          paperData.identifiers.doi = additionalData.doi;
        }
        
        if (additionalData.arxivId) {
          paperData.arxivId = additionalData.arxivId;
          paperData.identifiers.arxiv = additionalData.arxivId;
        }
        
        // Add citation count
        if (additionalData.citationCount) {
          paperData.citations = additionalData.citationCount;
        }
      } else if (paperData.source === 'doi') {
        // Update with CrossRef data
        if (!paperData.title && additionalData.title) {
          paperData.title = additionalData.title;
        }
        
        if (!paperData.authors && additionalData.author) {
          paperData.authors = additionalData.author
            .map((author: any) => {
              if (author.given && author.family) {
                return `${author.given} ${author.family}`;
              }
              return author.name || '';
            })
            .filter(Boolean)
            .join(', ');
        }
        
        // Add publication date
        if (!paperData.published_date && additionalData.created) {
          const date = new Date(additionalData.created['date-time']);
          paperData.published_date = date.toISOString().split('T')[0];
        }
      }
    }
  } catch (error) {
    console.error('Error enhancing paper data:', error);
  }
  
  return paperData;
}
