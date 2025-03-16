// extension/source-integration/base-source.ts
// Base abstract class for source integrations with default identifier formatting

import { SourceIntegration } from './types';
import { PaperMetadata } from '../papers/types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('base-source');

/**
 * Abstract base class for source integrations
 * Provides default implementations for identifier formatting methods
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
  abstract extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null>;
  
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
}
