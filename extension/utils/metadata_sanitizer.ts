/**
 * utils/metadata_sanitizer.ts
 * 
 * Sanitizes metadata fields by removing newlines, excess whitespace, etc.
 * @param data Paper metadata object
 * @returns Sanitized metadata object
 */
export function sanitizeMetadata<T extends Record<string, any>>(data: T): T {
  // Create a new object to avoid modifying the original
  const sanitized = { ...data } as Record<string, any>;
  
  // Fields that should be sanitized
  const textFields = ['title', 'authors', 'abstract', 'doi'];
  
  for (const field of textFields) {
    if (typeof sanitized[field] === 'string') {
      // Remove newlines and normalize whitespace
      sanitized[field] = (sanitized[field] as string)
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  
  // Handle nested fields if needed
  if (sanitized.source_specific_metadata && typeof sanitized.source_specific_metadata === 'object') {
    const nestedData = { ...sanitized.source_specific_metadata } as Record<string, any>;
    
    for (const [key, value] of Object.entries(nestedData)) {
      if (typeof value === 'string') {
        nestedData[key] = value
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      }
    }
    
    sanitized.source_specific_metadata = nestedData;
  }
  
  return sanitized as T;
}
