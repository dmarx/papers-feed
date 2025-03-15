// source-integration/arxiv/index.ts
// ArXiv integration using metadata transformer

import { SourceIntegration } from '../types';
import { PaperMetadata } from '../../papers/types';
import { parseXMLText } from './xml-parser';
import { transformMetadata, MetadataMapping } from '../../utils/metadata-transformer';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('arxiv-integration');

export class ArXivIntegration implements SourceIntegration {
  readonly id = 'arxiv';
  readonly name = 'arXiv.org';
  
  // URL patterns for papers
  readonly urlPatterns = [
    /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
    /arxiv\.org\/\w+\/([0-9.]+)/
  ];
  
  // Content script matches
  readonly contentScriptMatches = [
    "*://*.arxiv.org/*"
  ];
  
  // Metadata mapping for ArXiv
  private readonly METADATA_MAPPING: MetadataMapping = {
    titleField: 'title',
    authorsField: 'authors',
    abstractField: 'summary',
    dateField: 'published_date',
    tagsField: 'arxiv_tags',
    
    // Custom author extraction (since authors is an array)
    extractAuthors: (data) => {
      if (Array.isArray(data.authors)) {
        return data.authors.join(', ');
      }
      return data.authors || '';
    }
  };

  /**
   * Check if this integration can handle the given URL
   */
  canHandleUrl(url: string): boolean {
    return this.urlPatterns.some(pattern => pattern.test(url));
  }

  /**
   * Extract paper ID from URL
   */
  extractPaperId(url: string): string | null {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[2] || match[1]; // The capture group with the paper ID
      }
    }
    return null;
  }

  /**
   * Extract metadata from page or fetch from API
   */
  async extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null> {
    logger.info(`Extracting metadata for arXiv ID: ${paperId}`);
    
    // Try to extract from page first
    const pageMetadata = this.extractFromPage(document, paperId);
    if (pageMetadata) {
      logger.debug('Extracted metadata from page');
      return pageMetadata;
    }
    
    // If page extraction fails, fetch from API
    logger.debug('Falling back to API for metadata');
    return this.fetchFromApi(paperId);
  }
  
  /**
   * Extract metadata from ArXiv page
   */
  private extractFromPage(document: Document, paperId: string): PaperMetadata | null {
    try {
      // Extract title
      const titleElement = document.querySelector('.title');
      if (!titleElement) return null;
      
      const title = titleElement.textContent?.replace('Title:', '').trim() || '';
      
      // Extract authors
      const authorsElement = document.querySelector('.authors');
      const authors = authorsElement?.textContent?.replace('Authors:', '').trim() || '';
      
      // Extract abstract
      const abstractElement = document.querySelector('.abstract');
      const abstract = abstractElement?.textContent?.replace('Abstract:', '').trim() || '';
      
      // Extract categories
      const categoriesElement = document.querySelector('.subjects');
      const categoriesText = categoriesElement?.textContent?.replace('Subjects:', '').trim() || '';
      const tags = categoriesText.split(';').map(tag => tag.trim());
      
      // Extract publication date
      const dateElement = document.querySelector('.dateline');
      const publishedDate = dateElement?.textContent?.trim() || '';
      
      // Create metadata object
      return {
        sourceId: this.id,
        paperId,
        url: window.location.href,
        title,
        authors,
        abstract,
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate,
        tags
      };
    } catch (error) {
      logger.error('Error extracting from page:', error);
      return null;
    }
  }
  
  /**
   * Fetch metadata from ArXiv API
   */
  private async fetchFromApi(arxivId: string): Promise<PaperMetadata | null> {
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
      logger.debug(`API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status}`);
      }
      
      const text = await response.text();
      const parsedXml = await parseXMLText(text);
      
      if (!parsedXml) {
        logger.error('Failed to parse API response');
        return null;
      }
      
      // Use the metadata transformer to convert the parsed XML to standard format
      const paperData = transformMetadata(
        this.id,
        arxivId,
        parsedXml,
        this.METADATA_MAPPING,
        `https://arxiv.org/abs/${arxivId}`
      );
      
      logger.debug('Paper metadata processed', paperData);
      return paperData;
    } catch (error) {
      logger.error('Error processing arXiv metadata', error);
      return null;
    }
  }
}

// Export a singleton instance that can be used by both background and content scripts
export const arxivIntegration = new ArXivIntegration();
