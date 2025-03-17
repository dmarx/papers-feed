// extension/source-integration/base-source.ts
// Base abstract class for source integrations with default identifier formatting
// and metadata extraction capability

import { SourceIntegration } from './types';
import { PaperMetadata } from '../papers/types';
import { loguru } from '../utils/logger';
import { 
  MetadataExtractor, 
  createMetadataExtractor,
  generatePaperIdFromUrl,
  SOURCE_TYPES
} from '../utils/metadata-extractor';

const logger = loguru.getLogger('base-source');

/**
 * Abstract base class for source integrations
 * Provides default implementations for identifier formatting methods
 * and metadata extraction
 */
export abstract class BaseSourceIntegration implements SourceIntegration {
  // Abstract properties to be implemented by derived classes
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly urlPatterns: RegExp[];
  abstract readonly contentScriptMatches: string[];

  // Abstract methods to be implemented by derived classes
  abstract canHandleUrl(url: string): boolean;
  abstract extractPaperId(url: string): string | null;
  
  /**
   * Create a metadata extractor for the given document
   * Override this method to provide a custom extractor for your source
   */
  protected createMetadataExtractor(document: Document): MetadataExtractor {
    return createMetadataExtractor(document);
  }
  
  /**
   * Extract metadata from a page
   * Default implementation uses common metadata extraction
   * Override in specific source integrations if needed
   */
  async extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null> {
    try {
      logger.debug(`Extracting metadata using base extractor for ID: ${paperId}`);
      
      // Create a metadata extractor for this document
      const extractor = this.createMetadataExtractor(document);
      
      // Extract metadata
      const extracted = extractor.extract();
      const url = document.location.href;
      
      // Determine source type (PDF or URL)
      const sourceType = extractor.getSourceType();
      
      // Create PaperMetadata object
      return {
        sourceId: this.id,
        paperId,
        url: url,
        title: extracted.title || document.title || paperId,
        authors: extracted.authors || '',
        abstract: extracted.description || '',
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate: extracted.publishedDate || '',
        tags: extracted.tags || [],
        doi: extracted.doi,
        journalName: extracted.journalName,
        sourceType: sourceType // Store the source type for reference
      };
    } catch (error) {
      logger.error('Error extracting metadata with base extractor', error);
      return null;
    }
  }
  
  /**
   * Format a paper identifier for this source
   * Default implementation uses the format: sourceId.paperId
   * Override this method if a source needs a different format
   */
  formatPaperId(paperId: string): string {
    return `${this.id}.${paperId}`;
  }
  
  /**
   * Parse a paper identifier specific to this source
   * Default implementation handles source.paperId format and extracts paperId
   * Override this method if a source uses a different format
   */
  parsePaperId(identifier: string): string | null {
    const prefix = `${this.id}.`;
    
    if (identifier.startsWith(prefix)) {
      return identifier.substring(prefix.length);
    }
    
    // Try legacy format (sourceId:paperId)
    const legacyPrefix = `${this.id}:`;
    if (identifier.startsWith(legacyPrefix)) {
      logger.debug(`Parsed legacy format identifier: ${identifier}`);
      return identifier.substring(legacyPrefix.length);
    }
    
    return null;
  }
  
  /**
   * Format a storage object ID for this source
   * Default implementation uses the format: type:sourceId.paperId
   * Override this method if a source needs a different format
   */
  formatObjectId(type: string, paperId: string): string {
    return `${type}:${this.formatPaperId(paperId)}`;
  }

  /**
   * Create a manual paper entry for any URL
   * Useful for tracking generic web pages that aren't specific to this source
   */
  async createManualPaperEntry(url: string, document: Document): Promise<PaperMetadata | null> {
    try {
      logger.debug(`Creating manual paper entry for URL: ${url}`);
      
      // Create a metadata extractor
      const extractor = this.createMetadataExtractor(document);
      
      // Extract metadata
      const extracted = extractor.extract();
      
      // Generate a paper ID from the URL
      const paperId = generatePaperIdFromUrl(url);
      
      // Determine if it's a PDF
      const sourceType = extractor.getSourceType();
      const sourceId = sourceType; // Use the source type as the source ID
      
      // Create a new paper metadata object
      const metadata: PaperMetadata = {
        sourceId: sourceId,
        paperId: paperId,
        url: url,
        title: extracted.title || document.title || paperId,
        authors: extracted.authors || '',
        abstract: extracted.description || '',
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate: extracted.publishedDate || '',
        tags: extracted.tags || [],
        doi: extracted.doi,
        journalName: extracted.journalName,
        sourceType: sourceType
      };
      
      logger.debug('Created manual paper entry', metadata);
      return metadata;
    } catch (error) {
      logger.error('Error creating manual paper entry', error);
      return null;
    }
  }
}
