// extension/storage/types.ts
import type { Json } from 'gh-store-client';

// Convert interfaces to type aliases to help with Json compatibility
export type PaperMetadata = {
  arxivId: string;
  url: string;
  title: string;
  authors: string;
  abstract: string;
  timestamp: string;
  published_date: string;
  arxiv_tags: string[];
  rating: string;
}

// Make session config a separate type for clarity
export type SessionConfig = {
  idle_threshold_seconds: number;
  min_duration_seconds: number;
  continuous_activity_required: boolean;
  partial_sessions_logged: boolean;
}

// Reading session as a plain object type
export type ReadingSession = {
  duration_seconds: number;
  session_config: SessionConfig;
}

// Base interaction type that ensures data is Json-compatible
export type Interaction = {
  type: string;
  timestamp: string;
  data: Json;
}

// Typed interaction data (these are the actual data shapes we'll use)
export type ReadingInteractionData = {
  duration_seconds: number;
  session_config: SessionConfig;
}

export type AnnotationInteractionData = {
  key: string;
  value: Json;
}

export type RatingInteractionData = {
  rating: string;
}

// Collection of interactions for a paper
export type InteractionLog = {
  paper_id: string;
  interactions: Interaction[];
}

// Type guards for runtime type checking
export function isReadingSession(data: unknown): data is ReadingSession {
  const session = data as ReadingSession;
  return (
    typeof session === 'object' &&
    session !== null &&
    typeof session.duration_seconds === 'number' &&
    typeof session.session_config === 'object'
  );
}

export function isInteractionLog(data: unknown): data is InteractionLog {
  const log = data as InteractionLog;
  return (
    typeof log === 'object' &&
    log !== null &&
    typeof log.paper_id === 'string' &&
    Array.isArray(log.interactions)
  );
}
