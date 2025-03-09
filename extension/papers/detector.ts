// extension/papers/detector.ts
// Simplified detector that uses the plugin registry

import { SourceInfo } from './types';
import { formatPrimaryId } from './source_utils';
import { pluginRegistry } from './plugins/registry';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('Detector');

/**
 * Detector for academic paper URLs that uses the plugin system
 */
export class MultiSourceDetector {
  /**
   * Detect paper source and metadata from URL using the plugin registry
   * 
   * @param {string} url - URL to analyze
   * @returns {SourceInfo|null} Paper source information or null if not detected
   */
  static detect(url: string): SourceInfo | null {
    // Use the plugin registry to find a matching plugin
    const plugins = pluginRegistry.getAll();
    
    for (const plugin of plugins) {
      for (const pattern of plugin.urlPatterns) {
        const match = url.match(pattern);
        if (match) {
          const id = plugin.extractId(url);
          if (id) {
            const primary_id = plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id);
            logger.info(`Detected ${plugin.id} paper: ${id} (${primary_id})`);
            return {
              type: plugin.id,
              id: id,
              primary_id: primary_id,
              url
            };
          }
        }
      }
    }
    
    logger.info(`No matching plugin found for URL: ${url}`);
    return null;
  }
}

/**
 * Utility function to detect source from URL
 * Just a wrapper around MultiSourceDetector for backward compatibility
 */
export function detectSourceFromUrl(url: string): SourceInfo | null {
  return MultiSourceDetector.detect(url);
}
