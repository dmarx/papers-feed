// extension/papers/plugins/service_worker_plugin.ts
// Definition for service worker plugins

import { UnifiedPaperData, MetadataQualityResult } from '../../types/common';

/**
 * Service worker plugin interface
 * Only contains functionality that runs in the service worker context
 */
export interface ServiceWorkerPlugin {
  // Basic info
  id: string;
  name: string;
  description: string;
  version: string;
  
  // URL patterns for detection
  urlPatterns: RegExp[];
  
  // Source detection methods
  detectSourceId: (url: string) => string | null;
  formatId: (id: string) => string;
  
  // Optional API-based data fetching
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  
  // Optional quality evaluation
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  
  // Optional UI customization
  color?: string;
  icon?: string;
  
  // Reference to content script extractor (just the path, not the implementation)
  extractorPath: string;
}

/**
 * Configuration for creating a service worker plugin
 */
export interface ServiceWorkerPluginConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  detectSourceId: (url: string) => string | null;
  formatId: (id: string) => string;
  extractorPath: string;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  color?: string;
  icon?: string;
}

/**
 * Default quality evaluation implementation
 */
export function defaultQualityEvaluation(paperData: Partial<UnifiedPaperData>): MetadataQualityResult {
  // Define required fields for different quality levels
  const essentialFields = ['title', 'primary_id', 'url'];
  const standardFields = [...essentialFields, 'authors'];
  const completeFields = [...standardFields, 'abstract', 'timestamp'];
  
  // Check which fields are missing
  const missingEssential = essentialFields.filter(field => {
    const value = paperData[field];
    return value === undefined || value === null || value === '';
  });
  
  const missingComplete = completeFields.filter(field => {
    const value = paperData[field];
    return value === undefined || value === null || value === '';
  });
  
  // Calculate quality level
  let quality: 'minimal' | 'partial' | 'complete';
  
  if (missingEssential.length > 0) {
    quality = 'minimal';
  } else if (missingComplete.length > 0) {
    quality = 'partial';
  } else {
    quality = 'complete';
  }
  
  return {
    quality,
    missingFields: missingComplete,
    hasEssentialFields: missingEssential.length === 0
  };
}
