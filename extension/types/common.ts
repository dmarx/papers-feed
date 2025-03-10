// extension/types/common.ts
// Central types file for consistent interface definitions across the project

/**
 * Paper metadata with multi-source support
 */
export interface PaperData {
  // Multi-source fields (required)
  primary_id: string;  // {source}.{id} format
  source: string;      // Source type (arxiv, doi, semanticscholar, etc.)
  sourceId: string;    // Original ID from the source
  
  // Common fields
  url: string;
  title: string;
  authors?: string;
  abstract?: string;
  timestamp?: string;
  rating?: string;
  
  // Source-specific identifiers
  identifiers?: {
    original: string;
    url: string;
    // String index signature
    [key: string]: string;
  };
  
  // Source-specific metadata
  source_specific_metadata?: {
    [key: string]: any;
  };
  
  // Legacy fields (for backward compatibility during refactoring)
  arxivId?: string;
  arxiv_tags?: string[];
  
  // Allow string indexing for evaluation checks
  [key: string]: any;
}

/**
 * Paper source information
 */
export interface SourceInfo {
  type: string;          // Source type (e.g., 'arxiv', 'doi')
  id: string;            // Source-specific ID
  primary_id: string;    // Universal primary ID 
  url: string;           // Original URL
}

/**
 * Enhanced source information with plugin
 */
export interface DetectedSourceInfo extends SourceInfo {
  plugin?: any;          // Associated plugin if available
}

/**
 * Reading session data
 */
export interface ReadingSessionData {
  session_id: string;
  duration_seconds: number;
  idle_seconds: number;
  start_time: string;
  end_time: string;
  total_elapsed_seconds: number;
}

/**
 * Interaction record
 */
export interface Interaction {
  type: string;
  timestamp: string;
  data: any;
}

/**
 * Interaction log
 */
export interface InteractionLog {
  paper_id: string;
  legacy_id?: string; // For backward compatibility
  interactions: Interaction[];
}

/**
 * Session metadata
 */
export interface SessionMetadata {
  sourceType: string;
  paperId: string;
  title: string;
  sessionId: string;
  startTime: string;
  activeSeconds: number;
  idleSeconds: number;
}

/**
 * Paper metadata from API
 */
export interface PaperMetadata {
  title?: string;
  authors?: string;
  abstract?: string;
  url?: string;
  source?: string;
  id?: string;
  primary_id?: string;
  [key: string]: any;
}

/**
 * Plugin configuration for SourcePluginFactory
 */
export interface SourcePluginConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  color?: string;
  icon?: string;
  
  // Core functionality
  idExtractor: (url: string) => string | null;
  formatId: (id: string) => string;
  
  // Content script extractor function as a string
  contentScriptExtractorCode: string;
  
  // Service worker operations
  apiDataFetcher?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  
  // Optional custom quality evaluation
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
}

/**
 * Result of metadata quality evaluation
 */
export interface MetadataQualityResult {
  quality: 'minimal' | 'partial' | 'complete';
  missingFields: string[];
  hasEssentialFields: boolean;
}

/**
 * Unified paper data format (standardized across sources)
 */
export interface UnifiedPaperData {
  // Core fields required for all sources
  primary_id: string;
  source: string;
  sourceId: string;
  url: string;
  title: string;
  authors: string;
  abstract: string;
  timestamp: string;
  rating: string;
  
  // Cross-reference identifiers
  identifiers?: {
    [key: string]: string;
  };
  
  // Source-specific metadata
  source_specific_metadata?: {
    [key: string]: any;
  };
  
  // Allow string indexing for evaluation checks
  [key: string]: any;
}
