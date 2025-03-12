// extension/content/message_handlers.ts
// Handle messages between content script and background

import { loguru } from '../utils/logger';
import type { ExtractorLoader } from '../types/extractors';
import { UnifiedPaperData } from '../types/common';

const logger = loguru.getLogger('ContentMessageHandlers');

// Type definitions for loader functions
type ExtractMetadataFn = (
  pluginId: string, 
  document: Document, 
  url: string
) => Promise<Partial<UnifiedPaperData> | null>;

type LoadExtractorFn = (pluginId: string) => Promise<any>;

// We declare these variables but don't assign them yet
// They'll be assigned at runtime through the dynamic import
let extractMetadata: ExtractMetadataFn;
let loadExtractor: LoadExtractorFn;

// Initialize with stub functions that will be replaced at runtime
extractMetadata = async (pluginId: string, doc: Document, url: string) => {
  logger.warning(`Using stub extractMetadata function. Real loader not initialized for plugin: ${pluginId}`);
  return null;
};

loadExtractor = async (pluginId: string) => {
  logger.warning(`Using stub loadExtractor function. Real loader not initialized for plugin: ${pluginId}`);
  return null;
};

// This code runs at runtime but not during type-checking
// Use a dynamic import to avoid TypeScript requiring the file during compilation
// @ts-ignore
if (typeof window !== 'undefined') {
  // We're in a browser environment, so try to load the module
  import('../dist/extractors/loader')
    .then((loaderModule) => {
      // Replace stubs with real functions
      extractMetadata = loaderModule.extractMetadata;
      loadExtractor = loaderModule.loadExtractor;
      logger.info('Successfully loaded extractor module');
    })
    .catch((error) => {
      logger.error('Failed to load extractor module:', error);
      // Continue with stub functions
    });
}

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
      // Extract metadata using the plugin extractor
      if (message.pluginId) {
        extractMetadata(message.pluginId, document, window.location.href)
          .then((metadata: any) => {
            sendResponse({ 
              success: true, 
              metadata 
            });
          })
          .catch((error: Error) => {
            logger.error('Error executing extractor:', error);
            sendResponse({ 
              success: false, 
              error: String(error) 
            });
          });
      } else {
        // No plugin ID provided
        sendResponse({ 
          success: false, 
          error: 'No plugin ID provided for extraction' 
        });
      }
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
      // Request the plugin ID from the background script
      chrome.runtime.sendMessage({
        type: 'getPluginForUrl',
        url: window.location.href
      }, async (response) => {
        if (response && response.success && response.pluginId) {
          try {
            // Extract metadata using the plugin system
            const metadata = await extractMetadata(response.pluginId, document, window.location.href);
            
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
            error: 'No plugin available for this URL'
          }, '*');
        }
      });
      break;

    default:
      logger.info('Unhandled window message action:', message.action);
  }
}

/**
 * Extract metadata from the current page
 * @returns {Promise<any>} Extracted metadata
 */
export async function extractCurrentPageMetadata(): Promise<any> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: 'getPluginForUrl',
      url: window.location.href
    }, async response => {
      try {
        if (response && response.success && response.pluginId) {
          // Use the plugin system to extract metadata
          const metadata = await extractMetadata(response.pluginId, document, window.location.href);
          resolve(metadata);
        } else {
          // No plugin found for this URL
          resolve(null);
        }
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
