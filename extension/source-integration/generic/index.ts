// extension/source-integration/generic/index.ts
// Generic integration for auto-detected and manually logged papers/URLs

import { BaseSourceIntegration } from '../base-source';
import { PaperMetadata } from '../../papers/types';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('generic-integration');

/**
 * Generic integration for auto-detected and manually logged papers
 */
export class GenericIntegration extends BaseSourceIntegration {
  readonly id = 'generic';
  readonly name = 'Generic Papers';
  
  // We'll only provide limited auto-detection patterns
  // The goal is NOT to auto-detect, but to support manual logging
  readonly urlPatterns = [
    /\.pdf$/i  // Just to identify PDFs for source type
  ];
  
  // No content script matches - we don't want to auto-detect
  readonly contentScriptMatches = [];
  
  /**
   * Check if this integration can handle the given URL
   * For generic integration, we deliberately return false to prevent auto-detection
   * Manual logging will be handled explicitly through the popup
   */
  canHandleUrl(url: string): boolean {
    // Always return false - we don't want to auto-detect
    // This ensures the generic source won't interfere with normal browsing
    return false;
  }

  /**
   * Extract paper ID from URL - this is for auto-detection
   */
  extractPaperId(url: string): string | null {
    // Generate a hash from the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    // Create a positive hexadecimal string
    const positiveHash = Math.abs(hash).toString(16).toUpperCase();
    
    // Use the first 8 characters as the ID
    return positiveHash.substring(0, 8);
  }

  /**
   * Extract metadata from a generic page or PDF
   */
  async extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null> {
    try {
      logger.debug(`Extracting metadata for generic document with ID: ${paperId}`);
      
      // Default values
      let title = document.title || paperId;
      let authors = '';
      let abstract = '';
      let publishedDate = '';
      
      // Try to extract Open Graph metadata
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
      if (ogTitle) {
        title = ogTitle;
      }
      
      // Try to get authors
      const ogAuthor = document.querySelector('meta[property="article:author"]')?.getAttribute('content') || 
                      document.querySelector('meta[name="author"]')?.getAttribute('content');
      if (ogAuthor) {
        authors = ogAuthor;
      }
      
      // Try to get description/abstract
      const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') || 
                           document.querySelector('meta[name="description"]')?.getAttribute('content');
      if (ogDescription) {
        abstract = ogDescription;
      }
      
      // Try to get published date
      const ogPublishedTime = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
      if (ogPublishedTime) {
        publishedDate = ogPublishedTime;
      }
      
      // Determine if it's a PDF or generic URL
      const isPdf = document.location.href.toLowerCase().endsWith('.pdf');
      const sourceId = isPdf ? 'pdf' : 'url';
      
      return {
        sourceId,
        paperId,
        url: document.location.href,
        title,
        authors,
        abstract,
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate,
        tags: []
      };
    } catch (error) {
      logger.error('Error extracting metadata from generic source', error);
      return null;
    }
  }
  
  /**
   * Format a paper identifier for this source
   * Override to handle both PDF and URL sources
   */
  formatPaperId(paperId: string, sourceType?: string): string {
    // Allow override of source type (pdf vs url)
    const actualSourceId = sourceType || 'url';
    return `${actualSourceId}.${paperId}`;
  }
  
  /**
   * Parse a paper identifier
   * Override to handle both PDF and URL sources
   */
  parsePaperId(identifier: string): string | null {
    // Handle pdf.XXXXXXXX or url.XXXXXXXX formats
    if (identifier.startsWith('pdf.') || identifier.startsWith('url.')) {
      return identifier.substring(identifier.indexOf('.') + 1);
    }
    return null;
  }
  
  /**
   * Format object ID
   * Override to handle both PDF and URL sources
   */
  formatObjectId(type: string, paperId: string, sourceType?: string): string {
    // Create the paper ID with the correct sourceType prefix
    const formattedId = this.formatPaperId(paperId, sourceType);
    return `${type}:${formattedId}`;
  }
}

// Export a singleton instance
export const genericIntegration = new GenericIntegration();
