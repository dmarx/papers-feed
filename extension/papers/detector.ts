// extension/papers/detector.ts
// Detector for academic paper URLs from multiple sources

import { formatPrimaryId, detectSourceFromUrl } from './source_utils';
import { SourceInfo } from './types';

/**
 * Multi-source paper URL detector
 */
export class MultiSourceDetector {
  /**
   * Detect paper source and metadata from URL
   * 
   * @param {string} url - URL to analyze
   * @returns {SourceInfo|null} Paper source information or null if not detected
   */
  static detect(url: string): SourceInfo | null {
    return detectSourceFromUrl(url);
  }
  
  /**
   * Process a URL to extract paper data
   * This is an enhanced version of the original processArxivUrl function
   * 
   * @param {string} url - URL to process
   * @param {Function} existingProcessArxivUrl - The original arXiv processing function
   * @returns {Promise<any|null>} Paper data or null if not detected/processed
   */
  static async processUrl(
    url: string, 
    existingProcessArxivUrl?: (url: string) => Promise<any>
  ): Promise<any | null> {
    // First try to detect the source from URL
    const sourceInfo = this.detect(url);
    
    if (!sourceInfo) {
      // Fall back to the original arXiv processor if source not detected
      return existingProcessArxivUrl ? existingProcessArxivUrl(url) : null;
    }
    
    // ArXiv URLs should still use the original processor for full compatibility
    if (sourceInfo.type === 'arxiv' && existingProcessArxivUrl) {
      const paperData = await existingProcessArxivUrl(url);
      
      // Add new fields for multi-source support without breaking compatibility
      if (paperData) {
        paperData.source = 'arxiv';
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = formatPrimaryId('arxiv', paperData.arxivId);
      }
      
      return paperData;
    }
    
    // For non-arXiv sources, extract basic metadata
    // This is a minimal implementation to get started
    const { type, id, primary_id } = sourceInfo;
    
    const paperData: Record<string, any> = {
      source: type,
      sourceId: id,
      primary_id: primary_id,
      url: url,
      title: `${type.toUpperCase()} Paper: ${id}`, // Generic title as placeholder
      authors: '',
      abstract: '',
      timestamp: new Date().toISOString(),
      rating: 'novote'
    };
    
    // Try to extract metadata from page if tab is available
    try {
      // This functionality is implemented in process_paper_url.ts
      // Will be added as part of the integration
    } catch (error) {
      console.error('Error extracting metadata:', error);
    }
    
    return paperData;
  }
}
