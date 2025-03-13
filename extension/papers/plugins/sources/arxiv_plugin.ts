// extension/papers/plugins/sources/arxiv_plugin.ts
// ArXiv plugin implementation with clean context separation

import { pluginFactory } from '../plugin_factory';
import { parseXML } from '../../../utils/worker_safe_parser';
import { loguru } from '../../../utils/logger';

const logger = loguru.getLogger('ArxivPlugin');

/**
 * Create the arXiv plugin for the service worker context
 */
export const arxivPlugin = pluginFactory.createServiceWorkerPlugin({
  id: 'arxiv',
  name: 'arXiv',
  description: 'Support for arXiv papers',
  version: '1.0.0',
  color: '#B31B1B',
  icon: '📝',
  
  // URL patterns for detection
  urlPatterns: [
    /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
    /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
    /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
  ],
  
  // Extract ID from URL
  detectSourceId: (url: string): string | null => {
    for (const pattern of [
      /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
      /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
      /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
    ]) {
      const match = url.match(pattern);
      if (match) {
        return match[1] + (match[2] || '');
      }
    }
    return null;
  },
  
  // Format ID consistently
  formatId: (id: string): string => `arxiv.${id}`,
  
  // Fetch metadata from API
  fetchApiData: async (id: string) => {
    logger.info(`Fetching arXiv API data for ID: ${id}`);
    
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
      
      // Use fetch for service worker compatibility
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const text = await response.text();
      
      // Use our service-worker safe XML parser
      const parser = parseXML(text);
      
      // Extract entry data
      const entryContent = parser.getEntry();
      
      // Extract title
      const title = parser.getTagContent('title');
      
      // Extract authors
      const authorsList = parser.getAuthor();
      const authors = authorsList.join(', ');
      
      // Extract summary
      const abstract = parser.getTagContent('summary');
      
      // Extract categories
      const categories = parser.getCategories();
      
      // Extract published date
      const published = parser.getPublishedDate();
      
      // Format primary ID
      const primary_id = `arxiv.${id}`;
      
      // Return structured metadata
      return {
        primary_id,
        source: 'arxiv',
        sourceId: id,
        url: `https://arxiv.org/abs/${id}`,
        title,
        authors,
        abstract,
        timestamp: new Date().toISOString(),
        source_specific_metadata: {
          arxiv_tags: categories,
          published_date: published
        }
      };
    } catch (error) {
      logger.error(`Error fetching arXiv API data: ${error}`);
      return {};
    }
  }
});

// Export the plugin for direct import
export default arxivPlugin;
