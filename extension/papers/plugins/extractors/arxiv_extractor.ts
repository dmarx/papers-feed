// extension/papers/plugins/extractors/arxiv_extractor.ts
// ArXiv metadata extractor for content scripts

import { pluginFactory } from '../plugin_factory';
import { UnifiedPaperData } from '../../../types/common';

/**
 * Create the ArXiv content extractor
 */
const arxivExtractor = pluginFactory.createContentExtractor({
  pluginId: 'arxiv',
  
  extractMetadata: async (document: Document, url: string): Promise<Partial<UnifiedPaperData>> => {
    try {
      // Extract the arXiv ID from the URL
      const idMatch = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9.]+)(v[0-9]+)?/);
      const arxivId = idMatch ? (idMatch[1] + (idMatch[2] || '')) : '';
      
      if (!arxivId) {
        console.warn('Could not extract arXiv ID from URL');
        return {};
      }
      
      // Create standardized ID
      const primary_id = `arxiv.${arxivId}`;
      
      // Extract title
      let title = '';
      const titleElement = document.querySelector('.title');
      if (titleElement) {
        title = titleElement.textContent?.replace('Title:', '').trim() || '';
      }
      
      // Extract authors
      let authors = '';
      const authorElements = document.querySelectorAll('.authors a');
      if (authorElements.length > 0) {
        const authorNames = Array.from(authorElements)
          .map(el => el.textContent?.trim())
          .filter(Boolean);
        authors = authorNames.join(', ');
      }
      
      // Extract abstract
      let abstract = '';
      const abstractElement = document.querySelector('.abstract');
      if (abstractElement) {
        abstract = abstractElement.textContent?.replace('Abstract:', '').trim() || '';
      }
      
      // Extract categories
      const categories: string[] = [];
      const categoryElements = document.querySelectorAll('.subjects .tag');
      categoryElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text) categories.push(text);
      });
      
      // Extract publication date (if available)
      let publicationDate = '';
      const dateElement = document.querySelector('.dateline');
      if (dateElement) {
        const dateMatch = dateElement.textContent?.match(/\(Submitted on ([^)]+)\)/);
        if (dateMatch) {
          publicationDate = dateMatch[1];
        }
      }
      
      // Return structured metadata
      return {
        primary_id,
        source: 'arxiv',
        sourceId: arxivId,
        url,
        title,
        authors,
        abstract,
        timestamp: new Date().toISOString(),
        source_specific_metadata: {
          arxiv_tags: categories,
          published_date: publicationDate
        }
      };
    } catch (error) {
      console.error('Error extracting arXiv metadata:', error);
      return {
        source: 'arxiv',
        url
      };
    }
  }
});

// Default export for module system
export default arxivExtractor;
