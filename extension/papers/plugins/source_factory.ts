// extension/papers/plugins/source_factory.ts
// Updated factory to create plugins with proper context separation

import { SourcePlugin, MetadataQualityResult } from './source_plugin';
import { pluginRegistry } from './registry';
import { UnifiedPaperData } from '../../types/common';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('SourcePluginFactory');

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
    extractorCode?: string; // For compatibility with existing code
    extractMetadata?: (document: Document, url: string) => Promise<Partial<UnifiedPaperData>>;
  };
}

/**
 * Factory for creating source plugins with proper context separation
 */
export class SourcePluginFactory {
  /**
   * Create a new source plugin from configuration and register it
   * @param config Plugin configuration
   * @returns The created plugin
   */
  createPlugin(config: SourcePluginConfig): SourcePlugin {
    logger.info(`Creating plugin: ${config.id}`);
    
    // Validate required fields
    this.validateConfig(config);
    
    // Default quality evaluation if not provided
    const evaluateMetadataQuality = config.serviceWorker.evaluateMetadataQuality || 
      ((paperData: Partial<UnifiedPaperData>): MetadataQualityResult => {
        // Define required fields for different quality levels
        const essentialFields = ['title', 'primary_id', 'url'];
        const standardFields = [...essentialFields, 'authors'];
        const completeFields = [...standardFields, 'abstract', 'timestamp'];
        
        // Check which fields are missing
        const missingEssential = essentialFields.filter(field => {
          const value = paperData[field];
          return value === undefined || value === null || value === '';
        });
        
        const missingComplete = completeFields.filter(field => {
          const value = paperData[field];
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
      });
    
    // Create the plugin with both top-level methods and context-specific components
    const plugin: SourcePlugin = {
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,
      urlPatterns: config.urlPatterns,
      color: config.color,
      icon: config.icon,
      
      // Top-level methods (for compatibility with existing code)
      extractId: config.serviceWorker.detectSourceId,
      formatId: config.serviceWorker.formatId,
      hasApi: !!config.serviceWorker.fetchApiData,
      fetchApiData: config.serviceWorker.fetchApiData,
      evaluateMetadataQuality,
      
      // Content script methods
      getContentScriptExtractor: () => {
        // Return the extractor code or a placeholder
        return config.contentScript.extractorCode || 
          `// Extractor code for ${config.id} plugin\n` +
          `// This is a generated placeholder. Replace with actual extraction logic.\n` +
          `async function extractMetadata(document, url) {\n` +
          `  console.warn('Using placeholder extractor for ${config.id}');\n` +
          `  return { source: "${config.id}", url: url };\n` +
          `}`;
      },
      extractMetadata: config.contentScript.extractMetadata,
      
      // Context-specific components
      serviceWorker: {
        detectSourceId: config.serviceWorker.detectSourceId,
        formatId: config.serviceWorker.formatId,
        fetchApiData: config.serviceWorker.fetchApiData,
        evaluateMetadataQuality
      },
      contentScript: {
        extractorModulePath: config.contentScript.extractorModulePath,
        extractMetadata: config.contentScript.extractMetadata
      }
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
  private validateConfig(config: SourcePluginConfig): void {
    // Required fields must exist
    const requiredFields = [
      'id', 'name', 'description', 'version', 'urlPatterns',
      'serviceWorker', 'contentScript'
    ];
    
    const missingFields = requiredFields.filter(field => 
      !config[field as keyof SourcePluginConfig]);
    
    if (missingFields.length > 0) {
      const error = `Plugin configuration missing required fields: ${missingFields.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }
    
    // URL patterns must be an array with at least one pattern
    if (!Array.isArray(config.urlPatterns) || config.urlPatterns.length === 0) {
      const error = `Plugin ${config.id} has no URL patterns`;
      logger.error(error);
      throw new Error(error);
    }
    
    // Validate service worker component
    const requiredSWFields = ['detectSourceId', 'formatId'];
    const missingSWFields = requiredSWFields.filter(field => 
      !config.serviceWorker[field as keyof typeof config.serviceWorker]);
    
    if (missingSWFields.length > 0) {
      const error = `Plugin ${config.id} service worker is missing required fields: ${missingSWFields.join(', ')}`;
      logger.error(error);
      throw new Error(error);
    }
    
    // Validate content script component
    if (!config.contentScript.extractorModulePath) {
      const error = `Plugin ${config.id} content script is missing required extractorModulePath`;
      logger.error(error);
      throw new Error(error);
    }
  }
}

// Export a singleton instance
export const sourcePluginFactory = new SourcePluginFactory();
