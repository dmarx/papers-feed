// popup.ts
// Extension popup script

import { loguru } from './utils/logger';

const logger = loguru.getLogger('popup');

// Type for paper data
interface PaperData {
  sourceId: string;
  paperId: string;
  title: string;
  authors: string;
  abstract?: string;
  timestamp?: string;
  rating?: string;
  publishedDate?: string;
  tags?: string[];
  url?: string;
}

// Function to get paper data from background script
async function getCurrentPaper(): Promise<PaperData | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({type: 'getCurrentPaper'}, (response) => {
      logger.debug('Got paper data from background:', response);
      resolve(response);
    });
  });
}

// Function to update UI with paper data
function updateUI(paperData: PaperData | null): void {
  const titleElement = document.getElementById('paperTitle');
  const authorsElement = document.getElementById('paperAuthors');
  const statusElement = document.getElementById('status');
  
  if (!titleElement || !authorsElement || !statusElement) {
    logger.error('Unable to find UI elements');
    return;
  }

  if (paperData) {
    titleElement.textContent = paperData.title || paperData.paperId;
    authorsElement.textContent = paperData.authors || '';
    statusElement.textContent = 'Paper tracked! Stored in GitHub.';
    
    // Enable rating buttons
    const thumbsUpButton = document.getElementById('thumbsUp') as HTMLButtonElement;
    const thumbsDownButton = document.getElementById('thumbsDown') as HTMLButtonElement;
    
    if (thumbsUpButton) thumbsUpButton.disabled = false;
    if (thumbsDownButton) thumbsDownButton.disabled = false;
    
    // Set active state for current rating if exists
    if (paperData.rating === 'thumbsup' && thumbsUpButton) {
      thumbsUpButton.classList.add('active');
    } else if (paperData.rating === 'thumbsdown' && thumbsDownButton) {
      thumbsDownButton.classList.add('active');
    }
    
  } else {
    titleElement.textContent = 'No paper detected';
    authorsElement.textContent = '';
    statusElement.textContent = 'Visit a paper to track it';
    
    // Disable rating buttons
    const thumbsUpButton = document.getElementById('thumbsUp') as HTMLButtonElement;
    const thumbsDownButton = document.getElementById('thumbsDown') as HTMLButtonElement;
    
    if (thumbsUpButton) thumbsUpButton.disabled = true;
    if (thumbsDownButton) thumbsDownButton.disabled = true;
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  logger.info('Popup opened');
  
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  
  logger.debug('Current tab:', tab.url);
  
  // Check if we're on a supported site
  const isPaperUrl = tab.url && /arxiv\.org|example\.com/.test(tab.url);
  
  if (isPaperUrl) {
    logger.debug('On supported paper site, getting paper data...');
    
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
    const thumbsUpButton = document.getElementById('thumbsUp');
    if (thumbsUpButton) {
      thumbsUpButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: 'popupAction',
          action: 'rate',
          sourceId: paperData?.sourceId,
          paperId: paperData?.paperId,
          data: { value: 'thumbsup' }
        }, (response) => {
          if (response && response.success) {
            const statusElement = document.getElementById('status');
            if (statusElement) {
              statusElement.textContent = 'Rating updated to: thumbs up';
              setTimeout(() => window.close(), 1500);
            }
          }
        });
      });
    }
    
    const thumbsDownButton = document.getElementById('thumbsDown');
    if (thumbsDownButton) {
      thumbsDownButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          type: 'popupAction',
          action: 'rate',
          sourceId: paperData?.sourceId,
          paperId: paperData?.paperId,
          data: { value: 'thumbsdown' }
        }, (response) => {
          if (response && response.success) {
            const statusElement = document.getElementById('status');
            if (statusElement) {
              statusElement.textContent = 'Rating updated to: thumbs down';
              setTimeout(() => window.close(), 1500);
            }
          }
        });
      });
    }
  } else {
    updateUI(null);
  }
});
