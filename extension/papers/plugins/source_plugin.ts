// extension/papers/plugins/source_plugin.ts
// Redesigned plugin interface with clear context separation

import { UnifiedPaperData, MetadataQualityResult } from '../../types/common';

/**
 * Service worker specific plugin functionality
 */
export interface ServiceWorkerPlugin {
  /**
   * Detect paper ID from URL (runs in service worker)
   * @param url URL to analyze
   * @returns Source ID or null if not matching
   */
  detectSourceId: (url: string) => string | null;
  
  /**
   * Format ID according to plugin's conventions
   * @param id Source-specific ID
   * @returns Formatted primary ID
   */
  formatId: (id: string) => string;
  
  /**
   * Fetch metadata from API (runs in service worker)
   * @param id Source-specific ID
   * @returns Paper metadata or null if unavailable
   */
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  
  /**
   * Evaluate quality of paper metadata
   * @param paperData Paper data to evaluate
   * @returns Quality evaluation result
   */
  evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
}

/**
 * Content script specific plugin functionality
 */
export interface ContentScriptPlugin {
  /**
   * Path to the content script extractor module
   * This will be imported at build time
   */
  extractorModulePath: string;
  
  /**
   * DOM metadata extraction (defined but loaded separately)
   * @param document Document to extract from
   * @param url URL of the page
   * @returns Extracted metadata
   */
  extractMetadata?: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
}

/**
 * Core plugin interface with context-specific components
 */
export interface SourcePlugin {
  // Basic plugin information
  id: string;
  name: string;
  description: string;
  version: string;
  
  // URL detection (shared but used differently in each context)
  urlPatterns: RegExp[];
  
  // Context-specific components
  serviceWorker: ServiceWorkerPlugin;
  contentScript: ContentScriptPlugin;
  
  // UI customization
  color?: string;
  icon?: string;
}

/**
 * Helper method to extract ID using the plugin's URL patterns
 * @param plugin Plugin to use
 * @param url URL to extract from
 * @returns Extracted ID or null
 */
export function extractIdWithPlugin(plugin: SourcePlugin, url: string): string | null {
  // First try the dedicated method
  const id = plugin.serviceWorker.detectSourceId(url);
  if (id) return id;
  
  // Fall back to pattern matching if the method doesn't return an ID
  for (const pattern of plugin.urlPatterns) {
    const match = url.match(pattern);
    if (match) {
      // Return the first capture group as the ID
      return match[1] || null;
    }
  }
  
  return null;
}
