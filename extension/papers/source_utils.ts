// extension/papers/source_utils.ts
// Utilities for supporting multiple paper sources with new format only

import { SourceInfo } from './types';

// Source type definitions
interface SourceTypeDefinition {
  prefix: string;
  url_patterns: RegExp[];
  id_extractors: ((match: RegExpMatchArray) => string)[];
  id_format?: RegExp;
}

const SOURCE_TYPES: Record<string, SourceTypeDefinition> = {
  'arxiv': {
    prefix: 'arxiv',
    url_patterns: [
      /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
      /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/
    ],
    id_extractors: [
      (match) => match[2],
      (match) => match[1] + (match[2] || '')
    ],
    id_format: /[0-9]{4}\.[0-9]{4,5}(v[0-9]+)?/
  },
  'semanticscholar': {
    prefix: 's2',
    url_patterns: [
      /semanticscholar\.org\/paper\/([a-f0-9]+)/,
      /s2-research\.org\/papers\/([a-f0-9]+)/
    ],
    id_extractors: [
      (match) => match[1],
      (match) => match[1]
    ],
    id_format: /[a-f0-9]{40}/
  },
  'doi': {
    prefix: 'doi',
    url_patterns: [
      /doi\.org\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    id_extractors: [
      (match) => match[1]
    ],
    id_format: /10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+/
  },
  'acm': {
    prefix: 'doi',  // ACM uses DOIs
    url_patterns: [
      /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    id_extractors: [
      (match) => match[1]
    ],
    id_format: /10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+/
  },
  'openreview': {
    prefix: 'openreview',
    url_patterns: [
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/,
      // Add support for PDF links on OpenReview
      /openreview\.net\/pdf\?id=([a-zA-Z0-9_\-]+)/
    ],
    id_extractors: [
      (match) => match[1],
      (match) => match[1]
    ],
    id_format: /[a-zA-Z0-9_\-]+/
  }
};

/**
 * Format a source-specific ID into a universal primary ID format
 * 
 * @param {string} source - Source type (e.g. 'arxiv', 'doi')
 * @param {string} id - Original source-specific identifier
 * @returns {string} Formatted primary ID
 */
export function formatPrimaryId(source: string, id: string): string {
  // Use source-specific prefixes
  const sourcePrefix = SOURCE_TYPES[source]?.prefix || 'generic';
  
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
  
  // Map prefix to source type
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
 * @deprecated Use primary_id directly
 * Legacy function maintained only for migration support
 */
export function getLegacyId(primaryId: string): string {
  console.warn('getLegacyId is deprecated. Use primary_id directly.');
  // If there's no prefix, assume it's already a legacy ID
  if (!primaryId.includes('.')) {
    return primaryId;
  }
  
  const { type, id } = parseId(primaryId);
  
  // For arXiv, return just the ID (backward compatible)
  if (type === 'arxiv') {
    return id;
  }
  
  // For other sources, use the full prefixed ID to avoid collisions with arXiv IDs
  return primaryId;
}

/**
 * Detect paper source and ID from URL
 * 
 * @param {string} url - URL to detect source from
 * @returns {SourceInfo|null} Source information or null if not detected
 */
export function detectSourceFromUrl(url: string): SourceInfo | null {
  // Check each source type
  for (const [sourceType, definition] of Object.entries(SOURCE_TYPES)) {
    for (let i = 0; i < definition.url_patterns.length; i++) {
      const match = url.match(definition.url_patterns[i]);
      if (match) {
        const id = definition.id_extractors[i](match);
        return {
          type: sourceType,
          id: id,
          primary_id: formatPrimaryId(sourceType, id),
          url: url
        };
      }
    }
  }
  
  return null;
}

/**
 * Checks if a string is in the required prefixed format
 * 
 * @param {string} id - ID to check
 * @returns {boolean} True if the ID is in the correct format
 */
export function isNewFormat(id: string): boolean {
  // Check if it has a valid prefix
  const validPrefixes = Object.values(SOURCE_TYPES).map(def => `${def.prefix}.`);
  validPrefixes.push('generic.'); // Add generic prefix
  
  return validPrefixes.some(prefix => id.startsWith(prefix));
}

/**
 * Gets a display label for a source type
 * 
 * @param {string} sourceType - Source type
 * @returns {string} Human-readable label
 */
export function getSourceLabel(sourceType: string): string {
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
 * Validate if an ID matches the expected format for its source
 * 
 * @param {string} sourceType - Source type
 * @param {string} id - Source ID
 * @returns {boolean} Whether the ID is valid
 */
export function validateSourceId(sourceType: string, id: string): boolean {
  const definition = SOURCE_TYPES[sourceType];
  if (!definition || !definition.id_format) {
    return true; // If no format is defined, assume valid
  }
  
  return definition.id_format.test(id);
}

/**
 * Get canonical URL for a paper
 * 
 * @param {string} sourceType - Source type
 * @param {string} id - Source ID
 * @returns {string} Canonical URL
 */
export function getCanonicalUrl(sourceType: string, id: string): string {
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
