// extension/papers/plugins/plugin_factory.ts
// Factory for creating plugins and extractors

import { loguru } from '../../utils/logger';
import { ServiceWorkerPlugin, ServiceWorkerPluginConfig, defaultQualityEvaluation } from './service_worker_plugin';
import { ContentExtractor, ContentExtractorConfig } from './content_extractor';
import { pluginRegistry } from './registry';

const logger = loguru.getLogger('PluginFactory');

/**
 * Factory for creating plugins and extractors
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
      extractorPath: config.extractorPath,
      fetchApiData: config.fetchApiData,
      evaluateMetadataQuality: config.evaluateMetadataQuality || defaultQualityEvaluation,
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
      'detectSourceId', 'formatId', 'extractorPath'
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
}

/**
 * Singleton plugin factory
 */
export const pluginFactory = new PluginFactory();
