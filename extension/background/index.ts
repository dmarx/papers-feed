// extension/background/index.ts - Main extension background service worker

import { loguru } from "../utils/logger";
import { initializePluginSystem } from '../papers/plugins/loader';
import { processUrl } from '../papers/detection_service';
import credentialManager from './credential_manager';
import sessionManager from './session_manager';
import eventHandlers from './event_handlers';
import messageHandlers from './message_handlers';
import debugModule from './debug';

const logger = loguru.getLogger('Background');

/**
 * Initialize the extension
 * @returns {Promise<void>}
 */
async function initialize(): Promise<void> {
  logger.info('Initializing extension');
  
  try {
    // Load credentials and config
    const { paperManager } = await credentialManager.loadCredentials();
    logger.info('Credentials loaded:', {
      hasPaperManager: !!paperManager
    });
    
    // Load session configuration
    const sessionConfig = await sessionManager.loadSessionConfig();
    logger.info('Session configuration loaded');
    
    // Initialize plugin system with retry capability
    logger.info('Initializing plugin system');
    await initializePluginSystem(3);
    logger.info('Plugin system initialized');
    
    // Set up event listeners
    await eventHandlers.setupListeners();
    
    // Initialize debug objects (message handlers are self-initializing)
    debugModule.initializeDebugObjects({
      handleUrl: processUrl
    });
    
    logger.info('Extension initialized successfully');
  } catch (error) {
    logger.error('Extension initialization failed:', error);
  }
}

// Initialize extension
initialize();
