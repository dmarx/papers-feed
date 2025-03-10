// extension/papers/source_utils.ts
// Fixed to export isNewFormat function

import { pluginRegistry } from './plugins/registry';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('SourceUtils');

/**
 * Format a source-specific ID into a universal primary ID format
 * Uses source-specific formatId from plugin if available
 * 
 * @param {string} source - Source type (e.g. 'arxiv', 'doi')
 * @param {string} id - Original source-specific identifier
 * @returns {string} Formatted primary ID
 */
export function formatPrimaryId(source: string, id: string): string {
  // First check if we have a plugin for this source
  const plugin = pluginRegistry.get(source);
  
  // Use plugin's serviceWorker.formatId method if available
  if (plugin && plugin.serviceWorker && plugin.serviceWorker.formatId) {
    return plugin.serviceWorker.formatId(id);
  }
  
  // Sanitize the ID by replacing problematic characters
  const safeId = id
    .replace(/\//g, '_')
    .replace(/:/g, '.')
    .replace(/\s/g, '_')
    .replace(/\\/g, '_');
  
  return `${source}.${safeId}`;
}

/**
 * Parse a primary ID into its source type and original source ID
 * 
 * @param {string} prefixedId - The primary ID in the format "{source_prefix}.{id}"
 * @returns {Object} Object with source type and source ID
 */
export function parseId(prefixedId: string): { type: string; id: string } {
  // Split at the first dot
  const [prefix, ...idParts] = prefixedId.split('.');
  const id = idParts.join('.'); // Rejoin in case ID contains periods
  
  // Map prefix to source type by looking up plugins
  const plugins = pluginRegistry.getAll();
  for (const plugin of plugins) {
    // Check if the plugin's ID format matches the prefix
    if (plugin.serviceWorker && plugin.serviceWorker.formatId) {
      const sampleId = plugin.serviceWorker.formatId('test');
      const samplePrefix = sampleId.split('.')[0];
      if (samplePrefix === prefix) {
        return {
          type: plugin.id,
          id: id
        };
      }
    }
  }
