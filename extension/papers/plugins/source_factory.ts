// extension/papers/plugins/source_factory.ts
// Updated to solve type error

import { loguru } from '../../utils/logger';
import { UnifiedPaperData, MetadataQualityResult } from '../../types/common';
import { pluginRegistry } from './registry';

const logger = loguru.getLogger('SourcePluginFactory');

// Define plugin interfaces appropriate for the new structure
export interface SourcePlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  detectSourceId: (url: string) => string | null;
  formatId: (id: string) => string;
  fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  extractorModulePath: string;
  color?: string;
  icon?: string;
}

/**
 * Configuration for creating a source plugin
 */
export interface SourcePluginConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  color?: string;
  icon?: string;
  
  // Service worker specific
  serviceWorker: {
    detectSourceId: (url: string) => string | null;
    formatId: (id: string) => string;
    fetchApiData?: (id: string) => Promise<Partial<UnifiedPaperData>>;
    evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
  };
  
  // Content script specific
  contentScript: {
    extractorModulePath: string;
  };
}

/**
 * Factory for creating source plugins with context separation
 */
export class SourcePluginFactory {
  /**
   * Create a new source plugin from configuration and register it
   * @param config Plugin configuration
   * @returns The created plugin
   */
  createPlugin(config: SourcePluginConfig): SourcePlugin {
    logger.info(`Creating plugin: ${config.id}`);
    this.validateConfig(config);
    
    // Create the plugin with the correct structure
    const plugin: SourcePlugin = {
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,
      urlPatterns: config.urlPatterns,
      color: config.color,
      icon: config.icon,
      
      // Map service worker functions directly to plugin
      detectSourceId: config.serviceWorker.detectSourceId,
      formatId: config.serviceWorker.formatId,
      fetchApiData: config.serviceWorker.fetchApiData,
      evaluateMetadataQuality: config.serviceWorker.evaluateMetadataQuality || this.defaultQualityEvaluation,
      
      // Store extractor path for content script
      extractorModulePath: config.contentScript.extractorModulePath
    };
    
    // Register the plugin
    pluginRegistry.register(plugin);
    
    return plugin;
  }
  
  /**
   * Validate plugin configuration
   * @param config Configuration to validate
   * @throws Error if required fields are missing
   */
  validateConfig(config: SourcePluginConfig): void {
    const requiredFields = [
      'id',
      'name',
      'description',
      'version',
      'urlPatterns',
      'serviceWorker',
      'contentScript'
    ];
    
    const missingFields = requiredFields.filter(field => !config[field as keyof SourcePluginConfig]);
    
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
    
    const requiredSWFields = ['detectSourceId', 'formatId'];
    const missingSWFields = requiredSWFields.filter(field => !config.serviceWorker[field as keyof typeof config.serviceWorker]);
    
    if (missingSWFields.length > 0) {
      const error = `Plugin ${config.id} service worker is missing required fields: ${missingSWFields.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }
    
    if (!config.contentScript.extractorModulePath) {
      const error = `Plugin ${config.id} content script is missing required extractorModulePath`;
      logger.error(error);
      throw new Error(error);
    }
  }
  
  /**
   * Default quality evaluation implementation
   */
  defaultQualityEvaluation(paperData: Partial<UnifiedPaperData>): MetadataQualityResult {
    const essentialFields = ['title', 'primary_id', 'url'];
    const standardFields = [...essentialFields, 'authors'];
    const completeFields = [...standardFields, 'abstract', 'timestamp'];
    
    const missingEssential = essentialFields.filter(field => {
      const value = paperData[field];
      return value === undefined || value === null || value === '';
    });
    
    const missingComplete = completeFields.filter(field => {
      const value = paperData[field];
      return value === undefined || value === null || value === '';
    });
    
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
export const sourcePluginFactory = new SourcePluginFactory();
