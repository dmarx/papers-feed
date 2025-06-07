// extension/utils/icon-manager.ts
// Icon management utility with inline SVGs and enhanced features

import { loguru } from './logger';

const logger = loguru.getLogger('icon-manager');

export enum IconState {
  DEFAULT = 'default',
  DETECTED = 'detected',
  TRACKED = 'tracked',
}

// Your excellent SVG definitions (keeping them as-is)
const ICON_CONFIGS: {
  [K in IconState]: { svg: string; title: string };
} = {
  [IconState.DEFAULT]: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" fill="#f8f9fa"/><rect x="6" y="6" width="24" height="24" rx="2" fill="#e9ecef"/><path fill="#dc3545" d="M18 8v16l4-3 4 3V8z"/></svg>`,
    title: 'Academic Paper Tracker',
  },

  [IconState.DETECTED]: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" fill="#e3f2fd"/><rect x="6" y="6" width="24" height="24" rx="2" fill="#bbdefb"/><path fill="#2196f3" d="M18 8v16l4-3 4 3V8z"/></svg>`,
    title: 'Paper Detected - Academic Paper Tracker',
  },

  [IconState.TRACKED]: {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect width="36" height="36" fill="#e8f5e8"/><rect x="6" y="6" width="24" height="24" rx="2" fill="#c8e6c9"/><path fill="#4caf50" d="M18 8v16l4-3 4 3V8z"/></svg>`,
    title: 'Paper Tracked - Academic Paper Tracker',
  },
};

const ICON_SIZES = [16, 32, 48, 128];

export class IconManager {
  private tabStates: Map<number, IconState> = new Map();
  private pendingUpdates: Map<number, Promise<void>> = new Map(); // NEW: Prevent race conditions
  private iconCache: Map<string, Record<string, ImageData>> = new Map(); // NEW: Cache rasterized icons

  constructor() {
    this.setupTabListeners();
    this.preloadIcons(); // NEW: Pre-rasterize all icons at startup
    logger.debug('Icon manager initialized');
  }

  private setupTabListeners(): void {
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
      this.pendingUpdates.delete(tabId);
      logger.debug(`Cleaned up icon state for closed tab ${tabId}`);
    });

    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'loading' && changeInfo.url) {
        this.setIconState(tabId, IconState.DEFAULT);
        logger.debug(`Reset icon for tab ${tabId} navigating to ${changeInfo.url}`);
      }
    });
  }

  // NEW: Pre-rasterize all icons for better performance
  private async preloadIcons(): Promise<void> {
    try {
      for (const state of Object.values(IconState)) {
        const config = ICON_CONFIGS[state];
        const imageDataMap: Record<string, ImageData> = {};
        
        for (const px of ICON_SIZES) {
          const imgData = await this.rasterizeSvgToImageData(config.svg, px, px);
          imageDataMap[px.toString()] = imgData;
        }
        
        this.iconCache.set(state, imageDataMap);
      }
      logger.debug('Pre-loaded all icon states');
    } catch (error) {
      logger.error('Failed to preload icons:', error);
    }
  }

  async setIconState(tabId: number, state: IconState): Promise<void> {
    // NEW: Check if already in this state (deduplication)
    const currentState = this.tabStates.get(tabId);
    if (currentState === state) {
      logger.debug(`Icon already in ${state} state for tab ${tabId}, skipping`);
      return;
    }

    // NEW: Wait for any pending updates to avoid race conditions
    const pending = this.pendingUpdates.get(tabId);
    if (pending) {
      try {
        await pending;
      } catch (error) {
        logger.warn(`Previous icon update failed for tab ${tabId}:`, error);
      }
    }

    // Create update promise
    const updatePromise = this.performIconUpdate(tabId, state);
    this.pendingUpdates.set(tabId, updatePromise);

    try {
      await updatePromise;
      this.tabStates.set(tabId, state);
      logger.debug(`Set icon state to ${state} for tab ${tabId}`);
    } catch (error) {
      logger.error(`Failed to set icon state for tab ${tabId}:`, error);
      throw error;
    } finally {
      this.pendingUpdates.delete(tabId);
    }
  }

  private async performIconUpdate(tabId: number, state: IconState): Promise<void> {
    const config = ICON_CONFIGS[state];

    // Check if tab still exists
    try {
      await chrome.tabs.get(tabId);
    } catch (error) {
      logger.debug(`Tab ${tabId} no longer exists, skipping icon update`);
      return;
    }

    try {
      // NEW: Use cached icons if available, otherwise rasterize on demand
      let imageDataMap = this.iconCache.get(state);
      
      if (!imageDataMap) {
        logger.debug(`Cache miss for ${state}, rasterizing on demand`);
        imageDataMap = {};
        for (const px of ICON_SIZES) {
          const imgData = await this.rasterizeSvgToImageData(config.svg, px, px);
          imageDataMap[px.toString()] = imgData;
        }
        this.iconCache.set(state, imageDataMap);
      }

      await chrome.action.setIcon({
        tabId,
        imageData: imageDataMap,
      });

      await chrome.action.setTitle({
        tabId,
        title: config.title,
      });

    } catch (error) {
      // Handle specific Chrome API errors gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('No tab with id') || 
          errorMessage.includes('Cannot access')) {
        logger.debug(`Cannot update icon for tab ${tabId}: ${errorMessage}`);
        return;
      }
      throw error;
    }
  }

  private async rasterizeSvgToImageData(
    svgText: string,
    widthPx: number,
    heightPx: number
  ): Promise<ImageData> {
    try {
      // Clean up SVG text and ensure it's valid
      const cleanSvg = svgText.trim();
      
      // Create blob with proper MIME type
      const svgBlob = new Blob([cleanSvg], { type: 'image/svg+xml;charset=utf-8' });
      
      // Create object URL for the blob
      const svgUrl = URL.createObjectURL(svgBlob);
      
      try {
        // Create an image element and load the SVG
        const img = new Image();
        
        // Wait for image to load
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load SVG image'));
          img.src = svgUrl;
        });

        // Create canvas and draw image
        const offscreen = new OffscreenCanvas(widthPx, heightPx);
        const ctx = offscreen.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get 2D context from OffscreenCanvas');
        }

        // Clear canvas and draw image
        ctx.clearRect(0, 0, widthPx, heightPx);
        ctx.drawImage(img, 0, 0, widthPx, heightPx);

        return ctx.getImageData(0, 0, widthPx, heightPx);
      } finally {
        // Clean up object URL
        URL.revokeObjectURL(svgUrl);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.warn(`SVG rasterization failed, creating fallback icon: ${errorMessage}`);
      
      // Create a simple fallback icon
      return this.createFallbackIcon(widthPx, heightPx);
    }
  }

  // NEW: Create a simple fallback icon when SVG fails
  private createFallbackIcon(widthPx: number, heightPx: number): ImageData {
    const offscreen = new OffscreenCanvas(widthPx, heightPx);
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context for fallback icon');
    }

    // Draw a simple colored rectangle as fallback
    ctx.fillStyle = '#dc3545'; // Bootstrap red
    ctx.fillRect(0, 0, widthPx, heightPx);
    
    // Add a simple bookmark shape
    ctx.fillStyle = '#fff';
    const padding = Math.max(2, widthPx * 0.1);
    ctx.fillRect(padding, padding, widthPx - padding * 2, heightPx - padding * 2);
    
    return ctx.getImageData(0, 0, widthPx, heightPx);
  }

  getIconState(tabId: number): IconState {
    return this.tabStates.get(tabId) || IconState.DEFAULT;
  }

  async setPaperDetected(tabId: number): Promise<void> {
    await this.setIconState(tabId, IconState.DETECTED);
  }

  async setPaperTracked(tabId: number): Promise<void> {
    await this.setIconState(tabId, IconState.TRACKED);
  }

  async resetIcon(tabId: number): Promise<void> {
    await this.setIconState(tabId, IconState.DEFAULT);
  }

  async setBadgeText(tabId: number, text: string, color?: string): Promise<void> {
    try {
      await chrome.action.setBadgeText({ tabId, text });
      if (color) {
        await chrome.action.setBadgeBackgroundColor({ tabId, color });
      }
      logger.debug(`Set badge text "${text}" for tab ${tabId}`);
    } catch (error) {
      logger.error(`Failed to set badge text for tab ${tabId}:`, error);
    }
  }

  async clearBadge(tabId: number): Promise<void> {
    await this.setBadgeText(tabId, '');
  }

  // NEW: Utility method to add dynamic badges/indicators
  async setPaperCount(tabId: number, count: number): Promise<void> {
    if (count > 0) {
      await this.setBadgeText(tabId, count.toString(), '#FF4444');
    } else {
      await this.clearBadge(tabId);
    }
  }

  // NEW: Reset all tabs to default (useful for extension restart)
  async resetAllIcons(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      await Promise.allSettled(
        tabs.map(tab => tab.id ? this.resetIcon(tab.id) : Promise.resolve())
      );
      logger.info('Reset all tab icons');
    } catch (error) {
      logger.error('Failed to reset all icons:', error);
    }
  }

  // NEW: Get cache statistics for debugging
  getCacheStats(): { states: number; totalSize: number } {
    let totalSize = 0;
    for (const imageDataMap of this.iconCache.values()) {
      for (const imageData of Object.values(imageDataMap)) {
        totalSize += imageData.data.length;
      }
    }
    return {
      states: this.iconCache.size,
      totalSize
    };
  }
}
