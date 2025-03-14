// source-integration/types.ts
// Defines the interface for source integrations

import type { Json } from 'gh-store-client';
import type { PaperMetadata } from '../papers/types';

// Represents what each source integration must implement
export interface SourceIntegration {
  // Unique identifier for this integration
  readonly id: string;
  
  // Human-readable name of the integration
  readonly name: string;
  
  // Whether this integration can handle a given URL
  canHandleUrl(url: string): boolean;
  
  // Extract paper ID from URL
  extractPaperId(url: string): string | null;
  
  // Get metadata for a paper
  fetchPaperMetadata(paperId: string): Promise<PaperMetadata | null>;
  
  // Get URL patterns for the link processor to detect papers
  getLinkPatterns(): Array<{
    sourceId: string;
    pattern: string;
    extractorCode: string;
  }>;
  
  // Get domain patterns this integration should be activated on
  getContentScriptMatches(): string[];
}

// Interface for the integration registry/manager
export interface IntegrationManager {
  // Register a source integration
  registerIntegration(integration: SourceIntegration): void;
  
  // Get integration that can handle a URL
  getIntegrationForUrl(url: string): SourceIntegration | null;
  
  // Get all registered integrations
  getAllIntegrations(): SourceIntegration[];
  
  // Get content script match patterns for all integrations
  getAllContentScriptMatches(): string[];
}
