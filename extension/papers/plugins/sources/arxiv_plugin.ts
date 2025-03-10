// extension/papers/plugins/sources/arxiv_plugin.ts
// ArXiv plugin implementation using source factory

import { sourcePluginFactory } from '../source_factory';
import { UnifiedPaperData } from '../../types';
import { loguru } from '../../../utils/logger';
import { parseXML } from '../../../utils/worker_safe_parser';

const logger = loguru.getLogger('ArXivPlugin');

// Content script extractor function as a string
// This will be executed in the content script context
const extractorCode = `
  // Extract arXiv ID from URL
  const idMatch = url.match(/arxiv\\.org\\/(?:abs|pdf)\\/([0-9.]+)(v[0-9]+)?/);
  const arxivId = idMatch ? (idMatch[1] + (idMatch[2] || '')) : '';
  
  if (!arxivId) {
    return null;
  }
  
  // Create standardized ID
  const primary_id = \`arxiv.\${arxivId}\`;
  
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
    authors = Array.from(authorElements)
      .map(el => el.textContent?.trim())
      .filter(Boolean)
      .join(', ');
  }
  
  // Extract abstract
  let abstract = '';
  const abstractElement = document.querySelector('.abstract');
  if (abstractElement) {
    abstract = abstractElement.textContent?.replace('Abstract:', '').trim() || '';
  }
  
  // Extract categories
  const categories = [];
  const categoryElements = document.querySelectorAll('.subjects .tag');
  categoryElements.forEach(el => {
    const text = el.textContent?.trim();
    if (text) categories.push(text);
  });
  
  // Return structured metadata
  return {
    primary_id,
    source: 'arxiv',
    sourceId: arxivId,
    url,
    title,
    authors,
    abstract,
    source_specific_metadata: {
      arxiv_tags: categories
    },
    timestamp: new Date().toISOString()
  };
`;

// Create the arXiv plugin using the factory
export const arxivPlugin = sourcePluginFactory.createPlugin({
  id: 'arxiv',
  name: 'arXiv',
  description: 'Support for arXiv papers',
  version: '1.0.0',
  color: '#B31B1B',
  icon: '📝',
  
  // URL patterns for detecting arXiv papers
  urlPatterns: [
    /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
    /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
    /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
  ],
  
  // Extract ID from URL
  idExtractor: (url: string): string | null => {
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
  
  // Content script extraction code
  contentScriptExtractorCode: extractorCode,
  
  // API-based metadata fetching (service worker)
  apiDataFetcher: async (id: string): Promise<Partial<UnifiedPaperData>> => {
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
  
  // Custom ID formatting
  formatId: (id: string): string => `arxiv.${id}`,
  
  // Custom metadata quality evaluation
  evaluateMetadataQuality: (paperData: Partial<UnifiedPaperData>) => {
    // Define required fields for different quality levels
    const essentialFields = ['title', 'primary_id', 'url'];
    const standardFields = [...essentialFields, 'authors'];
    const completeFields = [...standardFields, 'abstract', 'source_specific_metadata'];
    
    // Check which fields are missing
    const missingEssential = essentialFields.filter(field => 
      !paperData[field] || paperData[field] === '');
    
    const missingStandard = standardFields.filter(field => 
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
});

// Export the plugin for direct import
export default arxivPlugin;
