// extension/papers/plugins/extractors/arxiv_extractor.ts
// ArXiv metadata extractor for content scripts

import { UnifiedPaperData } from '../../../types/common';

/**
 * Extract metadata from an arXiv page
 * This runs in the content script context with full DOM access
 * 
 * @param document The document to extract metadata from
 * @param url The URL of the page
 * @returns The extracted metadata
 */
export async function extractMetadata(
  document: Document, 
  url: string
): Promise<Partial<UnifiedPaperData>> {
  try {
    // Extract the arXiv ID from the URL
    const idMatch = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9.]+)(v[0-9]+)?/);
    const arxivId = idMatch ? (idMatch[1] + (idMatch[2] || '')) : '';
    
    if (!arxivId) {
      console.warn('Could not extract arXiv ID from URL');
      return {};
    }
    
    // Create standardized ID
    const primary_id = `arxiv.${arxivId}`;
    
    // Extract title
    let title = '';
    const titleElement = document.querySelector('.title');
    if (titleElement) {
      title = titleElement.textContent?.replace('Title:', '').trim() || '';
    }
    
    // Extract authors
    let authors = '';
    const authorElements = document.querySelectorAll('.authors a');
    if (authorElements.length > 0) {
      const authorNames = Array.from(authorElements)
        .map(el => el.textContent?.trim())
        .filter(Boolean);
      authors = authorNames.join(', ');
    }
    
    // Extract abstract
    let abstract = '';
    const abstractElement = document.querySelector('.abstract');
    if (abstractElement) {
      abstract = abstractElement.textContent?.replace('Abstract:', '').trim() || '';
    }
    
    // Extract categories
    const categories: string[] = [];
    const categoryElements = document.querySelectorAll('.subjects .tag');
    categoryElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text) categories.push(text);
    });
    
    // Extract publication date (if available)
    let publicationDate = '';
    const dateElement = document.querySelector('.dateline');
    if (dateElement) {
      const dateMatch = dateElement.textContent?.match(/\(Submitted on ([^)]+)\)/);
      if (dateMatch) {
        publicationDate = dateMatch[1];
      }
    }
    
    // Return structured metadata
    return {
      primary_id,
      source: 'arxiv',
      sourceId: arxivId,
      url,
      title,
      authors,
      abstract,
      timestamp: new Date().toISOString(),
      source_specific_metadata: {
        arxiv_tags: categories,
        published_date: publicationDate
      }
    };
  } catch (error) {
    console.error('Error extracting arXiv metadata:', error);
    return {
      source: 'arxiv',
      url
    };
  }
}

/**
 * Helper function to extract text content from an element
 * @param selector CSS selector
 * @param removePrefix Text prefix to remove (e.g., "Abstract:")
 * @returns Extracted text or empty string
 */
function extractText(
  document: Document, 
  selector: string, 
  removePrefix?: string
): string {
  const element = document.querySelector(selector);
  if (!element || !element.textContent) {
    return '';
  }
  
  let text = element.textContent.trim();
  if (removePrefix && text.startsWith(removePrefix)) {
    text = text.substring(removePrefix.length).trim();
  }
  
  return text;
}

/**
 * Default export for the extractor
 */
export default {
  extractMetadata
};
