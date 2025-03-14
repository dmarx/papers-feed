// source-integration/types.ts
// Enhanced source integration types for plugin architecture

import type { Json } from 'gh-store-client';

/**
 * Source definition with URL patterns and extractor code
 */
export interface SourceDefinition {
  // Unique identifier
  id: string;
  
  // Human-readable name
  name: string;
  
  // URL patterns to match
  urlPatterns: string[];
  
  // Code to extract paper ID from URL (as string that can be eval'd)
  extractorCode: string;
  
  // Code to extract metadata from page (as string that can be eval'd)
  metadataExtractorCode: string;
  
  // Domain match patterns (for content script)
  contentScriptMatches: string[];
}

/**
 * Paper metadata that all source integrations should provide
 */
export interface PaperMetadata {
  // Source integration ID
  sourceId: string;
  
  // Paper ID within the source
  paperId: string;
  
  // Full URL to the paper
  url: string;
  
  // Paper title
  title: string;
  
  // Authors (comma-separated)
  authors: string;
  
  // Abstract or summary
  abstract: string;
  
  // When this was first seen by the extension
  timestamp: string;
  
  // When paper was published
  publishedDate: string;
  
  // Categories or tags
  tags: string[];
  
  // User rating (novote, thumbsup, thumbsdown)
  rating: string;
}

/**
 * Link pattern for content script
 */
export interface LinkPattern {
  // Source integration ID
  sourceId: string;
  
  // Regular expression pattern (as string)
  pattern: string;
  
  // Function to extract paper ID (as string)
  extractorCode: string;
}

/**
 * Metadata extractor function
 */
export type MetadataExtractor = (document: Document, paperId: string) => Promise<PaperMetadata>;

/**
 * Message from content script to background script with metadata
 */
export interface MetadataMessage {
  type: 'paperMetadata';
  metadata: PaperMetadata;
}

/**
 * Message to register source patterns with content script
 */
export interface RegisterPatternsMessage {
  type: 'registerSources';
  sources: SourceDefinition[];
}

/**
 * Manager interface for source integrations
 */
export interface SourceManager {
  // Get all registered sources
  getAllSources(): SourceDefinition[];
  
  // Get source for a given URL
  getSourceForUrl(url: string): SourceDefinition | null;
  
  // Extract paper ID from URL using appropriate source
  extractPaperId(url: string): { sourceId: string, paperId: string } | null;
}
