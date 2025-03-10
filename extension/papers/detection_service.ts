// extension/papers/detection_service.ts
// Enhanced paper detection service using context-separated plugins

import { loguru } from "../utils/logger";
import { pluginRegistry } from './plugins/registry';
import { arePluginsInitialized, initializePluginSystem } from './plugins/loader';
import { SourceInfo, DetectedSourceInfo } from '../types/common';

const logger = loguru.getLogger('DetectionService');

// Type definition for navigation details
interface NavDetails {
    tabId: number;
    url: string;
    frameId: number;
    timeStamp: number;
}

/**
 * Enhanced URL detection service with context awareness
 */
export class URLDetectionService {
  // Track processing state
  private pendingUrls = new Set<string>();
  
  // Debounce configuration
  private debounceTime = 500; // ms
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  
  // Cache successful detections to avoid repeat processing
  private detectionCache = new Map<string, DetectedSourceInfo>();
  private maxCacheSize = 100;
  
  constructor() {
    logger.info('URL Detection Service initialized');
  }
  
  /**
   * Detect paper source from URL
   * @param {string} url URL to analyze
   * @returns {Promise<DetectedSourceInfo|null>} Detected source info or null
   */
  async detectSource(url: string): Promise<DetectedSourceInfo | null> {
    if (!url) {
      logger.warning('Empty URL provided to detectSource');
      return null;
    }
    
    // First check cache
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
      
      // Use the plugin registry's findForUrl method
      const result = pluginRegistry.findForUrl(url);
      
      if (result) {
        // Create a standardized result
        const sourceInfo: DetectedSourceInfo = {
          type: result.plugin.id,
          id: result.id,
          // Use the plugin's formatId method to ensure consistency
          primary_id: result.plugin.serviceWorker.formatId(result.id),
          url: url,
          plugin: result.plugin
        };
        
        // Add to cache
        this.addToCache(url, sourceInfo);
        
        logger.info(`Detected source: ${sourceInfo.type}:${sourceInfo.id}`);
        return sourceInfo;
      }
      
      logger.info(`No matching source found for URL: ${url}`);
      return null;
    } finally {
      // Remove from pending after a delay to prevent immediate reprocessing
      this.removePendingUrlWithDelay(url);
    }
  }
  
  /**
   * Check if a URL is valid for paper detection
   * @param {string} url URL to check
   * @returns {boolean} True if URL is valid
   */
  isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    
    try {
      // Basic URL validation
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Check if URL is currently being processed
   * @param {string} url URL to check
   * @returns {boolean} True if URL is pending
   */
  isUrlPending(url: string): boolean {
    return this.pendingUrls.has(url);
  }
  
  /**
   * Add URL to pending set
   * @param {string} url URL to add
   */
  addPendingUrl(url: string): void {
    this.pendingUrls.add(url);
  }
  
  /**
   * Remove URL from pending set
   * @param {string} url URL to remove
   */
  removePendingUrl(url: string): void {
    this.pendingUrls.delete(url);
    
    // Clear any existing timer
    if (this.debounceTimers.has(url)) {
      clearTimeout(this.debounceTimers.get(url));
      this.debounceTimers.delete(url);
    }
  }
  
  /**
   * Remove URL from pending set after a delay
   * @param {string} url URL to remove
   * @param {number} delay Delay in ms (default: debounceTime)
   */
  removePendingUrlWithDelay(url: string, delay?: number): void {
    // Clear any existing timer
    if (this.debounceTimers.has(url)) {
      clearTimeout(this.debounceTimers.get(url) as NodeJS.Timeout);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      this.pendingUrls.delete(url);
      this.debounceTimers.delete(url);
    }, delay || this.debounceTime);
    
    this.debounceTimers.set(url, timer);
  }
  
  /**
   * Add a successful detection to cache
   * @param {string} url URL 
   * @param {DetectedSourceInfo} info Detection info
   */
  private addToCache(url: string, info: DetectedSourceInfo): void {
    if (!url) {
      logger.warning('Attempted to cache with empty URL');
      return;
    }
    
    // Implement LRU cache eviction if needed
    if (this.detectionCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first key)
      const oldestKey = this.detectionCache.keys().next().value;
      if (oldestKey) {
        this.detectionCache.delete(oldestKey);
      }
    }
    
    this.detectionCache.set(url, info);
  }
  
  /**
   * Clear the detection cache
   */
  clearCache(): void {
    this.detectionCache.clear();
  }
  
  /**
   * Get information about extractor module for a plugin
   * @param id Plugin ID
   * @returns Extractor information or null
   */
  getExtractorInfoForPlugin(id: string): { path: string } | null {
    const plugin = pluginRegistry.get(id);
    if (!plugin) {
      return null;
    }
    
    return {
      path: plugin.contentScript.extractorModulePath
    };
  }
  
  /**
   * Reset the service state
   * Used for testing and emergency recovery
   */
  reset(): void {
    // Clear pending URLs
    this.pendingUrls.clear();
    
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    
    // Clear cache
    this.clearCache();
    
    logger.info('URL Detection Service has been reset');
  }
  
  /**
   * Get service status information
   * @returns {Object} Service status
   */
  getStatus(): any {
    return {
      pendingUrlsCount: this.pendingUrls.size,
      activeTimersCount: this.debounceTimers.size,
      cacheSize: this.detectionCache.size,
      pluginsInitialized: arePluginsInitialized(),
      pluginCount: pluginRegistry.getAll().length
    };
  }
}

// Export singleton instance
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
