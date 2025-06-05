// background.ts
// Background script with simple icon management

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { SessionService } from './utils/session-service';
import { PopupManager } from './utils/popup-manager';
import { SourceIntegrationManager } from './source-integration/source-manager';
import { setIcon } from './utils/icon-utils';
import { loguru } from './utils/logger';
import { PaperMetadata } from './papers/types';

// Import from central registry instead of individual integrations
import { sourceIntegrations } from './source-integration/registry';

const logger = loguru.getLogger('background');

// Global state
let githubToken = '';
let githubRepo = '';
let paperManager: PaperManager | null = null;
let sessionService: SessionService | null = null;
let popupManager: PopupManager | null = null;
let sourceManager: SourceIntegrationManager | null = null;

// Initialize sources
function initializeSources() {
  sourceManager = new SourceIntegrationManager();
  
  // Register all sources from the central registry
  for (const integration of sourceIntegrations) {
    sourceManager.registerSource(integration);
  }
  
  logger.info('Source manager initialized with integrations:', 
    sourceIntegrations.map(int => int.id).join(', '));
  
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
      
      // Pass the source manager to the paper manager
      paperManager = new PaperManager(githubClient, sourceManager!);
      logger.info('Paper manager initialized');
      
      // Initialize session service with paper manager
      sessionService = new SessionService(paperManager);
    } else {
      // Initialize session service without paper manager
      sessionService = new SessionService(null);
    }
    
    logger.info('Session service initialized');
    
    // Initialize popup manager
    popupManager = new PopupManager(
      () => sourceManager,
      () => paperManager
    );
    logger.info('Popup manager initialized');
    
    // Set up message listeners
    setupMessageListeners();
    
    // Set up tab listeners for icon cleanup
    setupTabListeners();
    
    // Initialize debug objects
    initializeDebugObjects();
  } catch (error) {
    logger.error('Initialization error', error);
  }
}

// Set up tab listeners
function setupTabListeners() {
  // Reset icon when navigating to new URL
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
      setIcon(tabId, 'default');
    }
  });
}

// Set up message listeners
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    
    if (message.type === 'contentScriptReady' && tabId) {
      logger.debug('Content script ready:', sender.tab.url);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'paperDetected' && tabId) {
      setIcon(tabId, 'detected');
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'noPaperDetected' && tabId) {
      setIcon(tabId, 'default');
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'paperMetadata' && message.metadata && tabId) {
      // Store metadata received from content script and update icon
      handlePaperMetadata(message.metadata, tabId);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'getCurrentPaper') {
      const session = sessionService?.getCurrentSession();
      const paperMetadata = session 
        ? sessionService?.getPaperMetadata(session.sourceId, session.paperId)
        : null;
      
      logger.debug('Popup requested current paper', paperMetadata);
      sendResponse(paperMetadata);
      return true;
    }
    
    if (message.type === 'updateRating') {
      logger.debug('Rating update requested:', message.rating);
      handleUpdateRating(message.rating, sendResponse);
      return true; // Will respond asynchronously
    }
    
    if (message.type === 'startSession') {
      handleStartSession(message.sourceId, message.paperId);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'sessionHeartbeat') {
      handleSessionHeartbeat();
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'endSession') {
      handleEndSession(message.reason || 'user_action');
      sendResponse({ success: true });
      return true;
    }

    // Manual paper logging from popup
    if (message.type === 'manualPaperLog' && message.metadata && tabId) {
      handleManualPaperLog(message.metadata, tabId)
        .then(() => sendResponse({ success: true }))
        .catch(error => {
          logger.error('Error handling manual paper log', error);
          sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        });
      return true; // Will respond asynchronously
    }
    
    // Other message handlers are managed by PopupManager
    return false; // Not handled
  });
}

// Handle paper metadata from content script
async function handlePaperMetadata(metadata: PaperMetadata, tabId: number) {
  logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
  
  try {
    // Store metadata in session service
    if (sessionService) {
      sessionService.storePaperMetadata(metadata);
    }
    
    // Store in GitHub if we have a paper manager
    if (paperManager) {
      await paperManager.getOrCreatePaper(metadata);
      logger.debug('Paper metadata stored in GitHub');
      
      // Update icon to tracked state
      await setIcon(tabId, 'tracked');
    } else {
      // No paper manager - show detected state
      await setIcon(tabId, 'detected');
    }
  } catch (error) {
    logger.error('Error handling paper metadata', error);
    // On error, show detected state instead of tracked
    await setIcon(tabId, 'detected');
  }
}

async function handleManualPaperLog(metadata: PaperMetadata, tabId: number): Promise<void> {
  logger.info(`Received manual paper log: ${metadata.sourceId}:${metadata.paperId}`);
  
  try {
    // Store metadata in session service
    if (sessionService) {
      sessionService.storePaperMetadata(metadata);
    }
    
    // Store in GitHub if we have a paper manager
    if (paperManager) {
      await paperManager.getOrCreatePaper(metadata);
      logger.debug('Manually logged paper stored in GitHub');
      
      // Update icon to tracked state
      await setIcon(tabId, 'tracked');
    }
  } catch (error) {
    logger.error('Error handling manual paper log', error);
    throw error;
  }
}

// Handle rating update
async function handleUpdateRating(rating: string, sendResponse: (response: any) => void) {
  if (!paperManager || !sessionService) {
    sendResponse({ success: false, error: 'Services not initialized' });
    return;
  }

  const session = sessionService.getCurrentSession();
  if (!session) {
    sendResponse({ success: false, error: 'No current session' });
    return;
  }

  const metadata = sessionService.getPaperMetadata();
  if (!metadata) {
    sendResponse({ success: false, error: 'No paper metadata available' });
    return;
  }

  try {
    await paperManager.updateRating(
      session.sourceId,
      session.paperId, 
      rating,
      metadata
    );
    
    // Update stored metadata with new rating
    metadata.rating = rating;
    
    sendResponse({ success: true });
  } catch (error) {
    logger.error('Error updating rating:', error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

// Handle session start request
function handleStartSession(sourceId: string, paperId: string) {
  if (!sessionService) {
    logger.error('Session service not initialized');
    return;
  }
  
  // Get metadata if available
  const existingMetadata = sessionService.getPaperMetadata(sourceId, paperId);
  
  // Start the session
  sessionService.startSession(sourceId, paperId, existingMetadata);
  logger.info(`Started session for ${sourceId}:${paperId}`);
}

// Handle session heartbeat
function handleSessionHeartbeat() {
  if (!sessionService) {
    logger.error('Session service not initialized');
    return;
  }
  
  sessionService.recordHeartbeat();
}

// Handle session end request
function handleEndSession(reason: string) {
  if (!sessionService) {
    logger.error('Session service not initialized');
    return;
  }
  
  const session = sessionService.getCurrentSession();
  if (session) {
    logger.info(`Ending session: ${reason}`);
    sessionService.endSession();
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
  
  // Reinitialize paper manager if credentials changed
  if (changes.githubToken || changes.githubRepo) {
    if (githubToken && githubRepo) {
      const githubClient = new GitHubStoreClient(githubToken, githubRepo);
      
      // Pass the source manager to the paper manager
      paperManager = new PaperManager(githubClient, sourceManager!);
      logger.info('Paper manager reinitialized');
      
      // Reinitialize session service with new paper manager
      sessionService = new SessionService(paperManager);
      logger.info('Session service reinitialized');
    }
  }
});

// Initialize debug objects in service worker scope
function initializeDebugObjects() {
  // @ts-ignore
  self.__DEBUG__ = {
    get paperManager() { return paperManager; },
    get sessionService() { return sessionService; },
    get popupManager() { return popupManager; },
    get sourceManager() { return sourceManager; },
    getGithubClient: () => paperManager ? paperManager.getClient() : null,
    getCurrentPaper: () => {
      const session = sessionService?.getCurrentSession();
      return session ? sessionService?.getPaperMetadata(session.sourceId, session.paperId) : null;
    },
    getSessionStats: () => sessionService?.getSessionStats(),
    getSources: () => sourceManager?.getAllSources(),
    forceEndSession: () => sessionService?.endSession(),
    setIcon: (tabId: number, state: 'default' | 'detected' | 'tracked') => setIcon(tabId, state)
  };

  logger.info('Debug objects registered');
}

// Initialize extension
initialize();
