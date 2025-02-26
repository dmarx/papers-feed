// extension/papers/process_paper_url.ts
// Process paper URLs from multiple sources

import { MultiSourceDetector } from './detector';
import { SourceInfo } from './types';

/**
 * Extract metadata from the current tab's page
 * 
 * @returns {Promise<PageMetadata|null>} Extracted metadata or null
 */
interface PageMetadata {
  title?: string;
  authors?: string;
  abstract?: string;
  published_date?: string;
}

async function extractMetadataFromCurrentPage(): Promise<PageMetadata | null> {
  try {
    // Get the current tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) return null;
    
    // Execute script to extract metadata
    const result = await chrome.tabs.executeScript(tabs[0].id, {
      code: `
        (function() {
          try {
            // Try to extract from common meta tags first
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
            
            // Fallback to page elements if meta tags not available
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
            return null;
          }
        })();
      `
    });
    
    if (result && result[0]) {
      return result[0] as PageMetadata;
    }
  } catch (error) {
    console.error('Error extracting page metadata:', error);
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
    const metadata = await extractMetadataFromCurrentPage();
    
    if (metadata) {
      paperData.title = metadata.title || `${sourceType.toUpperCase()} Paper: ${sourceId}`;
      paperData.authors = metadata.authors || '';
      paperData.abstract = metadata.abstract || '';
      paperData.published_date = metadata.published_date || '';
    } else {
      // Default title if metadata extraction fails
      paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
    }
  } catch (error) {
    console.error('Error extracting metadata:', error);
    paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
  }
  
  // Add source-specific identifiers
  if (sourceType === 'doi' || sourceType === 'acm') {
    paperData.doi = sourceId;
    paperData.identifiers = {
      original: sourceId,
      url: url,
      doi: sourceId
    };
  } else if (sourceType === 'semanticscholar') {
    paperData.s2Id = sourceId;
    paperData.identifiers = {
      original: sourceId,
      url: url,
      s2: sourceId
    };
  }
  
  console.log('Processed paper data:', paperData);
  return paperData;
}
