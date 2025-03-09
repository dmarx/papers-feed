// extension/papers/plugins/loader.ts
// Improved plugin loader with better initialization handling

import { loguru } from '../../utils/logger';
import { pluginRegistry } from './registry';

// Import plugins directly (static import)
import * as plugins from './sources/index';

const logger = loguru.getLogger('PluginLoader');

// Track plugin initialization state
let pluginsInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Load all built-in source plugins with improved error handling
 */
async function loadBuiltinPlugins(): Promise<void> {
  logger.info('Loading built-in plugins');
  
  try {
    // Plugins are already loaded via the static import
    // This is just to check if they were properly registered
    const pluginCount = pluginRegistry.getAll().length;
    
    if (pluginCount === 0) {
      logger.warning('No plugins were registered. Attempting emergency registration.');
      // Emergency fallback - directly import critical plugins
      try {
        await import('./sources/arxiv_plugin');
        await import('./sources/semantic_scholar_plugin');
        await import('./sources/openreview_plugin');
        
        // Check if emergency loading worked
        const emergencyCount = pluginRegistry.getAll().length;
        if (emergencyCount > 0) {
          logger.info(`Emergency plugin loading successful: ${emergencyCount} plugins registered`);
        } else {
          throw new Error('Failed to load any plugins even with emergency loading');
        }
      } catch (emergencyError) {
        logger.error('Emergency plugin loading failed:', emergencyError);
        throw emergencyError;
      }
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
    // Rethrow to indicate initialization failure
    throw error;
  }
}

/**
 * Initialize the plugin system with retry capability
 * @param {number} retries Number of retries if initialization fails
 * @returns {Promise<void>}
 */
export async function initializePluginSystem(retries = 3): Promise<void> {
  // If already initialized, return immediately
  if (pluginsInitialized) {
    return;
  }
  
  // If initialization is in progress, return the existing promise
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start initialization
  logger.info('Initializing plugin system');
  
  // Create a new initialization promise
  initializationPromise = (async () => {
    let attemptCount = 0;
    let lastError: Error | null = null;
    
    // Try initialization with retries
    while (attemptCount < retries) {
      try {
        await loadBuiltinPlugins();
        
        // Log loaded plugins
        const loadedPlugins = pluginRegistry.getAll();
        logger.info(`Initialized ${loadedPlugins.length} plugins:`);
        
        loadedPlugins.forEach(plugin => {
          logger.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
        });
        
        // Mark as successful
        pluginsInitialized = true;
        return;
      } catch (error) {
        attemptCount++;
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warning(`Plugin initialization attempt ${attemptCount} failed: ${lastError.message}`);
        
        if (attemptCount < retries) {
          // Wait before retrying
          const delay = Math.pow(2, attemptCount) * 500; // Exponential backoff
          logger.info(`Retrying plugin initialization in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // If we get here, all retries failed
    logger.error(`Plugin initialization failed after ${retries} attempts.`);
    if (lastError) {
      throw lastError;
    } else {
      throw new Error('Plugin initialization failed for unknown reasons');
    }
  })();
  
  try {
    await initializationPromise;
    return;
  } catch (error) {
    // Reset the promise so future calls can try again
    initializationPromise = null;
    throw error;
  }
}

/**
 * Check if plugins are initialized
 * @returns {boolean} True if plugins are initialized
 */
export function arePluginsInitialized(): boolean {
  return pluginsInitialized;
}

/**
 * Get current plugin initialization state
 * @returns {Object} Initialization state
 */
export function getPluginInitializationState() {
  return {
    initialized: pluginsInitialized,
    initializationInProgress: !!initializationPromise,
    pluginCount: pluginRegistry.getAll().length
  };
}

/**
 * Manually reset plugin initialization state
 * Used primarily for testing and emergency recovery
 */
export function resetPluginInitialization(): void {
  pluginsInitialized = false;
  initializationPromise = null;
  logger.warning('Plugin initialization state has been reset');
}
