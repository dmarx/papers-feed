// extension/papers/url_detection_service.ts
// Enhanced URL detection with unified approach and debouncing

import { pluginRegistry } from './plugins/registry';
import { formatPrimaryId } from './source_utils';
import { arePluginsInitialized, initializePluginSystem } from './plugins/loader';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('URLDetectionService');

// Type definition for detected source information
export interface DetectedSourceInfo {
  type: string;          // Source type (e.g., 'arxiv', 'doi')
  id: string;            // Source-specific ID
  primary_id: string;    // Universal primary ID 
  url: string;           // Original URL
  plugin?: any;          // Associated plugin if available
}

class URLDetectionService {
  // Track URLs being processed to prevent duplicates
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
      
      // Try using the plugin registry's findForUrl method first
      const result = pluginRegistry.findForUrl(url);
      if (result) {
        const sourceInfo: DetectedSourceInfo = {
          type: result.plugin.id,
          id: result.id,
          primary_id: result.plugin.formatId ? 
            result.plugin.formatId(result.id) : 
            formatPrimaryId(result.plugin.id, result.id),
          url: url,
          plugin: result.plugin
        };
        
        // Add to cache
        this.addToCache(url, sourceInfo);
        
        logger.info(`Detected source using plugin registry: ${sourceInfo.type}:${sourceInfo.id}`);
        return sourceInfo;
      }
      
      // Fall back to checking each plugin manually
      const plugins = pluginRegistry.getAll();
      
      for (const plugin of plugins) {
        for (const pattern of plugin.urlPatterns) {
          const match = url.match(pattern);
          if (match) {
            const id = plugin.extractId(url);
            if (id) {
              const sourceInfo: DetectedSourceInfo = {
                type: plugin.id,
                id: id,
                primary_id: plugin.formatId ? 
                  plugin.formatId(id) : 
                  formatPrimaryId(plugin.id, id),
                url: url,
                plugin: plugin
              };
              
              // Add to cache
              this.addToCache(url, sourceInfo);
              
              logger.info(`Detected source using manual check: ${sourceInfo.type}:${sourceInfo.id}`);
              return sourceInfo;
            }
          }
        }
      }
      
      logger.info(`No matching source found for URL: ${url}`);
      return null;
    } finally {
      // Clean up pending URL after a delay to prevent immediate reprocessing
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
      
      // Check for common academic domains
      const commonDomains = [
        'arxiv.org',
        'semanticscholar.org',
        'doi.org',
        'dl.acm.org',
        'openreview.net',
        's2-research.org'
      ];
      
      return commonDomains.some(domain => url.includes(domain));
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
      clearTimeout(this.debounceTimers.get(url));
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
    // Implement LRU cache eviction if needed
    if (this.detectionCache.size >= this.maxCacheSize) {
      // Remove oldest entry (first key)
      const oldestKey = this.detectionCache.keys().next().value;
      this.detectionCache.delete(oldestKey);
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
