// source-integration/template.ts
// Template for creating new source integrations

import { SourceIntegration } from './types';
import { PaperMetadata } from '../papers/types';
import { transformMetadata, MetadataMapping } from '../utils/metadata-transformer';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('template-integration');

/**
 * Template integration for new paper sources
 * 
 * How to use:
 * 1. Copy this file and rename it for your source (e.g., 'semantic-scholar.ts')
 * 2. Update the URL patterns and API endpoint
 * 3. Configure the metadata mapping for your source's API format
 * 4. Register the integration in the background script
 */
export class TemplateIntegration implements SourceIntegration {
  // A unique ID for this integration - use lowercase, no spaces
  readonly id = 'template';
  
  // Human-readable name for display
  readonly name = 'Template Source';
  
  // URL patterns for detecting this source's pages
  private readonly URL_PATTERNS = [
    /example\.com\/papers\/([a-z0-9]+)/,
    /example\.org\/view\/([a-z0-9]+)/
  ];
  
  // Metadata mapping configuration
  private readonly METADATA_MAPPING: MetadataMapping = {
    // Define how to extract each field from your API response
    titleField: 'title',
    authorsField: 'authors',
    abstractField: 'abstract',
    dateField: 'published_date',
    tagsField: 'keywords',
    
    // Optional custom extraction functions if needed
    extractAuthors: (data) => {
      if (Array.isArray(data.authors)) {
        return data.authors.map((author: any) => author.name || author).join(', ');
      }
      return data.authors || '';
    }
  };

  /**
   * Determines if this integration can handle a given URL
   */
  canHandleUrl(url: string): boolean {
    return this.URL_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Extract paper ID from URL
   */
  extractPaperId(url: string): string | null {
    for (const pattern of this.URL_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        return match[1]; // The capture group with the paper ID
      }
    }
    return null;
  }

  /**
   * Get patterns for the link processor to detect papers
   */
  getLinkPatterns() {
    return this.URL_PATTERNS.map(pattern => ({
      sourceId: this.id,
      pattern: pattern.toString().slice(1, -1), // Convert to string without slashes
      extractorCode: this.extractPaperId.toString()
    }));
  }

  /**
   * Fetch paper metadata from the source's API
   */
  async fetchPaperMetadata(paperId: string): Promise<PaperMetadata | null> {
    logger.info(`Fetching metadata for paper ID: ${paperId}`);
    
    try {
      // Replace with actual API call
      const apiUrl = `https://api.example.com/papers/${paperId}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Use the metadata transformer to convert API response to standard format
      const paperData = transformMetadata(
        this.id,
        paperId,
        data,
        this.METADATA_MAPPING,
        `https://example.com/papers/${paperId}`
      );
      
      logger.debug('Paper metadata processed', paperData);
      return paperData;
    } catch (error) {
      logger.error('Error processing metadata', error);
      return null;
    }
  }

  /**
   * Get domain patterns this integration should be activated on
   */
  getContentScriptMatches(): string[] {
    return ["*://*.example.com/*", "*://*.example.org/*"];
  }
