// extension/papers/plugins/source_plugin.ts

import { UnifiedPaperData } from '../types';

export interface MetadataQualityResult {
  quality: 'minimal' | 'partial' | 'complete';
  missingFields: string[];
  hasEssentialFields: boolean;
}

export interface SourcePlugin {
  // Basic info
  id: string;               // Unique source identifier
  name: string;             // Display name
  description: string;      // Description
  version: string;          // Version
  
  // URL detection
  urlPatterns: RegExp[];    // Patterns to match URLs
  extractId: (url: string) => string | null;  // Extract ID from URL
  
  // Content script metadata extraction
  getContentScriptExtractor: () => string;  // Returns extraction code as string
  
  // Metadata quality evaluation
  evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  
  // Optional API support
  hasApi?: boolean;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  
  // UI customization
  color?: string;           // Brand color
  icon?: string;            // Icon or emoji
  
  // Storage format customization
  formatId: (id: string) => string; // Format ID for storage
}
