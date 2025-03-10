// // extension/papers/plugins/loader-debug.ts
// // Enhanced logging for the plugin system

// import { loguru } from '../../utils/logger';
// import { pluginRegistry } from './registry';

// // Create debug loggers
// const loaderDebugLogger = loguru.getLogger('PluginDebug');

// /**
//  * Enhanced version of loadBuiltinPlugins with detailed logging
//  */
// export async function enhancedLoadBuiltinPlugins(): Promise<void> {
//   loaderDebugLogger.info('=== Starting plugin loading process ===');
  
//   try {
//     // Check for registered plugins
//     const pluginCount = pluginRegistry.getAll().length;
    
//     if (pluginCount === 0) {
//       loaderDebugLogger.error('No plugins were registered. Check plugin registration logic.');
//       loaderDebugLogger.info('Plugin registry state:', pluginRegistry);
//     } else {
//       loaderDebugLogger.info(`${pluginCount} plugins successfully registered`);
//       const registeredPlugins = pluginRegistry.getAll();
//       loaderDebugLogger.info('Registered plugins:');
//       registeredPlugins.forEach(plugin => {
//         loaderDebugLogger.info(`- ${plugin.id}: ${plugin.name} (v${plugin.version})`);
//       });
//     }
//   } catch (error) {
//     loaderDebugLogger.error('Error loading plugins', error);
//     if (error instanceof Error) {
//       loaderDebugLogger.error(`Stack trace: ${error.stack}`);
//       // Check for module resolution issues
//       if (error.message.includes('Cannot find module')) {
//         loaderDebugLogger.error('Module resolution error. Check import paths and build configuration.');
//       }
//     }
//   }
// }

// /**
//  * Enhanced version of initializePluginSystem with detailed logging
//  */
// export async function enhancedInitializePluginSystem(): Promise<void> {
//   loaderDebugLogger.info('=== Initializing plugin system ===');
  
//   try {
//     // Run the original loadBuiltinPlugins first
//     await enhancedLoadBuiltinPlugins();
    
//     // Log loaded plugins in detail
//     const plugins = pluginRegistry.getAll();
//     loaderDebugLogger.info(`Initialized ${plugins.length} plugins:`);
    
//     plugins.forEach(plugin => {
//       loaderDebugLogger.info(`Plugin: ${plugin.name} (${plugin.id}) v${plugin.version}`);
      
//       // Verify required plugin methods
//       if (!plugin.extractId) {
//         loaderDebugLogger.error(`Plugin ${plugin.id} is missing required extractId method!`);
//       }
      
//       if (!plugin.extractMetadata) {
//         loaderDebugLogger.error(`Plugin ${plugin.id} is missing required extractMetadata method!`);
//       }
      
//       // Log URL patterns
//       loaderDebugLogger.info(`URL patterns for ${plugin.id}:`);
//       plugin.urlPatterns.forEach(pattern => {
//         loaderDebugLogger.info(`- ${pattern.toString()}`);
//       });
      
//       // Check API capabilities
//       if (plugin.hasApi) {
//         if (plugin.fetchApiData) {
//           loaderDebugLogger.info(`Plugin ${plugin.id} has API support`);
//         } else {
//           loaderDebugLogger.error(`Plugin ${plugin.id} has hasApi=true but is missing fetchApiData method!`);
//         }
//       }
      
//       // Check ID formatting
//       if (plugin.formatId) {
//         const testId = 'test123';
//         const formattedId = plugin.formatId(testId);
//         loaderDebugLogger.info(`ID format example: ${testId} -> ${formattedId}`);
//       } else {
//         loaderDebugLogger.info(`Plugin ${plugin.id} uses default ID formatting`);
//       }
//     });
    
//     loaderDebugLogger.info('=== Plugin system initialization complete ===');
//   } catch (error) {
//     loaderDebugLogger.error('Plugin system initialization failed', error);
//     if (error instanceof Error) {
//       loaderDebugLogger.error(`Error details: ${error.message}`);
//       loaderDebugLogger.error(`Stack trace: ${error.stack}`);
//     }
//     throw error;
//   }
// }
