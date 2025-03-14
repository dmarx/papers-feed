// extension/papers/types.ts
// Type definitions for paper data

import type { Json } from 'gh-store-client';

/**
 * Paper metadata from any source
 */
export interface PaperMetadata {
  // Source identifier
  sourceId: string;
  
  // Paper identifier within the source
  paperId: string;
  
  // Full URL to the paper
  url: string;
  
  // Paper title
  title: string;
  
  // Authors (comma-separated)
  authors: string;
  
  // Abstract or summary
  abstract: string;
  
  // When this paper was first added
  timestamp: string;
  
  // Publication date
  publishedDate: string;
  
  // Tags or categories
  tags: string[];
  
  // User-assigned rating (novote, thumbsup, thumbsdown)
  rating: string;
  
  // Allow additional source-specific properties
  [key: string]: any;
}

/**
 * Reading session data
 */
export interface ReadingSessionData {
  // Session identifier
  session_id: string;
  
  // Active reading time in seconds
  duration_seconds: number;
  
  // Idle time in seconds
  idle_seconds: number;
  
  // Session start time
  start_time: string;
  
  // Session end time
  end_time: string;
  
  // Total elapsed time (active + idle) in seconds
  total_elapsed_seconds: number;
}

/**
 * Interaction data
 */
export interface Interaction {
  // Type of interaction (reading_session, annotation, rating)
  type: string;
  
  // When interaction occurred
  timestamp: string;
  
  // Additional data
  data: Json;
}

/**
 * Interaction log
 */
export interface InteractionLog {
  // Source identifier
  sourceId: string;
  
  // Paper identifier within the source
  paperId: string;
  
  // List of interactions
  interactions: Interaction[];
}

/**
 * Type guard for interaction log
 */
export function isInteractionLog(data: unknown): data is InteractionLog {
  const log = data as InteractionLog;
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.sourceId === 'string' &&
    typeof log.paperId === 'string' &&
    Array.isArray(log.interactions)
  );
}
