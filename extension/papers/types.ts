// papers/types.ts
// Generic paper data types for source-agnostic handling

import type { Json } from 'gh-store-client';

export type PaperMetadata = {
  // The integration source ID (e.g., 'arxiv')
  sourceId: string;
  
  // Source-specific paper ID (e.g., arXiv ID)
  paperId: string;
  
  // Full URL to the paper
  url: string;
  
  // Paper title
  title: string;
  
  // Author names (typically comma-separated)
  authors: string;
  
  // Paper abstract/summary
  abstract: string;
  
  // Timestamp when first encountered by the extension
  timestamp: string;
  
  // When the paper was published (source format)
  publishedDate: string;
  
  // Tags/categories from the source
  tags: string[];
  
  // User-assigned rating ('novote', 'thumbsup', 'thumbsdown')
  rating: string;
  
  // Optional additional metadata fields specific to source
  [key: string]: any;
}

export type ReadingSessionData = {
  // Unique ID for this session
  session_id: string;
  
  // Active reading time in seconds
  duration_seconds: number;
  
  // Time spent idle during session
  idle_seconds: number;
  
  // When session started
  start_time: string;
  
  // When session ended
  end_time: string;
  
  // Total elapsed time (active + idle)
  total_elapsed_seconds: number;
}

export type Interaction = {
  // Type of interaction ('reading_session', 'annotation', 'rating')
  type: string;
  
  // When the interaction occurred
  timestamp: string;
  
  // Additional data for this interaction
  data: Json;
}

export type InteractionLog = {
  // Full paper identifier (sourceId:paperId)
  paper_id: string;
  
  // List of interactions with this paper
  interactions: Interaction[];
}

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

export const isInteractionLog = (data: unknown): data is InteractionLog => {
  const log = data as InteractionLog;
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.paper_id === 'string' &&
    Array.isArray(log.interactions)
  );
};
