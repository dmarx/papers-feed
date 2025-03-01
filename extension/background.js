// background.js
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from './papers/manager';
import { loadSessionConfig, getConfigurationInMs } from './config/session.js';
import { ReadingSessionData } from './papers/types';
// Added imports for multi-source support
import { MultiSourceDetector } from './papers/detector';
import { getLegacyId } from './papers/source_utils';
import { initMultiSourceSupport } from './background_multi_source';

let githubToken = '';
let githubRepo = '';
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let sessionConfig = null;
let paperManager = null;

// Store references to functions that will be enhanced
let originalHandleTabChange = null;
let originalProcessArxivUrl = null;
let enhancedTabChangeHandler = null;
let enhancedProcessPaperUrl = null;

class ReadingSession {
    constructor(arxivId, config) {
       this.arxivId = arxivId;
       this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
    
    end() {
       return this.finalize();
    }
    
    getMetadata() {
       return {
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
    // Save original functions for compatibility
    originalHandleTabChange = handleTabChange;
    originalProcessArxivUrl = processArxivUrl;
    
    // Initialize multi-source support with explicit context binding
    const { processPaperUrl, enhancedHandleTabChange } = initMultiSourceSupport({
        createGithubIssue,       // Pass createGithubIssue function to background_multi_source
        endCurrentSession,       // Pass endCurrentSession function
        ReadingSession,          // Pass ReadingSession class
        sessionConfig,           // Pass sessionConfig
        startActivityTracking,   // Pass startActivityTracking function
        setCurrentPaperData,     // New helper function to set current paper data
        processArxivUrl          // Pass the original arXiv processor
    });
    
    // Store enhanced functions
    enhancedTabChangeHandler = enhancedHandleTabChange;
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

// Initialize credentials
loadCredentials();

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
    return true;
});

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
        const paperId = currentPaperData.arxivId || currentPaperData.sourceId;
        await paperManager.updateRating(paperId, rating, currentPaperData);
        currentPaperData.rating = rating;
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error updating rating:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Tab and window management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    // Use enhanced tab change handler if available, otherwise fall back to original
    if (enhancedTabChangeHandler) {
        enhancedTabChangeHandler(tab, originalHandleTabChange);
    } else {
        handleTabChange(tab);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Use enhanced tab change handler if available, otherwise fall back to original
        if (enhancedTabChangeHandler) {
            enhancedTabChangeHandler(tab, originalHandleTabChange);
        } else {
            handleTabChange(tab);
        }
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        endCurrentSession();
    }
});

// Listen for URL changes - now handling both arXiv and other sources
chrome.webNavigation.onCompleted.addListener(async (details) => {
    console.log('Navigation detected:', details.url);
    
    // Check if this is a paper URL using the multi-source detector
    const sourceInfo = MultiSourceDetector.detect(details.url);
    
    if (sourceInfo) {
        console.log(`${sourceInfo.type.toUpperCase()} URL detected, processing...`);
        
        // Use appropriate processor based on source
        let paperData;
        if (sourceInfo.type === 'arxiv' && originalProcessArxivUrl) {
            // Use original processor for arXiv
            paperData = await originalProcessArxivUrl(details.url);
            
            // Add multi-source fields
            if (paperData) {
                paperData.source = 'arxiv';
                paperData.sourceId = paperData.arxivId;
                paperData.primary_id = sourceInfo.primary_id;
            }
        } else if (enhancedProcessPaperUrl) {
            // Use enhanced processor for other sources
            paperData = await enhancedProcessPaperUrl(details.url);
        }
        
        if (paperData) {
            console.log('Paper data extracted:', paperData);
            await createGithubIssue(paperData);
        } else {
            console.log('Failed to extract paper data');
        }
    }
}, {
    url: [
        { hostSuffix: 'arxiv.org' },
        { hostSuffix: 'semanticscholar.org' },
        { hostSuffix: 'doi.org' },
        { hostSuffix: 'dl.acm.org' },
        { hostSuffix: 'openreview.net' }
    ]
});

// Original handleTabChange function
async function handleTabChange(tab) {
    const isArxiv = tab.url?.includes('arxiv.org/');
    console.log('Tab change detected:', { isArxiv, url: tab.url });
    
    if (!isArxiv) {
        console.log('Not an arXiv page, ending current session');
        await endCurrentSession();
        return;
    }

    if (currentSession) {
        console.log('Ending existing session before starting new one');
        await endCurrentSession();
    }

    console.log('Processing arXiv URL for new session');
    currentPaperData = await processArxivUrl(tab.url);
    if (currentPaperData) {
        console.log('Starting new session for:', currentPaperData.arxivId);
        currentSession = new ReadingSession(currentPaperData.arxivId, sessionConfig);
        const metadata = currentSession.getMetadata();
        console.log('New session created:', metadata);
        startActivityTracking();
    }
}

async function endCurrentSession() {
    if (currentSession && currentPaperData) {
        console.log('Ending session for:', currentPaperData.arxivId || currentPaperData.sourceId);
        const sessionData = currentSession.finalize();
        if (sessionData) {
            console.log('Creating reading event:', sessionData);
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

// Original createReadingEvent function
async function createReadingEvent(paperData, sessionData) {
    if (!paperManager || !paperData) {
        console.error('Missing required data for creating reading event:', {
            hasPaperManager: !!paperManager,
            hasPaperData: !!paperData
        });
        return;
    }

    try {
        await paperManager.logReadingSession(
            paperData.arxivId,
            sessionData,
            paperData
        );
        console.log('Reading session logged:', {
            arxivId: paperData.arxivId,
            sessionId: sessionData.session_id,
            activeTime: sessionData.duration_seconds,
            idleTime: sessionData.idle_seconds,
            totalTime: sessionData.total_elapsed_seconds
        });
        
    } catch (error) {
        console.error('Error logging reading session:', error);
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
        // Determine which ID to use for logging
        const paperIdForLogging = paperData.arxivId || 
                            (paperData.source && paperData.sourceId ? 
                            paperData.sourceId : 
                            null);
        
        if (!paperIdForLogging) {
            console.error('No valid paper ID found for logging');
            return;
        }
        
        await paperManager.logReadingSession(
            paperIdForLogging,
            sessionData,
            paperData
        );
        
        console.log('Reading session logged:', {
            paperId: paperIdForLogging,
            sessionId: sessionData.session_id,
            activeTime: sessionData.duration_seconds,
            idleTime: sessionData.idle_seconds,
            totalTime: sessionData.total_elapsed_seconds
        });
        
    } catch (error) {
        console.error('Error logging reading session:', error);
    }
}

async function createGithubIssue(paperData) {
    if (!paperManager) {
        console.error('Paper manager not initialized');
        return null;
    }

    try {
        const existingPaper = await paperManager.getOrCreatePaper(paperData);
        console.log('Paper metadata stored/retrieved:', 
            existingPaper.arxivId || existingPaper.sourceId || existingPaper.primary_id);
        return existingPaper;
    } catch (error) {
        console.error('Error handling paper metadata:', error);
        return null;
    }
}

async function handleAnnotationUpdate(type, data) {
    if (!paperManager) {
        throw new Error('Paper manager not initialized');
    }

    try {
        const paperData = data.title ? {
            title: data.title,
            source: data.source
        } : undefined;

        if (type === 'vote') {
            await paperManager.updateRating(
                data.paperId,
                data.vote,
                paperData
            );
        } else {
            await paperManager.logAnnotation(
                data.paperId,
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
        
        const paperData = {
            arxivId,
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

// Additions to extension/background.js

// Import plugin system
import { initializePluginSystem } from './papers/plugins/loader';
import { MultiSourceDetector } from './papers/detector';
import { loguru } from './utils/logger';

const logger = loguru.getLogger('Background');

// Initialize the extension
async function initialize() {
  logger.info('Initializing extension');
  
  // Load credentials and config
  await loadCredentials();
  
  // Initialize plugin system
  await initializePluginSystem();
  
  // Set up listeners for tab changes
  setupListeners();
  
  logger.info('Extension initialized');
}

// Set up event listeners using plugin system
function setupListeners() {
  // Get all supported hosts from plugins
  const { pluginRegistry } = await import('./papers/plugins/registry');
  const plugins = pluginRegistry.getAll();
  
  // Create host patterns from all plugins
  const hostPatterns = [];
  
  for (const plugin of plugins) {
    // Extract domain from first pattern as a simple approach
    // A more robust approach would parse all patterns
    const pattern = plugin.urlPatterns[0].toString();
    const match = pattern.match(/([a-zA-Z0-9.-]+)\\\.org/);
    if (match) {
      hostPatterns.push({ hostSuffix: `${match[1]}.org` });
    }
  }
  
  // Set up navigation listener with all hosts
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    logger.info(`Navigation detected: ${details.url}`);
    
    // Get tab info
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id === details.tabId) {
      // Use enhanced handler with plugin system
      handleTabChangeWithPlugins(tabs[0]);
    }
  }, { url: hostPatterns });
  
  // Also listen for tab activation
  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleTabChangeWithPlugins(tab);
  });
  
  // Listen for tab updates
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
      handleTabChangeWithPlugins(tab);
    }
  });
}

// Handle tab changes with plugin system
async function handleTabChangeWithPlugins(tab) {
  if (!tab.url) return;
  
  // Check if this is a paper URL using the plugin system
  const sourceInfo = MultiSourceDetector.detect(tab.url);
  
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
  const paperData = await MultiSourceDetector.processUrl(tab.url, processArxivUrl);
  
  if (paperData) {
    logger.info(`Starting new session for: ${paperData.primary_id}`);
    
    // Store current paper data
    currentPaperData = paperData;
    
    // Create a new reading session
    currentSession = new ReadingSession(paperData.primary_id, sessionConfig);
    
    const metadata = currentSession.getMetadata();
    logger.info('New session created:', metadata);
    
    // Start tracking reading time
    startActivityTracking();
    
    // Create or update paper in GitHub
    await createGithubIssue(paperData);
  }
}

// Call initialization
initialize().catch(error => {
  logger.error('Initialization failed', error);
});
