// extension/papers/detection_service.ts - Paper detection service wrapper

import { loguru } from "../utils/logger";
import { SourceInfo } from './types';
import { MultiSourceDetector, detectSourceFromUrl } from './detector';
import { pluginRegistry } from './plugins/registry';

const logger = loguru.getLogger('DetectionService');

// Define interfaces for detection service
export interface DetectedSourceInfo extends SourceInfo {
  plugin?: any; // Plugin instance
}

// Define NavDetails interface for Chrome API types
interface NavDetails {
    tabId: number;
    url: string;
    frameId: number;
    timeStamp: number;
}

/**
 * URL detection service using the MultiSourceDetector
 */
export const urlDetectionService = {
  /**
   * Check if URL is valid
   * @param {string} url URL to check
   * @returns {boolean} Whether URL is valid
   */
  isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Detect paper source info from URL
   * @param {string} url URL to analyze
   * @returns {Promise<DetectedSourceInfo|null>} Detection result with plugin
   */
  async detectSource(url: string): Promise<DetectedSourceInfo | null> {
    // Use the existing MultiSourceDetector
    const sourceInfo = MultiSourceDetector.detect(url);
    
    if (!sourceInfo) {
      return null;
    }
    
    // Get the plugin for this source
    const plugin = pluginRegistry.get(sourceInfo.type);
    
    if (!plugin) {
      logger.warn(`No plugin found for detected source: ${sourceInfo.type}`);
      return sourceInfo;
    }
    
    // Enhance the source info with the plugin
    return {
      ...sourceInfo,
      plugin
    };
  }
};

/**
 * Process a URL using the detection service
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
 * Process a tab using the detection service
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
 * Process navigation event using the detection service
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

// Re-export the MultiSourceDetector and detectSourceFromUrl for backward compatibility
export { MultiSourceDetector, detectSourceFromUrl };
