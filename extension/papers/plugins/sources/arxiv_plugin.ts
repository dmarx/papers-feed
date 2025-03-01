// extension/papers/plugins/sources/arxiv_plugin.ts

import { SourcePlugin } from '../source_plugin';
import { UnifiedPaperData } from '../../types';
import { loguru } from '../../../utils/logger';
import { parseXML } from '../../../utils/worker_safe_parser';

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
  
  async extractMetadata(document: Document, url: string): Promise<Partial<UnifiedPaperData>> {
    logger.info(`Extracting metadata from ${url}`);
    
    try {
      // Extract from page metadata
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
      
      // Extract authors
      let authors = '';
      const authorElements = document.querySelectorAll('.authors a');
      if (authorElements.length > 0) {
        authors = Array.from(authorElements)
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join(', ');
      }
      
      // Extract abstract
      let abstract = document.querySelector('.abstract')?.textContent?.trim();
      if (abstract?.startsWith('Abstract:')) {
        abstract = abstract.substring(9).trim();
      }
      
      // Extract categories
      const categories: string[] = [];
      const categoryElements = document.querySelectorAll('.subjects .tag');
      categoryElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text) categories.push(text);
      });
      
      return {
        title: title || '',
        authors: authors || '',
        abstract: abstract || '',
        arxiv_tags: categories
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
        arxiv_tags: categories,
        published_date: published
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
import { pluginRegistry } from '../registry';
pluginRegistry.register(arxivPlugin);
