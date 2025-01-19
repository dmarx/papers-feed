// extension/content.js
console.log('ArXiv extension content script loaded');

// CSS for the annotation UI
// Updated styles section
const STYLES = `
.arxiv-annotator {
    display: inline-block;
    margin-left: 4px;
    cursor: pointer;
    font-size: 0.9em;
    opacity: 0.7;
    transition: opacity 0.2s;
    vertical-align: baseline;
}

.arxiv-annotator:hover {
    opacity: 1;
}

.arxiv-popup {
    position: absolute;  /* Changed from fixed to absolute */
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 300px;
    z-index: 10000;
    box-sizing: border-box;  /* Added to ensure padding is included in width */
}

.arxiv-popup-header {
    font-weight: bold;
    margin-bottom: 8px;
    line-height: 1.4;
    font-size: 1em;
}

.arxiv-popup-meta {
    color: #666;
    font-size: 0.85em;
    margin-bottom: 12px;
    line-height: 1.4;
}

.arxiv-popup-buttons {
    display: flex;
    gap: 8px;
    margin: 8px 0;
}

.arxiv-popup button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
}

.arxiv-popup button:hover {
    background: #e8e8e8;
    border-color: #ccc;
}

.arxiv-popup button.active {
    background: #e0e0e0;
    border-color: #aaa;
}

.arxiv-popup textarea {
    width: calc(100% - 16px);  /* Account for padding */
    min-height: 80px;
    margin: 8px 0;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9em;
    line-height: 1.4;
    box-sizing: border-box;  /* Added to ensure padding is included in width */
}

.arxiv-popup textarea:focus {
    outline: none;
    border-color: #aaa;
}

.arxiv-popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
}

.arxiv-popup .save-button {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
}

.arxiv-popup .save-button:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
}

/* Loading state */
.arxiv-popup-header:empty::after,
.arxiv-popup-header:contains('Loading...') {
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
        !e.target.classList.contains('arxiv-annotator')) {
        activePopup.parentElement?.remove(); // Remove the wrapper
        activePopup = null;
    }
});

// Cache for paper metadata
const metadataCache = new Map();

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

// Fetch paper metadata
async function fetchPaperMetadata(arxivId) {
    console.log('Starting metadata fetch for:', arxivId);
    
    // Check cache first
    if (metadataCache.has(arxivId)) {
        console.log('Found in cache:', arxivId);
        return metadataCache.get(arxivId);
    }

    console.log('Fetching from arXiv API:', arxivId);
    try {
        const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
        console.log('API URL:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('API response status:', response.status);
        
        const text = await response.text();
        console.log('API response length:', text.length);
        
        const metadata = await parseXMLResponse(text);
        console.log('Parsed metadata:', metadata);

        if (metadata) {
            metadataCache.set(arxivId, metadata);
            return metadata;
        } else {
            console.log('Failed to parse metadata');
        }
    } catch (error) {
        console.error('Error fetching metadata:', error);
    }

    return null;
}

// Create popup element
async function createPopup(arxivId, initialTitle = '') {
    console.log('Creating popup for:', arxivId);
    
    // Fetch metadata first
    const metadata = await fetchPaperMetadata(arxivId);
    console.log('Fetched metadata:', metadata);

    const popup = document.createElement('div');
    popup.className = 'arxiv-popup';
    popup.innerHTML = `
        <div class="arxiv-popup-header">${metadata?.title || initialTitle || arxivId}</div>
        <div class="arxiv-popup-meta">${metadata?.authors || ''}</div>
        <div class="arxiv-popup-buttons">
            <button class="vote-button" data-vote="thumbsup">👍 Interesting</button>
            <button class="vote-button" data-vote="thumbsdown">👎 Not Relevant</button>
        </div>
        <textarea placeholder="Add notes..."></textarea>
        <div class="arxiv-popup-actions">
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
        
        // Send to background script
        if (vote || notes) {
            chrome.runtime.sendMessage({
                type: 'updateAnnotation',
                annotationType: notes ? 'notes' : 'vote',
                data: {
                    paperId: arxivId,
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

    return popup;
}

// Process a link element
async function processArxivLink(link) {
    // Skip if already processed
    if (link.classList.contains('arxiv-processed')) return;
    link.classList.add('arxiv-processed');

    // Extract arXiv ID
    const patterns = [
        /arxiv\.org\/abs\/([0-9.]+)/,
        /arxiv\.org\/pdf\/([0-9.]+)\.pdf/,
        /arxiv\.org\/\w+\/([0-9.]+)/
    ];
    
    let arxivId = null;
    for (const pattern of patterns) {
        const match = link.href.match(pattern);
        if (match) {
            arxivId = match[1];
            break;
        }
    }

    if (!arxivId) return;

    // Create annotator button
    const annotator = document.createElement('span');
    annotator.className = 'arxiv-annotator';
    annotator.textContent = '📝';
    annotator.title = 'Add annotation';
    
    // Create a wrapper for the popup that will help with positioning
    function createPopupWrapper(annotator) {
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.zIndex = '10000';
        return wrapper;
    }
    
    // Update the click handler
    annotator.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
    
        // Remove existing popup if any
        if (activePopup) {
            activePopup.parentElement?.remove(); // Remove the wrapper
            if (activePopup.arxivId === arxivId) {
                activePopup = null;
                return;
            }
        }
    
        // Create popup first
        const popup = await createPopup(arxivId);
        
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
        
        // Keep reference and show
        popup.arxivId = arxivId;
        annotator.parentNode.insertBefore(wrapper, annotator.nextSibling);
        activePopup = popup;
    });
    // Add to page
    link.parentNode.insertBefore(annotator, link.nextSibling);
}

// Process initial links
document.querySelectorAll('a[href*="arxiv.org"]').forEach(processArxivLink);

// Watch for new links
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                node.querySelectorAll('a[href*="arxiv.org"]').forEach(processArxivLink);
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
//# sourceMappingURL=content.bundle.js.map
