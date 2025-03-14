// utils/metadata-transformer.ts
// Generic metadata transformation utilities

import { PaperMetadata } from '../papers/types';
import { loguru } from './logger';

const logger = loguru.getLogger('metadata-transformer');

/**
 * Interface for source-specific metadata mapping
 */
export interface MetadataMapping {
  // Maps source-specific fields to standard metadata
  titleField: string | string[];
  authorsField: string | string[];
  abstractField: string | string[];
  dateField: string | string[];
  tagsField: string | string[];
  
  // Optional custom extraction functions
  extractAuthors?: (data: any) => string;
  extractTags?: (data: any) => string[];
  extractDate?: (data: any) => string;
}

/**
 * Transform source-specific API response to standard metadata
 */
export function transformMetadata(
  sourceId: string,
  paperId: string,
  apiData: any,
  mapping: MetadataMapping,
  sourceUrl: string
): PaperMetadata {
  // Extract fields using provided mapping
  const getField = (data: any, fieldPath: string | string[]): any => {
    if (Array.isArray(fieldPath)) {
      // Try multiple possible field paths
      for (const path of fieldPath) {
        const value = getField(data, path);
        if (value !== undefined && value !== null && value !== '') {
          return value;
        }
      }
      return '';
    }
    
    // Handle nested paths like "document.title"
    const parts = fieldPath.split('.');
    let value = data;
    
    for (const part of parts) {
      if (value === undefined || value === null) return '';
      value = value[part];
    }
    
    return value !== undefined && value !== null ? value : '';
  };
  
  // Extract title
  const title = getField(apiData, mapping.titleField);
  
  // Extract authors - either use custom function or default extraction
  const authors = mapping.extractAuthors 
    ? mapping.extractAuthors(apiData)
    : Array.isArray(getField(apiData, mapping.authorsField))
      ? getField(apiData, mapping.authorsField).join(', ')
      : getField(apiData, mapping.authorsField);
  
  // Extract abstract
  const abstract = getField(apiData, mapping.abstractField);
  
  // Extract published date
  const publishedDate = mapping.extractDate
    ? mapping.extractDate(apiData)
    : getField(apiData, mapping.dateField);
  
  // Extract tags
  const tags = mapping.extractTags
    ? mapping.extractTags(apiData)
    : Array.isArray(getField(apiData, mapping.tagsField))
      ? getField(apiData, mapping.tagsField)
      : [];
  
  const metadata: PaperMetadata = {
    sourceId,
    paperId,
    url: sourceUrl,
    title,
    authors,
    abstract,
    timestamp: new Date().toISOString(),
    rating: 'novote',
    publishedDate,
    tags
  };
  
  logger.debug('Transformed metadata', { sourceId, paperId });
  return metadata;
}
