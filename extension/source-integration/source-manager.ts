// source-integration/source-manager.ts
// Manager for source integrations

import { SourceDefinition, SourceManager } from './types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('source-manager');

/**
 * Manages source integrations
 */
export class SourceIntegrationManager implements SourceManager {
  private sources: Map<string, SourceDefinition> = new Map();
  
  constructor() {
    logger.info('Source integration manager initialized');
  }
  
  /**
   * Register a source integration
   */
  registerSource(source: SourceDefinition): void {
    if (this.sources.has(source.id)) {
      logger.warning(`Source with ID '${source.id}' already registered, overwriting`);
    }
    
    this.sources.set(source.id, source);
    logger.info(`Registered source: ${source.name} (${source.id})`);
  }
  
  /**
   * Get all registered sources
   */
  getAllSources(): SourceDefinition[] {
    return Array.from(this.sources.values());
  }
  
  /**
   * Get source that can handle a URL
   */
  getSourceForUrl(url: string): SourceDefinition | null {
    for (const source of this.sources.values()) {
      for (const patternStr of source.urlPatterns) {
        try {
          const pattern = new RegExp(patternStr);
          if (pattern.test(url)) {
            logger.debug(`Found source for URL '${url}': ${source.id}`);
            return source;
          }
        } catch (error) {
          logger.error(`Invalid pattern in source ${source.id}:`, error);
        }
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
      try {
        // Create function from extractor code
        const extractorFn = new Function('url', source.extractorCode);
        const paperId = extractorFn(url);
        
        if (paperId) {
          logger.debug(`Extracted paper ID '${paperId}' from URL using ${source.id}`);
          return { sourceId: source.id, paperId };
        }
      } catch (error) {
        logger.error(`Error extracting paper ID with ${source.id}:`, error);
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
      patterns.push(...source.contentScriptMatches);
    }
    
    return patterns;
  }
}
