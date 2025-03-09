// content/message_handlers.ts - Handle messages between content script and background

import { detectPaperSource, trackPaper } from './paper_detector';

/**
 * Initialize message handlers for content script
 */
export function initializeMessageHandlers(): void {
  console.log('Initializing content script message handlers');
  
  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener(handleMessage);
  
  // Listen for messages from the page script
  window.addEventListener('message', handleWindowMessage);
}

/**
 * Handle messages from the background script
 * @param {any} message Message data
 * @param {chrome.runtime.MessageSender} sender Message sender
 * @param {Function} sendResponse Response callback
 * @returns {boolean} Whether to use sendResponse asynchronously
 */
function handleMessage(
  message: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): boolean {
  console.log('Content script received message:', message);

  // Handle different message types
  switch (message.type) {
    case 'detectPaper':
      // Check if the current page is a paper
      const currentUrl = window.location.href;
      const sourceInfo = detectPaperSource(currentUrl);
      sendResponse(sourceInfo);
      break;

    case 'trackCurrentPaper':
      // Track the current page as a paper
      trackPaper(window.location.href);
      sendResponse({ success: true });
      break;
      
    case 'extractMetadata':
      // Extract metadata from the current page
      const metadata = extractMetadataFromPage();
      sendResponse(metadata);
      break;
      
    case 'injectAnnotator':
      // Inject annotator on specific element
      if (message.selector) {
        try {
          const element = document.querySelector(message.selector);
          if (element) {
            // TODO: Implement specialized annotator injection
            sendResponse({ success: true });
          } else {
            sendResponse({ success: false, error: 'Element not found' });
          }
        } catch (error) {
          sendResponse({ success: false, error: String(error) });
        }
      }
      break;
      
    default:
      // Unhandled message type
      console.log('Unhandled message type:', message.type);
  }

  return true; // Keep channel open for async response
}

/**
 * Handle messages from the page script
 * @param {MessageEvent} event Window message event
 */
function handleWindowMessage(event: MessageEvent): void {
  // Ensure message is from the same origin
  if (event.source !== window) {
    return;
  }

  const message = event.data;
  
  // Check if it's a message for our extension
  if (typeof message !== 'object' || message === null || message.target !== 'paper_tracker_extension') {
    return;
  }

  console.log('Content script received window message:', message);

  // Handle different action types
  switch (message.action) {
    case 'trackPaper':
      if (message.url) {
        trackPaper(message.url);
        // Respond to the page script
        window.postMessage({
          source: 'paper_tracker_extension',
          response: 'trackPaper',
          success: true
        }, '*');
      }
      break;

    case 'detectPaper':
      if (message.url) {
        const sourceInfo = detectPaperSource(message.url);
        // Respond to the page script
        window.postMessage({
          source: 'paper_tracker_extension',
          response: 'detectPaper',
          data: sourceInfo
        }, '*');
      }
      break;

    default:
      console.log('Unhandled window message action:', message.action);
  }
}

/**
 * Extract metadata from the current page
 * @returns {Object} Page metadata
 */
function extractMetadataFromPage(): Record<string, any> {
  // Helper to safely get meta content
  const getMetaContent = (selector: string): string | undefined => {
    const element = document.querySelector(selector);
    return element && 'content' in element ? 
      (element as HTMLMetaElement).content : undefined;
  };

  // Extract common metadata fields
  const metadata: Record<string, any> = {
    title: getMetaContent('meta[name="citation_title"]') ||
           getMetaContent('meta[property="og:title"]') ||
           document.title,
    authors: getMetaContent('meta[name="citation_author"]') ||
             getMetaContent('meta[name="citation_authors"]') ||
             getMetaContent('meta[name="author"]'),
    abstract: getMetaContent('meta[name="description"]') ||
              getMetaContent('meta[property="og:description"]') ||
              getMetaContent('meta[name="citation_abstract"]'),
    published_date: getMetaContent('meta[name="citation_publication_date"]') ||
                    getMetaContent('meta[name="citation_date"]'),
    doi: getMetaContent('meta[name="citation_doi"]'),
    url: getMetaContent('meta[property="og:url"]') || window.location.href
  };

  // Try to get abstract from various elements if not found in meta tags
  if (!metadata.abstract) {
    // Common abstract containers
    const abstractElement = document.querySelector('.abstract') || 
                           document.querySelector('#abstract') ||
                           document.querySelector('[class*="abstract"]') ||
                           document.querySelector('[id*="abstract"]');
    
    if (abstractElement) {
      metadata.abstract = abstractElement.textContent?.trim();
    }
  }

  return metadata;
}
