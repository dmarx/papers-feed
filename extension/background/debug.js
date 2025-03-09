// extension/background/debug.js - Debug utilities for service worker

import { loguru } from "../utils/logger";
import { urlDetectionService } from '../papers/detection_service';
import { getPluginInitializationState } from '../papers/plugins/loader';
import credentialManager from './credential_manager';
import sessionManager from './session_manager';

const logger = loguru.getLogger('Debug');

/**
 * Initialize debug objects in service worker scope
 * @param {Object} enhancedServices - Enhanced services object
 */
export function initializeDebugObjects(enhancedServices) {
  // Use self for service worker context
  if (typeof self !== 'undefined' && 'self' in globalThis) {
    self.__DEBUG__ = {
      // Paper manager
      get paperManager() { 
        return credentialManager.getPaperManager(); 
      },
      
      // GitHub client
      getGithubClient: () => {
        const paperManager = credentialManager.getPaperManager();
        return paperManager?.client;
      },
      
      // Session info
      getCurrentPaper: () => sessionManager.getCurrentPaper(),
      getCurrentSession: () => sessionManager.currentSession,
      getConfig: () => sessionManager.sessionConfig,
      
      // Enhanced services
      enhancedServices: {
        urlDetectionService,
        getPluginState: getPluginInitializationState,
        ...(enhancedServices || {})
      }
    };

    logger.info('Debug objects registered, access via __DEBUG__ in service worker console');
  } else {
    logger.warn('Debug objects not initialized: service worker context not detected');
  }
}

export default {
  initializeDebugObjects
};
