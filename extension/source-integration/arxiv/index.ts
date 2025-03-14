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
  private readonly URL_PATTERNS = [
    /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
    /arxiv\.org\/\w+\/([0-9.]+)/
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
    return this.URL_PATTERNS.some(pattern => pattern.test(url));
  }

  /**
   * Extract paper ID from URL
   */
  extractPaperId(url: string): string | null {
    for (const pattern of this.URL_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        return match[2] || match[1]; // The capture group with the paper ID
      }
    }
    return null;
  }

  /**
   * Get patterns for the content script to detect links
   */
  getLinkPatterns() {
    return this.URL_PATTERNS.map(pattern => ({
      sourceId: this.id,
      pattern: pattern.toString().slice(1, -1), // Convert to string without slashes
      extractorCode: this.extractPaperId.toString()
    }));
  }

  /**
   * Fetch paper metadata from ArXiv API
   */
  async fetchPaperMetadata(arxivId: string): Promise<PaperMetadata | null> {
    logger.info(`Fetching metadata for arXiv ID: ${arxivId}`);
    
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

  /**
   * Get domain patterns this integration should be activated on
   */
  getContentScriptMatches(): string[] {
    return ["*://*.arxiv.org/*"];
  }
}
