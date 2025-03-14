// content.ts
// Generic content script for all integrations

import { LinkProcessor } from './source-integration/link-processor';
import { loguru } from './utils/logger';

const logger = loguru.getLogger('content-script');

logger.info('Paper Tracker content script loaded');

// Create link processor
const linkProcessor = new LinkProcessor();

// Track active popup
let activePopup: HTMLElement | null = null;

// Inject common styles
function injectStyles() {
  if (document.getElementById('paper-tracker-styles')) {
    return; // Already injected
  }
  
  const styles = `
  .paper-annotator {
    display: inline-block;
    margin-left: 4px;
    cursor: pointer;
    font-size: 0.9em;
    opacity: 0.7;
    transition: opacity 0.2s;
    vertical-align: baseline;
  }

  .paper-annotator:hover {
    opacity: 1;
  }

  .paper-popup-wrapper {
    position: fixed;
    z-index: 10000;
  }

  .paper-popup {
    position: relative;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 300px;
    box-sizing: border-box;
  }

  .paper-popup-header {
    font-weight: bold;
    margin-bottom: 8px;
    line-height: 1.4;
    font-size: 1em;
  }

  .paper-popup-meta {
    color: #666;
    font-size: 0.85em;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .paper-popup-buttons {
    display: flex;
    gap: 8px;
    margin: 8px 0;
  }

  .paper-popup button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
  }

  .paper-popup button:hover {
    background: #e8e8e8;
    border-color: #ccc;
  }

  .paper-popup button.active {
    background: #e0e0e0;
    border-color: #aaa;
  }

  .paper-popup textarea {
    width: calc(100% - 16px);
    min-height: 80px;
    margin: 8px 0;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9em;
    line-height: 1.4;
    box-sizing: border-box;
  }

  .paper-popup textarea:focus {
    outline: none;
    border-color: #aaa;
  }

  .paper-popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }

  .paper-popup .save-button {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .paper-popup .save-button:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
  `;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = 'paper-tracker-styles';
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  
  logger.debug('Injected styles');
}

// Set up click-outside handler for popups
document.addEventListener('click', (e) => {
  if (activePopup && 
      !activePopup.contains(e.target as Node) && 
      !(e.target as Element).classList.contains('paper-annotator')) {
    activePopup.parentElement?.remove();
    activePopup = null;
  }
});

// Message handler for background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug('Received message', message);
  
  if (message.type === 'parseArXivXML') {
    try {
      // Parse the XML using the browser's DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(message.xmlText, 'text/xml');
      
      // Check for parse errors
      const parseError = xmlDoc.querySelector('parsererror');
      if (parseError) {
        throw new Error('XML parsing error: ' + parseError.textContent);
      }
      
      // Get entry element
      const entry = xmlDoc.querySelector('entry');
      if (!entry) {
        throw new Error('No entry element found in XML');
      }
      
      // Extract basic fields
      const title = entry.querySelector('title')?.textContent?.trim() || '';
      const summary = entry.querySelector('summary')?.textContent?.trim() || '';
      const published = entry.querySelector('published')?.textContent?.trim() || '';
      
      // Extract authors
      const authors = Array.from(entry.querySelectorAll('author name'))
        .map(name => name.textContent?.trim() || '');
      
      // Extract categories/tags
      const categories = new Set<string>();
      
      // Primary category
      const primaryCategory = entry.querySelector('arxiv\\:primary_category, primary_category');
      if (primaryCategory && primaryCategory.hasAttribute('term')) {
        categories.add(primaryCategory.getAttribute('term') || '');
      }
      
      // Other categories
      const categoryElements = entry.querySelectorAll('category');
      categoryElements.forEach(cat => {
        if (cat.hasAttribute('term')) {
          categories.add(cat.getAttribute('term') || '');
        }
      });
      
      const result = {
        title,
        summary,
        authors,
        published_date: published,
        arxiv_tags: Array.from(categories)
      };
      
      sendResponse({ success: true, data: result });
    } catch (error) {
      logger.error('Error parsing ArXiv XML', error);
      sendResponse({ success: false, error: (error as Error).message });
    }
    return true;
  }

  if (message.type === 'registerPatterns') {
    // Register URL patterns for link detection
    message.patterns.forEach((patternInfo: any) => {
      linkProcessor.registerPattern({
        sourceId: patternInfo.sourceId,
        pattern: new RegExp(patternInfo.pattern),
        extractPaperId: (url: string) => {
          // Execute extractPaperId function from string
          try {
            return new Function('url', patternInfo.extractorCode)(url);
          } catch (error) {
            logger.error('Error extracting paper ID', error);
            return null;
          }
        }
      });
    });
    
    // Process existing links
    linkProcessor.processLinks(document);
    
    // Start observing for new links
    linkProcessor.startObserving(document);
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'showPopup') {
    // Remove existing popup
    if (activePopup) {
      activePopup.parentElement?.remove();
      activePopup = null;
    }
    
    // Create popup wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'paper-popup-wrapper';
    
    // Position near click or element
    if (message.position) {
      wrapper.style.left = `${message.position.x}px`;
      wrapper.style.top = `${message.position.y}px`;
    }
    
    // Create popup
    const popup = document.createElement('div');
    popup.className = 'paper-popup';
    popup.innerHTML = message.html;
    
    // Add to page
    wrapper.appendChild(popup);
    document.body.appendChild(wrapper);
    
    // Set up event handlers
    if (message.handlers) {
      for (const handler of message.handlers) {
        const elements = popup.querySelectorAll(handler.selector);
        elements.forEach(element => {
          element.addEventListener(handler.event, () => {
            chrome.runtime.sendMessage({
              type: 'popupAction',
              action: handler.action,
              sourceId: message.sourceId,
              paperId: message.paperId,
              data: {
                value: (element as HTMLInputElement).value,
                checked: (element as HTMLInputElement).checked,
                id: (element as HTMLElement).id
              }
            });
          });
        });
      }
    }
    
    // Save reference
    activePopup = popup;
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.type === 'processPage') {
    // Re-process the entire page
    linkProcessor.processLinks(document);
    sendResponse({ success: true });
    return true;
  }
});

// Initialize
(async function initialize() {
  // Inject styles
  injectStyles();
  
  // Tell background script we're ready and what page we're on
  chrome.runtime.sendMessage(
    { 
      type: 'contentScriptReady', 
      url: window.location.href 
    },
    (response) => {
      if (response?.success) {
        logger.debug('Background script acknowledged ready status');
      }
    }
  );
})();
