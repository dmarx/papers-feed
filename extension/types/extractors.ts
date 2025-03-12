// extension/types/extractors.ts
// Type definitions for extractor modules and loader

import { UnifiedPaperData } from './common';

/**
 * Interface for extractor module functions
 */
export interface ExtractorModule {
  /**
   * Extract metadata from a document
   * @param document DOM document to extract from
   * @param url URL of the page
   * @returns Extracted paper data
   */
  extractMetadata: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
}

/**
 * Interface for the loader module functions
 */
export interface ExtractorLoader {
  /**
   * Load an extractor module for a specific plugin
   * @param pluginId Plugin ID
   * @returns Extractor module or null if not found
   */
  loadExtractor: (pluginId: string) => Promise<ExtractorModule | null>;
  
  /**
   * Extract metadata using a plugin extractor
   * @param pluginId Plugin ID
   * @param document DOM document to extract from
   * @param url URL of the page
   * @returns Extracted paper data
   */
  extractMetadata: (
    pluginId: string, 
    document: Document, 
    url: string
  ) => Promise<Partial<UnifiedPaperData> | null>;
}

/**
 * Interface for the registry of extractors
 */
export interface ExtractorRegistry {
  [pluginId: string]: string;
}
