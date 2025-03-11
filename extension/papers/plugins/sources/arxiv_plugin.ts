// extension/papers/plugins/sources/arxiv_plugin.ts
// ArXiv plugin implementation using the new context-separated architecture

import { sourcePluginFactory } from '../source_factory';
import { UnifiedPaperData } from '../../../types/common';
import { loguru } from '../../../utils/logger';
import { parseXML } from '../../../utils/worker_safe_parser';

const logger = loguru.getLogger('ArXivPlugin');

/**
 * Create the arXiv plugin using the factory with proper context separation
 */
export const arxivPlugin = sourcePluginFactory.createPlugin({
  id: 'arxiv',
  name: 'arXiv',
  description: 'Support for arXiv papers',
  version: '1.0.0',
  color: '#B31B1B',
  icon: '📝',
  
  // URL patterns for detecting arXiv papers (used in both contexts)
  urlPatterns: [
    /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
    /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
    /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
  ],
  
  // Service worker specific functionality
  serviceWorker: {
    // Extract ID from URL (service worker context)
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
    
    // API-based metadata fetching (service worker context)
    fetchApiData: async (id: string): Promise<Partial<UnifiedPaperData>> => {
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
    },
    
    // Custom metadata quality evaluation
    evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => {
      // Define required fields for different quality levels
      const essentialFields = ['title', 'primary_id', 'url'];
      const standardFields = [...essentialFields, 'authors'];
      const completeFields = [...standardFields, 'abstract', 'source_specific_metadata'];
      
      // Check which fields are missing
      const missingEssential = essentialFields.filter(field => 
        !paperData[field] || paperData[field] === '');
      
      const missingComplete = completeFields.filter(field => {
        if (field === 'source_specific_metadata') {
          return !paperData.source_specific_metadata || 
                !paperData.source_specific_metadata.arxiv_tags || 
                !Array.isArray(paperData.source_specific_metadata.arxiv_tags) || 
                paperData.source_specific_metadata.arxiv_tags.length === 0;
        }
        return !paperData[field] || paperData[field] === '';
      });
      
      // Calculate quality level
      let quality: 'minimal' | 'partial' | 'complete';
      
      if (missingEssential.length > 0) {
        quality = 'minimal';
      } else if (missingComplete.length > 0) {
        quality = 'partial';
      } else {
        quality = 'complete';
      }
      
      return {
        quality,
        missingFields: missingComplete,
        hasEssentialFields: missingEssential.length === 0
      };
    }
  },
  
  // Content script specific functionality
  contentScript: {
    // Path to the content script extractor module
    // This will be imported at build time
    extractorModulePath: './extractors/arxiv_extractor'
  }
});

// Export the plugin for direct import
export default arxivPlugin;
