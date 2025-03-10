// extension/papers/detection_service.ts
// Enhanced paper detection service using the plugin system

import { loguru } from "../utils/logger";
import { SourceInfo } from './types';
import { pluginRegistry } from './plugins/registry';
import { arePluginsInitialized, initializePluginSystem } from './plugins/loader';

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
 * Enhanced URL detection service
 */
export class URLDetectionService {
  // Track processing state
  private pendingUrls = new Set<string>();
  private detectionCache = new Map<string, DetectedSourceInfo>();
  
  constructor() {
    logger.info('URL Detection Service initialized');
  }
  
  /**
   * Check if URL is valid
   * @param {string} url URL to check
   * @returns {boolean} Whether URL is valid
   */
  isValidUrl(url: string): boolean {
    if (!url) return false;
    
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Detect paper source info from URL
   * @param {string} url URL to analyze
   * @returns {Promise<DetectedSourceInfo|null>} Detection result with plugin
   */
  async detectSource(url: string): Promise<DetectedSourceInfo | null> {
    if (!url) {
      logger.warning('Empty URL provided to detectSource');
      return null;
    }
    
    // Check cache first
    if (this.detectionCache.has(url)) {
      logger.info(`Cache hit for ${url}`);
      return this.detectionCache.get(url) as DetectedSourceInfo;
    }
    
    // Ensure plugins are initialized
    if (!arePluginsInitialized()) {
      logger.info('Plugins not initialized, initializing now...');
      try {
        await initializePluginSystem();
      } catch (error) {
        logger.error('Failed to initialize plugins:', error);
        return null;
      }
    }
    
    // Check if URL is already being processed
    if (this.isUrlPending(url)) {
      logger.info(`URL already being processed: ${url}`);
      return null;
    }
    
    try {
      // Mark URL as pending
      this.addPendingUrl(url);
      
      // Use the plugin registry to find a matching plugin
      const result = pluginRegistry.findForUrl(url);
      
      if (result) {
        // Create a standardized result
        const sourceInfo: DetectedSourceInfo = {
          type: result.plugin.id,
          id: result.id,
          primary_id: result.plugin.formatId(result.id),
          url: url,
          plugin: result.plugin
        };
        
        // Cache the result
        this.detectionCache.set(url, sourceInfo);
        
        logger.info(`Detected source: ${sourceInfo.type}:${sourceInfo.id}`);
        return sourceInfo;
      }
      
      logger.info(`No matching source found for URL: ${url}`);
      return null;
    } finally {
      // Remove from pending after a delay to prevent immediate reprocessing
      setTimeout(() => {
        this.pendingUrls.delete(url);
      }, 500);
    }
  }
  
  /**
   * Check if URL is pending processing
   * @param url URL to check
   * @returns True if URL is pending
   */
  isUrlPending(url: string): boolean {
    return this.pendingUrls.has(url);
  }
  
  /**
   * Add URL to pending set
   * @param url URL to add
   */
  addPendingUrl(url: string): void {
    this.pendingUrls.add(url);
  }
  
  /**
   * Clear detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
    logger.info('Detection cache cleared');
  }
  
  /**
   * Get a plugin's extractor code for a URL
   * @param url URL to get extractor for
   * @returns Extractor code as string or null
   */
  async getExtractorForUrl(url: string): Promise<string | null> {
    const sourceInfo = await this.detectSource(url);
    if (!sourceInfo || !sourceInfo.plugin) {
      return null;
    }
    
    try {
      return sourceInfo.plugin.getContentScriptExtractor();
    } catch (error) {
      logger.error(`Error getting extractor for ${url}:`, error);
      return null;
    }
  }
  
  /**
   * Get extractor code for a specific plugin
   * @param pluginId Plugin ID
   * @returns Extractor code or null
   */
  getExtractorForPlugin(pluginId: string): string | null {
    return pluginRegistry.getExtractorCode(pluginId);
  }
}

// Create singleton instance
export const urlDetectionService = new URLDetectionService();

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
