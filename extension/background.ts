// extension/background.ts
// Background script with heartbeat-based session tracking

import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig } from './config/session';
import { SessionTracker } from './utils/session-tracker';
import { PopupManager } from './utils/popup-manager';
import { SourceIntegrationManager } from './source-integration/source-manager';
import { loguru } from './utils/logger';
import { PaperMetadata } from './papers/types';

// Import source plugins directly
import { arxivIntegration } from './source-integration/arxiv';
import { genericIntegration } from './source-integration/generic';
import { Message } from './source-integration/types';

const logger = loguru.getLogger('background');

// Global state
let githubToken = '';
let githubRepo = '';
let paperManager: PaperManager | null = null;
let sessionTracker: SessionTracker | null = null;
let popupManager: PopupManager | null = null;
let sourceManager: SourceIntegrationManager | null = null;

// Heartbeat timeout check
const HEARTBEAT_TIMEOUT = 15000; // 15 seconds (3 times the 5-second heartbeat interval)
let heartbeatTimeoutId: number | null = null;

// Initialize sources
function initializeSources() {
  sourceManager = new SourceIntegrationManager();
  
  // Register built-in sources directly
  sourceManager.registerSource(arxivIntegration);
  sourceManager.registerSource(genericIntegration);
  
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
      
      // Pass the source manager to the paper manager
      paperManager = new PaperManager(githubClient, sourceManager!);
      logger.info('Paper manager initialized');
    }
    
    // Initialize session tracker
    sessionTracker = new SessionTracker();
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
  chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
    if (message.type === 'contentScriptReady' && sender.tab?.id) {
      logger.debug('Content script ready:', sender.tab.url);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'paperMetadata' && message.metadata) {
      // Store metadata received from content script
      handlePaperMetadata(message.metadata);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'getCurrentPaper') {
      const paperMetadata = sessionTracker?.getCurrentSession()
        ? sessionTracker?.getPaperMetadata()
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
      handleSessionHeartbeat(message.sourceId, message.paperId, message.timestamp);
      sendResponse({ success: true });
      return true;
    }
    
    if (message.type === 'endSession') {
      handleEndSession(message.sourceId, message.paperId, message.reason || 'user_action');
      sendResponse({ success: true });
      return true;
    }

    // New handler for manual paper logging from popup
    if (message.type === 'manualPaperLog' && message.metadata) {
      handleManualPaperLog(message.metadata)
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
    
    return false;
  });
}

// Handle paper metadata from content script
async function handlePaperMetadata(metadata: PaperMetadata) {
  logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
  
  try {
    // Store in GitHub if we have a paper manager
    if (paperManager) {
      await paperManager.getOrCreatePaper(metadata);
      logger.debug('Paper metadata stored in GitHub');
    }
  } catch (error) {
    logger.error('Error handling paper metadata', error);
  }
}

// Handle rating update
async function handleUpdateRating(rating: string, sendResponse: (response: any) => void) {
  if (!paperManager || !sessionTracker) {
    sendResponse({ success: false, error: 'Services not initialized' });
    return;
  }

  const session = sessionTracker.getCurrentSession();
  if (!session) {
    sendResponse({ success: false, error: 'No current session' });
    return;
  }

  const metadata = sessionTracker.getPaperMetadata();
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
  if (!sessionTracker) {
    logger.error('Session tracker not initialized');
    return;
  }
  
  // Get metadata if available
  const existingMetadata = sessionTracker.getPaperMetadata(sourceId, paperId);
  
  // Start the session
  sessionTracker.startSession(sourceId, paperId, existingMetadata);
  logger.info(`Started session for ${sourceId}:${paperId}`);
  
  // Schedule heartbeat check
  scheduleHeartbeatCheck();
}

// Handle session heartbeat
function handleSessionHeartbeat(sourceId: string, paperId: string, timestamp: number) {
  if (!sessionTracker) {
    logger.error('Session tracker not initialized');
    return;
  }
  
  const session = sessionTracker.getCurrentSession();
  
  // Verify session matches
  if (session && session.sourceId === sourceId && session.paperId === paperId) {
    sessionTracker.recordHeartbeat();
    
    // Reschedule heartbeat check
    scheduleHeartbeatCheck();
    
    logger.debug(`Heartbeat received for ${sourceId}:${paperId}`);
  } else {
    // Heartbeat for non-current session - probably a race condition
    logger.warning(`Received heartbeat for non-current session: ${sourceId}:${paperId}`);
    
    // Start new session if needed
    if (!session) {
      handleStartSession(sourceId, paperId);
    }
  }
}

// Handle session end request
function handleEndSession(sourceId: string, paperId: string, reason: string) {
  const session = sessionTracker?.getCurrentSession();
  
  // Only end if it matches current session
  if (session && session.sourceId === sourceId && session.paperId === paperId) {
    logger.info(`Ending session for ${sourceId}:${paperId}`, { reason });
    endCurrentSession();
  } else {
    logger.warning(`Received end request for non-current session: ${sourceId}:${paperId}`);
  }
}

async function handleManualPaperLog(metadata: PaperMetadata): Promise<void> {
  logger.info(`Received manual paper log: ${metadata.sourceId}:${metadata.paperId}`);
  
  try {
    // Store in GitHub if we have a paper manager
    if (paperManager) {
      await paperManager.getOrCreatePaper(metadata);
      logger.debug('Manually logged paper stored in GitHub');
    }
  } catch (error) {
    logger.error('Error handling manual paper log', error);
    throw error;
  }
}

// Schedule heartbeat timeout check
function scheduleHeartbeatCheck() {
  // Clear any existing timeout
  if (heartbeatTimeoutId !== null) {
    clearTimeout(heartbeatTimeoutId);
    heartbeatTimeoutId = null;
  }
  
  // Only schedule if we have an active session
  if (!sessionTracker || !sessionTracker.hasActiveSession()) {
    return;
  }
  
  // Set timeout to check for missed heartbeats
  heartbeatTimeoutId = self.setTimeout(() => {
    checkHeartbeat();
  }, HEARTBEAT_TIMEOUT);
}

// Check if we've missed too many heartbeats
function checkHeartbeat() {
  if (!sessionTracker || !sessionTracker.hasActiveSession()) {
    return;
  }
  
  const timeSinceLastHeartbeat = sessionTracker.getTimeSinceLastHeartbeat();
  
  if (timeSinceLastHeartbeat && timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
    // Too much time since last heartbeat, end the session
    logger.info('Heartbeat timeout, ending session');
    endCurrentSession();
  } else {
    // Still active, reschedule check
    scheduleHeartbeatCheck();
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
    }
  }
});

// End current session and save data
async function endCurrentSession() {
  if (!sessionTracker) {
    return;
  }
  
  // Get current session
  const session = sessionTracker.getCurrentSession();
  if (!session) {
    return;
  }
  
  // Get paper metadata
  const metadata = sessionTracker.getPaperMetadata();
  
  // End the session
  const sessionData = sessionTracker.endSession();
  
  // Store session data if we have it and a paper manager
  if (sessionData && paperManager) {
    logger.debug('Creating reading event', sessionData);
    
    try {
      // Store reading session
      await paperManager.logReadingSession(
        session.sourceId,
        session.paperId,
        sessionData,
        metadata
      );
      
      logger.info(`Session saved to GitHub for ${session.sourceId}:${session.paperId}`);
    } catch (error) {
      logger.error('Error saving session', error);
    }
  }
  
  // Clear heartbeat timeout
  if (heartbeatTimeoutId !== null) {
    clearTimeout(heartbeatTimeoutId);
    heartbeatTimeoutId = null;
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
    getCurrentPaper: () => sessionTracker?.getPaperMetadata(),
    getSessionInfo: () => sessionTracker?.getCurrentSessionMetadata(),
    getSources: () => sourceManager?.getAllSources(),
    forceEndSession: () => endCurrentSession()
  };

  logger.info('Debug objects registered');
}

// Initialize extension
initialize();
