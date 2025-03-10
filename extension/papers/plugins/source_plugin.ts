// extension/papers/plugins/source_plugin.ts
// Redesigned plugin interface with clear context separation

import { UnifiedPaperData } from '../../types/common';

/**
 * Result of metadata quality evaluation
 */
export interface MetadataQualityResult {
  quality: 'minimal' | 'partial' | 'complete';
  missingFields: string[];
  hasEssentialFields: boolean;
}

/**
 * Core plugin interface
 */
export interface SourcePlugin {
  // Basic plugin information
  id: string;
  name: string;
  description: string;
  version: string;
  
  // URL detection (shared but used differently in each context)
  urlPatterns: RegExp[];
  
  // Methods required by existing codebase
  extractId: (url: string) => string | null;
  formatId: (id: string) => string;
  hasApi?: boolean;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  getContentScriptExtractor: () => string;
  extractMetadata?: (document: any, url: string) => Promise<Partial<UnifiedPaperData>>;
  evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  
  // UI customization
  color?: string;
  icon?: string;
  
  // Context-specific components (for internal use)
  serviceWorker: {
    detectSourceId: (url: string) => string | null;
    formatId: (id: string) => string;
    fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
    evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  };
  
  contentScript: {
    extractorModulePath: string;
    extractMetadata?: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
  };
}

/**
 * Helper method to extract ID using the plugin's URL patterns
 * @param plugin Plugin to use
 * @param url URL to extract from
 * @returns Extracted ID or null
 */
export function extractIdWithPlugin(plugin: SourcePlugin, url: string): string | null {
  // First try the dedicated method
  const id = plugin.extractId(url);
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
