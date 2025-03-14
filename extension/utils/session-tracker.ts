// utils/session-tracker.ts
// Reading session tracking

import { ReadingSessionData } from '../papers/types';
import { loguru } from './logger';

const logger = loguru.getLogger('session-tracker');

export interface SessionConfig {
  // Threshold for idle time in milliseconds
  idleThreshold: number;
  
  // Minimum session duration to be considered valid, in milliseconds
  minSessionDuration: number;
  
  // How often to update active time in milliseconds
  activityUpdateInterval: number;
  
  // Whether to require continuous activity (reset timer on idle)
  requireContinuousActivity: boolean;
  
  // Whether to log sessions shorter than minimum duration
  logPartialSessions: boolean;
}

export class SessionTracker {
  private activeSession: ReadingSession | null = null;
  private updateInterval: number | null = null;
  private currentPaperId: string | null = null;
  private currentSourceId: string | null = null;
  
  constructor(private config: SessionConfig) {
    logger.debug('Session tracker initialized', config);
  }
  
  /**
   * Start tracking a new session
   */
  startSession(sourceId: string, paperId: string): void {
    // End any existing session first
    this.endSession();
    
    // Create new session
    this.activeSession = new ReadingSession(sourceId, paperId, this.config);
    this.currentSourceId = sourceId;
    this.currentPaperId = paperId;
    
    // Start update interval
    this.startUpdateInterval();
    
    logger.info(`Started tracking session for ${sourceId}:${paperId}`, 
      this.activeSession.getMetadata());
  }
  
  /**
   * End the current session and get the data
   */
  endSession(): ReadingSessionData | null {
    if (!this.activeSession) {
      return null;
    }
    
    // Stop the update interval
    this.stopUpdateInterval();
    
    // Finalize the session
    const sessionData = this.activeSession.finalize();
    
    logger.info(`Ended session for ${this.currentSourceId}:${this.currentPaperId}`,
      sessionData ? {
        duration: sessionData.duration_seconds,
        idle: sessionData.idle_seconds
      } : 'Session too short');
    
    // Clear current session
    this.activeSession = null;
    this.currentSourceId = null;
    this.currentPaperId = null;
    
    return sessionData;
  }
  
  /**
   * Get the current session's metadata
   */
  getCurrentSessionMetadata(): any | null {
    return this.activeSession?.getMetadata() || null;
  }
  
  /**
   * Get current paper and source IDs
   */
  getCurrentPaper(): { sourceId: string | null, paperId: string | null } {
    return {
      sourceId: this.currentSourceId,
      paperId: this.currentPaperId
    };
  }
  
  /**
   * Start the activity update interval
   */
  private startUpdateInterval(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
    }
    
    this.updateInterval = window.setInterval(() => {
      this.activeSession?.update();
    }, this.config.activityUpdateInterval);
  }
  
  /**
   * Stop the activity update interval
   */
  private stopUpdateInterval(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

class ReadingSession {
  // Session ID
  readonly sessionId: string;
  
  // Timestamps
  private startTime: Date;
  private lastActiveTime: Date;
  private endTime: Date | null = null;
  
  // Time tracking
  private activeTime: number = 0;
  private idleTime: number = 0;
  
  // State
  private isTracking: boolean = true;
  private finalizedData: ReadingSessionData | null = null;
  
  constructor(
    public sourceId: string,
    public paperId: string,
    private config: SessionConfig
  ) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.startTime = new Date();
    this.lastActiveTime = new Date();
  }
  
  /**
   * Update the session's active and idle time
   */
  update(): void {
    if (!this.isTracking || this.finalizedData) {
      return;
    }
    
    const now = new Date();
    const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
    
    if (timeSinceLastActive < this.config.idleThreshold) {
      // User is active
      this.activeTime += timeSinceLastActive;
    } else {
      // User is idle
      this.idleTime += timeSinceLastActive;
    }
    
    this.lastActiveTime = now;
  }
  
  /**
   * Finalize the session and get the data
   */
  finalize(): ReadingSessionData | null {
    if (this.finalizedData) {
      return this.finalizedData;
    }
    
    // Update one last time
    this.update();
    
    // Stop tracking
    this.isTracking = false;
    this.endTime = new Date();
    
    // Calculate total elapsed time
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
    
    // Check if session is long enough
    if (this.activeTime >= this.config.minSessionDuration || this.config.logPartialSessions) {
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
   * Get session metadata (for debugging/display)
   */
  getMetadata(): any {
    return {
      sessionId: this.sessionId,
      sourceId: this.sourceId,
      paperId: this.paperId,
      startTime: this.startTime.toISOString(),
      activeSeconds: Math.round(this.activeTime / 1000),
      idleSeconds: Math.round(this.idleTime / 1000),
      isTracking: this.isTracking
    };
  }
}
