// background.js - Consolidated with multi-source support
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig, getConfigurationInMs } from './config/session.js';
import { formatPrimaryId } from './papers/source_utils';
import { initializePluginSystem } from './papers/plugins/loader';
import { pluginRegistry } from './papers/plugins/registry';
import { loguru } from './utils/logger';

const logger = loguru.getLogger('Background');
const debugLogger = loguru.getLogger('DebugFlow');

// Global state
let githubToken = '';
let githubRepo = '';
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let sessionConfig = null;
let paperManager = null;

// Debounce mechanism to avoid multiple creations of the same paper
const pendingUrls = new Set();

// Enhanced reading session for modern format
class EnhancedReadingSession {
  constructor(paperData, config) {
    // Use primary_id as the canonical identifier
    if (!paperData.primary_id) {
      throw new Error('Paper data must include primary_id');
    }
    
    this.paperId = paperData.primary_id;
    this.paperData = paperData;
    
    // Generate unique session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize timing data
    this.startTime = new Date();
    this.activeTime = 0;
    this.idleTime = 0;
    this.lastActiveTime = new Date();
    this.isTracking = true;
    this.config = config;
    this.endTime = null;
    this.finalizedData = null;
  }
  
  update() {
    if (this.isTracking && !this.finalizedData) {
      const now = new Date();
      const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
      
      if (timeSinceLastActive < this.config.idleThreshold) {
        this.activeTime += timeSinceLastActive;
      } else {
        this.idleTime += timeSinceLastActive;
      }
      
      this.lastActiveTime = now;
    }
  }
  
  finalize() {
    if (this.finalizedData) {
      return this.finalizedData;
    }
 
    this.update();
    this.isTracking = false;
    this.endTime = new Date();
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
 
    if (this.activeTime >= this.config.minSessionDuration) {
      this.finalizedData = {
        session_id: this.sessionId,
        duration_seconds: Math.round(this.activeTime / 1000),
        idle_seconds: Math.round(this.idleTime / 1000),
        start_time: this.startTime.toISOString(),
        end_time: this.endTime.toISOString(),
        total_elapsed_seconds: Math.round(totalElapsed / 1000)
      };
      return this.finalizedData;
    }
    return null;
  }
  
  getMetadata() {
    return {
      sourceType: this.paperData.source,
      paperId: this.paperId,
      title: this.paperData.title,
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      activeSeconds: Math.round(this.activeTime / 1000),
      idleSeconds: Math.round(this.idleTime / 1000)
    };
  }
}

// Load credentials and configuration when extension starts
async function loadCredentials() {
  const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
  githubToken = items.githubToken || '';
  githubRepo = items.githubRepo || '';
  logger.info('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
  
  // Initialize paper manager if we have credentials
  if (githubToken && githubRepo) {
    const githubClient = new GitHubStoreClient(githubToken, githubRepo);
    paperManager = new PaperManager(githubClient);
    logger.info('Paper manager initialized');
  }
  
  // Load session configuration
  sessionConfig = getConfigurationInMs(await loadSessionConfig());
  logger.info('Session configuration loaded:', sessionConfig);
  
  // Initialize debug objects
  initializeDebugObjects();
}

// Listen for credential changes
chrome.storage.onChanged.addListener(async (changes) => {
  logger.info('Storage changes detected:', Object.keys(changes));
  if (changes.githubToken) {
    githubToken = changes.githubToken.newValue;
  }
  if (changes.githubRepo) {
    githubRepo = changes.githubRepo.newValue;
  }
  if (changes.sessionConfig) {
    sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
    logger.info('Session configuration updated:', sessionConfig);
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

// Initialize the extension
async function initialize() {
  logger.info('Initializing extension');
  
  // Load credentials and config
  await loadCredentials();
  
  // Initialize plugin system
  await initializePluginSystem();
  
  // Set up listeners for tab changes
  await setupListeners();
  
  logger.info('Extension initialized');
}

// Initialize extension
initialize().catch(error => {
  logger.error('Initialization failed', error);
});

// Message passing between background and popup/content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.info('Message received:', request);
  
  if (request.type === 'getCurrentPaper') {
    logger.info('Popup requested current paper:', currentPaperData);
    sendResponse(currentPaperData);
  }
  else if (request.type === 'updateRating') {
    logger.info('Rating update requested:', request.rating);
    handleUpdateRating(request.rating, sendResponse);
    return true; // Will respond asynchronously
  }
  else if (request.type === 'updateAnnotation') {
    logger.info('Annotation update requested:', request.annotationType, request.data);
    handleAnnotationUpdate(request.annotationType, request.data)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  // Add a dedicated handler for track paper requests from content scripts
  else if (request.type === 'trackPaper') {
    logger.info('Track paper requested:', request);
    handleTrackPaper(request)
      .then(response => sendResponse(response))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Will respond asynchronously
  }
  return true;
});

// Handle track paper request from content script
async function handleTrackPaper(request) {
  if (!paperManager) {
    throw new Error('Paper manager not initialized');
  }

  try {
    // Process the paper URL based on its source
    let paperData;
    
    // Use the plugin system to process the URL if possible
    const plugin = pluginRegistry.get(request.source);
    if (plugin) {
      logger.info(`Using ${plugin.name} plugin to process paper`);
      
      // Extract ID using the plugin
      const id = plugin.extractId(request.url);
      
      if (!id) {
        throw new Error(`Could not extract ID from URL: ${request.url}`);
      }
      
      // Try to use the plugin's API if available
      if (plugin.hasApi && plugin.fetchApiData) {
        try {
          paperData = await plugin.fetchApiData(id);
          // Add required source information
          paperData.source = request.source;
          paperData.sourceId = id;
          paperData.primary_id = plugin.formatId ? plugin.formatId(id) : formatPrimaryId(request.source, id);
          paperData.url = request.url;
        } catch (error) {
          logger.error(`Error using plugin API: ${error}`);
        }
      }
    }
    
    // Fall back to basic paper data if API failed
    if (!paperData) {
      // Get the ID using the plugin if available
      const id = plugin ? plugin.extractId(request.url) : request.id;
      paperData = {
        source: request.source,
        sourceId: id,
        primary_id: plugin && plugin.formatId ? 
          plugin.formatId(id) : formatPrimaryId(request.source, id),
        url: request.url,
        title: request.title || `${request.source.toUpperCase()} Paper: ${id}`,
        timestamp: new Date().toISOString(),
        rating: 'novote'
      };
    }
    
    if (!paperData) {
      throw new Error(`Could not process paper: ${request.url}`);
    }
    
    // Create GitHub issue for the paper
    await createGithubIssue(paperData);
    
    return { success: true, paperData };
  } catch (error) {
    logger.error(`Error tracking paper: ${error}`);
    throw error;
  }
}

// Enhanced handler for rating updates with legacy ID detection
async function handleUpdateRating(rating, sendResponse) {
  if (!paperManager) {
    debugLogger.error('Paper manager not initialized');
    sendResponse({ success: false, error: 'Paper manager not initialized' });
    return;
  }

  if (!currentPaperData) {
    debugLogger.error('No current paper');
    sendResponse({ success: false, error: 'No current paper' });
    return;
  }

  try {
    // Always use primary_id for rating updates
    const paperId = currentPaperData.primary_id;
    
    if (checkForLegacyIdFormat(paperId)) {
      debugLogger.error(`Unexpected legacy ID format in currentPaperData: ${paperId}`);
    }
    
    debugLogger.info(`Updating rating for ${paperId} to ${rating}`);
    await paperManager.updateRating(paperId, rating, currentPaperData);
    currentPaperData.rating = rating;
    sendResponse({ success: true });
  } catch (error) {
    debugLogger.error('Error updating rating:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Consolidated setup for all navigation and tab listeners
async function setupListeners() {
  logger.info('Setting up unified event listeners');
  
  // Get all supported hosts from plugins
  const plugins = pluginRegistry.getAll();
  
  // Create host patterns from all plugins
  const hostPatterns = [];
  
  for (const plugin of plugins) {
    // Add all the plugin URL patterns if possible
    try {
      // Extract domain patterns from the plugin's URL patterns
      for (const pattern of plugin.urlPatterns) {
        const patternStr = pattern.toString();
        // Extract domain from pattern - this is a simplified approach
        const match = patternStr.match(/([a-zA-Z0-9.-]+)\\?\.([a-zA-Z]+)/);
        if (match) {
          const domain = match[1];
          const tld = match[2];
          hostPatterns.push({ hostSuffix: `${domain}.${tld}` });
        }
      }
    } catch (err) {
      logger.error(`Error processing plugin URL patterns: ${err}`);
    }
  }
  
  // Add default patterns if we couldn't extract from plugins
  if (hostPatterns.length === 0) {
    hostPatterns.push(
      { hostSuffix: 'arxiv.org' },
      { hostSuffix: 'semanticscholar.org' },
      { hostSuffix: 'doi.org' },
      { hostSuffix: 'dl.acm.org' },
      { hostSuffix: 'openreview.net' }
    );
  }
  
  logger.info(`Setting up navigation listener with patterns: ${JSON.stringify(hostPatterns)}`);
  
  // CONSOLIDATED LISTENER: Set up a single navigation listener with all hosts
  chrome.webNavigation.onCompleted.addListener(handleUnifiedNavigation, { 
    url: hostPatterns
  });
  
  // CONSOLIDATED LISTENER: Set up a single tab activation listener
  chrome.tabs.onActivated.addListener(handleUnifiedTabActivation);
  
  // CONSOLIDATED LISTENER: Set up a single tab update listener
  chrome.tabs.onUpdated.addListener(handleUnifiedTabUpdate);
  
  // Window focus changes
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      endCurrentSession();
    }
  });
  
  logger.info('All event listeners initialized');
}

// Enhanced findPluginForUrl with detailed logging
function findPluginForUrl(url) {
  debugLogger.info(`Finding plugin for URL: ${url}`);
  
  // First try using the plugin registry
  const plugins = pluginRegistry.getAll();
  debugLogger.info(`Checking against ${plugins.length} registered plugins`);
  
  for (const plugin of plugins) {
    debugLogger.debug(`Testing against plugin: ${plugin.id}`);
    for (const pattern of plugin.urlPatterns) {
      const patternStr = pattern.toString();
      debugLogger.debug(`- Testing pattern: ${patternStr}`);
      const match = url.match(pattern);
      if (match) {
        debugLogger.info(`URL matches pattern for plugin: ${plugin.id}`);
        const id = plugin.extractId(url);
        if (id) {
          const primary_id = plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id);
          debugLogger.info(`Successfully extracted ID: ${id}, primary_id: ${primary_id}`);
          return {
            type: plugin.id,
            id: id,
            primary_id: primary_id,
            url,
            plugin: plugin
          };
        } else {
          debugLogger.warning(`Pattern matched but failed to extract ID for ${plugin.id}`);
        }
      }
    }
  }
  
  debugLogger.warning(`No plugin found for URL: ${url}`);
  return null;
}

// Unified handlers for navigation and tab events
async function handleUnifiedNavigation(details) {
  logger.info(`Unified navigation handler: ${details.url}`);
  
  // Skip if URL is already being processed to avoid duplicates
  if (pendingUrls.has(details.url)) {
    logger.info(`URL already being processed, skipping: ${details.url}`);
    return;
  }
  
  // Mark URL as being processed
  pendingUrls.add(details.url);
  
  try {
    // Get the appropriate plugin for this URL
    const sourceInfo = findPluginForUrl(details.url);
    
    if (!sourceInfo) {
      logger.info('Not a recognized paper URL');
      pendingUrls.delete(details.url);
      return;
    }
    
    logger.info(`Detected paper: ${sourceInfo.type}:${sourceInfo.id}`);
    
    // Get tab info to determine if it's the active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id === details.tabId) {
      // This is the active tab, handle as tab change
      await handleTabChangeWithPlugins(tabs[0]);
    } else {
      // Process URL but don't start a session
      const paperData = await processPaperUrl(details.url);
      if (paperData) {
        logger.info(`Processed paper data: ${paperData.title}`);
      }
    }
  } catch (error) {
    logger.error(`Error in navigation handler: ${error}`);
  } finally {
    // Remove URL from pending after a delay to prevent immediate reprocessing
    setTimeout(() => {
      pendingUrls.delete(details.url);
    }, 500);
  }
}

async function handleUnifiedTabActivation(activeInfo) {
  logger.info(`Unified tab activation handler: ${activeInfo.tabId}`);
  const tab = await chrome.tabs.get(activeInfo.tabId);
  
  if (!tab.url || pendingUrls.has(tab.url)) {
    logger.info(`Tab URL empty or already being processed: ${tab.url}`);
    return;
  }
  
  pendingUrls.add(tab.url);
  
  try {
    // Delegate to the appropriate handler
    await handleTabChangeWithPlugins(tab);
  } catch (error) {
    logger.error(`Error in tab activation handler: ${error}`);
  } finally {
    setTimeout(() => {
      pendingUrls.delete(tab.url);
    }, 500);
  }
}

async function handleUnifiedTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status !== 'complete' || !tab.url || pendingUrls.has(tab.url)) {
    return;
  }
  
  logger.info(`Unified tab update handler: ${tab.url}`);
  pendingUrls.add(tab.url);
  
  try {
    // Delegate to the appropriate handler
    await handleTabChangeWithPlugins(tab);
  } catch (error) {
    logger.error(`Error in tab update handler: ${error}`);
  } finally {
    setTimeout(() => {
      pendingUrls.delete(tab.url);
    }, 500);
  }
}

// Enhanced processPaperUrl with detailed logging
async function processPaperUrl(url) {
  debugLogger.info(`Processing paper URL: ${url}`);
  
  // Skip if URL is already being processed
  if (pendingUrls.has(url)) {
    debugLogger.warning(`URL already being processed in processPaperUrl: ${url}`);
    return null;
  }
  
  // Mark URL as being processed
  pendingUrls.add(url);
  debugLogger.info(`Added ${url} to pendingUrls (now ${pendingUrls.size} pending)`);
  
  try {
    // Find the appropriate plugin or source info
    const sourceInfo = findPluginForUrl(url);
    
    if (!sourceInfo) {
      debugLogger.warning('Not a recognized paper URL in processor');
      return null;
    }
    
    // Process based on source type
    let paperData;
    
    if (sourceInfo.plugin) {
      const plugin = sourceInfo.plugin;
      debugLogger.info(`Using plugin ${plugin.id} for processing`);
      
      // Try to use the plugin's API if available
      if (plugin.hasApi && plugin.fetchApiData) {
        try {
          debugLogger.info(`Using ${plugin.id} plugin API to process paper, ID: ${sourceInfo.id}`);
          const apiData = await plugin.fetchApiData(sourceInfo.id);
          debugLogger.info(`API data received for ${sourceInfo.id}: ${JSON.stringify(apiData).substring(0, 200)}...`);
          
          if (Object.keys(apiData).length > 0) {
            paperData = {
              ...apiData,
              source: plugin.id,
              sourceId: sourceInfo.id,
              primary_id: sourceInfo.primary_id,
              url: url
            };
            debugLogger.info(`Created paper data from API: primary_id=${paperData.primary_id}`);
          } else {
            debugLogger.warning(`API returned empty data for ${sourceInfo.id}`);
          }
        } catch (error) {
          debugLogger.error(`Error using plugin API: ${error.message}`, error);
        }
      } else {
        debugLogger.info(`Plugin ${plugin.id} does not have API or fetchApiData method`);
      }
      
      // If API failed, try to extract from the page DOM if we have a tab ID
      if (!paperData) {
        try {
          debugLogger.info(`Attempting DOM extraction for ${plugin.id}`);
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          debugLogger.info(`Found ${tabs.length} active tabs`);
          
          if (tabs.length > 0 && tabs[0].id) {
            const tabId = tabs[0].id;
            debugLogger.info(`Executing script in tab ${tabId}`);
            
            // Execute script to get HTML document
            const script = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => document.documentElement.outerHTML
            });
            
            if (script && script[0] && script[0].result) {
              debugLogger.info(`Successfully got HTML content from tab`);
              // Create DOM document from HTML
              const parser = new DOMParser();
              const doc = parser.parseFromString(script[0].result, 'text/html');
              
              // Use plugin to extract metadata
              debugLogger.info(`Using plugin.extractMetadata for ${url}`);
              const metadata = await plugin.extractMetadata(doc, url);
              
              if (metadata && Object.keys(metadata).length > 0) {
                debugLogger.info(`Metadata extracted: ${JSON.stringify(metadata).substring(0, 200)}...`);
                paperData = {
                  ...metadata,
                  source: plugin.id,
                  sourceId: sourceInfo.id,
                  primary_id: sourceInfo.primary_id,
                  url: url
                };
                debugLogger.info(`Created paper data from DOM: primary_id=${paperData.primary_id}`);
              } else {
                debugLogger.warning(`No metadata extracted from DOM for ${url}`);
              }
            } else {
              debugLogger.warning(`Failed to get HTML content from tab ${tabId}`);
            }
          } else {
            debugLogger.warning(`No active tab found for DOM extraction`);
          }
        } catch (error) {
          debugLogger.error(`Error extracting from DOM: ${error.message}`, error);
        }
      }
    } else {
      debugLogger.info(`No plugin available for source type: ${sourceInfo.type}`);
    }
    
    // If we still don't have paper data, create a basic record
    if (!paperData) {
      debugLogger.info(`Creating basic paper data record for ${sourceInfo.type}:${sourceInfo.id}`);
      paperData = {
        source: sourceInfo.type,
        sourceId: sourceInfo.id,
        primary_id: sourceInfo.primary_id,
        url: url,
        title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
        timestamp: new Date().toISOString(),
        rating: 'novote'
      };
    }
    
    // If paper data was extracted, create or update in GitHub
    if (paperData) {
      debugLogger.info(`Paper data extracted, creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await createGithubIssue(paperData);
        debugLogger.info(`Successfully created/updated GitHub issue for ${paperData.primary_id}`);
      } catch (error) {
        debugLogger.error(`Error creating GitHub issue: ${error.message}`, error);
      }
    }
    
    return paperData;
  } catch (error) {
    debugLogger.error(`Error processing paper URL: ${error.message}`, error);
    return null;
  } finally {
    // Remove URL from pending after a delay
    debugLogger.info(`Scheduling removal of ${url} from pendingUrls in 500ms`);
    setTimeout(() => {
      pendingUrls.delete(url);
      debugLogger.info(`Removed ${url} from pendingUrls (now ${pendingUrls.size} pending)`);
    }, 500);
  }
}

// Enhanced handleTabChangeWithPlugins with detailed logging
async function handleTabChangeWithPlugins(tab) {
  if (!tab.url) {
    debugLogger.warning(`Tab has no URL`);
    return;
  }
  
  debugLogger.info(`Handling tab change for URL: ${tab.url}`);
  
  // Find the appropriate plugin or source info
  const sourceInfo = findPluginForUrl(tab.url);
  
  if (!sourceInfo) {
    debugLogger.info('Not a recognized paper page, ending current session');
    await endCurrentSession();
    return;
  }
  
  // End any existing session
  if (currentSession) {
    debugLogger.info('Ending existing session before starting new one');
    await endCurrentSession();
  }
  
  // Process the paper URL
  debugLogger.info(`Processing paper URL: ${tab.url}`);
  
  // Get paper data using the plugin system
  const paperData = await processPaperUrl(tab.url);
  
  if (paperData) {
    debugLogger.info(`Starting new session for: ${paperData.primary_id}`);
    
    // Store current paper data
    currentPaperData = paperData;
    
    // Create a new reading session
    try {
      debugLogger.info(`Creating new EnhancedReadingSession, config: ${JSON.stringify(sessionConfig)}`);
      currentSession = new EnhancedReadingSession(paperData, sessionConfig);
      
      const metadata = currentSession.getMetadata();
      debugLogger.info('New session created:', metadata);
      
      // Start tracking reading time
      startActivityTracking();
      
      // Create GitHub issue
      debugLogger.info(`Creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await createGithubIssue(paperData);
      } catch (error) {
        debugLogger.error(`Error creating GitHub issue: ${error}`);
      }
    } catch (error) {
      debugLogger.error(`Error creating reading session: ${error.message}`);
    }
  } else {
    debugLogger.warning(`Failed to process paper URL: ${tab.url}`);
  }
}

async function endCurrentSession() {
  if (currentSession && currentPaperData) {
    logger.info(`Ending session for: ${currentPaperData.primary_id}`);
    const sessionData = currentSession.finalize();
    if (sessionData) {
      logger.info('Creating reading event:', sessionData);
      await createReadingEvent(currentPaperData, sessionData);
    }
    currentSession = null;
    currentPaperData = null;
    stopActivityTracking();
  }
}

function startActivityTracking() {
  if (!activityInterval) {
    logger.info('Starting activity tracking');
    activityInterval = setInterval(() => {
      if (currentSession) {
        currentSession.update();
      }
    }, sessionConfig.activityUpdateInterval);
  }
}

function stopActivityTracking() {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
}

// Create reading event function for all sources
async function createReadingEvent(paperData, sessionData) {
  if (!paperManager || !paperData) {
    logger.error('Missing required data for creating reading event:', {
      hasPaperManager: !!paperManager,
      hasPaperData: !!paperData
    });
    return;
  }

  try {
    // Always use primary_id for storage
    if (!paperData.primary_id) {
      logger.error('Paper data missing primary_id. This should not happen.');
      return;
    }
    
    const paperId = paperData.primary_id;
    
    await paperManager.logReadingSession(
      paperId,
      sessionData,
      paperData
    );
    
    logger.info('Reading session logged:', {
      paperId: paperId,
      sessionId: sessionData.session_id,
      activeTime: sessionData.duration_seconds,
      idleTime: sessionData.idle_seconds,
      totalTime: sessionData.total_elapsed_seconds
    });
    
  } catch (error) {
    logger.error('Error logging reading session:', error);
  }
}

// Enhanced createGithubIssue with detailed logging
async function createGithubIssue(paperData) {
  if (!paperManager) {
    debugLogger.error('Paper manager not initialized');
    return null;
  }

  // Ensure paper has primary_id
  if (!paperData.primary_id) {
    debugLogger.warning(`Paper data missing primary_id, attempting to generate one`);
    if (paperData.source && paperData.sourceId) {
      paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      debugLogger.info(`Generated primary_id: ${paperData.primary_id}`);
    } else {
      debugLogger.error('Cannot create paper - no valid identifier');
      return null;
    }
  }
  
  try {
    debugLogger.info(`Creating/getting paper issue: ${paperData.primary_id}`);
    const existingPaper = await paperManager.getOrCreatePaper(paperData);
    debugLogger.info(`Paper metadata stored/retrieved: ${existingPaper.primary_id}`);
    return existingPaper;
  } catch (error) {
    debugLogger.error(`Error handling paper metadata: ${error}`);
    return null;
  }
}

// Enhanced handler for annotation updates with legacy ID detection
async function handleAnnotationUpdate(type, data) {
  if (!paperManager) {
    throw new Error('Paper manager not initialized');
  }

  try {
    // Ensure we have a valid paper ID
    let paperId = data.paperId;
    
    // Check for legacy format and convert if needed
    if (checkForLegacyIdFormat(paperId)) {
      debugLogger.warning(`Converting legacy ID format in annotation: ${paperId}`);
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.info(`Converted to new format: ${paperId}`);
    }
    
    const paperData = data.title ? {
      title: data.title,
      source: data.source,
      primary_id: paperId
    } : undefined;

    if (type === 'vote') {
      debugLogger.info(`Updating rating for ${paperId} to ${data.vote}`);
      await paperManager.updateRating(
        paperId,
        data.vote,
        paperData
      );
    } else {
      debugLogger.info(`Logging annotation for ${paperId}`);
      await paperManager.logAnnotation(
        paperId,
        'notes',
        data.notes,
        paperData
      );
    }

    return { success: true };
  } catch (error) {
    debugLogger.error(`Error logging interaction: ${error}`);
    throw error;
  }
}

// Initialize debug objects in service worker scope
function initializeDebugObjects() {
  // Don't use window in service worker context
  self.__DEBUG__ = {
    get paperManager() { return paperManager; },
    getGithubClient: () => paperManager?.client,
    getCurrentPaper: () => currentPaperData,
    getCurrentSession: () => currentSession,
    getConfig: () => sessionConfig
  };

  logger.info('Debug objects registered, access via __DEBUG__ in service worker console');
}

// Enhanced ID format transition logging for legacy detection
function checkForLegacyIdFormat(id) {
  if (!id) return false;
  
  // Check if it's already in the new format
  if (isNewFormat(id)) {
    return false;
  }
  
  // Log legacy format usage
  debugLogger.warning(`Legacy ID format detected: ${id}`);
  return true;
}

// Enhance plugin registry initialization with detailed logging
function enhancePluginRegistryLogging() {
  const originalRegister = pluginRegistry.register;
  pluginRegistry.register = function(plugin) {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name}), version ${plugin.version}`);
    
    // Check plugin validity
    if (!plugin.urlPatterns || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    
    if (!plugin.extractId) {
      debugLogger.error(`Plugin ${plugin.id} missing required extractId method`);
    }
    
    // Log plugin capabilities
    const capabilities = [];
    if (plugin.hasApi) capabilities.push('API');
    if (plugin.formatId) capabilities.push('custom ID format');
    if (plugin.extractMetadata) capabilities.push('metadata extraction');
    
    debugLogger.info(`Plugin ${plugin.id} capabilities: ${capabilities.join(', ')}`);
    
    // Call original method
    return originalRegister.call(this, plugin);
  };
}

// Enhance GitHub client initialization with detailed logging
function enhanceGithubClientLogging() {
  const originalLoadCredentials = loadCredentials;
  
  loadCredentials = async function() {
    debugLogger.info('Loading credentials and initializing GitHub client');
    await originalLoadCredentials();
    
    // Verify initialization
    if (githubToken && githubRepo) {
      debugLogger.info(`GitHub client initialized with repo: ${githubRepo}`);
    } else {
      debugLogger.warning(`GitHub client not fully initialized: token=${!!githubToken}, repo=${!!githubRepo}`);
    }
    
    if (paperManager) {
      debugLogger.info('Paper manager successfully initialized');
    } else {
      debugLogger.error('Paper manager failed to initialize');
    }
    
    if (sessionConfig) {
      debugLogger.info(`Session config loaded: ${JSON.stringify(sessionConfig)}`);
    } else {
      debugLogger.error('Session config not loaded');
    }
  };
}

// Apply enhanced logging
enhancePluginRegistryLogging();
enhanceGithubClientLogging();

// Add a startup diagnostics function
async function runDiagnostics() {
  debugLogger.info('=== Running startup diagnostics ===');
  
  // Check plugin registry
  const plugins = pluginRegistry.getAll();
  debugLogger.info(`${plugins.length} plugins registered`);
  
  for (const plugin of plugins) {
    debugLogger.info(`Plugin: ${plugin.id} (${plugin.name})`);
    debugLogger.info(`- URL patterns: ${plugin.urlPatterns.map(p => p.toString()).join(', ')}`);
    debugLogger.info(`- Has API: ${!!plugin.hasApi}`);
    debugLogger.info(`- Has custom ID format: ${!!plugin.formatId}`);
  }
  
  // Check GitHub client initialization
  debugLogger.info(`GitHub client: token=${!!githubToken}, repo=${!!githubRepo}`);
  debugLogger.info(`Paper manager initialized: ${!!paperManager}`);
  
  // Check session configuration
  debugLogger.info(`Session config: ${JSON.stringify(sessionConfig || 'Not loaded')}`);
  
  // Test URL detection with sample URLs
  const testUrls = [
    'https://arxiv.org/abs/2201.12345',
    'https://www.semanticscholar.org/paper/abcdef1234567890abcdef1234567890abcdef12',
    'https://doi.org/10.1145/3548606.3560596',
    'https://openreview.net/forum?id=abc123def456'
  ];
  
  debugLogger.info('Testing URL detection:');
  for (const url of testUrls) {
    const sourceInfo = findPluginForUrl(url);
    if (sourceInfo) {
      debugLogger.info(`${url} -> ${sourceInfo.type}:${sourceInfo.id} (${sourceInfo.primary_id})`);
    } else {
      debugLogger.warning(`${url} -> Not detected`);
    }
  }
  
  debugLogger.info('=== Diagnostics complete ===');
}

// Run diagnostics after initialization
const originalInitialize = initialize;
initialize = async function() {
  debugLogger.info('Extension initialization started');
  try {
    await originalInitialize();
    debugLogger.info('Extension initialization completed successfully');
    await runDiagnostics();
  } catch (error) {
    debugLogger.error(`Initialization failed: ${error.message}`, error);
    throw error;
  }
};

// Log when messages are received
const originalOnMessage = chrome.runtime.onMessage.addListener;
chrome.runtime.onMessage.addListener = function(request, sender, sendResponse) {
  debugLogger.info(`Message received: type=${request.type}, sender=${sender.tab ? sender.tab.url : 'extension'}`);
  return originalOnMessage(request, sender, sendResponse);
};
