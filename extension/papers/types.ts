// extension/papers/types.ts
import type { Json } from 'gh-store-client';

/**
 * Paper metadata with multi-source support
 */
export type PaperMetadata = {
  // Legacy fields (for backward compatibility)
  arxivId?: string;
  arxiv_tags?: string[];
  
  // Multi-source fields
  primary_id?: string;  // {source}:{id} format
  source?: string;      // Source type (arxiv, doi, semanticscholar, etc.)
  sourceId?: string;    // Original ID from the source
  
  // Common fields
  url: string;
  title: string;
  authors: string;
  abstract: string;
  timestamp: string;
  published_date: string;
  rating: string;
  
  // Source-specific identifiers
  identifiers?: {
    original: string;
    url: string;
    // Fix for TS2411: Using string index signature
    [key: string]: string;
  };
}

/**
 * Reading session data
 */
export type ReadingSessionData = {
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
export type Interaction = {
  type: string;
  timestamp: string;
  data: Json;
}

/**
 * Interaction log
 */
export type InteractionLog = {
  paper_id: string;
  legacy_id?: string; // For backward compatibility
  interactions: Interaction[];
}

/**
 * Type guard for reading session data
 */
export const isReadingSession = (data: unknown): data is ReadingSessionData => {
  const session = data as ReadingSessionData;
  return (
    typeof session === 'object' &&
    session !== null &&
    typeof session.session_id === 'string' &&
    typeof session.duration_seconds === 'number' &&
    typeof session.idle_seconds === 'number' &&
    typeof session.start_time === 'string' &&
    typeof session.end_time === 'string' &&
    typeof session.total_elapsed_seconds === 'number'
  );
};

/**
 * Type guard for interaction log
 */
export const isInteractionLog = (data: unknown): data is InteractionLog => {
  const log = data as InteractionLog;
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.paper_id === 'string' &&
    Array.isArray(log.interactions)
  );
};

/**
 * Paper source information
 */
export type SourceInfo = {
  type: string;
  id: string;
  primary_id: string;
  url: string;
}

/**
 * Extended paper data interface for all source types
 */
export interface UnifiedPaperData {
  // Core fields required for all sources
  primary_id: string;  // Standardized ID format: {source}.{id}
  source: string;      // Source identifier (arxiv, doi, semanticscholar, etc.)
  sourceId: string;    // Original ID from the source
  url: string;         // Paper URL
  title: string;       // Paper title
  authors: string;     // Author list as string
  abstract: string;    // Paper abstract
  timestamp: string;   // When the paper was first tracked
  rating: string;      // User rating (thumbsup, thumbsdown, novote)
  
  // Legacy support fields
  arxivId?: string;            // For backward compatibility
  published_date?: string;     // Publication date
  arxiv_tags?: string[];       // ArXiv categories
  
  // Source-specific fields
  // Fix for TS2411: Using string index signature
  identifiers?: {              // Cross-reference identifiers
    [key: string]: string;     // Other identifier types
 };
 
 // Allow for extension with string indexing
 // Fix for TS2411: Using string index signature
 source_specific_metadata?: {
  [key: string]: any;
 };
}
