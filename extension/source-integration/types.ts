// source-integration/types.ts
// Type definitions for source integrations

import type { Json } from 'gh-store-client';
import type { PaperMetadata } from '../papers/types';

/**
 * Source integration interface
 * Implementations should be importable by both background and content scripts
 */
export interface SourceIntegration {
  // Unique identifier
  readonly id: string;
  
  // Human-readable name
  readonly name: string;
  
  // URL patterns for matching papers from this source (as RegExp patterns)
  readonly urlPatterns: RegExp[];
  
  // Domain match patterns for content script registration
  readonly contentScriptMatches: string[];
  
  // Check if URL is from this source
  canHandleUrl(url: string): boolean;
  
  // Extract paper ID from URL
  extractPaperId(url: string): string | null;
  
  // Extract metadata from page or API
  extractMetadata(document: Document, paperId: string): Promise<PaperMetadata | null>;
}

/**
 * Manager interface for source integrations
 */
export interface SourceManager {
  // Register a source integration
  registerSource(source: SourceIntegration): void;
  
  // Get all registered sources
  getAllSources(): SourceIntegration[];
  
  // Get source for a given URL
  getSourceForUrl(url: string): SourceIntegration | null;
  
  // Extract paper ID from URL using appropriate source
  extractPaperId(url: string): { sourceId: string, paperId: string } | null;
}

/**
 * Message types for communication between background and content scripts
 */

// Content script ready notification
export interface ContentScriptReadyMessage {
  type: 'contentScriptReady';
  url: string;
}

// Paper metadata message
export interface PaperMetadataMessage {
  type: 'paperMetadata';
  metadata: PaperMetadata;
}

// Show annotation popup request
export interface ShowAnnotationPopupMessage {
  type: 'showAnnotationPopup';
  sourceId: string;
  paperId: string;
  position: { x: number, y: number };
}

// Popup action message
export interface PopupActionMessage {
  type: 'popupAction';
  action: string;
  sourceId: string;
  paperId: string;
  data: any;
}

// Union type for all message types
export type Message = 
  | ContentScriptReadyMessage
  | PaperMetadataMessage
  | ShowAnnotationPopupMessage
  | PopupActionMessage;
