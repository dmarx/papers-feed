// utils/metadata_sanitizer.ts

/**
 * Sanitizes metadata fields by removing newlines, excess whitespace, etc.
 * @param data Paper metadata object
 * @returns Sanitized metadata object
 */
export function sanitizeMetadata<T extends Record<string, any>>(data: T): T {
  const sanitized = { ...data };
  
  // Fields that should be sanitized
  const textFields = ['title', 'abstract'];
  
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
    // Create a new object to hold the sanitized nested data
    const sanitizedNestedData: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(sanitized.source_specific_metadata)) {
      if (typeof value === 'string') {
        sanitizedNestedData[key] = value
          .replace(/\n/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
      } else {
        sanitizedNestedData[key] = value;
      }
    }
    
    // Replace the entire nested object
    sanitized.source_specific_metadata = sanitizedNestedData;
  }
  
  return sanitized as T;
}
