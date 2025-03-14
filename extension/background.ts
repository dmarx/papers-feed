// background.ts
// Enhanced background script with source manager

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig, getConfigurationInMs } from './config/session.js';
import { SessionTracker } from './utils/session-tracker';
import { PopupManager } from './utils/popup-manager';
import { SourceIntegrationManager } from './source-integration/source-manager';
import { arxivSource } from './source-integration/plugins/arxiv';
import { loguru } from './utils/logger';

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
  
  // Register built-in sources
  sourceManager.registerSource(arxivSource);
  
  // TODO: Add mechanism to load additional sources from config or storage
  
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
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'getCurrentPaper') {
      logger.debug('Popup requested current paper', currentPaperData);
      sendResponse(currentPaperData);
      return true;
    }
    
    if (message.type === 'contentScriptReady' && sender.tab?.id && sender.tab?.url) {
      logger.debug('Content script ready:', sender.tab.url);
      
      // Send sources to content script
      sendSourcesToContentScript(sender.tab.id);
      
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'paperMetadata' && message.metadata) {
      // Store metadata received from content script
      handlePaperMetadata(message.metadata, sender.tab?.id);
      sendResponse({ success: true });
      return true;
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

// Initialize extension
initialize();

// Tab and window management
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
  if (!sessionTracker || !paperManager) {
    return;
  }
  
  // Get current paper info
  const currentPaper = sessionTracker.getCurrentPaper();
  
  if (currentPaper.sourceId && currentPaper.paperId) {
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

// Send sources to content script
async function sendSourcesToContentScript(tabId: number): Promise<void> {
  if (!sourceManager) {
    return;
  }
  
  try {
    const sources = sourceManager.getAllSources();
    
    await chrome.tabs.sendMessage(tabId, {
      type: 'registerSources',
      sources
    });
    
    logger.debug('Sent sources to content script', tabId);
  } catch (error) {
    logger.error('Error sending sources to content script', error);
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
    getGithubClient: () => paperManager?.client,
    getCurrentPaper: () => currentPaperData,
    getSessionConfig: () => sessionConfig,
    getSessionMetadata: () => sessionTracker?.getCurrentSessionMetadata(),
    getSources: () => sourceManager?.getAllSources()
  };

  logger.info('Debug objects registered');
}
