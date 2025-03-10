// extension/content/message_handlers.ts
// Handle messages between content script and background

import { loguru } from '../utils/logger';

const logger = loguru.getLogger('ContentMessageHandlers');

/**
 * Initialize message handlers for content script
 */
export function initializeMessageHandlers(): void {
  logger.info('Initializing content script message handlers');
  
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
  logger.info('Content script received message:', message);

  // Handle different message types
  switch (message.type) {
    case 'extractPageMetadata':
      // Execute the extractor code on the current page
      executeExtractor(message.extractorCode, window.location.href)
        .then(metadata => {
          sendResponse({ 
            success: true, 
            metadata 
          });
        })
        .catch(error => {
          logger.error('Error executing extractor:', error);
          sendResponse({ 
            success: false, 
            error: String(error) 
          });
        });
      break;

    case 'getPluginForUrl':
      // We don't need to do anything here, just report success
      // This is handled by the background script
      sendResponse({ success: true });
      break;
      
    default:
      // Unhandled message type
      logger.info('Unhandled message type:', message.type);
      sendResponse({ 
        success: false, 
        error: `Unhandled message type: ${message.type}` 
      });
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

  logger.info('Content script received window message:', message);

  // Handle different action types
  switch (message.action) {
    case 'extractMetadata':
      // Request the extractor from the background script
      chrome.runtime.sendMessage({
        type: 'getExtractorForUrl',
        url: window.location.href
      }, async (response) => {
        if (response && response.success && response.extractorCode) {
          try {
            // Execute the extractor code
            const metadata = await executeExtractor(response.extractorCode, window.location.href);
            
            // Send result back to the page
            window.postMessage({
              source: 'paper_tracker_extension',
              response: 'extractMetadata',
              success: true,
              metadata
            }, '*');
          } catch (error) {
            window.postMessage({
              source: 'paper_tracker_extension',
              response: 'extractMetadata',
              success: false,
              error: String(error)
            }, '*');
          }
        } else {
          window.postMessage({
            source: 'paper_tracker_extension',
            response: 'extractMetadata',
            success: false,
            error: response?.error || 'No extractor available'
          }, '*');
        }
      });
      break;

    default:
      logger.info('Unhandled window message action:', message.action);
  }
}

/**
 * Execute extractor code in the content script context
 * @param {string} extractorCode Code to execute
 * @param {string} url Page URL
 * @returns {Promise<any>} Extracted metadata
 */
async function executeExtractor(extractorCode: string, url: string): Promise<any> {
  try {
    // Create a function from the extractor code string
    const extractorFn = new Function('document', 'url', `
      return (async function(document, url) {
        ${extractorCode}
      })(document, url);
    `);
    
    // Execute the extractor function
    const metadata = await extractorFn(document, url);
    
    if (metadata) {
      logger.info(`Extracted metadata: ${metadata.title || 'Untitled'}`);
      return metadata;
    } else {
      logger.warning('Extractor returned no metadata');
      return null;
    }
  } catch (error) {
    logger.error(`Error executing extractor: ${error}`);
    throw error;
  }
}

/**
 * Extract metadata from the current page
 * @returns {Promise<any>} Extracted metadata
 */
export async function extractCurrentPageMetadata(): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'getExtractorForUrl',
      url: window.location.href
    }, async response => {
      if (!response || !response.success || !response.extractorCode) {
        return resolve(null);
      }
      
      try {
        const metadata = await executeExtractor(response.extractorCode, window.location.href);
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Report extracted metadata to the background script
 * @param {any} metadata Extracted metadata
 * @returns {Promise<boolean>} Success status
 */
export async function reportExtractedMetadata(metadata: any): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: 'metadataExtracted',
      data: metadata
    }, response => {
      resolve(response && response.success);
    });
  });
}
