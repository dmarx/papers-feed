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
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <path fill="#AAB8C2" d="M35 26a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V6.313C1 4.104 6.791 0 9 0h20.625C32.719 0 35 2.312 35 5.375V26z"/>
  <path fill="#F5F8FA" d="M33 30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6c0-4.119-.021-4 5-4h21a4 4 0 0 1 4 4v24z"/>
  <path fill="#FFF"     d="M31 31a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v24z"/>
  <path fill="#AAB8C2" d="M31 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4v22z"/>
  <path fill="#E1E8ED" d="M29 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4h19.335C27.544 8 29 9.456 29 11.665V32z"/>
  <path fill="#AAB8C2" d="M6 6C4.312 6 4.269 4.078 5 3.25C5.832 2.309 7.125 2 9.438 2H11V0H8.281C4.312 0 1 2.5 1 5.375V32a4 4 0 0 0 4 4h2V6H6z"/>
  <g fill="#DD2E44">
    <path d="M17 4v23l4-6l4 6V4z"/>
    <path d="M25 28a1 1 0 0 1-.832-.445L21 22.803l-3.168 4.752A.998.998 0 0 1 16 27V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v23a1 1 0 0 1-1 1zm-4-8c.334 0 .646.167.832.445L24 23.697V5h-6v18.697l2.168-3.252c.186-.278.498-.445.832-.445z"/>
  </g>
  <path fill="#F5F8FA" d="M15 2h12v2H15z"/>
</svg>
    `.trim(),
    title: 'Academic Paper Tracker',
  },

  [IconState.DETECTED]: {
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <path fill="#1DA1F2" d="M35 26a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V6.313C1 4.104 6.791 0 9 0h20.625C32.719 0 35 2.312 35 5.375V26z"/>
  <path fill="#E8F5FE" d="M33 30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6c0-4.119-.021-4 5-4h21a4 4 0 0 1 4 4v24z"/>
  <path fill="#FFF"     d="M31 31a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v24z"/>
  <path fill="#1DA1F2" d="M31 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4v22z"/>
  <path fill="#E8F5FE" d="M29 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4h19.335C27.544 8 29 9.456 29 11.665V32z"/>
  <path fill="#1DA1F2" d="M6 6C4.312 6 4.269 4.078 5 3.25C5.832 2.309 7.125 2 9.438 2H11V0H8.281C4.312 0 1 2.5 1 5.375V32a4 4 0 0 0 4 4h2V6H6z"/>
  <g fill="#0A84FF">
    <path d="M17 4v23l4-6l4 6V4z"/>
    <path d="M25 28a1 1 0 0 1-.832-.445L21 22.803l-3.168 4.752A.998.998 0 0 1 16 27V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v23a1 1 0 0 1-1 1zm-4-8c.334 0 .646.167.832.445L24 23.697V5h-6v18.697l2.168-3.252c.186-.278.498-.445.832-.445z"/>
  </g>
  <path fill="#E8F5FE" d="M15 2h12v2H15z"/>
</svg>
    `.trim(),
    title: 'Paper Detected - Academic Paper Tracker',
  },

  [IconState.TRACKED]: {
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <path fill="#228B22" d="M35 26a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V6.313C1 4.104 6.791 0 9 0h20.625C32.719 0 35 2.312 35 5.375V26z"/>
  <path fill="#E8F5EE" d="M33 30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6c0-4.119-.021-4 5-4h21a4 4 0 0 1 4 4v24z"/>
  <path fill="#FFF"     d="M31 31a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v24z"/>
  <path fill="#228B22" d="M31 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4v22z"/>
  <path fill="#E8F5EE" d="M29 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4h19.335C27.544 8 29 9.456 29 11.665V32z"/>
  <path fill="#228B22" d="M6 6C4.312 6 4.269 4.078 5 3.25C5.832 2.309 7.125 2 9.438 2H11V0H8.281C4.312 0 1 2.5 1 5.375V32a4 4 0 0 0 4 4h2V6H6z"/>
  <g fill="#006400">
    <path d="M17 4v23l4-6l4 6V4z"/>
    <path d="M25 28a1 1 0 0 1-.832-.445L21 22.803l-3.168 4.752A.998.998 0 0 1 16 27V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v23a1 1 0 0 1-1 1zm-4-8c.334 0 .646.167.832.445L24 23.697V5h-6v18.697l2.168-3.252c.186-.278.498-.445.832-.445z"/>
  </g>
  <path fill="#E8F5EE" d="M15 2h12v2H15z"/>
</svg>
    `.trim(),
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
      if (error.message?.includes('No tab with id') || 
          error.message?.includes('Cannot access')) {
        logger.debug(`Cannot update icon for tab ${tabId}: ${error.message}`);
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
      const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
      const bitmap = await createImageBitmap(svgBlob, {
        resizeWidth: widthPx,
        resizeHeight: heightPx,
        resizeQuality: 'high',
      });

      const offscreen = new OffscreenCanvas(widthPx, heightPx);
      const ctx = offscreen.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get 2D context from OffscreenCanvas');
      }

      ctx.clearRect(0, 0, widthPx, heightPx);
      ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);

      return ctx.getImageData(0, 0, widthPx, heightPx);
    } catch (error) {
      logger.error(`Failed to rasterize SVG at ${widthPx}x${heightPx}:`, error);
      throw error;
    }
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
