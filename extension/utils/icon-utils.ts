// extension/utils/icon-utils.ts
// Simple icon management utilities

import { loguru } from './logger';

const logger = loguru.getLogger('icon-utils');

// Icon configurations
const ICONS = {
  default: {
    path: {
      "16": "icons/bookmark/red/favicon-16x16.png",
      "32": "icons/bookmark/red/favicon-32x32.png", 
      "48": "icons/bookmark/red/apple-touch-icon.png",
      "128": "icons/bookmark/red/apple-touch-icon.png"
    },
    title: "Academic Paper Tracker"
  },
  detected: {
    path: {
      "16": "icons/bookmark/blue/favicon-16x16.png",
      "32": "icons/bookmark/blue/favicon-32x32.png",
      "48": "icons/bookmark/blue/apple-touch-icon.png", 
      "128": "icons/bookmark/blue/apple-touch-icon.png"
    },
    title: "Paper Detected - Academic Paper Tracker"
  },
  tracked: {
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
 * Set icon for a specific tab
 */
export async function setIcon(tabId: number, state: keyof typeof ICONS): Promise<void> {
  try {
    const config = ICONS[state];
    
    await chrome.action.setIcon({
      tabId,
      path: config.path
    });

    await chrome.action.setTitle({
      tabId, 
      title: config.title
    });

    logger.debug(`Set ${state} icon for tab ${tabId}`);
  } catch (error) {
    logger.error(`Failed to set ${state} icon for tab ${tabId}:`, error);
  }
}
