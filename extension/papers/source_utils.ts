// extension/papers/source_utils.ts
// Utilities for supporting multiple paper sources while maintaining compatibility

/**
 * Source type definitions and patterns
 */
interface SourceTypeInfo {
  prefix: string;
  urlPatterns: RegExp[];
  idFormat?: RegExp;
}

/**
 * Result of source detection from URL
 */
export interface SourceInfo {
  type: string;
  id: string;
  primary_id: string;
  url: string;
}

/**
 * Source type definitions
 */
const SOURCE_TYPES: Record<string, SourceTypeInfo> = {
  'arxiv': {
    prefix: 'arxiv',
    urlPatterns: [
      /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
      /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/
    ],
    idFormat: /[0-9]{4}\.[0-9]{4,5}(v[0-9]+)?/
  },
  'semanticscholar': {
    prefix: 's2',
    urlPatterns: [
      /semanticscholar\.org\/paper\/([a-f0-9]+)/,
      /s2-research\.org\/papers\/([a-f0-9]+)/
    ],
    idFormat: /[a-f0-9]{40}/
  },
  'doi': {
    prefix: 'doi',
    urlPatterns: [
      /doi\.org\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    idFormat: /10\.[0-9.]+\/[a-zA-Z0-9._\-\/:()\[\]]+/
  },
  'acm': {
    prefix: 'doi',  // ACM uses DOIs
    urlPatterns: [
      /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    idFormat: /10\.[0-9.]+\/[a-zA-Z0-9._\-\/:()\[\]]+/
  },
  'openreview': {
    prefix: 'openreview',
    urlPatterns: [
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/
    ],
    idFormat: /[a-zA-Z0-9_\-]+/
  }
};

/**
 * Format a source-specific ID into a universal primary ID format
 * 
 * @param source - Source type (e.g. 'arxiv', 'doi')
 * @param id - Original source-specific identifier
 * @returns Formatted primary ID
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
 * @param prefixedId - The primary ID in the format "{source_prefix}.{id}"
 * @returns Object with source type and source ID
 */
export function parseId(prefixedId: string): { type: string; id: string } {
  // Split at the first dot
  const [prefix, ...idParts] = prefixedId.split('.');
  const id = idParts.join('.'); // Rejoin in case ID contains periods
  
  // Map prefix to source type
  const sourceType = Object.entries(SOURCE_TYPES).find(
    ([_, info]) => info.prefix === prefix
  )?.[0] || 'generic';
  
  // For DOIs, restore slashes
  const originalId = sourceType === 'doi' ? id.replace(/_/g, '/') : id;
  
  return { type: sourceType, id: originalId };
}

/**
 * Get a legacy-compatible ID (for backward compatibility)
 * 
 * @param primaryId - The primary ID (can be prefixed or legacy)
 * @returns Legacy-compatible ID
 */
export function getLegacyId(primaryId: string): string {
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
 * @param url - URL to detect source from
 * @returns Source information or null if not detected
 */
export function detectSourceFromUrl(url: string): SourceInfo | null {
  for (const [sourceType, sourceInfo] of Object.entries(SOURCE_TYPES)) {
    for (const pattern of sourceInfo.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        // The last capturing group should be the ID
        // Fix the error by correctly accessing the last match group
        const id = match[match.length - 1];
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
 * Checks if a string is in the new prefixed format
 * 
 * @param id - ID to check
 * @returns True if the ID is in the new format
 */
export function isNewFormat(id: string): boolean {
  // Get all valid prefixes
  const validPrefixes = Object.values(SOURCE_TYPES).map(
    info => `${info.prefix}.`
  );
  validPrefixes.push('generic.'); // Also add generic prefix
  
  // Check if it has any valid prefix
  return validPrefixes.some(prefix => id.startsWith(prefix));
}

/**
 * Gets a display label for a source type
 * 
 * @param sourceType - Source type
 * @returns Human-readable label
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
