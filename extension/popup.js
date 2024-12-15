// popup.js
let currentIssueNumber = null;

// Function to get paper data from background script
async function getCurrentPaper() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({type: 'getCurrentPaper'}, response => {
      console.log('Got paper data from background:', response);
      resolve(response);
    });
  });
}

// Function to update UI with paper data
function updateUI(paperData) {
  const titleElement = document.getElementById('paperTitle');
  const authorsElement = document.getElementById('paperAuthors');
  const statusElement = document.getElementById('status');

  if (paperData) {
    titleElement.textContent = paperData.title || paperData.arxivId;
    authorsElement.textContent = paperData.authors;
    statusElement.textContent = 'Paper tracked! Issue created on GitHub.';
    
    // Enable rating buttons
    document.getElementById('thumbsUp').disabled = false;
    document.getElementById('thumbsDown').disabled = false;
  } else {
    titleElement.textContent = 'No arXiv paper detected';
    authorsElement.textContent = '';
    statusElement.textContent = 'Visit an arXiv paper to track it';
    
    // Disable rating buttons
    document.getElementById('thumbsUp').disabled = true;
    document.getElementById('thumbsDown').disabled = true;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup opened');
  
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log('Current tab:', tab.url);
  
  if (tab.url.includes('arxiv.org')) {
    console.log('On arXiv page, getting paper data...');
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
      }, response => {
        if (response && response.success) {
          document.getElementById('status').textContent = 'Rating updated to: thumbs up';
          setTimeout(() => window.close(), 1500);
        }
      });
    });
    
    document.getElementById('thumbsDown').addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'updateRating',
        rating: 'thumbsdown'
      }, response => {
        if (response && response.success) {
          document.getElementById('status').textContent = 'Rating updated to: thumbs down';
          setTimeout(() => window.close(), 1500);
        }
      });
    });
  } else {
    updateUI(null);
  }
});
