// extension/papers/plugins/source_factory.ts
// Factory to simplify creation of new source plugins

import { SourcePlugin } from './source_plugin';
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
  hasApi?: boolean;
  idExtractor: (url: string) => string | null;
  metadataExtractor: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
  apiDataFetcher?: (id: string) => Promise<Partial<UnifiedPaperData>>;
  formatId?: (id: string) => string;
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
      
      // Standard implementation of extractId
      extractId: (url: string): string | null => {
        try {
          return config.idExtractor(url);
        } catch (error) {
          this.logger.error(`Error extracting ID for ${config.id}:`, error);
          return null;
        }
      },
      
      // Standard implementation of extractMetadata
      extractMetadata: async (document: Document, url: string): Promise<Partial<UnifiedPaperData>> => {
        try {
          const metadata = await config.metadataExtractor(document, url);
          this.logger.info(`Extracted metadata for ${config.id}: ${metadata.title || 'Untitled'}`);
          return metadata;
        } catch (error) {
          this.logger.error(`Error extracting metadata for ${config.id}:`, error);
          return {};
        }
      }
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
    
    // Add formatId if provided
    if (config.formatId) {
      plugin.formatId = config.formatId;
    }
    
    // Register the plugin
    pluginRegistry.register(plugin);
    
    return plugin;
  }
  
  /**
   * Create a basic plugin from minimal configuration
   * 
   * @param id Plugin ID
   * @param name Display name
   * @param urlPatterns URL patterns to match
   * @param idExtractor Function to extract ID from URL
   * @returns The created plugin
   */
  createBasicPlugin(
    id: string,
    name: string,
    urlPatterns: RegExp[],
    idExtractor: (url: string) => string | null
  ): SourcePlugin {
    return this.createPlugin({
      id,
      name,
      description: `Support for ${name} papers`,
      version: '1.0.0',
      urlPatterns,
      idExtractor,
      metadataExtractor: async () => ({})
    });
  }
}

// Export a singleton instance
export const sourcePluginFactory = new SourcePluginFactory();
