// background.js
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig, getConfigurationInMs } from './config/session.js';
import { ReadingSessionData } from './papers/types';
// Added imports for multi-source support
import { MultiSourceDetector } from './papers/detector';
import { formatPrimaryId } from './papers/source_utils';
import { initMultiSourceSupport } from './background_multi_source';
import { initializePluginSystem } from './papers/plugins/loader';
import { pluginRegistry } from './papers/plugins/registry';

import { loguru } from './utils/logger';

const logger = loguru.getLogger('Background');

let githubToken = '';
let githubRepo = '';
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let sessionConfig = null;
let paperManager = null;

// Store references to functions that will be enhanced
let originalProcessArxivUrl = null;
let enhancedProcessPaperUrl = null;

// Debounce mechanism to avoid multiple creations of the same paper
const pendingUrls = new Set();
const pendingPaperCreations = new Map();

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
    console.log('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
    
    // Initialize paper manager if we have credentials
    if (githubToken && githubRepo) {
        const githubClient = new GitHubStoreClient(githubToken, githubRepo);
        paperManager = new PaperManager(githubClient);
        console.log('Paper manager initialized');
    }
    
    // Load session configuration
    sessionConfig = getConfigurationInMs(await loadSessionConfig());
    console.log('Session configuration loaded:', sessionConfig);

    // Initialize multi-source support
    enhancedInitialization();
    
    // Initialize debug objects after everything is loaded
    initializeDebugObjects();
}

// Initialize multi-source support
function enhancedInitialization() {
    // Save original function for compatibility
    originalProcessArxivUrl = processArxivUrl;
    
    // Initialize multi-source support with explicit context binding
    const { processPaperUrl, enhancedHandleTabChange } = initMultiSourceSupport({
        createGithubIssue,       // Pass createGithubIssue function to background_multi_source
        endCurrentSession,       // Pass endCurrentSession function
        EnhancedReadingSession,  // Pass EnhancedReadingSession class
        sessionConfig,           // Pass sessionConfig
        startActivityTracking,   // Pass startActivityTracking function
        setCurrentPaperData,     // New helper function to set current paper data
        processArxivUrl          // Pass the original arXiv processor
    });
    
    // Store enhanced function
    enhancedProcessPaperUrl = processPaperUrl;
    
    // Debug information
    console.log('Multi-source paper support initialized');
}

// Helper function to set current paper data
function setCurrentPaperData(data) {
    currentPaperData = data;
    return currentPaperData;
}

// Listen for credential changes
chrome.storage.onChanged.addListener(async (changes) => {
    console.log('Storage changes detected:', Object.keys(changes));
    if (changes.githubToken) {
        githubToken = changes.githubToken.newValue;
    }
    if (changes.githubRepo) {
        githubRepo = changes.githubRepo.newValue;
    }
    if (changes.sessionConfig) {
        sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
        console.log('Session configuration updated:', sessionConfig);
    }
    
    // Reinitialize paper manager if credentials changed
    if (changes.githubToken || changes.githubRepo) {
        if (githubToken && githubRepo) {
            const githubClient = new GitHubStoreClient(githubToken, githubRepo);
            paperManager = new PaperManager(githubClient);
            console.log('Paper manager reinitialized');
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

// Initialize credentials
initialize().catch(error => {
  logger.error('Initialization failed', error);
});

// Message passing between background and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    if (request.type === 'getCurrentPaper') {
        console.log('Popup requested current paper:', currentPaperData);
        sendResponse(currentPaperData);
    }
    else if (request.type === 'updateRating') {
        console.log('Rating update requested:', request.rating);
        handleUpdateRating(request.rating, sendResponse);
        return true; // Will respond asynchronously
    }
    else if (request.type === 'updateAnnotation') {
        console.log('Annotation update requested:', request.annotationType, request.data);
        handleAnnotationUpdate(request.annotationType, request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
    // Add a dedicated handler for track paper requests from content scripts
    else if (request.type === 'trackPaper') {
        console.log('Track paper requested:', request);
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
            
            // Fall back to enhanced process paper URL if API failed
            if (!paperData && enhancedProcessPaperUrl) {
                paperData = await enhancedProcessPaperUrl(request.url);
            }
        } else if (request.source === 'arxiv' && originalProcessArxivUrl) {
            // Special case for arXiv
            paperData = await originalProcessArxivUrl(request.url);
            
            // Add multi-source fields
            if (paperData) {
                paperData.source = 'arxiv';
                paperData.sourceId = paperData.arxivId;
                paperData.primary_id = formatPrimaryId('arxiv', paperData.arxivId);
            }
        } else if (enhancedProcessPaperUrl) {
            // Try the generic processor as a fallback
            paperData = await enhancedProcessPaperUrl(request.url);
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

async function handleUpdateRating(rating, sendResponse) {
    if (!paperManager) {
        sendResponse({ success: false, error: 'Paper manager not initialized' });
        return;
    }

    if (!currentPaperData) {
        sendResponse({ success: false, error: 'No current paper' });
        return;
    }

    try {
        // Always use primary_id for rating updates
        const paperId = currentPaperData.primary_id;
        await paperManager.updateRating(paperId, rating, currentPaperData);
        currentPaperData.rating = rating;
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error updating rating:', error);
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
    // Check if this is a paper URL
    const sourceInfo = MultiSourceDetector.detect(details.url);
    if (!sourceInfo) {
      logger.info('Not a recognized paper URL');
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
      const paperData = await processUnifiedPaperUrl(details.url);
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

// Helper function to find the appropriate plugin for a URL
function findPluginForUrl(url) {
  // First try using the plugin registry
  const plugins = pluginRegistry.getAll();
  
  for (const plugin of plugins) {
    for (const pattern of plugin.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        const id = plugin.extractId(url);
        if (id) {
          return {
            type: plugin.id,
            id: id,
            primary_id: plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id),
            plugin: plugin
          };
        }
      }
    }
  }
  
  // Fallback to legacy detector if no plugin match
  return MultiSourceDetector.detect(url);
}

// Unified paper URL processor with debouncing
async function processUnifiedPaperUrl(url) {
  logger.info(`Processing paper URL: ${url}`);
  
  // Skip if URL is already being processed
  if (pendingUrls.has(url)) {
    logger.info(`URL already being processed in processUnifiedPaperUrl: ${url}`);
    return null;
  }
  
  // Mark URL as being processed
  pendingUrls.add(url);
  
  try {
    // Check source type
    const sourceInfo = MultiSourceDetector.detect(url);
    if (!sourceInfo) {
      logger.info('Not a recognized paper URL in processor');
      return null;
    }
    
    // Process based on source type
    let paperData;
    if (sourceInfo.type === 'arxiv' && originalProcessArxivUrl) {
      // Use original arXiv processor for compatibility
      paperData = await originalProcessArxivUrl(url);
      
      // Enhance with source fields
      if (paperData) {
        paperData.source = 'arxiv';
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = sourceInfo.primary_id;
      }
    } else if (enhancedProcessPaperUrl) {
      // Use enhanced processor for other sources
      paperData = await enhancedProcessPaperUrl(url);
    }
    
    // If paper data was extracted, create or update in GitHub
    if (paperData) {
      logger.info(`Paper data extracted, creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await createGithubIssue(paperData);
      } catch (error) {
        logger.error(`Error creating GitHub issue: ${error}`);
      }
    }
    
    return paperData;
  } catch (error) {
    logger.error(`Error processing paper URL: ${error}`);
    return null;
  } finally {
    // Remove URL from pending after a delay
    setTimeout(() => {
      pendingUrls.delete(url);
    }, 500);
  }
}

// Handle tab changes with plugin system
async function handleTabChangeWithPlugins(tab) {
  if (!tab.url) return;
  
  // Find the appropriate plugin or source info
  const sourceInfo = findPluginForUrl(tab.url);
  
  if (!sourceInfo) {
    logger.info('Not a recognized paper page, ending current session');
    await endCurrentSession();
    return;
  }
  
  // End any existing session
  if (currentSession) {
    logger.info('Ending existing session before starting new one');
    await endCurrentSession();
  }
  
  // Process the paper URL
  logger.info(`Processing paper URL: ${tab.url}`);
  
  // Use sourceInfo to get paper data
  let paperData;
  
  // If we have a plugin, try to use it
  if (sourceInfo.plugin) {
    const plugin = sourceInfo.plugin;
    
    // Try to use the plugin's API if available
    if (plugin.hasApi && plugin.fetchApiData) {
      try {
        logger.info(`Using ${plugin.id} plugin API for tab`);
        const apiData = await plugin.fetchApiData(sourceInfo.id);
        if (Object.keys(apiData).length > 0) {
          paperData = {
            ...apiData,
            source: plugin.id,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: tab.url
          };
        }
      } catch (error) {
        logger.error(`Error using plugin API for tab: ${error}`);
      }
    }
  }
  
  // Fall back to legacy processors if needed
  if (!paperData) {
    if (sourceInfo.type === 'arxiv' && originalProcessArxivUrl) {
      // Use original arXiv processor for compatibility
      paperData = await originalProcessArxivUrl(tab.url);
      
      // Enhance with source fields
      if (paperData) {
        paperData.source = 'arxiv';
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = sourceInfo.primary_id;
      }
    } else if (enhancedProcessPaperUrl) {
      // Use enhanced processor for other sources
      paperData = await enhancedProcessPaperUrl(tab.url);
    }
  }
  
  if (paperData) {
    logger.info(`Starting new session for: ${paperData.primary_id}`);
    
    // Store current paper data
    currentPaperData = paperData;
    
    // Create a new reading session
    currentSession = new EnhancedReadingSession(paperData, sessionConfig);
    
    const metadata = currentSession.getMetadata();
    logger.info('New session created:', metadata);
    
    // Start tracking reading time
    startActivityTracking();
    
    // Create GitHub issue
    logger.info(`Creating GitHub issue for: ${paperData.primary_id}`);
    try {
      await createGithubIssue(paperData);
    } catch (error) {
      logger.error(`Error creating GitHub issue: ${error}`);
    }
  }
}

async function endCurrentSession() {
    if (currentSession && currentPaperData) {
        logger.info(`Ending session for: ${currentPaperData.primary_id}`);
        const sessionData = currentSession.finalize();
        if (sessionData) {
            logger.info('Creating reading event:', sessionData);
            await enhancedCreateReadingEvent(currentPaperData, sessionData);
        }
        currentSession = null;
        currentPaperData = null;
        stopActivityTracking();
    }
}

function startActivityTracking() {
    if (!activityInterval) {
        console.log('Starting activity tracking');
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

// Enhanced createReadingEvent function for multi-source support
async function enhancedCreateReadingEvent(paperData, sessionData) {
    if (!paperManager || !paperData) {
        console.error('Missing required data for creating reading event:', {
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

// Direct GitHub issue creation function
async function createGithubIssue(paperData) {
    if (!paperManager) {
        logger.error('Paper manager not initialized');
        return null;
    }

    // Ensure paper has primary_id
    if (!paperData.primary_id) {
        if (paperData.source && paperData.sourceId) {
            paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
        } else if (paperData.arxivId) {
            paperData.source = 'arxiv';
            paperData.sourceId = paperData.arxivId;
            paperData.primary_id = formatPrimaryId('arxiv', paperData.arxivId);
        } else {
            logger.error('Cannot create paper - no valid identifier');
            return null;
        }
    }
    
    try {
        logger.info(`Creating/getting paper issue: ${paperData.primary_id}`);
        const existingPaper = await paperManager.getOrCreatePaper(paperData);
        logger.info(`Paper metadata stored/retrieved: ${existingPaper.primary_id}`);
        return existingPaper;
    } catch (error) {
        logger.error(`Error handling paper metadata: ${error}`, error);
        return null;
    }
}

async function handleAnnotationUpdate(type, data) {
    if (!paperManager) {
        throw new Error('Paper manager not initialized');
    }

    try {
        // Ensure we have a valid paper ID
        let paperId = data.paperId;
        
        // Convert to new format if needed
        if (!paperId.includes('.')) {
            logger.warning(`Legacy ID format detected in annotation: ${paperId}`);
            paperId = formatPrimaryId('arxiv', paperId);
        }
        
        const paperData = data.title ? {
            title: data.title,
            source: data.source,
            primary_id: paperId
        } : undefined;

        if (type === 'vote') {
            await paperManager.updateRating(
                paperId,
                data.vote,
                paperData
            );
        } else {
            await paperManager.logAnnotation(
                paperId,
                'notes',
                data.notes,
                paperData
            );
        }

        return { success: true };
    } catch (error) {
        console.error('Error logging interaction:', error);
        throw error;
    }
}

async function parseXMLText(xmlText) {
    console.log('Parsing XML response...');
    try {
        const getTagContent = (tag, text) => {
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/;
            const entryMatch = text.match(entryRegex);
            
            if (entryMatch) {
                const entryContent = entryMatch[1];
                const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
                const match = entryContent.match(regex);
                return match ? match[1].trim() : '';
            }
            return '';
        };
        
        const getAuthors = (text) => {
            const authors = [];
            const regex = /<author>[^]*?<name>([^]*?)<\/name>[^]*?<\/author>/g;
            let match;
            while (match = regex.exec(text)) {
                authors.push(match[1].trim());
            }
            return authors;
        };

        const getCategories = (text) => {
            const categories = new Set();
            
            const primaryMatch = text.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
            if (primaryMatch) {
                categories.add(primaryMatch[1]);
            }
            
            const categoryRegex = /<category[^>]*term="([^"]+)"/g;
            let match;
            while (match = categoryRegex.exec(text)) {
                categories.add(match[1]);
            }
            
            return Array.from(categories);
        };

        const getPublishedDate = (text) => {
            const match = text.match(/<published>([^<]+)<\/published>/);
            return match ? match[1].trim() : null;
        };

        const parsed = {
            title: getTagContent('title', xmlText),
            summary: getTagContent('summary', xmlText),
            authors: getAuthors(xmlText),
            published_date: getPublishedDate(xmlText),
            arxiv_tags: getCategories(xmlText)
        };
        
        console.log('Parsed XML:', parsed);
        return parsed;
    } catch (error) {
        console.error('Error parsing XML:', error);
        return null;
    }
}

// Process arXiv URL, but enhanced to add standardized fields
async function processArxivUrl(url) {
    console.log('Processing URL:', url);
    
    let arxivId = null;
    const match = url.match(/arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/);
    if (match) {
        arxivId = match[2];
    }
    
    if (!arxivId) {
        console.log('No arXiv ID found in URL');
        return null;
    }
    
    console.log('Found arXiv ID:', arxivId);
    
    try {
        const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
        console.log('Fetching from arXiv API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`ArXiv API error: ${response.status}`);
        }
        
        const text = await response.text();
        const parsed = await parseXMLText(text);
        
        if (!parsed) {
            console.log('Failed to parse API response');
            return null;
        }
        
        // Build paper data with new format fields
        const paperData = {
            arxivId,
            source: 'arxiv',
            sourceId: arxivId,
            primary_id: formatPrimaryId('arxiv', arxivId),
            url,
            title: parsed.title,
            authors: parsed.authors.join(", "),
            abstract: parsed.summary,
            timestamp: new Date().toISOString(),
            rating: 'novote',
            published_date: parsed.published_date,
            arxiv_tags: parsed.arxiv_tags
        };
        
        console.log('Paper data processed:', paperData);
        return paperData;
    } catch (error) {
        console.error('Error processing arXiv URL:', error);
        return null;
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

    console.log('Debug objects registered, access via __DEBUG__ in service worker console');
}
