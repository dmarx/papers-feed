// extension/papers/source_utils.js
// Minimal implementation of source utilities for multiple paper sources

/**
 * Format a source-specific ID into a universal primary ID format
 * 
 * @param {string} source - Source type (e.g. 'arxiv', 'doi')
 * @param {string} id - Original source-specific identifier
 * @returns {string} Formatted primary ID
 */
export function formatPrimaryId(source, id) {
  const sourcePrefix = {
    'arxiv': 'arxiv',
    'semanticscholar': 's2',
    'doi': 'doi',
    'acm': 'doi',  // ACM uses DOIs
    'openreview': 'openreview'
  }[source] || 'generic';
  
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
export function parseId(prefixedId) {
  // Split at the first dot
  const [prefix, ...idParts] = prefixedId.split('.');
  const id = idParts.join('.'); // Rejoin in case ID contains periods
  
  // Map prefix to source type
  const prefixToSource = {
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
 * Get a legacy-compatible ID (for backward compatibility)
 * 
 * @param {string} prefixedId - The primary ID in the format "{source_prefix}.{id}"
 * @returns {string} Legacy-compatible ID
 */
export function getLegacyId(prefixedId) {
  const { type, id } = parseId(prefixedId);
  
  // For arXiv, return just the ID (backward compatible)
  if (type === 'arxiv') {
    return id;
  }
  
  // For other sources, use the full prefixed ID to avoid collisions
  return prefixedId;
}

/**
 * Detect source and ID from a paper URL
 * 
 * @param {string} url - URL to check
 * @returns {Object|null} Source information or null if not detected
 */
export function detectSourceFromUrl(url) {
  // Define patterns for different sources
  const patterns = [
    { 
      type: 'arxiv', 
      regex: /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
      idExtractor: (match) => match[2]
    },
    { 
      type: 'semanticscholar', 
      regex: /semanticscholar\.org\/paper\/([a-f0-9]+)/,
      idExtractor: (match) => match[1]
    },
    {
      type: 'doi',
      regex: /doi\.org\/(10\.[0-9.]+\/[a-zA-Z0-9._\-\/:()[\]]+)/,
      idExtractor: (match) => match[1]
    },
    {
      type: 'acm',
      regex: /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[a-zA-Z0-9._\-\/:()[\]]+)/,
      idExtractor: (match) => match[1]
    }
  ];
  
  // Check each pattern
  for (const pattern of patterns) {
    const match = url.match(pattern.regex);
    if (match) {
      const id = pattern.idExtractor(match);
      return {
        type: pattern.type,
        id: id,
        primary_id: formatPrimaryId(pattern.type, id),
        url: url
      };
    }
  }
  
  return null;
}
