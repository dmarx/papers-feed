// extension/papers/plugins/registry-debug.ts
// Enhanced registry logging

import { SourcePlugin } from './source_plugin';
import { loguru } from '../../utils/logger';

const registryDebugLogger = loguru.getLogger('PluginRegistryDebug');

/**
 * Enhance the existing plugin registry with debugging capabilities
 * @param registry The original plugin registry instance
 */
export function enhancePluginRegistry(registry: any): void {
  // Store original methods
  const originalRegister = registry.register;
  const originalGetAll = registry.getAll;
  const originalGet = registry.get;
  const originalFindForUrl = registry.findForUrl;
  
  // Enhanced register method
  registry.register = function(plugin: SourcePlugin): void {
    registryDebugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name})`);
    
    // Validate plugin has required fields
    if (!plugin.id || typeof plugin.id !== 'string') {
      registryDebugLogger.error(`Plugin missing valid id: ${JSON.stringify(plugin)}`);
      return;
    }
    
    if (!Array.isArray(plugin.urlPatterns) || plugin.urlPatterns.length === 0) {
      registryDebugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    
    if (!plugin.extractId || typeof plugin.extractId !== 'function') {
      registryDebugLogger.error(`Plugin ${plugin.id} missing required extractId method`);
      return;
    }
    
    // Call original method
    originalRegister.call(this, plugin);
    
    registryDebugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    registryDebugLogger.info(`Plugin capabilities: hasApi=${!!plugin.hasApi}, formatId=${!!plugin.formatId}`);
  };
  
  // Enhanced getAll method
  registry.getAll = function(): SourcePlugin[] {
    const plugins = originalGetAll.call(this);
    registryDebugLogger.info(`Getting all plugins, found ${plugins.length} registered`);
    return plugins;
  };
  
  // Enhanced get method
  registry.get = function(id: string): SourcePlugin | undefined {
    registryDebugLogger.info(`Looking up plugin by id: ${id}`);
    const plugin = originalGet.call(this, id);
    if (!plugin) {
      registryDebugLogger.warning(`No plugin found with id: ${id}`);
    } else {
      registryDebugLogger.info(`Found plugin: ${plugin.name} (${plugin.id})`);
    }
    return plugin;
  };
  
  // Enhanced findForUrl method
  registry.findForUrl = function(url: string): { plugin: SourcePlugin; id: string } | null {
    registryDebugLogger.info(`Finding plugin for URL: ${url}`);
    
    const result = originalFindForUrl.call(this, url);
    
    if (result) {
      registryDebugLogger.info(`Found plugin for URL: ${result.plugin.id}, extracted ID: ${result.id}`);
    } else {
      registryDebugLogger.warning(`No plugin found for URL: ${url}`);
    }
    
    return result;
  };
  
  registryDebugLogger.info('Plugin registry enhanced with debugging capabilities');
}
