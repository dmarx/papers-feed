// extension/content.ts
// Content script with heartbeat session tracking

import { LinkProcessor } from './source-integration/link-processor';
import { SourceIntegration, Message } from './source-integration/types';
import { PaperMetadata } from './papers/types';
import { loguru } from './utils/logger';

// Import source plugins directly
import { arxivIntegration } from './source-integration/arxiv';

const logger = loguru.getLogger('content-script');

logger.info('Paper Tracker content script loaded');

// Available source integrations
const sourceIntegrations: SourceIntegration[] = [
  arxivIntegration,
  // Add more sources as they become available
];

// Track active popup
let activePopup: HTMLElement | null = null;

// Heartbeat interval
let heartbeatInterval: number | null = null;
const HEARTBEAT_INTERVAL = 5000; // 5 seconds

// Track tab visibility
let isTabVisible = true;

// Create link processor
const linkProcessor = new LinkProcessor((sourceId, paperId, link) => {
  // Callback when link is found
  injectAnnotationButton(link, sourceId, paperId);
});

// Initialize sources
function initializeSources() {
  // Register each source with the link processor
  for (const source of sourceIntegrations) {
    logger.debug(`Initializing source: ${source.id}`);
    
    // Register patterns with link processor
    source.urlPatterns.forEach(pattern => {
      linkProcessor.registerPattern({
        sourceId: source.id,
        pattern,
        extractPaperId: (url: string) => source.extractPaperId(url)
      });
    });
  }
}

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

// Add annotation button to link
function injectAnnotationButton(link: HTMLAnchorElement, sourceId: string, paperId: string): void {
  // Skip if already processed
  if (link.nextSibling && 
      link.nextSibling.nodeType === Node.ELEMENT_NODE &&
      (link.nextSibling as Element).classList.contains('paper-annotator')) {
    return;
  }
  
  // Create annotator button
  const annotator = document.createElement('span');
  annotator.className = 'paper-annotator';
  annotator.textContent = '📝';
  annotator.title = 'Add annotation';
  
  // Store data attributes
  annotator.dataset.sourceId = sourceId;
  annotator.dataset.paperId = paperId;
  
  // Add click handler
  annotator.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Send message to background script to show popup
    chrome.runtime.sendMessage({
      type: 'showAnnotationPopup',
      sourceId,
      paperId,
      position: {
        x: e.clientX,
        y: e.clientY
      }
    });
  });
  
  // Add to page next to link
  link.parentNode?.insertBefore(annotator, link.nextSibling);
}

// Get source that can handle a URL
function getSourceForUrl(url: string): SourceIntegration | null {
  for (const source of sourceIntegrations) {
    if (source.canHandleUrl(url)) {
      return source;
    }
  }
  return null;
}

// Extract paper ID from URL
function extractPaperId(url: string): { sourceId: string, paperId: string } | null {
  for (const source of sourceIntegrations) {
    if (source.canHandleUrl(url)) {
      const paperId = source.extractPaperId(url);
      if (paperId) {
        return { sourceId: source.id, paperId };
      }
    }
  }
  return null;
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

// Start heartbeat for session tracking
function startSessionTracking(sourceId: string, paperId: string) {
  // Stop any existing heartbeat
  stopHeartbeat();
  
  // Only start tracking if tab is visible
  if (!isTabVisible) {
    logger.debug(`Not starting session for ${sourceId}:${paperId} because tab is not visible`);
    return;
  }
  
  // Tell background script to start a new session
  chrome.runtime.sendMessage({
    type: 'startSession',
    sourceId,
    paperId
  }, response => {
    if (response?.success) {
      logger.debug(`Started session for ${sourceId}:${paperId}`);
    } else {
      logger.error(`Failed to start session for ${sourceId}:${paperId}`, response?.error);
    }
  });
  
  // Start sending heartbeats
  heartbeatInterval = window.setInterval(() => {
    chrome.runtime.sendMessage({
      type: 'sessionHeartbeat',
      sourceId,
      paperId,
      timestamp: Date.now()
    });
  }, HEARTBEAT_INTERVAL);
  
  logger.info(`Started heartbeat for ${sourceId}:${paperId}`);
}

// Stop heartbeat
function stopHeartbeat() {
  if (heartbeatInterval !== null) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
    logger.debug('Stopped heartbeat');
  }
}

// Process current page if it's a paper
async function processCurrentPage() {
  const url = window.location.href;
  const paperInfo = extractPaperId(url);
  
  if (paperInfo) {
    logger.info(`Detected paper: ${paperInfo.sourceId}:${paperInfo.paperId}`);
    
    const { sourceId, paperId } = paperInfo;
    const source = sourceIntegrations.find(s => s.id === sourceId);
    
    if (source) {
      try {
        const metadata = await source.extractMetadata(document, paperId);
        
        if (metadata) {
          // Send metadata to background script
          chrome.runtime.sendMessage({
            type: 'paperMetadata',
            metadata
          });
          
          logger.debug(`Sent metadata to background script for ${sourceId}:${paperId}`);
          
          // Start session tracking if tab is visible
          if (isTabVisible) {
            startSessionTracking(sourceId, paperId);
          }
        }
      } catch (error) {
        logger.error(`Error extracting metadata for ${sourceId}:${paperId}`, error);
      }
    }
  }
}

// Visibility change listener
document.addEventListener('visibilitychange', () => {
  const wasVisible = isTabVisible;
  isTabVisible = document.visibilityState === 'visible';
  
  const paperInfo = extractPaperId(window.location.href);
  if (!paperInfo) return;
  
  if (isTabVisible && !wasVisible) {
    // Tab has become visible again - restart session
    logger.info(`Tab became visible again for ${paperInfo.sourceId}:${paperInfo.paperId}`);
    startSessionTracking(paperInfo.sourceId, paperInfo.paperId);
  } else if (!isTabVisible && wasVisible) {
    // Tab has become hidden - end current session
    logger.info(`Tab hidden for ${paperInfo.sourceId}:${paperInfo.paperId}`);
    
    // Send end session message
    chrome.runtime.sendMessage({
      type: 'endSession',
      sourceId: paperInfo.sourceId,
      paperId: paperInfo.paperId,
      reason: 'tab_hidden'
    });
    
    // Stop heartbeat
    stopHeartbeat();
  }
});

// Focus/blur listeners
window.addEventListener('focus', () => {
  const paperInfo = extractPaperId(window.location.href);
  if (!paperInfo) return;
  
  // Tab gained focus - restart session if it wasn't already running
  if (!heartbeatInterval) {
    logger.info(`Tab gained focus for ${paperInfo.sourceId}:${paperInfo.paperId}`);
    startSessionTracking(paperInfo.sourceId, paperInfo.paperId);
  }
});

window.addEventListener('blur', () => {
  const paperInfo = extractPaperId(window.location.href);
  if (!paperInfo) return;
  
  // Tab lost focus - end current session
  logger.info(`Tab lost focus for ${paperInfo.sourceId}:${paperInfo.paperId}`);
  
  // Send end session message
  chrome.runtime.sendMessage({
    type: 'endSession',
    sourceId: paperInfo.sourceId,
    paperId: paperInfo.paperId,
    reason: 'tab_blur'
  });
  
  // Stop heartbeat
  stopHeartbeat();
});

// Inform background when page is unloaded
window.addEventListener('beforeunload', () => {
  const url = window.location.href;
  const paperInfo = extractPaperId(url);
  
  if (paperInfo) {
    // Try to send one last message before page unloads
    chrome.runtime.sendMessage({
      type: 'endSession',
      sourceId: paperInfo.sourceId,
      paperId: paperInfo.paperId,
      reason: 'page_unload'
    });
  }
  
  stopHeartbeat();
});

// Message handler for background script
chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
  logger.debug('Received message', message);
  
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
                value: element.tagName === 'TEXTAREA' ? 
                  (element as HTMLTextAreaElement).value : 
                  (element as HTMLElement).getAttribute('data-vote'),
                checked: element.tagName === 'INPUT' ? 
                  (element as HTMLInputElement).checked : undefined,
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
    processCurrentPage();
    sendResponse({ success: true });
    return true;
  }
});

// Initialize
(async function initialize() {
  // Inject styles
  injectStyles();
  
  // Initialize sources
  initializeSources();
  
  // Process links
  linkProcessor.processLinks(document);
  
  // Start observing for new links
  linkProcessor.startObserving(document);
  
  // Set initial tab visibility
  isTabVisible = document.visibilityState === 'visible';
  
  // Process current page
  processCurrentPage();
  
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

// Set up observer for URL changes (single page apps)
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    processCurrentPage();
  }
}).observe(document, { subtree: true, childList: true });
