// extension/papers/source_utils.ts
// Simplified utility functions for paper sources that work with the plugin system

import { pluginRegistry } from './plugins/registry';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('SourceUtils');

// Default source prefixes for ID formatting
// These are used as fallbacks if a plugin doesn't define its own formatId method
const SOURCE_PREFIXES: Record<string, string> = {
  'arxiv': 'arxiv',
  'semanticscholar': 's2',
  'doi': 'doi',
  'openreview': 'openreview',
  'acm': 'doi'  // ACM uses DOIs
};

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
  
  // Use plugin's formatId method if available
  if (plugin && plugin.formatId) {
    return plugin.formatId(id);
  }
  
  // Otherwise use the default prefix
  const sourcePrefix = SOURCE_PREFIXES[source] || 'generic';
  
  // Sanitize the ID by replacing problematic characters
  const safeId = id
    .replace(/\//g, '_')
    .replace(/:/g, '.')
    .replace(/\s/g, '_')
    .replace(/\\/g, '_');
  
  return `${sourcePrefix}.${safeId}`;
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
    if (plugin.formatId) {
      const sampleId = plugin.formatId('test');
      const samplePrefix = sampleId.split('.')[0];
      if (samplePrefix === prefix) {
        return {
          type: plugin.id,
          id: id
        };
      }
    }
  }
  
  // Fallback to hardcoded mapping for backward compatibility
  const prefixToSource: Record<string, string> = {
    'arxiv': 'arxiv',
    's2': 'semanticscholar',
    'doi': 'doi',
    'openreview': 'openreview'
  };
  
  return {
    type: prefixToSource[prefix] || 'generic',
    id: prefix === 'doi' ? id.replace(/_/g, '/') : id
  };
}

/**
 * Checks if a string is in the required prefixed format
 * 
 * @param {string} id - ID to check
 * @returns {boolean} True if the ID is in the correct format
 */
export function isNewFormat(id: string): boolean {
  // Check if it has a valid prefix
  const validPrefixes = Object.values(SOURCE_PREFIXES).map(prefix => `${prefix}.`);
  validPrefixes.push('generic.'); // Add generic prefix
  
  return validPrefixes.some(prefix => id.startsWith(prefix));
}

/**
 * Gets a display label for a source type using the plugin if available
 * 
 * @param {string} sourceType - Source type
 * @returns {string} Human-readable label
 */
export function getSourceLabel(sourceType: string): string {
  const plugin = pluginRegistry.get(sourceType);
  if (plugin) {
    return plugin.name;
  }
  
  // Fallback for backward compatibility
  const labels: Record<string, string> = {
    'arxiv': 'arXiv',
    'semanticscholar': 'Semantic Scholar',
    'doi': 'DOI',
    'acm': 'ACM Digital Library',
    'openreview': 'OpenReview'
  };
  
  return labels[sourceType] || sourceType.charAt(0).toUpperCase() + sourceType.slice(1);
}

/**
 * Get canonical URL for a paper using the plugin if available
 * 
 * @param {string} sourceType - Source type
 * @param {string} id - Source ID
 * @returns {string} Canonical URL
 */
export function getCanonicalUrl(sourceType: string, id: string): string {
  // First check if a plugin is available for this source
  const plugin = pluginRegistry.get(sourceType);
  if (plugin) {
    // If the plugin has any URL patterns, try to construct a URL
    if (plugin.urlPatterns && plugin.urlPatterns.length > 0) {
      const pattern = plugin.urlPatterns[0].toString();
      // Extract the domain and path pattern
      const match = pattern.match(/([^/]+)(\/[^)]+)/);
      if (match) {
        const domain = match[1].replace(/\\\./, '.');
        const path = match[2]
          .replace(/\\\//g, '/')
          .replace(/\([^)]+\)/, id);
        return `https://${domain}${path}`;
      }
    }
  }
  
  // Fallback for backward compatibility
  switch (sourceType) {
    case 'arxiv':
      return `https://arxiv.org/abs/${id}`;
    case 'semanticscholar':
      return `https://www.semanticscholar.org/paper/${id}`;
    case 'doi':
      return `https://doi.org/${id}`;
    case 'acm':
      return `https://dl.acm.org/doi/${id}`;
    case 'openreview':
      return `https://openreview.net/forum?id=${id}`;
    default:
      return id.startsWith('10.') ? `https://doi.org/${id}` : "";
  }
}
