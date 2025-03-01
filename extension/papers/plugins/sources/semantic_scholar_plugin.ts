// extension/papers/plugins/sources/semantic_scholar_plugin.ts

import { SourcePlugin } from '../source_plugin';
import { UnifiedPaperData } from '../../types';
import { loguru } from '../../../utils/logger';

const logger = loguru.getLogger('SemanticScholarPlugin');

export const semanticScholarPlugin: SourcePlugin = {
  id: 'semanticscholar',
  name: 'Semantic Scholar',
  description: 'Support for Semantic Scholar papers',
  version: '1.0.0',
  
  urlPatterns: [
    /semanticscholar\.org\/paper\/([a-f0-9]+)/,
    /s2-research\.org\/papers\/([a-f0-9]+)/
  ],
  
  extractId(url: string): string | null {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  },
  
  async extractMetadata(document: Document, url: string): Promise<Partial<UnifiedPaperData>> {
    logger.info(`Extracting metadata from ${url}`);
    
    try {
      const getMetaContent = (selector: string): string | undefined => {
        const element = document.querySelector(selector);
        return element && 'content' in element ? 
          (element as HTMLMetaElement).content : undefined;
      };
      
      // Extract from meta tags
      const title = getMetaContent('meta[name="citation_title"]') || 
                   getMetaContent('meta[property="og:title"]') ||
                   document.title;
      
      // Try to get authors - S2 has specific author elements
      let authors = '';
      const authorElements = document.querySelectorAll('[data-test-id="author-list"] a');
      if (authorElements.length > 0) {
        authors = Array.from(authorElements)
          .map(el => el.textContent?.trim())
          .filter(Boolean)
          .join(', ');
      } else {
        authors = getMetaContent('meta[name="citation_author"]') || '';
      }
      
      // Get abstract
      let abstract = getMetaContent('meta[name="description"]') || 
                    getMetaContent('meta[property="og:description"]');
      
      if (!abstract) {
        const abstractEl = document.querySelector('[data-test-id="abstract-text"]') ||
                          document.querySelector('.abstract');
        abstract = abstractEl?.textContent?.trim();
      }
      
      // Extract citation count if available
      let citations: number | undefined;
      const citationEl = document.querySelector('[data-test-id="citation-count"]');
      if (citationEl) {
        const citText = citationEl.textContent;
        if (citText) {
          const match = citText.match(/(\d+)/);
          if (match) {
            citations = parseInt(match[1], 10);
          }
        }
      }
      
      // Extract DOI if available
      const doi = getMetaContent('meta[name="citation_doi"]');
      
      return {
        title: title || '',
        authors: authors || '',
        abstract: abstract || '',
        source_specific_metadata: {
          citations: citations,
          // Any other S2-specific metadata
        },
        identifiers: doi ? { doi } : undefined
      };
    } catch (error) {
      logger.error('Error extracting metadata from Semantic Scholar page', error);
      return {};
    }
  },
  
  hasApi: true,
  
  async fetchApiData(id: string): Promise<Partial<UnifiedPaperData>> {
    logger.info(`Fetching API data for S2:${id}`);
    
    try {
      const apiUrl = `https://api.semanticscholar.org/v1/paper/${id}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Extract fields from API response
      const authors = data.authors ? 
        data.authors.map((author: any) => author.name).join(', ') : '';
      
      // Create the paper data object
      const paperData: Partial<UnifiedPaperData> = {
        title: data.title || '',
        authors,
        abstract: data.abstract || '',
        source_specific_metadata: {
          citations: data.citations,
          // Any other S2-specific metadata
        },
        published_date: data.year ? `${data.year}` : undefined,
        identifiers: {}
      };
      
      // Add identifiers
      if (data.doi) {
        paperData.identifiers!.doi = data.doi;
      }
      
      if (data.arxivId) {
        paperData.identifiers!.arxiv = data.arxivId;
      }
      
      return paperData;
    } catch (error) {
      logger.error('Error fetching Semantic Scholar API data', error);
      return {};
    }
  },
  
  color: '#2e7d32',
  icon: '📊',
  
  formatId(id: string): string {
    return `s2.${id}`;
  }
};

// Register the plugin
import { pluginRegistry } from '../registry';
pluginRegistry.register(semanticScholarPlugin);
