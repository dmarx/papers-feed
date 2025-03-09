// content.js
// Enhanced with better paper tracking and standardized ID handling

/**
 * Detect paper source and ID from URL using the standardized approach
 * @param {string} url URL to check for paper identifiers
 * @returns {Object|null} Source information or null if not a paper URL
 */
function detectPaperSource(url) {
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
 * Format a primary ID properly using a consistent approach
 * @param {string} source Source type (e.g., 'arxiv', 'doi')
 * @param {string} id Original ID from the source
 * @returns {string} Formatted primary ID
 */
function formatPrimaryId(source, id) {
  // Sanitize the ID by replacing problematic characters
  const safeId = id
    .replace(/\//g, '_')
    .replace(/:/g, '.')
    .replace(/\s/g, '_')
    .replace(/\\/g, '_');
  
  return `${source}.${safeId}`;
}

/**
 * Process paper link and add annotation functionality
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

/**
 * Create popup element for paper annotation
 * @param {string} source Paper source
 * @param {string} id Paper ID
 * @param {string} initialTitle Optional initial title
 * @returns {Promise<HTMLElement>} Popup element
 */
async function createPopup(source, id, initialTitle = '') {
  console.log(`Creating popup for ${source}:${id}`);
  
  // Calculate the standardized primary ID
  const primary_id = formatPrimaryId(source, id);
  
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
      
      // Format data for the background script with primary_id
      if (vote || notes) {
          chrome.runtime.sendMessage({
              type: 'updateAnnotation',
              annotationType: notes ? 'notes' : 'vote',
              data: {
                  paperId: primary_id, // Use the formatted primary ID
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
  popup.primary_id = primary_id;
  
  return popup;
}

// Update the trackPaper function to use the unified approach
function trackPaper(url) {
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

// Add a direct tracking function that can be called from page content
window.paperTracker = {
  detectPaperSource,
  fetchPaperMetadata,
  processPaperLink,
  trackPaper
};

// Export the enhanced trackPaper function to global scope for other scripts
window.trackPaper = trackPaper;
