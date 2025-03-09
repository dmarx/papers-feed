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
    
    // Override the default quality evaluation if provided
    if (config.evaluateMetadataQuality) {
      plugin.evaluateMetadataQuality = config.evaluateMetadataQuality;
    }
    
    // Register the plugin
    pluginRegistry.register(plugin);
    
    return plugin;
  }
}

// Export a singleton instance
export const sourcePluginFactory = new SourcePluginFactory();
