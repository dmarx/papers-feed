// source-integration/plugins/arxiv.ts
// ArXiv integration plugin definition

import { SourceDefinition, PaperMetadata } from '../types';

/**
 * Extract paper ID from ArXiv URL
 */
function extractPaperId(url: string): string | null {
  const patterns = [
    /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
    /arxiv\.org\/\w+\/([0-9.]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[2] || match[1]; // The capture group with the paper ID
    }
  }
  
  return null;
}

/**
 * Extract metadata from ArXiv page or API
 */
async function extractMetadata(document: Document, paperId: string): Promise<PaperMetadata> {
  // Try to extract from page first
  let metadata = extractFromPage(document, paperId);
  
  // Fall back to API if page extraction fails
  if (!metadata) {
    metadata = await fetchFromApi(paperId);
  }
  
  return {
    sourceId: 'arxiv',
    paperId,
    url: window.location.href,
    title: metadata.title,
    authors: metadata.authors,
    abstract: metadata.abstract,
    timestamp: new Date().toISOString(),
    rating: 'novote',
    publishedDate: metadata.published_date,
    tags: metadata.tags
  };
}

/**
 * Extract metadata from ArXiv page
 */
function extractFromPage(document: Document, paperId: string): any | null {
  try {
    // Extract title
    const titleElement = document.querySelector('.title');
    if (!titleElement) return null;
    
    const title = titleElement.textContent?.replace('Title:', '').trim() || '';
    
    // Extract authors
    const authorsElement = document.querySelector('.authors');
    const authors = authorsElement?.textContent?.replace('Authors:', '').trim() || '';
    
    // Extract abstract
    const abstractElement = document.querySelector('.abstract');
    const abstract = abstractElement?.textContent?.replace('Abstract:', '').trim() || '';
    
    // Extract categories
    const categoriesElement = document.querySelector('.subjects');
    const categoriesText = categoriesElement?.textContent?.replace('Subjects:', '').trim() || '';
    const tags = categoriesText.split(';').map(tag => tag.trim());
    
    // Extract publication date
    const dateElement = document.querySelector('.dateline');
    const published_date = dateElement?.textContent?.trim() || '';
    
    return {
      title,
      authors,
      abstract,
      tags,
      published_date
    };
  } catch (error) {
    console.error('Error extracting from page:', error);
    return null;
  }
}

/**
 * Fetch metadata from ArXiv API
 */
async function fetchFromApi(arxivId: string): Promise<any> {
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
  
  const response = await fetch(apiUrl);
  
  if (!response.ok) {
    throw new Error(`ArXiv API error: ${response.status}`);
  }
  
  const text = await response.text();
  const parsedData = await parseArXivXML(text);
  
  if (!parsedData) {
    throw new Error('Failed to parse API response');
  }
  
  return parsedData;
}

/**
 * Parse ArXiv API XML response
 */
async function parseArXivXML(xmlText: string): Promise<any> {
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
  const authorNodes = entry.querySelectorAll('author name');
  const authors = Array.from(authorNodes)
    .map(name => name.textContent?.trim() || '')
    .join(', ');
  
  // Extract categories/tags
  const categories = new Set<string>();
  
  // Primary category
  const primaryCategory = entry.querySelector('arxiv\\:primary_category, primary_category');
  if (primaryCategory && primaryCategory.getAttribute('term')) {
    categories.add(primaryCategory.getAttribute('term') || '');
  }
  
  // Other categories
  const categoryElements = entry.querySelectorAll('category');
  categoryElements.forEach(cat => {
    if (cat.getAttribute('term')) {
      categories.add(cat.getAttribute('term') || '');
    }
  });
  
  return {
    title,
    authors,
    abstract: summary,
    published_date: published,
    tags: Array.from(categories)
  };
}

/**
 * ArXiv source definition
 */
export const arxivSource: SourceDefinition = {
  id: 'arxiv',
  name: 'arXiv.org',
  urlPatterns: [
    'arxiv\\.org\\/(abs|pdf|html)\\/([0-9.]+)',
    'arxiv\\.org\\/\\w+\\/([0-9.]+)'
  ],
  extractorCode: extractPaperId.toString(),
  metadataExtractorCode: extractMetadata.toString(),
  contentScriptMatches: ['*://*.arxiv.org/*']
};
