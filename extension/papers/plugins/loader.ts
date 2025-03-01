// extension/papers/plugins/loader.ts

import { loguru } from '../../utils/logger';
import { pluginRegistry } from './registry';

const logger = loguru.getLogger('PluginLoader');

/**
 * Load all built-in source plugins
 */
export async function loadBuiltinPlugins(): Promise<void> {
  logger.info('Loading built-in plugins');
  
  try {
    // Import all plugins
    // In a real implementation, we might do this dynamically
    await Promise.all([
      import('./sources/arxiv_plugin'),
      import('./sources/semantic_scholar_plugin'),
      // Add more plugins here as they're implemented
    ]);
    
    logger.info(`Loaded ${pluginRegistry.getAll().length} plugins`);
  } catch (error) {
    logger.error('Error loading plugins', error);
  }
}

/**
 * Initialize the plugin system
 */
export async function initializePluginSystem(): Promise<void> {
  logger.info('Initializing plugin system');
  
  await loadBuiltinPlugins();
  
  // Log loaded plugins
  const plugins = pluginRegistry.getAll();
  logger.info(`Initialized ${plugins.length} plugins:`);
  
  plugins.forEach(plugin => {
    logger.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
  });
}
