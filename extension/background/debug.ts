// extension/background/debug.ts - Debug utilities for service worker

import { loguru } from "../utils/logger";
import { urlDetectionService } from '../papers/detection_service';
import { getPluginInitializationState } from '../papers/plugins/loader';
import credentialManager from './credential_manager';
import sessionManager from './session_manager';

const logger = loguru.getLogger('Debug');

// Define properly typed interfaces for debug objects
interface EnhancedServices {
  urlDetectionService: typeof urlDetectionService;
  getPluginState: typeof getPluginInitializationState;
  handleUrl?: (url: string) => Promise<any>;
  [key: string]: any;
}

// Don't redeclare __DEBUG__ here since it's already declared elsewhere
// We'll use the existing declaration

/**
 * Initialize debug objects in service worker scope
 * @param {Partial<EnhancedServices>} enhancedServices - Enhanced services object
 */
export function initializeDebugObjects(enhancedServices?: Partial<EnhancedServices>): void {
  // Use self for service worker context
  if (typeof self !== 'undefined') {
    (self as any).__DEBUG__ = {
      // Paper manager
      get paperManager() { 
        return credentialManager.getPaperManager(); 
      },
      
      // GitHub client - use any to bypass type checking for this property
      getGithubClient: (): any => {
        return credentialManager.getPaperManager();
      },
      
      // Session info
      getCurrentPaper: () => sessionManager.getCurrentPaper(),
      getCurrentSession: () => sessionManager.currentSession,
      getConfig: () => sessionManager.sessionConfig,
      
      // Enhanced services - construct with proper defaults
      enhancedServices: {
        urlDetectionService,
        getPluginState: getPluginInitializationState,
        handleUrl: enhancedServices?.handleUrl || ((url: string) => Promise.resolve(null)),
        ...(enhancedServices || {})
      }
    };

    logger.info('Debug objects registered, access via __DEBUG__ in service worker console');
  } else {
    logger.warning('Debug objects not initialized: service worker context not detected');
  }
}

export default {
  initializeDebugObjects
};
