// extension/source-integration/source-manager.ts
// Manager for source integrations

import { SourceDefinition, SourceIntegration, SourceManager } from './types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('source-manager');

/**
 * Manages source integrations
 */
export class SourceIntegrationManager implements SourceManager {
  private sources: Map<string, SourceIntegration> = new Map();
  
  constructor() {
    logger.info('Source integration manager initialized');
  }
  
  /**
   * Register a source integration
   */
  registerSource(source: SourceIntegration): void {
    if (this.sources.has(source.id)) {
      logger.warning(`Source with ID '${source.id}' already registered, overwriting`);
    }
    
    this.sources.set(source.id, source);
    logger.info(`Registered source: ${source.name} (${source.id})`);
  }
  
  /**
   * Get all registered sources as source definitions for content script
   */
  getAllSources(): SourceDefinition[] {
    return Array.from(this.sources.values()).map(source => ({
      id: source.id,
      name: source.name,
      urlPatterns: source.getLinkPatterns().map(pattern => pattern.pattern),
      extractorCode: source.extractPaperId.toString(),
      metadataExtractorCode: async function(document: Document, paperId: string) {
        const integration = Array.from(this.sources.values()).find(s => s.id === source.id);
        if (!integration) return null;
        return integration.fetchPaperMetadata(paperId);
      }.toString(),
      contentScriptMatches: source.getContentScriptMatches()
    }));
  }
  
  /**
   * Get source that can handle a URL
   */
  getSourceForUrl(url: string): SourceIntegration | null {
    for (const source of this.sources.values()) {
      if (source.canHandleUrl(url)) {
        logger.debug(`Found source for URL '${url}': ${source.id}`);
        return source;
      }
    }
    
    logger.debug(`No source found for URL: ${url}`);
    return null;
  }
  
  /**
   * Extract paper ID from URL using appropriate source
   */
  extractPaperId(url: string): { sourceId: string, paperId: string } | null {
    for (const source of this.sources.values()) {
      if (source.canHandleUrl(url)) {
        const paperId = source.extractPaperId(url);
        if (paperId) {
          logger.debug(`Extracted paper ID '${paperId}' from URL using ${source.id}`);
          return { sourceId: source.id, paperId };
        }
      }
    }
    
    logger.debug(`Could not extract paper ID from URL: ${url}`);
    return null;
  }
  
  /**
   * Get all content script match patterns
   */
  getAllContentScriptMatches(): string[] {
    const patterns: string[] = [];
    
    for (const source of this.sources.values()) {
      patterns.push(...source.getContentScriptMatches());
    }
    
    return patterns;
  }
}
