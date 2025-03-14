// papers/types.ts
// Type definitions for paper data

import type { Json } from 'gh-store-client';

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
  // Full paper ID (sourceId:paperId)
  paper_id: string;
  
  // List of interactions
  interactions: Interaction[];
}

/**
 * Type guard for reading session data
 */
export function isReadingSession(data: unknown): data is ReadingSessionData {
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
}

/**
 * Type guard for interaction log
 */
export function isInteractionLog(data: unknown): data is InteractionLog {
  const log = data as InteractionLog;
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.paper_id === 'string' &&
    Array.isArray(log.interactions)
  );
}
