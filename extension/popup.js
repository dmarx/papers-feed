// popup.js
// Fully updated to use the standardized data model approach

/**
 * Get paper data from background script
 * @returns {Promise<any>} Paper data or null if not available
 */
async function getCurrentPaper() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({type: 'getCurrentPaper'}, response => {
      console.log('Got paper data from background:', response);
      resolve(response);
    });
  });
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

/**
 * Update UI with paper data
 * @param {Object} paperData Paper metadata
 */
function updateUI(paperData) {
  const titleElement = document.getElementById('paperTitle');
  const authorsElement = document.getElementById('paperAuthors');
  const statusElement = document.getElementById('status');
  const sourceElement = document.getElementById('paperSource');

  if (paperData) {
    // Ensure paper data has primary_id - should always be the case now
    if (!paperData.primary_id) {
      console.error('Paper data missing required primary_id:', paperData);
      titleElement.textContent = 'Error: Missing paper identifier';
      sourceElement.classList.add('hidden');
      return;
    }
    
    // Set paper details
    titleElement.textContent = paperData.title || 'Untitled Paper';
    authorsElement.textContent = paperData.authors || '';
    
    // Set source information
    if (paperData.source) {
      sourceElement.textContent = getSourceLabel(paperData.source);
      sourceElement.classList.remove('hidden');
      
      // Add source-specific class for styling
      sourceElement.className = 'paper-source';
      sourceElement.classList.add(`source-${paperData.source}`);
    } else {
      sourceElement.classList.add('hidden');
    }
    
    statusElement.textContent = 'Paper tracked! Data stored on GitHub.';
    
    // Enable rating buttons
    document.getElementById('thumbsUp').disabled = false;
    document.getElementById('thumbsDown').disabled = false;
    
    // Highlight active rating if set
    if (paperData.rating === 'thumbsup') {
      document.getElementById('thumbsUp').classList.add('active');
    } else if (paperData.rating === 'thumbsdown') {
      document.getElementById('thumbsDown').classList.add('active');
    }
  } else {
    titleElement.textContent = 'No academic paper detected';
    authorsElement.textContent = '';
    sourceElement.classList.add('hidden');
    statusElement.textContent = 'Visit a supported academic paper to track it';
    
    // Disable rating buttons
    document.getElementById('thumbsUp').disabled = true;
    document.getElementById('thumbsDown').disabled = true;
  }
}

/**
 * Check if URL is a supported paper source
 * @param {string} url URL to check
 * @returns {boolean} Whether URL is from a supported source
 */
function isPaperUrl(url) {
  return (
    url.includes('arxiv.org/') ||
    url.includes('semanticscholar.org/paper/') ||
    url.includes('doi.org/') ||
    url.includes('dl.acm.org/doi/') ||
    url.includes('openreview.net/forum') ||
    url.includes('openreview.net/pdf')
  );
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup opened');
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Current tab:', tab.url);
  
  if (isPaperUrl(tab.url)) {
    console.log('On academic paper page, getting paper data...');
    
    // Try multiple times to get paper data, as it might not be ready immediately
    let retries = 3;
    let paperData = null;
    
    while (retries > 0 && !paperData) {
      paperData = await getCurrentPaper();
      if (!paperData) {
        await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
        retries--;
      }
    }
    
    updateUI(paperData);
    
    // Set up rating handlers
    document.getElementById('thumbsUp').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'updateRating',
        rating: 'thumbsup'
      }, (response) => {
        if (response && response.success) {
          document.getElementById('status').textContent = 'Rating updated to: thumbs up';
          document.getElementById('thumbsUp').classList.add('active');
          document.getElementById('thumbsDown').classList.remove('active');
          setTimeout(() => window.close(), 1500);
        } else if (response && response.error) {
          document.getElementById('status').textContent = `Error: ${response.error}`;
        }
      });
    });
    
    document.getElementById('thumbsDown').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'updateRating',
        rating: 'thumbsdown'
      }, (response) => {
        if (response && response.success) {
          document.getElementById('status').textContent = 'Rating updated to: thumbs down';
          document.getElementById('thumbsUp').classList.remove('active');
          document.getElementById('thumbsDown').classList.add('active');
          setTimeout(() => window.close(), 1500);
        } else if (response && response.error) {
          document.getElementById('status').textContent = `Error: ${response.error}`;
        }
      });
    });
  } else {
    updateUI(null);
  }
});
