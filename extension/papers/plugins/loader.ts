// extension/papers/plugins/loader.ts

import { loguru } from '../../utils/logger';
import { pluginRegistry } from './registry';

// Import plugins directly (static import)
import * as plugins from './sources/index';

const logger = loguru.getLogger('PluginLoader');

/**
 * Load all built-in source plugins
 */
export async function loadBuiltinPlugins(): Promise<void> {
  logger.info('Loading built-in plugins');
  
  try {
    // Plugins are already loaded via the static import
    // This is just to check if they were properly registered
    const pluginCount = pluginRegistry.getAll().length;
    
    if (pluginCount === 0) {
      logger.warning('No plugins were registered. Check plugin registration.');
    } else {
      logger.info(`${pluginCount} plugins are registered.`);
    }
  } catch (error) {
    logger.error('Error loading plugins', error);
    // Log detailed error information for debugging
    if (error instanceof Error) {
      logger.error(`Plugin loading error: ${error.message}`);
      if (error.stack) {
        logger.error(`Stack trace: ${error.stack}`);
      }
    }
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
