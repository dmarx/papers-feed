// extension/source-integration/types.ts
// Enhanced source integration types for plugin architecture

import type { Json } from 'gh-store-client';
import { PaperMetadata } from '../papers/types';

/**
 * Source integration interface
 */
export interface SourceIntegration {
  // Unique identifier
  readonly id: string;
  
  // Human-readable name
  readonly name: string;
  
  // Check if this integration can handle a URL
  canHandleUrl(url: string): boolean;
  
  // Extract paper ID from URL
  extractPaperId(url: string): string | null;
  
  // Get link patterns for the content script
  getLinkPatterns(): LinkPattern[];
  
  // Fetch paper metadata from API
  fetchPaperMetadata(paperId: string): Promise<PaperMetadata | null>;
  
  // Get content script matches
  getContentScriptMatches(): string[];
}

/**
 * Source definition for content script
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
  getSourceForUrl(url: string): SourceIntegration | null;
  
  // Extract paper ID from URL using appropriate source
  extractPaperId(url: string): { sourceId: string, paperId: string } | null;
}
