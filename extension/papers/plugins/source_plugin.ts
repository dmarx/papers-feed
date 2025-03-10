// extension/papers/plugins/source_plugin.ts

import { UnifiedPaperData } from '../types';

/**
 * Result of metadata quality evaluation
 */
export interface MetadataQualityResult {
  quality: 'minimal' | 'partial' | 'complete';
  missingFields: string[];
  hasEssentialFields: boolean;
}

/**
 * Core interface for all source plugins
 */
export interface SourcePlugin {
  // Basic info
  id: string;
  name: string;
  description: string;
  version: string;
  
  // URL detection
  urlPatterns: RegExp[];
  extractId: (url: string) => string | null;
  
  // Content script metadata extraction
  getContentScriptExtractor: () => string;
  
  // DOM extraction (optional)
  extractMetadata?: (document: any, url: string) => Promise<Partial<UnifiedPaperData>>;
  
  // Metadata quality evaluation
  evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  
  // Optional API support
  hasApi?: boolean;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  
  // UI customization
  color?: string;
  icon?: string;
  
  // Storage format customization
  formatId: (id: string) => string;
}
