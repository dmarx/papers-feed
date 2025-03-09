// extension/papers/plugins/registry.ts
// Updated plugin registry with improved logging

import { SourcePlugin } from './source_plugin';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('PluginRegistry');
const debugLogger = loguru.getLogger('PluginRegistryDebug');

class PluginRegistry {
  private plugins: Map<string, SourcePlugin> = new Map();
  
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
    
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    logger.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  
  getAll(): SourcePlugin[] {
    debugLogger.info(`Getting all plugins, currently ${this.plugins.size} registered`);
    return Array.from(this.plugins.values());
  }
  
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
  
  findForUrl(url: string): { plugin: SourcePlugin; id: string } | null {
    debugLogger.info(`Finding plugin for URL: ${url}`);
    
    for (const plugin of this.plugins.values()) {
      debugLogger.info(`Testing URL against plugin: ${plugin.id}`);
      
      for (const pattern of plugin.urlPatterns) {
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
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
