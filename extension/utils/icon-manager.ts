// extension/utils/icon-manager.ts
// Icon management utility for dynamic tab icons

import { loguru } from './logger';

const logger = loguru.getLogger('icon-manager');

/**
 * Icon states for different paper detection statuses
 */
export enum IconState {
  DEFAULT = 'default',
  DETECTED = 'detected',
  TRACKED = 'tracked'
}

/**
 * Icon configuration mapping states to icon paths
 */
const ICON_CONFIGS = {
  [IconState.DEFAULT]: {
    path: {
      "16": "icons/bookmark/red/favicon-16x16.png",
      "32": "icons/bookmark/red/favicon-32x32.png",
      "48": "icons/bookmark/red/apple-touch-icon.png",
      "128": "icons/bookmark/red/apple-touch-icon.png"
    },
    title: "Academic Paper Tracker"
  },
  [IconState.DETECTED]: {
    path: {
      "16": "icons/bookmark/blue/favicon-16x16.png", 
      "32": "icons/bookmark/blue/favicon-32x32.png",
      "48": "icons/bookmark/blue/apple-touch-icon.png",
      "128": "icons/bookmark/blue/apple-touch-icon.png"
    },
    title: "Paper Detected - Academic Paper Tracker"
  },
  [IconState.TRACKED]: {
    path: {
      "16": "icons/bookmark/green/favicon-16x16.png",
      "32": "icons/bookmark/green/favicon-32x32.png", 
      "48": "icons/bookmark/green/apple-touch-icon.png",
      "128": "icons/bookmark/green/apple-touch-icon.png"
    },
    title: "Paper Tracked - Academic Paper Tracker"
  }
} as const;

/**
 * Manages dynamic icon changes based on paper detection status
 */
export class IconManager {
  private tabStates: Map<number, IconState> = new Map();

  constructor() {
    this.setupTabListeners();
    logger.debug('Icon manager initialized');
  }

  /**
   * Set up listeners for tab events
   */
  private setupTabListeners(): void {
    // Clean up icon state when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.tabStates.delete(tabId);
      logger.debug(`Cleaned up icon state for closed tab ${tabId}`);
    });

    // Reset icon when navigating to new URL
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'loading' && changeInfo.url) {
        this.setIconState(tabId, IconState.DEFAULT);
        logger.debug(`Reset icon for tab ${tabId} navigating to ${changeInfo.url}`);
      }
    });
  }

  /**
   * Set icon state for a specific tab
   */
  async setIconState(tabId: number, state: IconState): Promise<void> {
    try {
      const config = ICON_CONFIGS[state];
      
      await chrome.action.setIcon({
        tabId,
        path: config.path
      });

      await chrome.action.setTitle({
        tabId,
        title: config.title
      });

      this.tabStates.set(tabId, state);
      logger.debug(`Set icon state to ${state} for tab ${tabId}`);
    } catch (error) {
      logger.error(`Failed to set icon state for tab ${tabId}:`, error);
    }
  }

  /**
   * Get current icon state for a tab
   */
  getIconState(tabId: number): IconState {
    return this.tabStates.get(tabId) || IconState.DEFAULT;
  }

  /**
   * Set icon to detected state (paper found but not yet tracked)
   */
  async setPaperDetected(tabId: number): Promise<void> {
    await this.setIconState(tabId, IconState.DETECTED);
  }

  /**
   * Set icon to tracked state (paper is being tracked/stored)
   */
  async setPaperTracked(tabId: number): Promise<void> {
    await this.setIconState(tabId, IconState.TRACKED);
  }

  /**
   * Reset icon to default state
   */
  async resetIcon(tabId: number): Promise<void> {
    await this.setIconState(tabId, IconState.DEFAULT);
  }

  /**
   * Set badge text (optional visual indicator)
   */
  async setBadgeText(tabId: number, text: string, color?: string): Promise<void> {
    try {
      await chrome.action.setBadgeText({
        tabId,
        text
      });

      if (color) {
        await chrome.action.setBadgeBackgroundColor({
          tabId,
          color
        });
      }

      logger.debug(`Set badge text "${text}" for tab ${tabId}`);
    } catch (error) {
      logger.error(`Failed to set badge text for tab ${tabId}:`, error);
    }
  }

  /**
   * Clear badge text
   */
  async clearBadge(tabId: number): Promise<void> {
    await this.setBadgeText(tabId, '');
  }
}
