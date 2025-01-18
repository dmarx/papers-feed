// extension/storage/types.ts
import type { Json } from 'gh-store-client';

// Base paper metadata - kept lean
export interface PaperMetadata {
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

// Reading session interaction
export interface ReadingSession {
  duration_seconds: number;
  session_config: {
    idle_threshold_seconds: number;
    min_duration_seconds: number;
    continuous_activity_required: boolean;
    partial_sessions_logged: boolean;
  };
}

// Base interaction type
export interface Interaction {
  type: string;
  timestamp: string;
  data: Json;
}

// Typed interactions
export interface ReadingInteraction extends Interaction {
  type: 'reading_session';
  data: ReadingSession;
}

export interface AnnotationInteraction extends Interaction {
  type: 'annotation';
  data: {
    key: string;
    value: Json;
  };
}

export interface RatingInteraction extends Interaction {
  type: 'rating';
  data: {
    rating: string;
  };
}

// Collection of interactions for a paper
export interface InteractionLog {
  paper_id: string;
  interactions: Interaction[];
}
