// extension/papers/paper_processor.ts - Complete paper processing pipeline

import { loguru } from "../utils/logger";
import { processUrl, processTab, processNavigation } from './detection_service';
import { extractPaperMetadata } from './metadata_service';

import { sanitizeMetadata } from '../utils/metadata_sanitizer';

const logger = loguru.getLogger('PaperProcessor');

/**
 * Fully process a URL with detection and metadata extraction
 * @param {string} url URL to process
 * @param {number|null} tabId Optional tab ID for DOM access
 * @returns {Promise<Object|null>} Full paper data or null
 */
export async function fullyProcessUrl(url: string, tabId: number | null = null): Promise<any | null> {
  try {
    // First detect the source
    const sourceInfo = await processUrl(url);
    
    if (!sourceInfo) {
      logger.info(`No source detected for URL: ${url}`);
      return null;
    }
    
    logger.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id}`);
    
    // Then extract metadata using the appropriate plugin
    //return await extractPaperMetadata(sourceInfo, tabId);
    let paperData = await extractPaperMetadata(sourceInfo, tabId);

    // After extracting metadata from any source
    if (paperData) {
      // Sanitize metadata before storing or displaying
      paperData = sanitizeMetadata(paperData);
      
      // Check for missing critical fields
      const hasMissingFields = !paperData.title || !paperData.authors;
      if (hasMissingFields) {
        paperData.metadata_quality = 'incomplete';
        // Flag for future enhancement attempts
      }
      return paperData;
    }
    return null;
    
  } catch (error) {
    logger.error(`Error fully processing URL ${url}:`, error);
    return null;
  }
}

/**
 * Fully process a tab with detection and metadata extraction
 * @param {chrome.tabs.Tab} tab Tab to process
 * @returns {Promise<Object|null>} Full paper data or null
 */
export async function fullyProcessTab(tab: chrome.tabs.Tab): Promise<any | null> {
  if (!tab.url || !tab.id) {
    logger.info('Tab has no URL or ID');
    return null;
  }
  
  try {
    // First detect the source
    const sourceInfo = await processTab(tab);
    
    if (!sourceInfo) {
      logger.info(`No source detected for tab URL: ${tab.url}`);
      return null;
    }
    
    logger.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id} in tab ${tab.id}`);
    
    // Then extract metadata using the appropriate plugin
    return await extractPaperMetadata(sourceInfo, tab.id);
  } catch (error) {
    logger.error(`Error fully processing tab: ${error}`);
    return null;
  }
}

/**
 * Fully process a navigation event with detection and metadata extraction
 * @param {Object} details Navigation details
 * @returns {Promise<Object|null>} Full paper data or null
 */
export async function fullyProcessNavigation(details: {
  tabId: number;
  url: string;
  frameId: number;
  timeStamp: number;
}): Promise<any | null> {
  if (!details.url || !details.tabId) {
    logger.info('Navigation has no URL or tab ID');
    return null;
  }
  
  try {
    // First detect the source
    const sourceInfo = await processNavigation(details);
    
    if (!sourceInfo) {
      logger.info(`No source detected for navigation URL: ${details.url}`);
      return null;
    }
    
    logger.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id} in navigation`);
    
    // Then extract metadata using the appropriate plugin
    return await extractPaperMetadata(sourceInfo, details.tabId);
  } catch (error) {
    logger.error(`Error fully processing navigation: ${error}`);
    return null;
  }
}
