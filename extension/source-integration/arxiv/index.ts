// extension/source-integration/arxiv/index.ts
// ArXiv integration with custom metadata extractor

import { BaseSourceIntegration } from '../base-source';
import { PaperMetadata } from '../../papers/types';
import { MetadataExtractor, createMetadataExtractor } from '../metadata-extractor';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('arxiv-integration');


/**
 * ArXiv integration with custom metadata extraction
 */
export class ArXivIntegration extends BaseSourceIntegration {
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
   * Override parent method to handle the API fallback
   */
  async extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null> {
    logger.info(`Extracting metadata for arXiv ID: ${paperId}`);
    
    // Try to extract from page first using our custom extractor
    const pageMetadata = await super.extractMetadata(document, paperId);
    
    // if (pageMetadata && pageMetadata.title && pageMetadata.authors) {
    logger.debug('Extracted metadata from page');
    return pageMetadata;
    // }
    
  }
}

// Export a singleton instance that can be used by both background and content scripts
export const arxivIntegration = new ArXivIntegration();
