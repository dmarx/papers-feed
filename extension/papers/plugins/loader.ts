// extension/papers/plugins/loader.ts
// Improved plugin loader with better initialization handling

import { loguru } from '../../utils/logger';
import { pluginRegistry } from './registry';

// Import plugins directly (static imports only)
// This is the key change - we need to use static imports only in service workers
import { arxivPlugin } from './sources/arxiv_plugin';
//import { semanticScholarPlugin } from './sources/semantic_scholar_plugin';
//import { openreviewPlugin } from './sources/openreview_plugin';

const logger = loguru.getLogger('PluginLoader');

// Track plugin initialization state
let pluginsInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Register core plugins manually instead of dynamic imports
 * Service workers don't support dynamic imports
 */
function registerCorePlugins(): void {
  try {
    // Clear existing plugins to avoid duplicates in case of retries
    const existingPlugins = pluginRegistry.getAll();
    if (existingPlugins.length > 0) {
      logger.info(`Found ${existingPlugins.length} plugins already registered`);
      return; // Already registered
    }
    
    // Register each plugin manually - static imports
    pluginRegistry.register(arxivPlugin);
    //pluginRegistry.register(semanticScholarPlugin);
    //pluginRegistry.register(openreviewPlugin);
    
    const pluginCount = pluginRegistry.getAll().length;
    logger.info(`Registered ${pluginCount} core plugins manually`);
  } catch (error) {
    logger.error('Error registering core plugins:', error);
    throw error;
  }
}

/**
 * Load all built-in source plugins with improved error handling
 */
async function loadBuiltinPlugins(): Promise<void> {
  logger.info('Loading built-in plugins');
  
  try {
    // Register the core plugins directly - no dynamic imports
    registerCorePlugins();
    
    // Check if plugins were registered successfully
    const pluginCount = pluginRegistry.getAll().length;
    
    if (pluginCount === 0) {
      logger.warning('No plugins were registered. Attempting emergency direct registration.');
      
      // Emergency fallback - try direct plugin registration again
      try {
        // These are the same plugins, but we try again in case of registration issues
        pluginRegistry.register(arxivPlugin);
        //pluginRegistry.register(semanticScholarPlugin);
        //pluginRegistry.register(openreviewPlugin);
        
        // Check if emergency registration worked
        const emergencyCount = pluginRegistry.getAll().length;
        if (emergencyCount > 0) {
          logger.info(`Emergency plugin registration successful: ${emergencyCount} plugins registered`);
        } else {
          throw new Error('Failed to register any plugins even with emergency registration');
        }
      } catch (emergencyError) {
        logger.error('Emergency plugin registration failed:', emergencyError);
        throw emergencyError;
      }
    } else {
      logger.info(`${pluginCount} plugins are registered`);
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
