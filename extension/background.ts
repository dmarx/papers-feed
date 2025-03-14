// background.ts
// Updated to use consolidated PopupManager

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig, getConfigurationInMs } from './config/session';
import { SourceIntegrationManager } from './source-integration/manager';
import { ArXivIntegration } from './source-integration/arxiv';
import { SessionTracker } from './utils/session-tracker';
import { PopupManager } from './utils/popup-manager';
import { loguru } from './utils/logger';

const logger = loguru.getLogger('background');

// Global state
let githubToken = '';
let githubRepo = '';
let currentPaperData: any = null;
let sessionConfig: any = null;
let paperManager: PaperManager | null = null;
let integrationManager: SourceIntegrationManager | null = null;
let sessionTracker: SessionTracker | null = null;
let popupManager: PopupManager | null = null;

// Initialize integrations
async function initializeIntegrations() {
  integrationManager = new SourceIntegrationManager();
  
  // Register built-in integrations
  integrationManager.registerIntegration(new ArXivIntegration());
  
  logger.info('Integrations initialized');
}

// Initialize everything
async function initialize() {
  try {
    // Initialize integrations first
    await initializeIntegrations();

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
      () => integrationManager ? integrationManager.getAllIntegrations() : [],
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
      
      // Send patterns for this page
      sendPatternsToContentScript(sender.tab.id);
      
      sendResponse({ success: true });
      return true;
    }
    
    // Handle page processing requests
    if (message.type === 'processPageLinks' && sender.tab?.id && sender.tab?.url) {
      processPageLinks(sender.tab.id, sender.tab.url);
      return true;
    }
    
    return false;
  });
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
      
      // Update popup manager with new paper manager
      if (popupManager) {
        popupManager = new PopupManager(
          () => integrationManager ? integrationManager.getAllIntegrations() : [],
          () => paperManager
        );
      }
    }
  }
});

// Initialize extension
initialize();

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

// Listen for URL changes
chrome.webNavigation.onCompleted.addListener(async (details) => {
  logger.debug('Navigation detected:', details.url);
  
  // Find integration that can handle this URL
  if (!integrationManager) {
    return;
  }
  
  const integration = integrationManager.getIntegrationForUrl(details.url);
  
  if (integration) {
    logger.info(`${integration.id} URL detected, processing...`);
    
    // Get paper ID
    const paperId = integration.extractPaperId(details.url);
    
    if (paperId) {
      // Fetch paper data
      const paperData = await integration.fetchPaperMetadata(paperId);
      
      if (paperData && paperManager) {
        logger.debug('Paper data extracted:', paperData);
        
        // Store in GitHub
        await paperManager.getOrCreatePaper(paperData);
        
        // Send patterns to content script
        sendPatternsToContentScript(details.tabId);
      }
    }
  }
}, {
  url: [{ schemes: ['http', 'https'] }]
});

async function handleTabChange(tab: chrome.tabs.Tab) {
  if (!integrationManager || !tab.url || !sessionTracker) {
    return;
  }
  
  const integration = integrationManager.getIntegrationForUrl(tab.url);
  
  if (!integration) {
    logger.debug('No integration for current page, ending session');
    await endCurrentSession();
    return;
  }

  const paperId = integration.extractPaperId(tab.url);
  
  if (!paperId) {
    logger.debug('No paper ID found in URL, ending session');
    await endCurrentSession();
    return;
  }
  
  // Get current session info
  const currentPaper = sessionTracker.getCurrentPaper();
  
  // End session if different paper
  if (currentPaper.sourceId && currentPaper.paperId && 
      (currentPaper.sourceId !== integration.id || currentPaper.paperId !== paperId)) {
    logger.debug('Different paper detected, ending existing session');
    await endCurrentSession();
  }
  
  // Start new session if none active
  if (!currentPaper.sourceId || !currentPaper.paperId) {
    logger.info('Processing paper from integration', { 
      integration: integration.id, 
      paperId 
    });
    
    // Fetch paper metadata
    const paperData = await integration.fetchPaperMetadata(paperId);
    
    if (paperData) {
      logger.debug('Paper metadata fetched', paperData);
      
      // Store paper data
      if (paperManager) {
        await paperManager.getOrCreatePaper(paperData);
      }
      
      // Start tracking session
      currentPaperData = paperData;
      sessionTracker.startSession(integration.id, paperId);
    }
  }
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

// Send patterns to content script
async function sendPatternsToContentScript(tabId: number): Promise<void> {
  if (!integrationManager) {
    return;
  }
  
  try {
    const allPatterns = integrationManager.getAllIntegrations()
      .flatMap(integration => integration.getLinkPatterns());
    
    await chrome.tabs.sendMessage(tabId, {
      type: 'registerPatterns',
      patterns: allPatterns
    });
    
    logger.debug('Sent patterns to content script', tabId);
  } catch (error) {
    logger.error('Error sending patterns to content script', error);
  }
}

// Process page links
async function processPageLinks(tabId: number, url: string): Promise<void> {
 if (!integrationManager) {
   return;
 }
 
 const integration = integrationManager.getIntegrationForUrl(url);
 
 if (integration) {
   try {
     await chrome.tabs.sendMessage(tabId, {
       type: 'processPage'
     });
   } catch (error) {
     logger.error(`Error processing page with ${integration.id} integration`, error);
   }
 }
}

// Initialize debug objects in service worker scope
function initializeDebugObjects() {
 // @ts-ignore
 globalThis.__DEBUG__ = {
   get paperManager() { return paperManager; },
   get integrationManager() { return integrationManager; },
   get sessionTracker() { return sessionTracker; },
   get popupManager() { return popupManager; },
   getGithubClient: () => paperManager?.client,
   getCurrentPaper: () => currentPaperData,
   getSessionConfig: () => sessionConfig,
   getSessionMetadata: () => sessionTracker?.getCurrentSessionMetadata()
 };

 logger.info('Debug objects registered');
}

