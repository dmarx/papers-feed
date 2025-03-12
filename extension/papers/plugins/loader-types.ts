// extension/papers/plugins/loader-types.ts
// Type definitions for loader functions to use during compilation

import { UnifiedPaperData } from '../../types/common';

/**
 * Load an extractor module for a specific plugin
 * @param pluginId Plugin ID
 * @returns Extractor module or null if not found
 */
export async function loadExtractor(pluginId: string): Promise<any> {
  console.warn(`Using type-check stub for loadExtractor(${pluginId})`);
  return null;
}

/**
 * Extract metadata using a plugin extractor
 * @param pluginId Plugin ID
 * @param document DOM document to extract from
 * @param url URL of the page
 * @returns Extracted paper data
 */
export async function extractMetadata(
  pluginId: string, 
  document: Document, 
  url: string
): Promise<Partial<UnifiedPaperData> | null> {
  console.warn(`Using type-check stub for extractMetadata(${pluginId})`);
  return null;
}

// Default export for compatibility
export default {
  loadExtractor,
  extractMetadata
};
