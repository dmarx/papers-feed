// extension/papers/plugins/source_factory.ts
// Factory to simplify creation of new source plugins

import { SourcePlugin, MetadataQualityResult } from './source_plugin';
import { pluginRegistry } from './registry';
import { UnifiedPaperData } from '../types';
import { loguru } from '../../utils/logger';

/**
 * Base configuration for creating a source plugin
 */
export interface SourcePluginConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  urlPatterns: RegExp[];
  color?: string;
  icon?: string;
  
  // Core functionality
  idExtractor: (url: string) => string | null;
  formatId: (id: string) => string;
  
  // Content script extractor function as a string
  contentScriptExtractorCode: string;
  
  // Service worker operations
  apiDataFetcher?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  
  // Optional custom quality evaluation
  evaluateMetadataQuality?: (paperData: Partial<UnifiedPaperData>) => MetadataQualityResult;
}

/**
 * Factory for creating source plugins with consistent behavior
 */
export class SourcePluginFactory {
  private logger = loguru.getLogger('SourcePluginFactory');

  /**
   * Create a new source plugin from configuration and register it
   * 
   * @param config Plugin configuration
   * @returns The created plugin
   */
  createPlugin(config: SourcePluginConfig): SourcePlugin {
    this.logger.info(`Creating plugin: ${config.id}`);
    
    // Validate required fields
    this.validateConfig(config);
    
    const plugin: SourcePlugin = {
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,
      urlPatterns: config.urlPatterns,
      color: config.color,
      icon: config.icon,
      hasApi: !!config.apiDataFetcher,
      
      // ID extraction function
      extractId: (url: string): string | null => {
        try {
          return config.idExtractor(url);
        } catch (error) {
          this.logger.error(`Error extracting ID for ${config.id}:`, error);
          return null;
        }
      },
      
      // Content script extraction code provider
      getContentScriptExtractor: (): string => {
        return config.contentScriptExtractorCode;
      },
      
      // Default metadata quality evaluation method
      evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>): MetadataQualityResult => {
        try {
          // If custom evaluator is provided, use it
          if (config.evaluateMetadataQuality) {
            return config.evaluateMetadataQuality(paperData);
          }
          
          // Define required fields for different quality levels
          const essentialFields = ['title', 'primary_id', 'url'];
          const standardFields = [...essentialFields, 'authors'];
          const completeFields = [...standardFields, 'abstract', 'timestamp'];
          
          // Check which fields are missing
          const missingEssential = essentialFields.filter(field => 
            !paperData[field] || paperData[field] === '');
          
          const missingStandard = standardFields.filter(field => 
            !paperData[field] || paperData[field] === '');
          
          const missingComplete = completeFields.filter(field => 
            !paperData[field] || paperData[field] === '');
          
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
        } catch (error) {
          this.logger.error(`Error evaluating metadata quality: ${error}`);
          return {
            quality: 'minimal',
            missingFields: ['error'],
            hasEssentialFields: false
          };
        }
      },
      
      // ID formatting function
      formatId: config.formatId
    };
    
    // Add API data fetcher if provided
    if (config.apiDataFetcher) {
      plugin.fetchApiData = async (id: string): Promise<Partial<UnifiedPaperData>> => {
        try {
          const data = await config.apiDataFetcher!(id);
          this.logger.info(`Fetched API data for ${config.id}:${id}`);
          return data;
        } catch (error) {
          this.logger.error(`Error fetching API data for ${config.id}:${id}:`, error);
          return {};
        }
      };
    }
    
    // Register the plugin
    pluginRegistry.register(plugin);
    
    return plugin;
  }
  
  /**
   * Validate plugin configuration
   * @param config Configuration to validate
   * @throws Error if required fields are missing
   */
  private validateConfig(config: SourcePluginConfig): void {
    // Required fields must exist
    const requiredFields = [
      'id', 'name', 'description', 'version', 'urlPatterns',
      'idExtractor', 'formatId', 'contentScriptExtractorCode'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !config[field as keyof SourcePluginConfig]);
    
    if (missingFields.length > 0) {
      const error = `Plugin configuration missing required fields: ${missingFields.join(', ')}`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    // URL patterns must be an array with at least one pattern
    if (!Array.isArray(config.urlPatterns) || config.urlPatterns.length === 0) {
      const error = `Plugin ${config.id} has no URL patterns`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    // Validate function fields
    if (typeof config.idExtractor !== 'function') {
      const error = `Plugin ${config.id} has invalid idExtractor: not a function`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    if (typeof config.formatId !== 'function') {
      const error = `Plugin ${config.id} has invalid formatId: not a function`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    // Content script extractor code must be a non-empty string
    if (typeof config.contentScriptExtractorCode !== 'string' || 
        config.contentScriptExtractorCode.trim() === '') {
      const error = `Plugin ${config.id} has invalid contentScriptExtractorCode: empty or not a string`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    // If apiDataFetcher is provided, it must be a function
    if (config.apiDataFetcher !== undefined && typeof config.apiDataFetcher !== 'function') {
      const error = `Plugin ${config.id} has invalid apiDataFetcher: not a function`;
      this.logger.error(error);
      throw new Error(error);
    }
    
    // If evaluateMetadataQuality is provided, it must be a function
    if (config.evaluateMetadataQuality !== undefined && 
        typeof config.evaluateMetadataQuality !== 'function') {
      const error = `Plugin ${config.id} has invalid evaluateMetadataQuality: not a function`;
      this.logger.error(error);
      throw new Error(error);
    }
  }
}

// Export a singleton instance
export const sourcePluginFactory = new SourcePluginFactory();
