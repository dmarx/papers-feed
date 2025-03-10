// utils/metadata_sanitizer.ts

/**
 * Sanitizes metadata fields by removing newlines, excess whitespace, etc.
 * @param data Paper metadata object
 * @returns Sanitized metadata object
 */
export function sanitizeMetadata<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  
  // Fields that should be sanitized
  const textFields = ['title', 'authors', 'abstract', 'doi'];
  
  for (const field of textFields) {
    if (typeof sanitized[field] === 'string') {
      // Remove newlines and normalize whitespace
      sanitized[field] = sanitized[field]
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  
  // Handle nested fields if needed
  if (sanitized.source_specific_metadata) {
    for (const [key, value] of Object.entries(sanitized.source_specific_metadata)) {
      if (typeof value === 'string') {
        sanitized.source_specific_metadata[key] = value
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
  }
  
  return sanitized;
}
