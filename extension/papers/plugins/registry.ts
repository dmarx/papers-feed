// extension/papers/plugins/registry.ts
// Updated registry to match new plugin structure

import { loguru } from '../../utils/logger';
import { SourcePlugin } from './source_factory';

const logger = loguru.getLogger('PluginRegistry');
const debugLogger = loguru.getLogger('PluginRegistryDebug');

/**
 * Helper function to extract ID from URL using a plugin
 */
export function extractIdWithPlugin(plugin: SourcePlugin, url: string): string | null {
  // First try the dedicated method
  const id = plugin.detectSourceId(url);
  if (id) return id;
  
  // Fall back to pattern matching if the method doesn't return an ID
  for (const pattern of plugin.urlPatterns) {
    const match = url.match(pattern);
    if (match) {
      // Return the first capture group as the ID
      return match[1] || null;
    }
  }
  
  return null;
}

/**
 * Registry for paper source plugins
 */
class PluginRegistry {
  private plugins = new Map<string, SourcePlugin>();
  
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
    
    if (!plugin.detectSourceId || typeof plugin.detectSourceId !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required detectSourceId method`);
      return;
    }
    
    if (!plugin.formatId || typeof plugin.formatId !== 'function') {
      debugLogger.error(`Plugin ${plugin.id} missing required formatId method`);
      return;
    }
    
    if (!plugin.extractorModulePath) {
      debugLogger.error(`Plugin ${plugin.id} missing required extractorModulePath`);
      return;
    }
    
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.fetchApiData}, formatId=${!!plugin.formatId}`);
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
  getPluginInfo() {
    return this.getAll().map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      hasApi: !!plugin.fetchApiData
    }));
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
debugLogger.info('PluginRegistry singleton instance created');
