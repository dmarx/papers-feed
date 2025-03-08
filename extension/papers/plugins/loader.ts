// extension/papers/plugins/loader.ts - Enhanced logging

import { loguru } from '../../utils/logger';
import { pluginRegistry } from './registry';

// Import plugins directly (static import)
import * as plugins from './sources/index';

const logger = loguru.getLogger('PluginLoader');
const debugLogger = loguru.getLogger('PluginDebug');

/**
 * Load all built-in source plugins with enhanced logging
 */
export async function loadBuiltinPlugins(): Promise<void> {
  logger.info('Loading built-in plugins');
  debugLogger.info('=== Starting plugin loading process ===');
  
  try {
    // Check for imported plugins
    debugLogger.info('Imported plugin module:', plugins);
    
    // Plugins are already loaded via the static import
    // This is just to check if they were properly registered
    const pluginCount = pluginRegistry.getAll().length;
    
    if (pluginCount === 0) {
      debugLogger.error('No plugins were registered. Check plugin registration logic.');
      debugLogger.info('Plugin registry state:', pluginRegistry);
      logger.warning('No plugins were registered. Check plugin registration.');
    } else {
      debugLogger.info(`${pluginCount} plugins successfully registered`);
      const registeredPlugins = pluginRegistry.getAll();
      debugLogger.info('Registered plugins:');
      registeredPlugins.forEach(plugin => {
        debugLogger.info(`- ${plugin.id}: ${plugin.name} (v${plugin.version})`);
      });
      
      logger.info(`${pluginCount} plugins are registered.`);
    }
  } catch (error) {
    debugLogger.error('Error loading plugins', error);
    if (error instanceof Error) {
      debugLogger.error(`Stack trace: ${error.stack}`);
      // Check for module resolution issues
      if (error.message.includes('Cannot find module')) {
        debugLogger.error('Module resolution error. Check import paths and build configuration.');
      }
    }
    
    logger.error('Error loading plugins', error);
  }
}

/**
 * Initialize the plugin system with enhanced logging
 */
export async function initializePluginSystem(): Promise<void> {
  debugLogger.info('=== Initializing plugin system ===');
  logger.info('Initializing plugin system');
  
  try {
    await loadBuiltinPlugins();
    
    // Log loaded plugins in detail
    const plugins = pluginRegistry.getAll();
    debugLogger.info(`Initialized ${plugins.length} plugins:`);
    
    plugins.forEach(plugin => {
      debugLogger.info(`Plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
      
      // Verify required plugin methods
      if (!plugin.extractId) {
        debugLogger.error(`Plugin ${plugin.id} is missing required extractId method!`);
      }
      
      if (!plugin.extractMetadata) {
        debugLogger.error(`Plugin ${plugin.id} is missing required extractMetadata method!`);
      }
      
      // Log URL patterns
      debugLogger.info(`URL patterns for ${plugin.id}:`);
      plugin.urlPatterns.forEach(pattern => {
        debugLogger.info(`- ${pattern.toString()}`);
      });
      
      // Check API capabilities
      if (plugin.hasApi) {
        if (plugin.fetchApiData) {
          debugLogger.info(`Plugin ${plugin.id} has API support`);
        } else {
          debugLogger.error(`Plugin ${plugin.id} has hasApi=true but is missing fetchApiData method!`);
        }
      }
      
      // Check ID formatting
      if (plugin.formatId) {
        const testId = 'test123';
        const formattedId = plugin.formatId(testId);
        debugLogger.info(`ID format example: ${testId} -> ${formattedId}`);
      } else {
        debugLogger.info(`Plugin ${plugin.id} uses default ID formatting`);
      }
      
      logger.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
    });
    
    debugLogger.info('=== Plugin system initialization complete ===');
  } catch (error) {
    debugLogger.error('Plugin system initialization failed', error);
    if (error instanceof Error) {
      debugLogger.error(`Error details: ${error.message}`);
      debugLogger.error(`Stack trace: ${error.stack}`);
    }
    throw error;
  }
}

// extension/papers/plugins/registry.ts - Enhanced registry logging

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
    
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.hasApi}, formatId=${!!plugin.formatId}`);
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
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
debugLogger.info('PluginRegistry singleton instance created');
