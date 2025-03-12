// extension/papers/plugins/content_extractor.ts
// Definition for content script extractors

import { UnifiedPaperData } from '../../types/common';

/**
 * Content script extractor interface
 * Only contains functionality that runs in the content script context
 */
export interface ContentExtractor {
  /**
   * Extract metadata from the document
   * @param document The document to extract from
   * @param url The URL of the page
   * @returns The extracted metadata
   */
  extractMetadata: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
  
  /**
   * ID of the plugin this extractor belongs to
   * Used to match with service worker plugins
   */
  pluginId: string;
}

/**
 * Configuration for building a content extractor
 */
export interface ContentExtractorConfig {
  /**
   * ID of the plugin this extractor belongs to
   */
  pluginId: string;
  
  /**
   * Implementation of the extraction function
   */
  extractMetadata: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
}
