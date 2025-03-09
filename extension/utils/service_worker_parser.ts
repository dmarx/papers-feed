// extension/utils/service_worker_parser.ts
// A DOM parser that works in service worker contexts

import { loguru } from './logger';

const logger = loguru.getLogger('ServiceWorkerParser');

/**
 * Create a simplified document-like object from HTML string for plugins to use
 * This is a workaround for service workers that don't have access to the DOM
 * 
 * @param htmlString The HTML string to parse
 * @returns A document-like object with simplified query methods
 */
export function createServiceWorkerDOM(htmlString: string): any {
  const dom = {
    _html: htmlString,
    
    // Simplified querySelector that uses regex
    querySelector(selector: string): any {
      try {
        // Very basic selector support - optimize for common cases
        
        // Handle ID selectors
        if (selector.startsWith('#')) {
          const idName = selector.substring(1);
          const match = new RegExp(`id=["']${idName}["'][^>]*>(.*?)<`, 'is').exec(htmlString);
          if (match) {
            return {
              textContent: match[1].replace(/<[^>]*>/g, ''),
              getAttribute: (attr: string) => {
                const attrMatch = new RegExp(`id=["']${idName}["'][^>]*${attr}=["']([^"']*)["']`, 'i').exec(htmlString);
                return attrMatch ? attrMatch[1] : null;
              }
            };
          }
        }
        
        // Handle class selectors
        if (selector.startsWith('.')) {
          const className = selector.substring(1);
          const match = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*>(.*?)<`, 'is').exec(htmlString);
          if (match) {
            return {
              textContent: match[1].replace(/<[^>]*>/g, ''),
              getAttribute: (attr: string) => {
                const attrMatch = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*${attr}=["']([^"']*)["']`, 'i').exec(htmlString);
                return attrMatch ? attrMatch[1] : null;
              }
            };
          }
        }
        
        // Handle meta tags (common in paper metadata)
        if (selector.includes('meta[')) {
          const nameMatch = /meta\[name=["']([^"']*)["']\]/.exec(selector);
          if (nameMatch) {
            const metaName = nameMatch[1];
            const match = new RegExp(`<meta[^>]*name=["']${metaName}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i').exec(htmlString);
            if (match) {
              return {
                content: match[1]
              };
            }
          }
          
          const propertyMatch = /meta\[property=["']([^"']*)["']\]/.exec(selector);
          if (propertyMatch) {
            const propName = propertyMatch[1];
            const match = new RegExp(`<meta[^>]*property=["']${propName}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'i').exec(htmlString);
            if (match) {
              return {
                content: match[1]
              };
            }
          }
        }
        
        // Handle tag selectors
        const tagMatch = /^([a-zA-Z0-9]+)/.exec(selector);
        if (tagMatch) {
          const tagName = tagMatch[1].toLowerCase();
          const match = new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, 'is').exec(htmlString);
          if (match) {
            return {
              textContent: match[1].replace(/<[^>]*>/g, ''),
              getAttribute: (attr: string) => {
                const attrMatch = new RegExp(`<${tagName}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'i').exec(htmlString);
                return attrMatch ? attrMatch[1] : null;
              }
            };
          }
        }
        
        // Default to null if not found
        return null;
      } catch (error) {
        logger.error(`Error in service worker DOM querySelector: ${error}`);
        return null;
      }
    },
    
    // Simplified querySelectorAll that uses regex
    querySelectorAll(selector: string): any[] {
      try {
        const results = [];
        
        // Handle class selectors
        if (selector.startsWith('.')) {
          const className = selector.substring(1);
          const regex = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*>(.*?)<`, 'gis');
          let match;
          while ((match = regex.exec(htmlString)) !== null) {
            results.push({
              textContent: match[1].replace(/<[^>]*>/g, ''),
              getAttribute: (attr: string) => {
                const attrMatch = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*${attr}=["']([^"']*)["']`, 'i').exec(match[0]);
                return attrMatch ? attrMatch[1] : null;
              }
            });
          }
          return results;
        }
        
        // Handle meta tag selectors
        if (selector.includes('meta[')) {
          const nameMatch = /meta\[name=["']([^"']*)["']\]/.exec(selector);
          if (nameMatch) {
            const metaName = nameMatch[1];
            const regex = new RegExp(`<meta[^>]*name=["']${metaName}["'][^>]*content=["']([^"']*)["'][^>]*>`, 'gi');
            let match;
            while ((match = regex.exec(htmlString)) !== null) {
              results.push({
                content: match[1]
              });
            }
            return results;
          }
        }
        
        // Handle tag selectors
        const tagMatch = /^([a-zA-Z0-9]+)/.exec(selector);
        if (tagMatch) {
          const tagName = tagMatch[1].toLowerCase();
          const regex = new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, 'gis');
          let match;
          while ((match = regex.exec(htmlString)) !== null) {
            results.push({
              textContent: match[1].replace(/<[^>]*>/g, ''),
              innerHTML: match[1],
              getAttribute: (attr: string) => {
                const attrMatch = new RegExp(`<${tagName}[^>]*${attr}=["']([^"']*)["'][^>]*>`, 'i').exec(match[0]);
                return attrMatch ? attrMatch[1] : null;
              }
            });
          }
          return results;
        }
        
        return results;
      } catch (error) {
        logger.error(`Error in service worker DOM querySelectorAll: ${error}`);
        return [];
      }
    },
    
    // For convenience
    getElementById(id: string): any {
      return this.querySelector(`#${id}`);
    },
    
    getElementsByClassName(className: string): any[] {
      return this.querySelectorAll(`.${className}`);
    },
    
    getElementsByTagName(tagName: string): any[] {
      return this.querySelectorAll(tagName);
    }
  };
  
  return dom;
}

/**
 * Extract common metadata for papers from HTML
 * This is specialized for academic paper pages
 * 
 * @param htmlString HTML source of the page
 * @returns Paper metadata object
 */
export function extractPaperMetadata(htmlString: string): Record<string, any> {
  const dom = createServiceWorkerDOM(htmlString);
  const metadata: Record<string, any> = {};
  
  try {
    // Helper to get meta content
    const getMetaContent = (name: string): string | undefined => {
      const element = dom.querySelector(`meta[name="${name}"]`) || 
                     dom.querySelector(`meta[property="${name}"]`);
      return element ? element.content : undefined;
    };
    
    // Extract common paper metadata
    metadata.title = getMetaContent('citation_title') || 
                    getMetaContent('og:title') || 
                    dom.querySelector('h1')?.textContent;
    
    metadata.authors = getMetaContent('citation_author') || 
                      getMetaContent('citation_authors') || 
                      getMetaContent('author');
    
    metadata.abstract = getMetaContent('description') || 
                       getMetaContent('og:description') || 
                       getMetaContent('citation_abstract');
    
    metadata.doi = getMetaContent('citation_doi');
    
    metadata.published_date = getMetaContent('citation_publication_date') ||
                             getMetaContent('citation_date');
    
    metadata.url = getMetaContent('og:url');
  } catch (error) {
    logger.error(`Error extracting paper metadata: ${error}`);
  }
  
  return metadata;
}

/**
 * A simple XML parser that works in service worker context
 * Replicates some of the DOM API for XML files
 */
export function parseXMLInServiceWorker(xmlText: string) {
  return {
    getTagContent(tag: string, content?: string): string {
      const searchText = content || xmlText;
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
      const match = searchText.match(regex);
      return match ? match[1].trim() : '';
    },
    
    getAll(tag: string): string[] {
      const result: string[] = [];
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 'gs');
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        result.push(match[1].trim());
      }
      return result;
    },
    
    getAttribute(tag: string, attr: string): string[] {
      const result: string[] = [];
      const regex = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["']`, 'g');
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        result.push(match[1]);
      }
      return result;
    }
  };
}
