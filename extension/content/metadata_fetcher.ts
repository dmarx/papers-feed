// content/metadata_fetcher.ts - Fetch paper metadata from services

/**
 * Paper metadata interface
 */
export interface PaperMetadata {
  title?: string;
  authors?: string;
  abstract?: string;
  url?: string;
  source?: string;
  id?: string;
  primary_id?: string;
  [key: string]: any;
}

/**
 * Cache for paper metadata to avoid repeated API calls
 */
const metadataCache = new Map<string, PaperMetadata>();

/**
 * Fetch paper metadata from APIs or background service
 * @param {string} source Paper source type
 * @param {string} id Paper ID
 * @returns {Promise<PaperMetadata>} Paper metadata
 */
export async function fetchPaperMetadata(source: string, id: string): Promise<PaperMetadata> {
  // Create cache key
  const cacheKey = `${source}:${id}`;
  
  // Check cache first
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey)!;
  }
  
  try {
    // Try to get metadata from the extension's background script first
    const backgroundMetadata = await getMetadataFromBackground(source, id);
    
    if (backgroundMetadata) {
      // Cache the result
      metadataCache.set(cacheKey, backgroundMetadata);
      return backgroundMetadata;
    }

    // Fall back to directly fetching from APIs
    let metadata: PaperMetadata;
    
    switch (source) {
      case 'arxiv':
        metadata = await fetchArxivMetadata(id);
        break;
      case 'semanticscholar':
        metadata = await fetchSemanticScholarMetadata(id);
        break;
      case 'openreview':
        metadata = await fetchOpenReviewMetadata(id);
        break;
      default:
        // For other sources, use minimal data
        metadata = {
          title: `${source.toUpperCase()} Paper: ${id}`,
          id: id,
          source: source
        };
    }
    
    // Cache and return the result
    metadataCache.set(cacheKey, metadata);
    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${source}:${id}:`, error);
    
    // Return minimal metadata on error
    return {
      title: `${source.toUpperCase()} Paper: ${id}`,
      id: id,
      source: source
    };
  }
}

/**
 * Get metadata from background script
 * @param {string} source Paper source
 * @param {string} id Paper ID
 * @returns {Promise<PaperMetadata|null>} Paper metadata or null
 */
async function getMetadataFromBackground(source: string, id: string): Promise<PaperMetadata | null> {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({
      type: 'getPaperMetadata',
      source: source,
      id: id
    }, (response) => {
      // Check if we got valid metadata
      if (response && response.title) {
        resolve(response);
      } else {
        resolve(null);
      }
    });
  });
}

/**
 * Fetch arXiv metadata from the arXiv API
 * @param {string} id arXiv paper ID
 * @returns {Promise<PaperMetadata>} Paper metadata
 */
async function fetchArxivMetadata(id: string): Promise<PaperMetadata> {
  try {
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Extract data using regex since we're in content script
    // (DOMParser is available but a little more complex to handle)
    const titleMatch = text.match(/<title>(.*?)<\/title>/);
    const authorsMatch = text.match(/<author>(.*?)<\/author>/g);
    const summaryMatch = text.match(/<summary>(.*?)<\/summary>/s);
    
    const title = titleMatch ? titleMatch[1].trim() : `arXiv Paper: ${id}`;
    
    // Process authors
    let authors = '';
    if (authorsMatch) {
      const authorNames = authorsMatch.map(authorTag => {
        const nameMatch = authorTag.match(/<name>(.*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : '';
      }).filter(Boolean);
      
      authors = authorNames.join(', ');
    }
    
    const abstract = summaryMatch ? summaryMatch[1].trim() : '';
    
    return {
      title,
      authors,
      abstract,
      id,
      source: 'arxiv',
      url: `https://arxiv.org/abs/${id}`
    };
  } catch (error) {
    console.error('Error fetching arXiv metadata:', error);
    return {
      title: `arXiv Paper: ${id}`,
      id,
      source: 'arxiv',
      url: `https://arxiv.org/abs/${id}`
    };
  }
}

/**
 * Fetch Semantic Scholar metadata
 * @param {string} id Semantic Scholar paper ID
 * @returns {Promise<PaperMetadata>} Paper metadata
 */
async function fetchSemanticScholarMetadata(id: string): Promise<PaperMetadata> {
  try {
    const apiUrl = `https://api.semanticscholar.org/v1/paper/${id}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract authors as a string
    const authors = data.authors
      ? data.authors.map((author: { name: string }) => author.name).join(', ')
      : '';
    
    return {
      title: data.title || `Semantic Scholar Paper: ${id}`,
      authors,
      abstract: data.abstract || '',
      id,
      source: 'semanticscholar',
      url: `https://www.semanticscholar.org/paper/${id}`,
      year: data.year,
      citationCount: data.citationCount
    };
  } catch (error) {
    console.error('Error fetching Semantic Scholar metadata:', error);
    return {
      title: `Semantic Scholar Paper: ${id}`,
      id,
      source: 'semanticscholar',
      url: `https://www.semanticscholar.org/paper/${id}`
    };
  }
}

/**
 * Fetch OpenReview metadata
 * @param {string} id OpenReview paper ID
 * @returns {Promise<PaperMetadata>} Paper metadata
 */
async function fetchOpenReviewMetadata(id: string): Promise<PaperMetadata> {
  try {
    const apiUrl = `https://api.openreview.net/notes?id=${id}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      throw new Error(`OpenReview API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Check if we have valid data
    if (data.notes && data.notes.length > 0) {
      const note = data.notes[0];
      const content = note.content || {};
      
      // Handle different content structures
      const getContentValue = (field: string): any => {
        if (!content[field]) return '';
        return typeof content[field] === 'object' && 'value' in content[field]
          ? content[field].value
          : content[field];
      };
      
      // Get title
      const title = getContentValue('title') || `OpenReview Paper: ${id}`;
      
      // Handle authors (could be in different formats)
      let authors = '';
      const authorsData = getContentValue('authors');
      if (Array.isArray(authorsData)) {
        authors = authorsData.join(', ');
      } else if (typeof authorsData === 'string') {
        authors = authorsData;
      }
      
      // Get abstract
      const abstract = getContentValue('abstract') || '';
      
      return {
        title,
        authors,
        abstract,
        id,
        source: 'openreview',
        url: `https://openreview.net/forum?id=${id}`,
        venue: getContentValue('venue') || note.venue,
        forum_id: note.forum
      };
    }
    
    // If no valid data found
    return {
      title: `OpenReview Paper: ${id}`,
      id,
      source: 'openreview',
      url: `https://openreview.net/forum?id=${id}`
    };
  } catch (error) {
    console.error('Error fetching OpenReview metadata:', error);
    return {
      title: `OpenReview Paper: ${id}`,
      id,
      source: 'openreview',
      url: `https://openreview.net/forum?id=${id}`
    };
  }
}
