// extension/papers/plugins/plugin_factory.ts
// Factory for creating plugins with clean separation of contexts

import { loguru } from '../../utils/logger';
import { UnifiedPaperData, MetadataQualityResult } from '../../types/common';
import { pluginRegistry } from './registry';

const logger = loguru.getLogger('PluginFactory');

/**
 * Service worker plugin - only contains what's needed in the service worker context
 */
export interface ServiceWorkerPlugin {
  // Basic plugin information
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  
  // Service worker methods
  detectSourceId: (url: string) => string | null;
  formatId: (id: string) => string;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  
  // Optional UI customization
  color?: string;
  icon?: string;
}

/**
 * Content script extractor - only contains what's needed in content script context
 */
export interface ContentExtractor {
  // ID to match with the service worker plugin
  pluginId: string;
  
  // Content extraction function
  extractMetadata: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
}

/**
 * Configuration for creating a service worker plugin
 */
export interface ServiceWorkerPluginConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  detectSourceId: (url: string) => string | null;
  formatId: (id: string) => string;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  color?: string;
  icon?: string;
}

/**
 * Configuration for creating a content extractor
 */
export interface ContentExtractorConfig {
  pluginId: string;
  extractMetadata: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
}

/**
 * Factory for creating plugins with clean context separation
 */
export class PluginFactory {
  /**
   * Create a service worker plugin
   * @param config Plugin configuration
   * @returns The created plugin
   */
  createServiceWorkerPlugin(config: ServiceWorkerPluginConfig): ServiceWorkerPlugin {
    logger.info(`Creating service worker plugin: ${config.id}`);
    
    this.validateServiceWorkerConfig(config);
    
    // Create the plugin
    const plugin: ServiceWorkerPlugin = {
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,
      urlPatterns: config.urlPatterns,
      detectSourceId: config.detectSourceId,
      formatId: config.formatId,
      fetchApiData: config.fetchApiData,
      evaluateMetadataQuality: config.evaluateMetadataQuality || this.defaultQualityEvaluation,
      color: config.color,
      icon: config.icon
    };
    
    // Register with the plugin registry
    pluginRegistry.register(plugin);
    
    return plugin;
  }
  
  /**
   * Create a content extractor
   * @param config Extractor configuration
   * @returns The created extractor
   */
  createContentExtractor(config: ContentExtractorConfig): ContentExtractor {
    logger.info(`Creating content extractor for plugin: ${config.pluginId}`);
    
    this.validateContentExtractorConfig(config);
    
    // Create the extractor
    const extractor: ContentExtractor = {
      pluginId: config.pluginId,
      extractMetadata: config.extractMetadata
    };
    
    return extractor;
  }
  
  /**
   * Validate service worker plugin configuration
   * @param config Configuration to validate
   */
  private validateServiceWorkerConfig(config: ServiceWorkerPluginConfig): void {
    const requiredFields = [
      'id', 'name', 'description', 'version', 'urlPatterns', 
      'detectSourceId', 'formatId'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !config[field as keyof ServiceWorkerPluginConfig]);
    
    if (missingFields.length > 0) {
      const error = `Plugin configuration missing required fields: ${missingFields.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }
    
    if (!Array.isArray(config.urlPatterns) || config.urlPatterns.length === 0) {
      const error = `Plugin ${config.id} has no URL patterns`;
      logger.error(error);
      throw new Error(error);
    }
  }
  
  /**
   * Validate content extractor configuration
   * @param config Configuration to validate
   */
  private validateContentExtractorConfig(config: ContentExtractorConfig): void {
    if (!config.pluginId) {
      const error = 'Content extractor missing required pluginId';
      logger.error(error);
      throw new Error(error);
    }
    
    if (!config.extractMetadata || typeof config.extractMetadata !== 'function') {
      const error = `Content extractor for ${config.pluginId} missing extractMetadata function`;
      logger.error(error);
      throw new Error(error);
    }
  }
  
  /**
   * Default quality evaluation implementation
   */
  defaultQualityEvaluation(paperData: Partial<UnifiedPaperData>): MetadataQualityResult {
    // Define required fields for different quality levels
    const essentialFields = ['title', 'primary_id', 'url'];
    const standardFields = [...essentialFields, 'authors'];
    const completeFields = [...standardFields, 'abstract', 'timestamp'];
    
    // Check which fields are missing
    const missingEssential = essentialFields.filter(field => {
      const value = paperData[field as keyof typeof paperData];
      return value === undefined || value === null || value === '';
    });
    
    const missingComplete = completeFields.filter(field => {
      const value = paperData[field as keyof typeof paperData];
      return value === undefined || value === null || value === '';
    });
    
    // Calculate quality level
    let quality: 'minimal' | 'partial' | 'complete';
    
    if (missingEssential.length > 0) {
      quality = 'minimal';
    } else if (missingComplete.length > 0) {
      quality = 'partial';
    } else {
      quality = 'complete';
    }
    
    return {
      quality,
      missingFields: missingComplete,
      hasEssentialFields: missingEssential.length === 0
    };
  }
}

// Export singleton instance
export const pluginFactory = new PluginFactory();
