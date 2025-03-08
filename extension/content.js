// content.js
// Enhanced to support multiple paper sources
console.log('Academic Paper Tracker content script loaded');

// CSS for the annotation UI - Updated with source-specific styling
const STYLES = `
.paper-annotator {
    display: inline-block;
    margin-left: 4px;
    cursor: pointer;
    font-size: 0.9em;
    opacity: 0.7;
    transition: opacity 0.2s;
    vertical-align: baseline;
}

.paper-annotator:hover {
    opacity: 1;
}

.paper-popup {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 300px;
    z-index: 10000;
    box-sizing: border-box;
}

.paper-popup-header {
    font-weight: bold;
    margin-bottom: 8px;
    line-height: 1.4;
    font-size: 1em;
}

.paper-popup-meta {
    color: #666;
    font-size: 0.85em;
    margin-bottom: 12px;
    line-height: 1.4;
}

.paper-popup-source {
    display: inline-block;
    font-size: 11px;
    border-radius: 4px;
    padding: 2px 6px;
    margin-bottom: 10px;
    color: white;
    font-weight: 500;
}

.source-arxiv {
    background-color: #B31B1B;
}

.source-doi, .source-acm {
    background-color: #0277bd;
}

.source-semanticscholar {
    background-color: #2e7d32;
}

.source-openreview {
    background-color: #6d4c41;
}

.paper-popup-buttons {
    display: flex;
    gap: 8px;
    margin: 8px 0;
}

.paper-popup button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
}

.paper-popup button:hover {
    background: #e8e8e8;
    border-color: #ccc;
}

.paper-popup button.active {
    background: #e0e0e0;
    border-color: #aaa;
}

.paper-popup textarea {
    width: calc(100% - 16px);
    min-height: 80px;
    margin: 8px 0;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9em;
    line-height: 1.4;
    box-sizing: border-box;
}

.paper-popup textarea:focus {
    outline: none;
    border-color: #aaa;
}

.paper-popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
}

.paper-popup .save-button {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
}

.paper-popup .save-button:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
}

/* Loading state */
.paper-popup-header:empty::after,
.paper-popup-header:contains('Loading...') {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #ddd;
    border-top-color: #666;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Source-specific annotator icons */
.annotator-arxiv::after {
    content: '📝';
}

.annotator-doi::after, .annotator-acm::after {
    content: '🔍';
}

.annotator-semanticscholar::after {
    content: '📊';
}

.annotator-openreview::after {
    content: '📋';
}

.annotator-generic::after {
    content: '📄';
}
`;

// Add styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = STYLES;
document.head.appendChild(styleSheet);

// Track active popup
let activePopup = null;

// Update the click-outside handler to account for wrapper
document.addEventListener('click', (e) => {
    if (activePopup && 
        !activePopup.contains(e.target) && 
        !e.target.classList.contains('paper-annotator')) {
        activePopup.parentElement?.remove(); // Remove the wrapper
        activePopup = null;
    }
});

// Cache for paper metadata
const metadataCache = new Map();

// Source definitions for URL matching
const PAPER_SOURCES = [
    {
        type: 'arxiv',
        urlPatterns: [
            /arxiv\.org\/abs\/([0-9.]+)/,
            /arxiv\.org\/pdf\/([0-9.]+)\.pdf/,
            /arxiv\.org\/\w+\/([0-9.]+)/
        ],
        getIdFromMatch: (match) => match[1]
    },
    {
        type: 'doi',
        urlPatterns: [
            /doi\.org\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
        ],
        getIdFromMatch: (match) => match[1]
    },
    {
        type: 'acm',
        urlPatterns: [
            /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
        ],
        getIdFromMatch: (match) => match[1]
    },
    {
        type: 'semanticscholar',
        urlPatterns: [
            /semanticscholar\.org\/paper\/([a-f0-9]+)/,
            /s2-research\.org\/papers\/([a-f0-9]+)/
        ],
        getIdFromMatch: (match) => match[1]
    },
    {
        type: 'openreview',
        urlPatterns: [
            /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/
        ],
        getIdFromMatch: (match) => match[1]
    }
];

/**
 * Detect paper source and ID from URL
 * @param {string} url URL to check for paper identifiers
 * @returns {Object|null} Source information or null if not a paper URL
 */
function detectPaperSource(url) {
    // Check each source type
    for (const source of PAPER_SOURCES) {
        for (let i = 0; i < source.urlPatterns.length; i++) {
            const match = url.match(source.urlPatterns[i]);
            if (match) {
                return {
                    type: source.type,
                    id: source.getIdFromMatch(match),
                    url: url
                };
            }
        }
    }
    return null;
}

/**
 * Get a formatted label for paper source
 * @param {string} source Paper source identifier
 * @returns {string} Human-readable source label
 */
function getSourceLabel(source) {
    const labels = {
        'arxiv': 'arXiv',
        'semanticscholar': 'Semantic Scholar',
        'doi': 'DOI',
        'acm': 'ACM Digital Library',
        'openreview': 'OpenReview'
    };
    return labels[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

// Parse arXiv API response
async function parseXMLResponse(xmlText) {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    // Get entry element
    const entry = xmlDoc.querySelector('entry');
    if (!entry) return null;
    
    return {
        title: entry.querySelector('title')?.textContent?.trim(),
        authors: Array.from(entry.querySelectorAll('author name'))
            .map(name => name.textContent.trim())
            .join(', '),
        abstract: entry.querySelector('summary')?.textContent?.trim(),
        published: entry.querySelector('published')?.textContent?.trim(),
    };
}

/**
 * Fetch paper metadata based on source
 * @param {string} source Paper source type
 * @param {string} id Paper identifier
 * @returns {Promise<Object|null>} Paper metadata or null if unavailable
 */
async function fetchPaperMetadata(source, id) {
    console.log(`Starting metadata fetch for ${source}:${id}`);
    
    // Generate cache key
    const cacheKey = `${source}:${id}`;
    
    // Check cache first
    if (metadataCache.has(cacheKey)) {
        console.log('Found in cache:', cacheKey);
        return metadataCache.get(cacheKey);
    }

    // Source-specific metadata fetching
    try {
        let metadata = null;
        
        if (source === 'arxiv') {
            // Use arXiv API
            const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
            console.log('API URL:', apiUrl);
            
            const response = await fetch(apiUrl);
            console.log('API response status:', response.status);
            
            if (response.ok) {
                const text = await response.text();
                metadata = await parseXMLResponse(text);
            }
        } else {
            // For other sources, try to extract from page meta tags first
            metadata = {
                title: document.querySelector('meta[name="citation_title"]')?.content ||
                       document.querySelector('meta[property="og:title"]')?.content,
                authors: document.querySelector('meta[name="citation_authors"]')?.content ||
                         document.querySelector('meta[name="author"]')?.content,
                abstract: document.querySelector('meta[name="description"]')?.content ||
                          document.querySelector('meta[property="og:description"]')?.content,
                published: document.querySelector('meta[name="citation_publication_date"]')?.content
            };
            
            // If not found in meta tags, set defaults
            if (!metadata.title) {
                metadata.title = `${getSourceLabel(source)} Paper: ${id}`;
            }
        }

        if (metadata) {
            console.log('Fetched metadata:', metadata);
            metadataCache.set(cacheKey, metadata);
            return metadata;
        } 
    } catch (error) {
        console.error('Error fetching metadata:', error);
    }

    // Default minimal metadata if all else fails
    const defaultMetadata = {
        title: `${getSourceLabel(source)} Paper: ${id}`,
        authors: '',
        abstract: '',
        published: ''
    };
    
    metadataCache.set(cacheKey, defaultMetadata);
    return defaultMetadata;
}

/**
 * Create popup element for paper annotation
 * @param {string} source Paper source
 * @param {string} id Paper ID
 * @param {string} initialTitle Optional initial title
 * @returns {Promise<HTMLElement>} Popup element
 */
async function createPopup(source, id, initialTitle = '') {
    console.log(`Creating popup for ${source}:${id}`);
    
    // Fetch metadata
    const metadata = await fetchPaperMetadata(source, id);
    console.log('Fetched metadata:', metadata);

    const popup = document.createElement('div');
    popup.className = 'paper-popup';
    
    // Create popup content
    popup.innerHTML = `
        <div class="paper-popup-source source-${source}">${getSourceLabel(source)}</div>
        <div class="paper-popup-header">${metadata?.title || initialTitle || id}</div>
        <div class="paper-popup-meta">${metadata?.authors || ''}</div>
        <div class="paper-popup-buttons">
            <button class="vote-button" data-vote="thumbsup">👍 Interesting</button>
            <button class="vote-button" data-vote="thumbsdown">👎 Not Relevant</button>
        </div>
        <textarea placeholder="Add notes..."></textarea>
        <div class="paper-popup-actions">
            <button class="save-button">Save</button>
        </div>
    `;

    // Handle voting
    popup.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', () => {
            popup.querySelectorAll('.vote-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Handle save
    popup.querySelector('.save-button').addEventListener('click', () => {
        const vote = popup.querySelector('.vote-button.active')?.dataset.vote;
        const notes = popup.querySelector('textarea').value;
        
        // Format data for the background script
        if (vote || notes) {
            chrome.runtime.sendMessage({
                type: 'updateAnnotation',
                annotationType: notes ? 'notes' : 'vote',
                data: {
                    paperId: id,
                    source: source,
                    vote,
                    notes,
                    title: metadata?.title,
                    authors: metadata?.authors,
                    abstract: metadata?.abstract,
                    timestamp: new Date().toISOString()
                }
            }, (response) => {
                console.log('Annotation saved:', response);
                popup.remove();
                activePopup = null;
            });
        }
    });

    // Store source and ID for reference
    popup.paperSource = source;
    popup.paperId = id;
    
    return popup;
}

/**
 * Create wrapper for popup placement
 * @returns {HTMLElement} Popup wrapper element
 */
function createPopupWrapper() {
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.zIndex = '10000';
    return wrapper;
}

/**
 * Process a paper link element
 * @param {HTMLAnchorElement} link Link element to process
 */
async function processPaperLink(link) {
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
            if (activePopup.paperSource === source && activePopup.paperId === id) {
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
        annotator.parentNode.insertBefore(wrapper, annotator.nextSibling);
        activePopup = popup;
    });
    
    // Add to page
    link.parentNode.insertBefore(annotator, link.nextSibling);
}

// Process initial links for all supported sources
function processInitialLinks() {
    // Process arXiv links (backward compatibility)
    document.querySelectorAll('a[href*="arxiv.org"]').forEach(processPaperLink);
    
    // Process DOI links
    document.querySelectorAll('a[href*="doi.org"]').forEach(processPaperLink);
    document.querySelectorAll('a[href*="dl.acm.org/doi"]').forEach(processPaperLink);
    
    // Process Semantic Scholar links
    document.querySelectorAll('a[href*="semanticscholar.org/paper"]').forEach(processPaperLink);
    
    // Process OpenReview links
    document.querySelectorAll('a[href*="openreview.net/forum"]').forEach(processPaperLink);
}

// Process all links on page load
processInitialLinks();

// Watch for new links with a mutation observer
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                // Process all supported link types
                if (node.tagName === 'A') {
                    processPaperLink(node);
                } else {
                    // Check for links inside added elements
                    node.querySelectorAll('a[href*="arxiv.org"]').forEach(processPaperLink);
                    node.querySelectorAll('a[href*="doi.org"]').forEach(processPaperLink);
                    node.querySelectorAll('a[href*="dl.acm.org/doi"]').forEach(processPaperLink);
                    node.querySelectorAll('a[href*="semanticscholar.org/paper"]').forEach(processPaperLink);
                    node.querySelectorAll('a[href*="openreview.net/forum"]').forEach(processPaperLink);
                }
            }
        });
    });
});

// OpenReview content script integration for content.js

// This should be added to the content.js file after the existing paper source processing code

/**
 * Process OpenReview links on any webpage
 * This adds tracking buttons for OpenReview papers
 */
function processOpenReviewLinks() {
  // Find all OpenReview paper links
  document.querySelectorAll('a[href*="openreview.net/forum"], a[href*="openreview.net/pdf"]').forEach(link => {
    // Skip already processed links
    if (link.classList.contains('paper-processed')) return;
    link.classList.add('paper-processed');
    
    // Extract paper ID from URL
    const match = link.href.match(/id=([a-zA-Z0-9_\-]+)/);
    if (!match) return;
    
    const paperId = match[1];
    
    // Create annotator button with OpenReview styling
    const annotator = document.createElement('span');
    annotator.className = 'paper-annotator annotator-openreview';
    annotator.title = 'Track this OpenReview paper';
    
    // Add click handler
    annotator.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      // If popup is already showing this paper, hide it
      if (activePopup && activePopup.paperId === paperId) {
        activePopup.parentElement?.remove();
        activePopup = null;
        return;
      }
      
      // Close any existing popup
      if (activePopup) {
        activePopup.parentElement?.remove();
      }
      
      // Create popup for this paper
      const popup = await createPopup('openreview', paperId, link.textContent?.trim());
      
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
      annotator.parentNode.insertBefore(wrapper, annotator.nextSibling);
      activePopup = popup;
    });
    
    // Add to page
    link.parentNode.insertBefore(annotator, link.nextSibling);
  });
}

// Add OpenReview to initial link processing
function addOpenReviewToInitialProcessing() {
  // Add OpenReview links to the initial processing
  const originalProcessInitialLinks = processInitialLinks;
  
  processInitialLinks = function() {
    // Call the original function
    originalProcessInitialLinks();
    
    // Process OpenReview links
    processOpenReviewLinks();
  };
  
  // Run it once to process existing links
  processOpenReviewLinks();
}

// Run the integration
addOpenReviewToInitialProcessing();

// Make sure the observer also processes OpenReview links
// This should already be handled if you're using a generic link processing approach

// Configure and start the observer
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Optional: Export functions for testing
window.paperTracker = {
    detectPaperSource,
    fetchPaperMetadata,
    processPaperLink
};
