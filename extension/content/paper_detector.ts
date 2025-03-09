// content/paper_detector.ts - Paper link detection and processing

import { fetchPaperMetadata } from './metadata_fetcher';
import { createPopup, createPopupWrapper } from './annotator';

/**
 * Paper source information
 */
export interface SourceInfo {
  type: string;
  id: string;
  url: string;
}

/**
 * Reference to active popup
 */
let activePopup: HTMLElement | null = null;

/**
 * Format a primary ID properly using a consistent approach
 * @param {string} source Source type (e.g., 'arxiv', 'doi')
 * @param {string} id Original ID from the source
 * @returns {string} Formatted primary ID
 */
export function formatPrimaryId(source: string, id: string): string {
  // Sanitize the ID by replacing problematic characters
  const safeId = id
    .replace(/\//g, '_')
    .replace(/:/g, '.')
    .replace(/\s/g, '_')
    .replace(/\\/g, '_');
  
  return `${source}.${safeId}`;
}

/**
 * Get a human-readable label for a source
 * @param {string} source Source type identifier
 * @returns {string} Human-readable label
 */
export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'arxiv': 'arXiv',
    'semanticscholar': 'Semantic Scholar',
    'doi': 'DOI',
    'acm': 'ACM Digital Library',
    'openreview': 'OpenReview'
  };
  
  return labels[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

/**
 * Paper sources configuration
 */
const PAPER_SOURCES = [
  {
    type: 'arxiv',
    urlPatterns: [
      /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
      /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/
    ],
    getIdFromMatch: (match: RegExpMatchArray) => match[1] + (match[2] || '')
  },
  {
    type: 'semanticscholar',
    urlPatterns: [
      /semanticscholar\.org\/paper\/([a-f0-9]+)/,
      /s2-research\.org\/papers\/([a-f0-9]+)/
    ],
    getIdFromMatch: (match: RegExpMatchArray) => match[1]
  },
  {
    type: 'doi',
    urlPatterns: [
      /doi\.org\/(10\.[0-9.]+\/[^\s&\/?#]+[^\s&\/?#.:])/
    ],
    getIdFromMatch: (match: RegExpMatchArray) => match[1]
  },
  {
    type: 'acm',
    urlPatterns: [
      /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[^\s&\/?#]+[^\s&\/?#.:])/
    ],
    getIdFromMatch: (match: RegExpMatchArray) => match[1]
  },
  {
    type: 'openreview',
    urlPatterns: [
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/,
      /openreview\.net\/pdf\?id=([a-zA-Z0-9_\-]+)/
    ],
    getIdFromMatch: (match: RegExpMatchArray) => match[1]
  }
];

/**
 * Detect paper source and ID from URL
 * @param {string} url URL to check for paper identifiers
 * @returns {SourceInfo|null} Source information or null if not a paper URL
 */
export function detectPaperSource(url: string): SourceInfo | null {
  // Check each source type
  for (const source of PAPER_SOURCES) {
    for (let i = 0; i < source.urlPatterns.length; i++) {
      const match = url.match(source.urlPatterns[i]);
      if (match) {
        const id = source.getIdFromMatch(match);
        return {
          type: source.type,
          id: id,
          url: url
        };
      }
    }
  }
  return null;
}

/**
 * Process paper link and add annotation functionality
 * @param {HTMLAnchorElement} link Link element to process
 */
export async function processPaperLink(link: HTMLAnchorElement): Promise<void> {
  // Skip if already processed
  if (link.classList.contains('paper-processed')) return;
  link.classList.add('paper-processed');

  // Detect paper source from URL
  const sourceInfo = detectPaperSource(link.href);
  if (!sourceInfo) return;
  
  const { type: source, id } = sourceInfo;

  // Create annotator button with source-specific class
  const annotator = document.createElement('span');
  annotator.className = `paper-annotator annotator-${source}`;
  annotator.title = `Add ${getSourceLabel(source)} annotation`;
  
  // Update the click handler
  annotator.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
  
    // Remove existing popup if any
    if (activePopup) {
      activePopup.parentElement?.remove(); // Remove the wrapper
      if (
        // Access properties directly - they're properly defined 
        // on the HTMLElement with Object.defineProperties
        activePopup.hasOwnProperty('paperSource') && 
        activePopup.hasOwnProperty('paperId') &&
        (activePopup as any).paperSource === source && 
        (activePopup as any).paperId === id
      ) {
        activePopup = null;
        return;
      }
    }
  
    // Create popup
    const popup = await createPopup(source, id);
    
    // Create wrapper and add popup to it
    const wrapper = createPopupWrapper();
    wrapper.appendChild(popup);
    
    // Position popup relative to annotator
    const annotatorRect = annotator.getBoundingClientRect();
    const available_width = window.innerWidth - annotatorRect.left;
    
    if (available_width < 320) { // if not enough space on right
      popup.style.right = '0';  // align to right edge
      popup.style.left = 'auto';
    } else {
      popup.style.left = '0';
    }
    popup.style.top = `${annotatorRect.height + 5}px`;
    
    // Add to page and store reference
    annotator.parentNode!.insertBefore(wrapper, annotator.nextSibling);
    activePopup = popup;
  });
  
  // Add to page
  link.parentNode!.insertBefore(annotator, link.nextSibling);
}

/**
 * Track a paper via the background script
 * @param {string} url Paper URL to track
 */
export function trackPaper(url: string): void {
  const sourceInfo = detectPaperSource(url);
  if (!sourceInfo) {
    console.log('Not a recognized paper URL:', url);
    return;
  }
  
  // Get the page title if possible
  const title = document.title || `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`;
  
  // Send message to background script with proper data format
  chrome.runtime.sendMessage({
    type: 'trackPaper',
    source: sourceInfo.type,
    id: sourceInfo.id,
    url: url,
    title: title
  }, (response) => {
    console.log('Paper tracking result:', response);
  });
}

/**
 * Setup automatic link detection on page
 */
export function setupLinkDetection(): void {
  // Process existing links
  document.querySelectorAll('a[href]').forEach(link => {
    processPaperLink(link as HTMLAnchorElement);
  });
  
  // Set up a MutationObserver to detect new links
  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      // Process added nodes
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if node is a link
          if ((node as Element).tagName === 'A' && (node as HTMLAnchorElement).href) {
            processPaperLink(node as HTMLAnchorElement);
          }
          
          // Check for links within the node
          (node as Element).querySelectorAll('a[href]').forEach(link => {
            processPaperLink(link as HTMLAnchorElement);
          });
        }
      });
    });
  });
  
  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
