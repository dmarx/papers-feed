// extension/background/session_manager.js - Manages reading sessions

import { loguru } from "../utils/logger";
import { loadSessionConfig, getConfigurationInMs } from '../config/session.js';
import credentialManager from './credential_manager';

const logger = loguru.getLogger('SessionManager');

/**
 * Enhanced reading session for modern format
 */
class EnhancedReadingSession {
  /**
   * Create a new reading session
   * @param {Object} paperData - Paper metadata
   * @param {Object} config - Session configuration
   */
  constructor(paperData, config) {
    // Validate required fields
    if (!paperData.primary_id) {
      throw new Error('Paper data must include primary_id');
    }
    
    this.paperId = paperData.primary_id;
    this.paperData = paperData;
    
    // Generate unique session ID
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Initialize timing data
    this.startTime = new Date();
    this.activeTime = 0;
    this.idleTime = 0;
    this.lastActiveTime = new Date();
    this.isTracking = true;
    this.config = config;
    this.endTime = null;
    this.finalizedData = null;
  }
  
  /**
   * Update session timing data
   */
  update() {
    if (this.isTracking && !this.finalizedData) {
      const now = new Date();
      const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
      
      if (timeSinceLastActive < this.config.idleThreshold) {
        this.activeTime += timeSinceLastActive;
      } else {
        this.idleTime += timeSinceLastActive;
      }
      
      this.lastActiveTime = now;
    }
  }
  
  /**
   * Finalize session data
   * @returns {Object|null} Session data or null if session was too short
   */
  finalize() {
    if (this.finalizedData) {
      return this.finalizedData;
    }
 
    this.update();
    this.isTracking = false;
    this.endTime = new Date();
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
 
    if (this.activeTime >= this.config.minSessionDuration) {
      this.finalizedData = {
        session_id: this.sessionId,
        duration_seconds: Math.round(this.activeTime / 1000),
        idle_seconds: Math.round(this.idleTime / 1000),
        start_time: this.startTime.toISOString(),
        end_time: this.endTime.toISOString(),
        total_elapsed_seconds: Math.round(totalElapsed / 1000)
      };
      return this.finalizedData;
    }
    return null;
  }
  
  /**
   * Get session metadata
   * @returns {Object} Session metadata
   */
  getMetadata() {
    return {
      sourceType: this.paperData.source,
      paperId: this.paperId,
      title: this.paperData.title,
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      activeSeconds: Math.round(this.activeTime / 1000),
      idleSeconds: Math.round(this.idleTime / 1000)
    };
  }
}

/**
 * Manages paper reading sessions
 */
export class SessionManager {
  constructor() {
    this.currentPaperData = null;
    this.currentSession = null;
    this.activityInterval = null;
    this.sessionConfig = null;
  }

  /**
   * Load session configuration
   * @returns {Promise<Object>} Session configuration
   */
  async loadSessionConfig() {
    this.sessionConfig = getConfigurationInMs(await loadSessionConfig());
    logger.info('Session configuration loaded:', this.sessionConfig);
    
    // Listen for configuration changes
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sessionConfig) {
        this.sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
        logger.info('Session configuration updated:', this.sessionConfig);
      }
    });
    
    return this.sessionConfig;
  }

  /**
   * Start a new reading session for a paper
   * @param {Object} paperData - Paper metadata
   * @returns {Object|null} Session metadata
   */
  startSession(paperData) {
    if (!paperData || !paperData.primary_id) {
      logger.error('Cannot start session: invalid paper data');
      return null;
    }
    
    // End any existing session
    if (this.currentSession) {
      logger.info('Ending existing session before starting new one');
      this.endCurrentSession();
    }
    
    logger.info(`Starting new session for: ${paperData.primary_id}`);
    
    // Store current paper data
    this.currentPaperData = paperData;
    
    // Create a new reading session
    this.currentSession = new EnhancedReadingSession(paperData, this.sessionConfig);
    
    const metadata = this.currentSession.getMetadata();
    logger.info('New session created:', metadata);
    
    // Start tracking reading time
    this._startActivityTracking();
    
    return metadata;
  }

  /**
   * End the current reading session
   * @returns {Promise<Object|null>} Session data or null if no active session
   */
  async endCurrentSession() {
    if (this.currentSession && this.currentPaperData) {
      logger.info(`Ending session for: ${this.currentPaperData.primary_id}`);
      const sessionData = this.currentSession.finalize();
      
      if (sessionData) {
        logger.info('Creating reading event:', sessionData);
        await this._createReadingEvent(this.currentPaperData, sessionData);
      }
      
      const result = {
        paperData: this.currentPaperData,
        sessionData: sessionData
      };
      
      this.currentSession = null;
      this.currentPaperData = null;
      this._stopActivityTracking();
      
      return result;
    }
    
    return null;
  }

  /**
   * Get the current paper data
   * @returns {Object|null} Current paper data
   */
  getCurrentPaper() {
    return this.currentPaperData;
  }

  /**
   * Start tracking activity
   * @private
   */
  _startActivityTracking() {
    if (!this.activityInterval) {
      logger.info('Starting activity tracking');
      this.activityInterval = setInterval(() => {
        if (this.currentSession) {
          this.currentSession.update();
        }
      }, this.sessionConfig.activityUpdateInterval);
    }
  }

  /**
   * Stop tracking activity
   * @private
   */
  _stopActivityTracking() {
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }

  /**
   * Create reading event in GitHub
   * @private
   * @param {Object} paperData - Paper metadata
   * @param {Object} sessionData - Session data
   * @returns {Promise<void>}
   */
  async _createReadingEvent(paperData, sessionData) {
    const paperManager = credentialManager.getPaperManager();
    
    if (!paperManager || !paperData) {
      logger.error('Missing required data for creating reading event:', {
        hasPaperManager: !!paperManager,
        hasPaperData: !!paperData
      });
      return;
    }

    try {
      // Always use primary_id for storage
      if (!paperData.primary_id) {
        logger.error('Paper data missing primary_id. This should not happen.');
        return;
      }
      
      const paperId = paperData.primary_id;
      
      await paperManager.logReadingSession(
        paperId,
        sessionData,
        paperData
      );
      
      logger.info('Reading session logged:', {
        paperId: paperId,
        sessionId: sessionData.session_id,
        activeTime: sessionData.duration_seconds,
        idleTime: sessionData.idle_seconds,
        totalTime: sessionData.total_elapsed_seconds
      });
      
    } catch (error) {
      logger.error('Error logging reading session:', error);
    }
  }
}

export default new SessionManager();
