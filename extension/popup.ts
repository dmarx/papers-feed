// popup.ts
// Updated to use the integration system for all metadata and paper ID operations
// Properly imports metadata extractor for use with rollup.js

import { PaperMetadata } from './papers/types';
import { 
  MetadataExtractor, 
  createMetadataExtractor, 
  ExtractedMetadata 
} from './utils/metadata-extractor';

console.log('Popup script starting...');

// Function to get paper data from background script
async function getCurrentPaper(): Promise<PaperMetadata | null> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({type: 'getCurrentPaper'}, (response) => {
      console.log('Got paper data from background:', response);
      resolve(response as PaperMetadata | null);
    });
  });
}

// Interface for page metadata
interface PageMetadata extends ExtractedMetadata {
  url: string;
}

// Function to get current tab info and metadata
async function getCurrentTabInfo(): Promise<PageMetadata> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        // Execute script to extract metadata from page
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          // We can import the MetadataExtractor properly with rollup.js
          func: () => {
            // Import statements are handled by rollup and will be included in the bundle
            // Use the imported MetadataExtractor
            const extractor = createMetadataExtractor(document);
            const metadata = extractor.extract();
            
            return {
              ...metadata,
              url: window.location.href
            };
          }
        }, (results) => {
          if (results && results[0] && results[0].result) {
            resolve({
              ...results[0].result as PageMetadata
            });
          } else {
            resolve({
              url: tabs[0].url || '',
              title: tabs[0].title || '',
              authors: '',
              description: '',
              publishedDate: '',
              tags: []
            });
          }
        });
      } else {
        resolve({ 
          url: '', 
          title: '', 
          authors: '', 
          description: '',
          publishedDate: '',
          tags: []
        });
      }
    });
  });
}

// Interface for message response
interface MessageResponse {
  success: boolean;
  error?: string;
}

// Function to log current page as a paper
async function logCurrentPage(pageInfo: PageMetadata): Promise<void> {
  console.log("Requesting background script to create paper entry");
  
  // Pass pageInfo to background script for processing by the source system
  chrome.runtime.sendMessage({
    type: 'createManualPaperEntry',
    pageInfo
  }, (response: { success: boolean; metadata?: PaperMetadata; error?: string }) => {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    if (response && response.success && response.metadata) {
      const metadata = response.metadata;
      statusElement.textContent = 'Page tracked successfully!';
      
      // Update UI to show the logged paper
      updateUI(metadata);
      
      // Start a session for this paper
      chrome.runtime.sendMessage({
        type: 'startSession',
        sourceId: metadata.sourceId,
        paperId: metadata.paperId
      });
      
      // Enable rating buttons
      const thumbsUpButton = document.getElementById('thumbsUp') as HTMLButtonElement;
      const thumbsDownButton = document.getElementById('thumbsDown') as HTMLButtonElement;
      
      if (thumbsUpButton && thumbsDownButton) {
        thumbsUpButton.disabled = false;
        thumbsDownButton.disabled = false;
      }
      
      // Hide manual log section
      const manualLogSection = document.getElementById('manualLogSection');
      if (manualLogSection) {
        manualLogSection.style.display = 'none';
      }
    } else {
      statusElement.textContent = 'Error: ' + (response?.error || 'Failed to log paper');
    }
  });
}

// Function to update UI with paper data
function updateUI(paperData: PaperMetadata | null): void {
  const titleElement = document.getElementById('paperTitle');
  const authorsElement = document.getElementById('paperAuthors');
  const statusElement = document.getElementById('status');
  const manualLogSection = document.getElementById('manualLogSection');

  if (!titleElement || !authorsElement || !statusElement || !manualLogSection) {
    console.error('Required DOM elements not found');
    return;
  }

  if (paperData) {
    // Show detected paper data
    titleElement.textContent = paperData.title || paperData.paperId;
    authorsElement.textContent = paperData.authors;
    statusElement.textContent = 'Paper tracked! Issue created on GitHub.';
    
    // Enable rating buttons
    const thumbsUpButton = document.getElementById('thumbsUp') as HTMLButtonElement;
    const thumbsDownButton = document.getElementById('thumbsDown') as HTMLButtonElement;
    
    if (thumbsUpButton && thumbsDownButton) {
      thumbsUpButton.disabled = false;
      thumbsDownButton.disabled = false;
      
      // Set active state on rating buttons
      thumbsUpButton.classList.toggle('active', paperData.rating === 'thumbsup');
      thumbsDownButton.classList.toggle('active', paperData.rating === 'thumbsdown');
    }
    
    // Hide manual log section
    manualLogSection.style.display = 'none';
  } else {
    // No paper detected - show manual log option
    titleElement.textContent = 'No paper detected';
    authorsElement.textContent = '';
    statusElement.textContent = 'Current page not recognized as a paper';
    
    // Disable rating buttons
    const thumbsUpButton = document.getElementById('thumbsUp') as HTMLButtonElement;
    const thumbsDownButton = document.getElementById('thumbsDown') as HTMLButtonElement;
    
    if (thumbsUpButton && thumbsDownButton) {
      thumbsUpButton.disabled = true;
      thumbsDownButton.disabled = true;
    }
    
    // Show manual log section
    manualLogSection.style.display = 'block';
  }
}

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup opened');
  
  // Get current tab info with metadata
  const tabInfo = await getCurrentTabInfo();
  console.log('Current tab:', tabInfo);
  
  // Get paper from the session tracker
  let paperData: PaperMetadata | null = null;
  let retries = 3;
  
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
        type: 'updateRating',
        rating: 'thumbsup'
      }, (response: MessageResponse) => {
        const statusElement = document.getElementById('status');
        const thumbsUpButton = document.getElementById('thumbsUp');
        const thumbsDownButton = document.getElementById('thumbsDown');
        
        if (!statusElement || !thumbsUpButton || !thumbsDownButton) return;
        
        if (response && response.success) {
          statusElement.textContent = 'Rating updated to: thumbs up';
          thumbsUpButton.classList.add('active');
          thumbsDownButton.classList.remove('active');
          setTimeout(() => window.close(), 1500);
        } else {
          statusElement.textContent = 'Error: ' + (response?.error || 'Unknown error');
        }
      });
    });
  }
  
  const thumbsDownButton = document.getElementById('thumbsDown');
  if (thumbsDownButton) {
    thumbsDownButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({
        type: 'updateRating',
        rating: 'thumbsdown'
      }, (response: MessageResponse) => {
        const statusElement = document.getElementById('status');
        const thumbsUpButton = document.getElementById('thumbsUp');
        const thumbsDownButton = document.getElementById('thumbsDown');
        
        if (!statusElement || !thumbsUpButton || !thumbsDownButton) return;
        
        if (response && response.success) {
          statusElement.textContent = 'Rating updated to: thumbs down';
          thumbsDownButton.classList.add('active');
          thumbsUpButton.classList.remove('active');
          setTimeout(() => window.close(), 1500);
        } else {
          statusElement.textContent = 'Error: ' + (response?.error || 'Unknown error');
        }
      });
    });
  }
  
  // Set up one-click logging button
  const logPageButton = document.getElementById('logPageButton');
  if (logPageButton) {
    console.log("Attaching logPageButton event listener...");
    logPageButton.addEventListener('click', () => {
      console.log("logPageButton clicked...");
      logCurrentPage(tabInfo);
    });
  }
});
