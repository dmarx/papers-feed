// extension/papers/plugins/registry.ts
// Updated registry to work with context-separated plugins

import { SourcePlugin, extractIdWithPlugin } from './source_plugin';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('PluginRegistry');
const debugLogger = loguru.getLogger('PluginRegistryDebug');

/**
 * Registry for paper source plugins with context-awareness
 */
class PluginRegistry {
  private plugins = new Map<string, SourcePlugin>();
  
  /**
   * Register a plugin with the registry
   * @param plugin Plugin to register
   */
  register(plugin: SourcePlugin): void {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name})`);
    
    // Validate plugin has required fields and components
    if (!plugin.id || typeof plugin.id !== 'string') {
      debugLogger.error(`Plugin missing valid id: ${JSON.stringify(plugin)}`);
      return;
    }
    
    if (!Array.isArray(plugin.urlPatterns) || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    
    // Validate service worker component
    if (!plugin.serviceWorker) {
      debugLogger.error(`Plugin ${plugin.id} missing required serviceWorker component`);
      return;
    }
    
    if (!plugin.serviceWorker.detectSourceId || typeof plugin.serviceWorker.detectSourceId !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required detectSourceId method`);
      return;
    }
    
    if (!plugin.serviceWorker.formatId || typeof plugin.serviceWorker.formatId !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required formatId method`);
      return;
    }
    
    // Validate content script component
    if (!plugin.contentScript) {
      debugLogger.error(`Plugin ${plugin.id} missing required contentScript component`);
      return;
    }
    
    if (!plugin.contentScript.extractorModulePath) {
      debugLogger.error(`Plugin ${plugin.id} missing required extractorModulePath`);
      return;
    }
    
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.serviceWorker.fetchApiData}, formatId=${!!plugin.serviceWorker.formatId}`);
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
      
      // Use the plugin's service worker component to detect the ID
      const id = extractIdWithPlugin(plugin, url);
      
      if (id) {
        debugLogger.info(`URL matches plugin ${plugin.id}, extracted ID: ${id}`);
        return { plugin, id };
      }
    }
    
    debugLogger.warning(`No plugin found for URL: ${url}`);
    return null;
  }
  
  /**
   * Get the path to the extractor module for a plugin
   * @param id Plugin ID
   * @returns Path to extractor module or null if plugin not found
   */
  getExtractorPath(id: string): string | null {
    const plugin = this.get(id);
    if (!plugin) {
      return null;
    }
    
    return plugin.contentScript.extractorModulePath;
  }
  
  /**
   * Check if a URL is supported by any registered plugin
   * @param url URL to check
   * @returns True if URL is supported
   */
  isSupportedUrl(url: string): boolean {
    return this.findForUrl(url) !== null;
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
      hasApi: !!plugin.serviceWorker.fetchApiData
    }));
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
debugLogger.info('PluginRegistry singleton instance created');
