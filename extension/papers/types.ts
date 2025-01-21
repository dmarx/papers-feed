// extension/papers/types.ts
import type { Json } from 'gh-store-client';

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

export type ReadingSession = {
  duration_seconds: number;
}

export type Interaction = {
  type: string;
  timestamp: string;
  data: Json;
}

export type InteractionLog = {
  paper_id: string;
  interactions: Interaction[];
}

export const isReadingSession = (data: unknown): data is ReadingSession => {
  const session = data as ReadingSession;
  return (
    typeof session === 'object' &&
    session !== null &&
    typeof session.duration_seconds === 'number'
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
