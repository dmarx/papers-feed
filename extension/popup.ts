// popup.ts
// TypeScript conversion of popup.js

console.log('Popup script starting...');

import { PaperMetadata } from './papers/types';

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
interface PageMetadata {
  url: string;
  title: string;
  authors: string;
  description: string;
  publishedDate: string;
  // new fields, may cause issues downstream
  doi?: string;
  journalName?: string;
  tags?: string[];
}

// Function to extract metadata from the page with support for Dublin Core and Citation metadata
// TODO: move this to generic or base source-integration
function extractPageMetadata(): Partial<PageMetadata> {
  const metadata: Partial<PageMetadata> = {
    title: '',
    authors: '',
    description: '',
    publishedDate: '',
    doi: '',
    journalName: '',
    tags: []
  };

  // Helper function to get content from meta tags
  const getMetaContent = (selector: string): string => {
    const element = document.querySelector(selector);
    return element ? element.getAttribute('content') || '' : '';
  };

  // Title extraction - priority order
  metadata.title = 
    // Dublin Core
    getMetaContent('meta[name="DC.Title"]') ||
    // Citation
    getMetaContent('meta[name="citation_title"]') ||
    // Open Graph
    getMetaContent('meta[property="og:title"]') ||
    // Standard meta
    getMetaContent('meta[name="title"]') ||
    // Fallback to document title
    document.title;

  // Author extraction - multiple possibilities and potentially multiple authors
  const dcCreator = getMetaContent('meta[name="DC.Creator.PersonalName"]');
  const citationAuthor = getMetaContent('meta[name="citation_author"]');
  const ogAuthor = getMetaContent('meta[property="og:article:author"]') || 
                  getMetaContent('meta[name="author"]');
  
  // Get all citation authors (some pages have multiple citation_author tags)
  const citationAuthors: string[] = [];
  document.querySelectorAll('meta[name="citation_author"]').forEach(el => {
    const content = el.getAttribute('content');
    if (content) citationAuthors.push(content);
  });
  
  // Get all DC creators
  const dcCreators: string[] = [];
  document.querySelectorAll('meta[name="DC.Creator.PersonalName"]').forEach(el => {
    const content = el.getAttribute('content');
    if (content) dcCreators.push(content);
  });
  
  // Set authors with priority
  if (dcCreators.length > 0) {
    metadata.authors = dcCreators.join(', ');
  } else if (citationAuthors.length > 0) {
    metadata.authors = citationAuthors.join(', ');
  } else if (dcCreator) {
    metadata.authors = dcCreator;
  } else if (citationAuthor) {
    metadata.authors = citationAuthor;
  } else if (ogAuthor) {
    metadata.authors = ogAuthor;
  }

  // Description/Abstract extraction
  metadata.description = 
    getMetaContent('meta[name="DC.Description"]') ||
    getMetaContent('meta[name="citation_abstract"]') ||
    getMetaContent('meta[property="og:description"]') || 
    getMetaContent('meta[name="description"]');

  // Publication date extraction
  metadata.publishedDate = 
    getMetaContent('meta[name="DC.Date.issued"]') ||
    getMetaContent('meta[name="citation_date"]') ||
    getMetaContent('meta[property="article:published_time"]');

  // DOI extraction
  metadata.doi = 
    getMetaContent('meta[name="DC.Identifier.DOI"]') ||
    getMetaContent('meta[name="citation_doi"]');

  // Journal name extraction
  metadata.journalName = 
    getMetaContent('meta[name="DC.Source"]') ||
    getMetaContent('meta[name="citation_journal_title"]');

  // Extract keywords/tags if available
  const keywords = getMetaContent('meta[name="keywords"]') || 
                  getMetaContent('meta[name="DC.Subject"]');
  
  if (keywords) {
    metadata.tags = keywords.split(',').map(tag => tag.trim());
  }

  console.log('Extracted metadata:', metadata);
  return metadata;
}

// Function to get current tab info and metadata
async function getCurrentTabInfo(): Promise<PageMetadata> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0] && tabs[0].id) {
        // Execute script to extract metadata from page
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: extractPageMetadata
        }, (results) => {
          if (results && results[0] && results[0].result) {
            resolve({
              url: tabs[0].url || '',
              title: tabs[0].title || '',
              ...results[0].result as Partial<PageMetadata>
            } as PageMetadata);
          } else {
            resolve({
              url: tabs[0].url || '',
              title: tabs[0].title || '',
              authors: '',
              description: '',
              publishedDate: ''
            });
          }
        });
      } else {
        resolve({ 
          url: '', 
          title: '', 
          authors: '', 
          description: '',
          publishedDate: '' 
        });
      }
    });
  });
}

// Generate a paper ID from a URL
function generatePaperIdFromUrl(url: string): string {
  // Use a basic hash function to create an ID from the URL
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create a positive hexadecimal string
  const positiveHash = Math.abs(hash).toString(16).toUpperCase();
  
  // sourceType will get prepended elsewhere, this is just generating a 
  // "source-specific" `paperId`, not the system-internal `objectId`
  return `${positiveHash.substring(0, 8)}`;
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

// Interface for message response
interface MessageResponse {
  success: boolean;
  error?: string;
}

// Function to log current page as a paper (one-click experience)
async function logCurrentPage(pageInfo: PageMetadata): Promise<void> {
  console.log("attempting to log paper");
  // Generate a paper ID from the URL
  const paperId = generatePaperIdFromUrl(pageInfo.url);
  console.log("generated paperId:", paperId);
  
  // Use 'pdf' or 'url' as the source identifier
  const sourceId = pageInfo.url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'url';
  
  // Create paper metadata with extracted info
  const metadata: PaperMetadata = {
    sourceId: sourceId,
    paperId: paperId,
    url: pageInfo.url,
    title: pageInfo.title || paperId,
    authors: pageInfo.authors || '',
    abstract: pageInfo.description || '',
    timestamp: new Date().toISOString(),
    publishedDate: pageInfo.publishedDate || '',
    tags: [],
    rating: 'novote'
  };

  console.log("PaperMetadata:", metadata);
  
  // Send to background script
  chrome.runtime.sendMessage({
    type: 'manualPaperLog',
    metadata: metadata
  }, (response: MessageResponse) => {
    const statusElement = document.getElementById('status');
    if (!statusElement) return;

    if (response && response.success) {
      statusElement.textContent = 'Page tracked successfully!';
      
      // Update UI to show the logged paper
      updateUI(metadata);
      
      // Start a session for this paper
      chrome.runtime.sendMessage({
        type: 'startSession',
        sourceId: sourceId,
        paperId: paperId
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
