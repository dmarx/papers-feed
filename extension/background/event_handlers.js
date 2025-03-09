// extension/background/event_handlers.js - Tab and navigation event handlers

import { loguru } from "../utils/logger";
import { processNavigation, processTab } from '../papers/detection_service';
import { fullyProcessUrl, fullyProcessTab } from '../papers/paper_processor';
import { pluginRegistry } from '../papers/plugins/registry';
import sessionManager from './session_manager';
import githubIntegration from './github_integration';

const logger = loguru.getLogger('EventHandlers');

/**
 * Manages tab and navigation event handlers
 */
export class EventHandlers {
  constructor() {
    this.pendingUrls = new Set();
  }

  /**
   * Set up all event listeners
   * @returns {Promise<void>}
   */
  async setupListeners() {
    logger.info('Setting up unified event listeners');
    
    // Get all supported hosts from plugins
    const plugins = pluginRegistry.getAll();
    
    // Create host patterns from all plugins
    const hostPatterns = this._buildHostPatterns(plugins);
    
    logger.info(`Setting up navigation listener with patterns: ${JSON.stringify(hostPatterns)}`);
    
    // CONSOLIDATED LISTENER: Set up a single navigation listener with all hosts
    chrome.webNavigation.onCompleted.addListener(
      this.handleUnifiedNavigation.bind(this), 
      { url: hostPatterns }
    );
    
    // CONSOLIDATED LISTENER: Set up a single tab activation listener
    chrome.tabs.onActivated.addListener(
      this.handleUnifiedTabActivation.bind(this)
    );
    
    // CONSOLIDATED LISTENER: Set up a single tab update listener
    chrome.tabs.onUpdated.addListener(
      this.handleUnifiedTabUpdate.bind(this)
    );
    
    // Window focus changes
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        sessionManager.endCurrentSession();
      }
    });
    
    logger.info('All event listeners initialized');
  }

  /**
   * Build host patterns from plugins
   * @private
   * @param {Array} plugins - Available plugins
   * @returns {Array} Host patterns for navigation listener
   */
  _buildHostPatterns(plugins) {
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
    
    return hostPatterns;
  }

  /**
   * Handle navigation events
   * @param {Object} details - Navigation details
   * @returns {Promise<void>}
   */
  async handleUnifiedNavigation(details) {
    logger.info(`Unified navigation handler: ${details.url}`);
    
    try {
      // Use enhanced detection service
      const sourceInfo = await processNavigation(details);
      
      if (!sourceInfo) {
        logger.info('Not a recognized paper URL');
        return;
      }
      
      logger.info(`Detected paper: ${sourceInfo.type}:${sourceInfo.id}`);
      
      // Check if tab is active
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id === details.tabId) {
        // This is the active tab, handle as tab change
        await this.handleTabChangeWithPlugins(tabs[0]);
      } else {
        // Process URL but don't start a session
        const paperData = await fullyProcessUrl(details.url);
        if (paperData) {
          logger.info(`Processed paper data: ${paperData.title}`);
        }
      }
    } catch (error) {
      logger.error(`Error in navigation handler: ${error}`);
    }
  }

  /**
   * Handle tab activation events
   * @param {Object} activeInfo - Tab activation info
   * @returns {Promise<void>}
   */
  async handleUnifiedTabActivation(activeInfo) {
    logger.info(`Unified tab activation handler: ${activeInfo.tabId}`);
    const tab = await chrome.tabs.get(activeInfo.tabId);
    
    if (!tab.url || this.pendingUrls.has(tab.url)) {
      logger.info(`Tab URL empty or already being processed: ${tab.url}`);
      return;
    }
    
    try {
      // Mark URL as being processed
      this.pendingUrls.add(tab.url);
      
      // Delegate to the appropriate handler
      await this.handleTabChangeWithPlugins(tab);
    } catch (error) {
      logger.error(`Error in tab activation handler: ${error}`);
    } finally {
      setTimeout(() => {
        this.pendingUrls.delete(tab.url);
      }, 500);
    }
  }

  /**
   * Handle tab update events
   * @param {number} tabId - Tab ID
   * @param {Object} changeInfo - Change info
   * @param {Object} tab - Tab object
   * @returns {Promise<void>}
   */
  async handleUnifiedTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== 'complete' || !tab.url || this.pendingUrls.has(tab.url)) {
      return;
    }
    
    logger.info(`Unified tab update handler: ${tab.url}`);
    
    try {
      // Mark URL as being processed
      this.pendingUrls.add(tab.url);
      
      // Delegate to the appropriate handler
      await this.handleTabChangeWithPlugins(tab);
    } catch (error) {
      logger.error(`Error in tab update handler: ${error}`);
    } finally {
      setTimeout(() => {
        this.pendingUrls.delete(tab.url);
      }, 500);
    }
  }

  /**
   * Handle tab changes for papers
   * @param {Object} tab - Tab object
   * @returns {Promise<void>}
   */
  async handleTabChangeWithPlugins(tab) {
    if (!tab.url) return;
    
    // Use enhanced detection service
    const sourceInfo = await processTab(tab);
    
    if (!sourceInfo) {
      logger.info('Not a recognized paper page, ending current session');
      await sessionManager.endCurrentSession();
      return;
    }

    // Process the paper URL with full metadata extraction
    logger.info(`Processing paper URL: ${tab.url}`);
    const paperData = await fullyProcessUrl(tab.url, tab.id);
    
    if (paperData) {
      logger.info(`Starting new session for: ${paperData.primary_id}`);
      
      // Start a new session
      sessionManager.startSession(paperData);
      
      // Create GitHub issue
      logger.info(`Creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await githubIntegration.createGithubIssue(paperData);
      } catch (error) {
        logger.error(`Error creating GitHub issue: ${error}`);
      }
    }
  }

  /**
   * Process a paper URL
   * @param {string} url - Paper URL
   * @param {Object} options - Processing options
   * @returns {Promise<Object|null>} Paper data or null
   */
  async processPaperUrl(url, options = {}) {
    logger.info(`Processing paper URL: ${url}`);
    
    try {
      // Use the enhanced services for full processing
      const tabId = options.tabId || null;
      return await fullyProcessUrl(url, tabId);
    } catch (error) {
      logger.error(`Error processing paper URL: ${error}`);
      return null;
    }
  }
}

export default new EventHandlers();
