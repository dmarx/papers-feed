// extension/background.ts
// Background script with direct source imports

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig, getConfigurationInMs } from './config/session';
import { SessionTracker } from './utils/session-tracker';
import { PopupManager } from './utils/popup-manager';
import { SourceIntegrationManager } from './source-integration/source-manager';
import { loguru } from './utils/logger';

// Import source plugins directly
import { arxivIntegration } from './source-integration/arxiv';
import { Message } from './source-integration/types';

const logger = loguru.getLogger('background');

// Global state
let githubToken = '';
let githubRepo = '';
let currentPaperData: any = null;
let sessionConfig: any = null;
let paperManager: PaperManager | null = null;
let sessionTracker: SessionTracker | null = null;
let popupManager: PopupManager | null = null;
let sourceManager: SourceIntegrationManager | null = null;

// Initialize sources
function initializeSources() {
  sourceManager = new SourceIntegrationManager();
  
  // Register built-in sources directly
  sourceManager.registerSource(arxivIntegration);
  
  logger.info('Source manager initialized');
  return sourceManager;
}

// Initialize everything
async function initialize() {
  try {
    // Initialize sources first
    initializeSources();
    
    // Load GitHub credentials
    const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
    githubToken = items.githubToken || '';
    githubRepo = items.githubRepo || '';
    logger.info('Credentials loaded', { hasToken: !!githubToken, hasRepo: !!githubRepo });
    
    // Initialize paper manager if we have credentials
    if (githubToken && githubRepo) {
      const githubClient = new GitHubStoreClient(githubToken, githubRepo);
      paperManager = new PaperManager(githubClient);
      logger.info('Paper manager initialized');
    }
    
    // Load session configuration
    const rawConfig = await loadSessionConfig();
    sessionConfig = getConfigurationInMs(rawConfig);
    logger.info('Session configuration loaded', sessionConfig);
    
    // Initialize session tracker
    sessionTracker = new SessionTracker(sessionConfig);
    logger.info('Session tracker initialized');
    
    // Initialize popup manager
    popupManager = new PopupManager(
      () => sourceManager,
      () => paperManager
    );
    logger.info('Popup manager initialized');
    
    // Set up message listeners
    setupMessageListeners();
    
    // Initialize debug objects
    initializeDebugObjects();
  } catch (error) {
    logger.error('Initialization error', error);
  }
}

// Set up message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    if (message.type === 'contentScriptReady' && sender.tab?.id) {
      logger.debug('Content script ready:', sender.tab.url);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'paperMetadata' && message.metadata) {
      // Store metadata received from content script
      handlePaperMetadata(message.metadata, sender.tab?.id);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'getCurrentPaper') {
      logger.debug('Popup requested current paper', currentPaperData);
      sendResponse(currentPaperData);
      return true;
    }
    
    if (message.type === 'updateRating') {
      logger.debug('Rating update requested:', message.rating);
      handleUpdateRating(message.rating, sendResponse);
      return true; // Will respond asynchronously
    }
    
    if (message.type === 'showAnnotationPopup') {
      // This is now handled directly by the PopupManager
      return false;
    }
    
    if (message.type === 'popupAction') {
      // This is now handled directly by the PopupManager
      return false;
    }
    
    return false;
  });
}

// Handle paper metadata from content script
async function handlePaperMetadata(metadata: any, tabId?: number) {
  logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
  
  try {
    // Store current paper data
    currentPaperData = metadata;
    
    // Store in GitHub if we have a paper manager
    if (paperManager) {
      await paperManager.getOrCreatePaper(metadata);
      logger.debug('Paper metadata stored in GitHub');
    }
    
    // Start tracking session
    if (sessionTracker) {
      sessionTracker.startSession(metadata.sourceId, metadata.paperId);
      logger.debug('Started tracking session');
    }
  } catch (error) {
    logger.error('Error handling paper metadata', error);
  }
}

// Handle rating update
async function handleUpdateRating(rating: string, sendResponse: (response: any) => void) {
  if (!paperManager) {
    sendResponse({ success: false, error: 'Paper manager not initialized' });
    return;
  }

  if (!currentPaperData) {
    sendResponse({ success: false, error: 'No current paper' });
    return;
  }

  try {
    await paperManager.updateRating(
      currentPaperData.sourceId,
      currentPaperData.paperId, 
      rating
    );
    currentPaperData.rating = rating;
    sendResponse({ success: true });
  } catch (error) {
    logger.error('Error updating rating:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Listen for credential changes
chrome.storage.onChanged.addListener(async (changes) => {
  logger.debug('Storage changes detected', Object.keys(changes));
  
  if (changes.githubToken) {
    githubToken = changes.githubToken.newValue;
  }
  if (changes.githubRepo) {
    githubRepo = changes.githubRepo.newValue;
  }
  if (changes.sessionConfig) {
    sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
    logger.info('Session configuration updated', sessionConfig);
    
    // Update session tracker with new config
    if (sessionTracker && sessionConfig) {
      sessionTracker = new SessionTracker(sessionConfig);
    }
  }
  
  // Reinitialize paper manager if credentials changed
  if (changes.githubToken || changes.githubRepo) {
    if (githubToken && githubRepo) {
      const githubClient = new GitHubStoreClient(githubToken, githubRepo);
      paperManager = new PaperManager(githubClient);
      logger.info('Paper manager reinitialized');
    }
  }
});

// Tab and window management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleTabChange(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    handleTabChange(tab);
  }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Window lost focus, end current session
    endCurrentSession();
  }
});

async function handleTabChange(tab: chrome.tabs.Tab) {
  if (!tab.url || !sessionTracker || !sourceManager) {
    return;
  }
  
  // Check if URL matches any registered source
  const source = sourceManager.getSourceForUrl(tab.url);
  
  if (!source) {
    logger.debug('No supported paper source detected, ending session');
    await endCurrentSession();
    return;
  }
  
  // Extract paper ID
  const extractedInfo = sourceManager.extractPaperId(tab.url);
  
  if (!extractedInfo) {
    logger.debug('No paper ID found in URL, ending session');
    await endCurrentSession();
    return;
  }
  
  // Get current session info
  const currentPaper = sessionTracker.getCurrentPaper();
  
  // End session if different paper
  if (currentPaper.sourceId && currentPaper.paperId && 
      (currentPaper.sourceId !== extractedInfo.sourceId || 
       currentPaper.paperId !== extractedInfo.paperId)) {
    logger.debug('Different paper detected, ending existing session');
    await endCurrentSession();
  }
  
  // Note: We don't start a new session here as we'll wait for the content script
  // to send us the metadata first
}

async function endCurrentSession() {
  if (!sessionTracker) {
    return;
  }
  
  // Get current paper info
  const currentPaper = sessionTracker.getCurrentPaper();
  
  if (currentPaper.sourceId && currentPaper.paperId && paperManager) {
    logger.info('Ending session for paper', { 
      source: currentPaper.sourceId,
      paperId: currentPaper.paperId
    });
    
    // End session and get data
    const sessionData = sessionTracker.endSession();
    
    if (sessionData && currentPaperData) {
      logger.debug('Creating reading event', sessionData);
      
      // Store reading session
      await paperManager.logReadingSession(
        currentPaper.sourceId,
        currentPaper.paperId,
        sessionData,
        currentPaperData
      );
    }
    
    // Clear current paper data
    currentPaperData = null;
  }
}

// Initialize debug objects in service worker scope
function initializeDebugObjects() {
  // @ts-ignore
  globalThis.__DEBUG__ = {
    get paperManager() { return paperManager; },
    get sessionTracker() { return sessionTracker; },
    get popupManager() { return popupManager; },
    get sourceManager() { return sourceManager; },
    getGithubClient: () => paperManager ? paperManager.getClient() : null,
    getCurrentPaper: () => currentPaperData,
    getSessionConfig: () => sessionConfig,
    getSessionMetadata: () => sessionTracker?.getCurrentSessionMetadata(),
    getSources: () => sourceManager?.getAllSources()
  };

  logger.info('Debug objects registered');
}

// Initialize extension
initialize();
