// extension/papers/plugins/registry.ts
// Enhanced plugin registry with improved validation and logging

import { SourcePlugin } from './source_plugin';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('PluginRegistry');
const debugLogger = loguru.getLogger('PluginRegistryDebug');

/**
 * Registry for paper source plugins
 * Manages plugin registration, discovery, and lookup
 */
class PluginRegistry {
  private plugins: Map<string, SourcePlugin> = new Map();
  
  /**
   * Register a plugin with the registry
   * @param plugin Plugin to register
   */
  register(plugin: SourcePlugin): void {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name})`);
    
    // Validate plugin has required fields
    if (!plugin.id || typeof plugin.id !== 'string') {
      debugLogger.error(`Plugin missing valid id: ${JSON.stringify(plugin)}`);
      return;
    }
    
    if (!Array.isArray(plugin.urlPatterns) || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    
    if (!plugin.extractId || typeof plugin.extractId !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required extractId method`);
      return;
    }
    
    if (!plugin.getContentScriptExtractor || typeof plugin.getContentScriptExtractor !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required getContentScriptExtractor method`);
      return;
    }
    
    if (!plugin.formatId || typeof plugin.formatId !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required formatId method`);
      return;
    }
    
    if (!plugin.evaluateMetadataQuality || typeof plugin.evaluateMetadataQuality !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required evaluateMetadataQuality method`);
      return;
    }
    
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.hasApi}, formatId=${!!plugin.formatId}`);
    logger.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  
  /**
   * Get all registered plugins
   * @returns Array of registered plugins
   */
  getAll(): SourcePlugin[] {
    debugLogger.info(`Getting all plugins, currently ${this.plugins.size} registered`);
    return Array.from(this.plugins.values());
  }
  
  /**
   * Get a plugin by ID
   * @param id Plugin ID
   * @returns Plugin instance or undefined if not found
   */
  get(id: string): SourcePlugin | undefined {
    debugLogger.info(`Looking up plugin by id: ${id}`);
    const plugin = this.plugins.get(id);
    if (!plugin) {
      debugLogger.warning(`No plugin found with id: ${id}`);
    } else {
      debugLogger.info(`Found plugin: ${plugin.name} (${plugin.id})`);
    }
    return plugin;
  }
  
  /**
   * Find a plugin that can handle a URL and extract its ID
   * @param url URL to find a plugin for
   * @returns Object with plugin and extracted ID, or null if no match
   */
  findForUrl(url: string): { plugin: SourcePlugin; id: string } | null {
    debugLogger.info(`Finding plugin for URL: ${url}`);
    
    for (const plugin of this.plugins.values()) {
      debugLogger.info(`Testing URL against plugin: ${plugin.id}`);
      
      for (const pattern of plugin.urlPatterns) {
        debugLogger.info(`Testing pattern: ${pattern.toString()}`);
        
        if (pattern.test(url)) {
          debugLogger.info(`URL matches pattern for plugin: ${plugin.id}`);
          
          const id = plugin.extractId(url);
          if (id) {
            debugLogger.info(`Successfully extracted ID: ${id}`);
            return { plugin, id };
          } else {
            debugLogger.warning(`Pattern matched but failed to extract ID`);
          }
        }
      }
    }
    
    debugLogger.warning(`No plugin found for URL: ${url}`);
    return null;
  }
  
  /**
   * Get the content script extractor code for a plugin
   * @param id Plugin ID
   * @returns Extractor code as string or null if plugin not found
   */
  getExtractorCode(id: string): string | null {
    const plugin = this.get(id);
    if (!plugin) {
      return null;
    }
    
    try {
      return plugin.getContentScriptExtractor();
    } catch (error) {
      debugLogger.error(`Error getting extractor code for plugin ${id}: ${error}`);
      return null;
    }
  }
  
  /**
   * Check if a URL is supported by any registered plugin
   * @param url URL to check
   * @returns True if URL is supported
   */
  isSupportedUrl(url: string): boolean {
    for (const plugin of this.plugins.values()) {
      for (const pattern of plugin.urlPatterns) {
        if (pattern.test(url)) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * Get information about all registered plugins
   * @returns Array of plugin information objects
   */
  getPluginInfo(): Array<{
    id: string;
    name: string;
    description: string;
    version: string;
    hasApi: boolean;
  }> {
    return this.getAll().map(plugin => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      hasApi: !!plugin.hasApi
    }));
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
debugLogger.info('PluginRegistry singleton instance created');
