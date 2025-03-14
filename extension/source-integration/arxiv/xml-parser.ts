// source-integration/arxiv/xml-parser.ts
// ArXiv API XML response parser - simplified for use with metadata transformer

import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('arxiv-xml-parser');

interface ArXivParsedData {
  title: string;
  summary: string;
  authors: string[];
  published_date: string;
  arxiv_tags: string[];
}

/**
 * Parse ArXiv API XML response into a structured object
 */
export async function parseXMLText(xmlText: string): Promise<ArXivParsedData | null> {
  logger.debug('Parsing ArXiv XML response');
  
  try {
    // Parse XML to DOM
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Check for parse errors
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML parsing error: ' + parseError.textContent);
    }
    
    // Get entry element
    const entry = xmlDoc.querySelector('entry');
    if (!entry) {
      throw new Error('No entry element found in XML');
    }
    
    // Extract basic fields
    const title = entry.querySelector('title')?.textContent?.trim() || '';
    const summary = entry.querySelector('summary')?.textContent?.trim() || '';
    const published = entry.querySelector('published')?.textContent?.trim() || '';
    
    // Extract authors
    const authors = Array.from(entry.querySelectorAll('author name'))
      .map(name => name.textContent?.trim() || '');
    
    // Extract categories/tags
    const categories = new Set<string>();
    
    // Primary category
    const primaryCategory = entry.querySelector('arxiv\\:primary_category, primary_category');
    if (primaryCategory && primaryCategory.hasAttribute('term')) {
      categories.add(primaryCategory.getAttribute('term') || '');
    }
    
    // Other categories
    const categoryElements = entry.querySelectorAll('category');
    categoryElements.forEach(cat => {
      if (cat.hasAttribute('term')) {
        categories.add(cat.getAttribute('term') || '');
      }
    });
    
    const result: ArXivParsedData = {
      title,
      summary,
      authors,
      published_date: published,
      arxiv_tags: Array.from(categories)
    };
    
    logger.debug('XML parsing completed successfully');
    return result;
  } catch (error) {
    logger.error('Error parsing ArXiv XML', error);
    return null;
  }
}
