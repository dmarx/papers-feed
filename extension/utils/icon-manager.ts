// extension/utils/icon-manager.ts
// Icon management utility for dynamic tab icons (SVGs defined inline)

import { loguru } from './logger';

const logger = loguru.getLogger('icon-manager');

/**
 * Icon states for different paper detection statuses
 */
export enum IconState {
  DEFAULT = 'default',
  DETECTED = 'detected',
  TRACKED = 'tracked',
}

/**
 * For each IconState, we define a single-root inline SVG string and a tooltip title.
 * Note: these SVG strings have been cleaned up to remove nested <svg> tags and <style> blocks.
 */
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
  <!-- “Blue” variant -->
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
  <!-- “Forest” variant -->
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

/**
 * Sizes (in pixels) at which we want to rasterize each SVG.
 * Chrome typically expects icons at these four resolutions.
 */
const ICON_SIZES = [16, 32, 48, 128];

/**
 * Manages dynamic icon changes based on paper detection status.
 */
export class IconManager {
  private tabStates: Map<number, IconState> = new Map();

  constructor() {
    this.setupTabListeners();
    logger.debug('Icon manager initialized');
  }

  private setupTabListeners(): void {
    // Clean up icon state when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
      logger.debug(`Cleaned up icon state for closed tab ${tabId}`);
    });

    // Reset icon when navigating to a new URL
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.status === 'loading' && changeInfo.url) {
        this.setIconState(tabId, IconState.DEFAULT);
        logger.debug(`Reset icon for tab ${tabId} navigating to ${changeInfo.url}`);
      }
    });
  }

  /**
   * Set icon state for a specific tab by:
   * 1. Taking the inline SVG string.
   * 2. Rasterizing to each size in ICON_SIZES via OffscreenCanvas.
   * 3. Passing imageDataMap to chrome.action.setIcon().
   */
  async setIconState(tabId: number, state: IconState): Promise<void> {
    const config = ICON_CONFIGS[state];

    try {
      // 1. Read the inline SVG text
      const svgText = config.svg;

      // 2. Rasterize SVG at each desired size
      const imageDataMap: Record<string, ImageData> = {};
      for (const px of ICON_SIZES) {
        const imgData = await this.rasterizeSvgToImageData(svgText, px, px);
        imageDataMap[px.toString()] = imgData;
      }

      // 3. Swap in the new icon for this tab
      await chrome.action.setIcon({
        tabId,
        imageData: imageDataMap,
      });

      // 4. Update the tooltip/title
      await chrome.action.setTitle({
        tabId,
        title: config.title,
      });

      // 5. Track state internally
      this.tabStates.set(tabId, state);
      logger.debug(`Set icon state to ${state} for tab ${tabId}`);
    } catch (error) {
      logger.error(`Failed to set icon state for tab ${tabId}:`, error);
    }
  }

  /**
   * Rasterize a string of SVG markup into an ImageData blob
   * at the specified pixel width/height.
   */
  private async rasterizeSvgToImageData(
    svgText: string,
    widthPx: number,
    heightPx: number
  ): Promise<ImageData> {
    // Create a Blob for the SVG text
    const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });

    // Decode the SVG into an ImageBitmap, resizing it to (widthPx × heightPx)
    const bitmap = await createImageBitmap(svgBlob, {
      resizeWidth: widthPx,
      resizeHeight: heightPx,
      resizeQuality: 'high',
    });

    // Draw the ImageBitmap onto an OffscreenCanvas
    const offscreen = new OffscreenCanvas(widthPx, heightPx);
    const ctx = offscreen.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from OffscreenCanvas');
    }
    ctx.clearRect(0, 0, widthPx, heightPx);
    ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);

    // Extract the rasterized pixel data
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
}
