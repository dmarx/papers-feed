// extension/papers/plugins/sources/arxiv_plugin.ts

import { SourcePlugin } from '../source_plugin';
import { UnifiedPaperData } from '../../types';
import { loguru } from '../../../utils/logger';
import { parseXML } from '../../../utils/worker_safe_parser';
import { pluginRegistry } from '../registry';
import { createServiceWorkerDOM } from '../../../utils/service_worker_parser';

const logger = loguru.getLogger('ArXivPlugin');

export const arxivPlugin: SourcePlugin = {
  id: 'arxiv',
  name: 'arXiv',
  description: 'Support for arXiv papers',
  version: '1.0.0',
  
  urlPatterns: [
    /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
    /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
    /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
  ],
  
  extractId(url: string): string | null {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        // Include version if available
        return match[1] + (match[2] || '');
      }
    }
    return null;
  },
  
  async extractMetadata(document: any, url: string): Promise<Partial<UnifiedPaperData>> {
    logger.info(`Extracting metadata from ${url}`);
    
    try {
      // Check if we're in a service worker context (document is not a real DOM)
      const isServiceWorker = typeof document !== 'object' || 
                             !document.querySelector || 
                             typeof document.querySelector !== 'function';
      
      if (isServiceWorker) {
        // Use our service worker DOM utility instead of bespoke string processing
        logger.info('Service worker context detected, using service worker DOM parser');
        const htmlContent = typeof document === 'string' 
          ? document 
          : (document.innerHTML || document.outerHTML || '');
        
        // Create a lightweight DOM-like object we can query
        const swDOM = createServiceWorkerDOM(htmlContent);
        
        // Now we can use querySelector-like methods
        let title = swDOM.querySelector('.title')?.textContent?.trim();
        if (title?.startsWith('Title:')) {
          title = title.substring(6).trim();
        }
        
        // Extract authors - properly type the elements from service worker DOM
        let authors = '';
        const authorElements = swDOM.querySelectorAll('.authors a');
        if (authorElements.length > 0) {
          // Convert to string array with proper typing
          const authorTexts: string[] = [];
          authorElements.forEach((el: any) => {
            const text = el.textContent?.trim();
            if (text) authorTexts.push(text);
          });
          authors = authorTexts.join(', ');
        }
        
        // Extract abstract
        let abstract = swDOM.querySelector('.abstract')?.textContent?.trim();
        if (abstract?.startsWith('Abstract:')) {
          abstract = abstract.substring(9).trim();
        }
        
        // Extract categories
        const categories: string[] = [];
        const categoryElements = swDOM.querySelectorAll('.subjects .tag');
        categoryElements.forEach((el: any) => {
          const text = el.textContent?.trim();
          if (text) categories.push(text);
        });
        
        return {
          title: title || '',
          authors: authors || '',
          abstract: abstract || '',
          source_specific_metadata: {
            arxiv_tags: categories,
            published_date: '' // Will be filled by API if available
          }
        };
      }
      
      // Browser context - use real DOM methods
      const getMetaContent = (selector: string): string | undefined => {
        const element = document.querySelector(selector);
        return element && 'content' in element ? 
          (element as HTMLMetaElement).content : undefined;
      };
      
      // Try to extract title and authors
      let title = document.querySelector('.title')?.textContent?.trim();
      if (title?.startsWith('Title:')) {
        title = title.substring(6).trim();
      }
      
      // Extract authors using forEach instead of map to avoid type issues
      let authors = '';
      const authorElements = document.querySelectorAll('.authors a');
      if (authorElements.length > 0) {
        const authorTexts: string[] = [];
        authorElements.forEach((el: Element) => {
          const text = el.textContent?.trim();
          if (text) authorTexts.push(text);
        });
        authors = authorTexts.join(', ');
      }
      
      // Extract abstract
      let abstract = document.querySelector('.abstract')?.textContent?.trim();
      if (abstract?.startsWith('Abstract:')) {
        abstract = abstract.substring(9).trim();
      }
      
      // Extract categories
      const categories: string[] = [];
      const categoryElements = document.querySelectorAll('.subjects .tag');
      categoryElements.forEach((el: Element) => {
        const text = el.textContent?.trim();
        if (text) categories.push(text);
      });
      
      return {
        title: title || '',
        authors: authors || '',
        abstract: abstract || '',
        source_specific_metadata: {
          arxiv_tags: categories,
          published_date: '' // Will be filled by API if available
        }
      };
    } catch (error) {
      logger.error('Error extracting metadata from arXiv page', error);
      return {};
    }
  },
  
  hasApi: true,
  
  async fetchApiData(id: string): Promise<Partial<UnifiedPaperData>> {
    logger.info(`Fetching API data for arXiv:${id}`);
    
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
      
      // Use self.fetch (available in service worker) instead of window.fetch
      const response = await self.fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Use the worker-safe XML parser
      const parser = parseXML(text);
      
      // Extract entry data
      const entryContent = parser.getEntry();
      
      // Extract title
      const title = parser.getTagContent('title');
      
      // Extract authors using the author parser
      const authorsList = parser.getAuthor();
      const authors = authorsList.join(', ');
      
      // Extract summary
      const abstract = parser.getTagContent('summary');
      
      // Extract categories using the categories parser
      const categories = parser.getCategories();
      
      // Extract published date
      const published = parser.getPublishedDate();
      
      return {
        title,
        authors,
        abstract,
        source_specific_metadata: {
          arxiv_tags: categories,
          published_date: published
        }
      };
    } catch (error) {
      logger.error('Error fetching arXiv API data', error);
      return {};
    }
  },
  
  color: '#B31B1B',
  icon: '📝',
  
  formatId(id: string): string {
    return `arxiv.${id}`;
  }
};

// Register the plugin
pluginRegistry.register(arxivPlugin);

// Export the plugin for direct import by the loader
export default arxivPlugin;
