// extension/source-integration/arxiv/index.ts
// ArXiv integration with custom metadata extractor

import { BaseSourceIntegration } from '../base-source';
import { PaperMetadata } from '../../papers/types';
import { parseXMLText } from './xml-parser';
import { MetadataExtractor, createMetadataExtractor } from '../../utils/metadata-extractor';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('arxiv-integration');

/**
 * ArXiv-specific metadata extractor
 * Enhances the base extractor with arXiv-specific extraction
 */
// class ArXivMetadataExtractor extends MetadataExtractor {
//   /**
//    * Extract authors with arXiv-specific handling
//    */
//   // protected extractAuthors(): string {
//   //   // Try arXiv-specific author element first
//   //   const authorsElement = this.document.querySelector('.authors');
//   //   if (authorsElement) {
//   //     const authorsText = authorsElement.textContent?.replace('Authors:', '').trim();
//   //     if (authorsText) {
//   //       return authorsText;
//   //     }
//   //   }
    
//   //   // Fall back to standard extraction
//   //   return super.extractAuthors();
//   // }
  
//   /**
//    * Extract abstract with arXiv-specific handling
//    */
//   // protected extractDescription(): string {
//   //   // Try arXiv-specific abstract element first
//   //   const abstractElement = this.document.querySelector('.abstract');
//   //   if (abstractElement) {
//   //     const abstractText = abstractElement.textContent?.replace('Abstract:', '').trim();
//   //     if (abstractText) {
//   //       return abstractText;
//   //     }
//   //   }
    
//   //   // Fall back to standard extraction
//   //   return super.extractDescription();
//   // }
  
//   /**
//    * Extract tags/categories with arXiv-specific handling
//    */
//   // protected extractTags(): string[] {
//   //   // Try arXiv-specific categories element first
//   //   const categoriesElement = this.document.querySelector('.subjects');
//   //   if (categoriesElement) {
//   //     const categoriesText = categoriesElement.textContent?.replace('Subjects:', '').trim();
//   //     if (categoriesText) {
//   //       return categoriesText.split(';').map(tag => tag.trim());
//   //     }
//   //   }
    
//   //   // Fall back to standard extraction
//   //   return super.extractTags();
//   // }
  
//   /**
//    * Extract publication date with arXiv-specific handling
//    */
//   protected extractPublishedDate(): string {
//     // Try arXiv-specific dateline element first
//     const dateElement = this.document.querySelector('.dateline');
//     if (dateElement) {
//       const dateText = dateElement.textContent?.trim();
//       if (dateText) {
//         return dateText;
//       }
//     }
    
//     // Fall back to standard extraction
//     return super.extractPublishedDate();
//   }
// }

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
   * Create a metadata extractor for arXiv pages
   */
  // protected createMetadataExtractor(document: Document): MetadataExtractor {
  //   return new ArXivMetadataExtractor(document);
  // }

  // /**
  //  * Check if this integration can handle the given URL
  //  */
  // canHandleUrl(url: string): boolean {
  //   return this.urlPatterns.some(pattern => pattern.test(url));
  // }

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
    
    // If page extraction fails or is incomplete, fetch from API
    // logger.debug('Falling back to API for metadata');
    // return this.fetchFromApi(paperId);
  }
  
  /**
   * Fetch metadata from ArXiv API
   */
  // private async fetchFromApi(arxivId: string): Promise<PaperMetadata | null> {
  //   try {
  //     const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
  //     logger.debug(`API URL: ${apiUrl}`);
      
  //     const response = await fetch(apiUrl);
      
  //     if (!response.ok) {
  //       throw new Error(`ArXiv API error: ${response.status}`);
  //     }
      
  //     const text = await response.text();
  //     const parsedXml = await parseXMLText(text);
      
  //     if (!parsedXml) {
  //       logger.error('Failed to parse API response');
  //       return null;
  //     }
      
  //     // Transform the parsed XML to standard metadata format
  //     return {
  //       sourceId: this.id,
  //       paperId: arxivId,
  //       url: `https://arxiv.org/abs/${arxivId}`,
  //       title: parsedXml.title || arxivId,
  //       authors: Array.isArray(parsedXml.authors) ? parsedXml.authors.join(', ') : parsedXml.authors || '',
  //       abstract: parsedXml.summary || '',
  //       timestamp: new Date().toISOString(),
  //       rating: 'novote',
  //       publishedDate: parsedXml.published_date || '',
  //       tags: parsedXml.arxiv_tags || [],
  //       sourceType: 'url'
  //     };
  //   } catch (error) {
  //     logger.error('Error processing arXiv metadata', error);
  //     return null;
  //   }
  // }
}

// Export a singleton instance that can be used by both background and content scripts
export const arxivIntegration = new ArXivIntegration();
