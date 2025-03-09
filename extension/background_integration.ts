// extension/background_integration.ts - With service worker support

import { urlDetectionService, DetectedSourceInfo } from './papers/url_detection_service';
import { initializePluginSystem, getPluginInitializationState } from './papers/plugins/loader';
import { formatPrimaryId } from './papers/source_utils';
import { loguru } from './utils/logger';

// Define NavDetails interface for Chrome API types
interface NavDetails {
    tabId: number;
    url: string;
    frameId: number;
    timeStamp: number;
}

const logger = loguru.getLogger('BackgroundIntegration');

/**
 * Initialize the enhanced services
 * @returns {Promise<void>}
 */
export async function initializeEnhancedServices(): Promise<void> {
  logger.info('Initializing enhanced services');
  
  try {
    // Initialize plugin system with retry capability
    await initializePluginSystem(3);
    
    const pluginState = getPluginInitializationState();
    logger.info('Plugin system initialized:', pluginState);
    
    // Add this integration module to the extension debug API
    // Using 'self' for service worker context
    if (typeof self !== 'undefined' && 'self' in globalThis && '__DEBUG__' in self) {
      (self as any).__DEBUG__.enhancedServices = {
        urlDetectionService,
        getPluginState: getPluginInitializationState,
        handleUrl: processUrl
      };
      
      logger.info('Debug API extended with enhanced services');
    }
  } catch (error) {
    logger.error('Failed to initialize enhanced services:', error);
    throw error;
  }
}

/**
 * Process a URL using the enhanced detection service
 * @param {string} url URL to process
 * @returns {Promise<DetectedSourceInfo|null>} Detection result
 */
export async function processUrl(url: string): Promise<DetectedSourceInfo | null> {
  if (!urlDetectionService.isValidUrl(url)) {
    logger.info(`Invalid or unsupported URL: ${url}`);
    return null;
  }
  
  try {
    return await urlDetectionService.detectSource(url);
  } catch (error) {
    logger.error(`Error processing URL ${url}:`, error);
    return null;
  }
}

/**
 * Process a tab using the enhanced detection service
 * @param {chrome.tabs.Tab} tab Tab to process
 * @returns {Promise<DetectedSourceInfo|null>} Detection result
 */
export async function processTab(tab: chrome.tabs.Tab): Promise<DetectedSourceInfo | null> {
  if (!tab.url) {
    logger.info('Tab has no URL');
    return null;
  }
  
  return processUrl(tab.url);
}

/**
 * Process navigation event using the enhanced detection service
 * @param {NavDetails} details Navigation details
 * @returns {Promise<DetectedSourceInfo|null>} Detection result
 */
export async function processNavigation(details: NavDetails): Promise<DetectedSourceInfo | null> {
  if (!details.url) {
    logger.info('Navigation event has no URL');
    return null;
  }
  
  return processUrl(details.url);
}

/**
 * Extract metadata from a detected source
 * @param {DetectedSourceInfo} sourceInfo Source info
 * @returns {Promise<Object|null>} Extracted metadata or null
 */
export async function extractMetadataFromSource(sourceInfo: DetectedSourceInfo): Promise<any | null> {
  if (!sourceInfo || !sourceInfo.plugin) {
    logger.info('No valid source info or plugin');
    return null;
  }
  
  try {
    // Try to use the plugin's API if available
    if (sourceInfo.plugin.hasApi && sourceInfo.plugin.fetchApiData) {
      try {
        logger.info(`Using ${sourceInfo.plugin.id} plugin API to extract metadata`);
        const apiData = await sourceInfo.plugin.fetchApiData(sourceInfo.id);
        
        if (apiData && Object.keys(apiData).length > 0) {
          // Ensure required fields are present
          return {
            ...apiData,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (apiError) {
        logger.error(`Error using plugin API: ${apiError}`);
      }
    }
    
    // Fall back to default minimal data
    return {
      source: sourceInfo.type,
      sourceId: sourceInfo.id,
      primary_id: sourceInfo.primary_id,
      url: sourceInfo.url,
      title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
      timestamp: new Date().toISOString(),
      rating: 'novote'
    };
  } catch (error) {
    logger.error(`Error extracting metadata: ${error}`);
    return null;
  }
}

/**
 * Process a document with DOM access using the given tab
 * @param {number} tabId Tab ID for DOM access
 * @param {DetectedSourceInfo} sourceInfo Source info
 * @returns {Promise<Object|null>} Extracted metadata or null
 */
export async function extractMetadataFromDOM(tabId: number, sourceInfo: DetectedSourceInfo): Promise<any | null> {
  if (!sourceInfo || !sourceInfo.plugin || !sourceInfo.plugin.extractMetadata) {
    return null;
  }
  
  try {
    logger.info(`Attempting DOM extraction for ${sourceInfo.type}`);
    
    // Execute script to get HTML document
    const script = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML
    });
    
    if (script && script[0] && script[0].result) {
      // Create DOM document from HTML for service worker context
      // Use non-DOM parser for service worker environment
      try {
        const htmlString = script[0].result as string;
        
        // Since we're in a service worker, we need to use a different approach for metadata extraction
        // Ask the plugin to extract metadata - must be a service worker safe implementation
        const metadata = await sourceInfo.plugin.extractMetadata({
          documentElement: { outerHTML: htmlString }
        }, sourceInfo.url);
        
        if (metadata && Object.keys(metadata).length > 0) {
          return {
            ...metadata,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (parserError) {
        logger.error(`Error parsing HTML in service worker: ${parserError}`);
        // Fall back to direct string content
        try {
          // Use a simpler approach - pass the HTML as a string
          const metadata = await sourceInfo.plugin.extractMetadata(
            { innerHTML: script[0].result },
            sourceInfo.url
          );
          
          if (metadata && Object.keys(metadata).length > 0) {
            return {
              ...metadata,
              source: sourceInfo.type,
              sourceId: sourceInfo.id,
              primary_id: sourceInfo.primary_id,
              url: sourceInfo.url
            };
          }
        } catch (fallbackError) {
          logger.error(`Error with fallback metadata extraction: ${fallbackError}`);
        }
      }
    }
  } catch (error) {
    logger.error(`Error extracting metadata from DOM: ${error}`);
  }
  
  return null;
}

/**
 * Fully process a URL with all enhanced services
 * @param {string} url URL to process
 * @param {number|null} tabId Optional tab ID for DOM access
 * @returns {Promise<Object|null>} Full paper data or null
 */
export async function fullyProcessUrl(url: string, tabId: number | null = null): Promise<any | null> {
  try {
    // Detect source
    const sourceInfo = await processUrl(url);
    
    if (!sourceInfo) {
      logger.info(`No source detected for URL: ${url}`);
      return null;
    }
    
    logger.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id}`);
    
    // Try API metadata extraction first
    let paperData = await extractMetadataFromSource(sourceInfo);
    
    // If API extraction failed or returned minimal data and we have a tab ID,
    // try DOM extraction as a fallback
    if (tabId && (!paperData || !paperData.title || paperData.title.includes(sourceInfo.id))) {
      logger.info('API extraction failed or returned minimal data, trying DOM extraction');
      const domData = await extractMetadataFromDOM(tabId, sourceInfo);
      
      if (domData) {
        // Merge API and DOM data, with DOM data taking precedence
        paperData = {
          ...paperData,
          ...domData,
          // Ensure critical fields are preserved
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url
        };
      }
    }
    
    if (paperData) {
      logger.info(`Successfully processed paper: ${paperData.title || paperData.primary_id}`);
    }
    
    return paperData;
  } catch (error) {
    logger.error(`Error fully processing URL ${url}:`, error);
    return null;
  }
}
