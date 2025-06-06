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
// Accessible color schemes for each state
const ICON_COLORS = {
  [IconState.DEFAULT]: {
    background: '#fef2f2',
    paper: '#fecaca',
    bookmark: '#dc2626',
  },
  [IconState.DETECTED]: {
    background: '#eff6ff',
    paper: '#93c5fd', 
    bookmark: '#2563eb',
  },
  [IconState.TRACKED]: {
    background: '#ecfdf5',
    paper: '#86efac',
    bookmark: '#059669',
  },
} as const;

const ICON_CONFIGS: {
  [K in IconState]: { colors: typeof ICON_COLORS[K]; title: string };
} = {
  [IconState.DEFAULT]: {
    colors: ICON_COLORS[IconState.DEFAULT],
    title: 'Academic Paper Tracker',
  },
  [IconState.DETECTED]: {
    colors: ICON_COLORS[IconState.DETECTED],
    title: 'Paper Detected - Academic Paper Tracker',
  },
  [IconState.TRACKED]: {
    colors: ICON_COLORS[IconState.TRACKED],
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

  // NEW: Pre-generate all icons for better performance
  private async preloadIcons(): Promise<void> {
    try {
      for (const state of Object.values(IconState)) {
        const config = ICON_CONFIGS[state];
        const imageDataMap: Record<string, ImageData> = {};
        
        for (const px of ICON_SIZES) {
          const imgData = this.createCanvasIcon(config.colors, px, px);
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
      // NEW: Use cached icons if available, otherwise generate on demand
      let imageDataMap = this.iconCache.get(state);
      
      if (!imageDataMap) {
        logger.debug(`Cache miss for ${state}, generating on demand`);
        imageDataMap = {};
        for (const px of ICON_SIZES) {
          const imgData = this.createCanvasIcon(config.colors, px, px);
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

  // NEW: Create icon using improved Canvas drawing (no borders, larger bookmark)
  private createCanvasIcon(
    colors: { background: string; paper: string; bookmark: string },
    widthPx: number,
    heightPx: number
  ): ImageData {
    const offscreen = new OffscreenCanvas(widthPx, heightPx);
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }

    // Use full canvas - no padding for maximum space utilization
    const paperWidth = widthPx;
    const paperHeight = heightPx;
    
    // Draw background (full canvas)
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, widthPx, heightPx);
    
    // Draw paper (no rounded corners for cleaner look at small sizes)
    ctx.fillStyle = colors.paper;
    ctx.fillRect(0, 0, paperWidth, paperHeight);
    
    // Draw larger, more prominent bookmark (35% of width)
    const bookmarkWidth = Math.floor(widthPx * 0.35);
    const bookmarkHeight = Math.floor(heightPx * 0.8);
    const bookmarkX = widthPx - bookmarkWidth;
    const bookmarkY = 0;
    
    ctx.fillStyle = colors.bookmark;
    ctx.fillRect(bookmarkX, bookmarkY, bookmarkWidth, bookmarkHeight);
    
    // Draw prominent notch (60% of bookmark width for better visibility)
    const notchSize = Math.floor(bookmarkWidth * 0.6);
    ctx.fillStyle = colors.paper;
    ctx.beginPath();
    ctx.moveTo(bookmarkX, bookmarkY + bookmarkHeight);
    ctx.lineTo(bookmarkX + bookmarkWidth, bookmarkY + bookmarkHeight);
    ctx.lineTo(bookmarkX + bookmarkWidth / 2, bookmarkY + bookmarkHeight - notchSize);
    ctx.closePath();
    ctx.fill();

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
