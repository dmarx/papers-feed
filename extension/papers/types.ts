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
 * Extended reading session with multi-source support
 */
export class MultiSourceReadingSession {
  // In legacy version, this was arxivId
  paperId: string;
  sessionId: string;
  startTime: Date;
  activeTime: number;
  idleTime: number;
  lastActiveTime: Date;
  isTracking: boolean;
  config: any;
  endTime: Date | null;
  finalizedData: ReadingSessionData | null;
  
  constructor(paperId: string, config: any) {
    this.paperId = paperId;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.startTime = new Date();
    this.activeTime = 0;
    this.idleTime = 0;
    this.lastActiveTime = new Date();
    this.isTracking = true;
    this.config = config;
    this.endTime = null;
    this.finalizedData = null;
  }
  
  // Rest of the methods remain the same as ReadingSession
  update() {
    if (this.isTracking && !this.finalizedData) {
      const now = new Date();
      const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
      
      if (timeSinceLastActive < this.config.idleThreshold) {
        this.activeTime += timeSinceLastActive;
      } else {
        this.idleTime += timeSinceLastActive;
      }
      
      this.lastActiveTime = now;
    }
  }
  
  finalize() {
    if (this.finalizedData) {
      return this.finalizedData;
    }
 
    this.update();
    this.isTracking = false;
    this.endTime = new Date();
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
 
    if (this.activeTime >= this.config.minSessionDuration) {
      this.finalizedData = {
        session_id: this.sessionId,
        duration_seconds: Math.round(this.activeTime / 1000),
        idle_seconds: Math.round(this.idleTime / 1000),
        start_time: this.startTime.toISOString(),
        end_time: this.endTime.toISOString(),
        total_elapsed_seconds: Math.round(totalElapsed / 1000)
      };
      return this.finalizedData;
    }
    return null;
  }
  
  end() {
    return this.finalize();
  }
  
  getMetadata() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      activeSeconds: Math.round(this.activeTime / 1000),
      idleSeconds: Math.round(this.idleTime / 1000)
    };
  }
}

// extension/papers/types.ts

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
  // doi?: string;                // DOI string for DOI and ACM sources
  identifiers?: {              // Cross-reference identifiers
    // original: string;          // Original ID from the source
    // url: string;               // Canonical URL
    // arxiv?: string;            // ArXiv ID
    // doi?: string;              // DOI reference
    // s2?: string;               // Semantic Scholar ID
    // acm?: string;              // ACM ID
    // openreview?: string;       // OpenReview ID
    [key: string]: string;     // Other identifier types
 };
 
 // // Metadata fields
 // citations?: number;          // Citation count
 // journal?: string;            // Journal name
 // conference?: string;         // Conference name
 // volume?: string;             // Journal volume
 // issue?: string;              // Journal issue
 // pages?: string;              // Page numbers
 // publisher?: string;          // Publisher name
 
 // Custom source-specific fields
 // conferenceInfo?: {           // Enhanced conference information
 //   name: string;              // Conference name
 //   year: number;              // Year
 //   location: string;          // Location
 //   abbreviation?: string;     // Conference abbreviation (e.g., "ICLR")
 // };
 
 // Allow for extension with string indexing
 // Fix for TS2411: Using string index signature
 source_specific_metadata?: {
  [key: string]: any;
 };
}
