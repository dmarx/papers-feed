// utils/session-tracker.ts
// Reading session tracking with simplified heartbeat-based approach

import { loguru } from './logger';
import { ReadingSessionData as PaperReadingSessionData, PaperMetadata } from '../papers/types';

const logger = loguru.getLogger('session-tracker');

/**
 * Reading session data structure
 */
export interface ReadingSessionData extends PaperReadingSessionData {
  // Session identifier
  session_id: string;
  
  // Paper identifiers
  source_id: string;
  paper_id: string;
  
  // Session timing
  start_time: string;
  end_time: string;
  
  // Heartbeat data
  heartbeat_count: number;
  
  // Duration in seconds (derived from heartbeat count)
  duration_seconds: number;
  
  // Legacy properties needed for compatibility
  idle_seconds: number;
  total_elapsed_seconds: number;
}

/**
 * Class representing a single reading session
 */
class ReadingSession {
  readonly sessionId: string;
  readonly sourceId: string;
  readonly paperId: string;
  readonly startTime: Date;
  
  private heartbeatCount: number = 0;
  private lastHeartbeatTime: Date;
  private endTime: Date | null = null;
  
  constructor(sourceId: string, paperId: string) {
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.sourceId = sourceId;
    this.paperId = paperId;
    this.startTime = new Date();
    this.lastHeartbeatTime = this.startTime;
    
    logger.debug(`Created new reading session: ${this.sessionId} for ${sourceId}:${paperId}`);
  }
  
  /**
   * Record a heartbeat
   */
  recordHeartbeat(): void {
    this.heartbeatCount++;
    this.lastHeartbeatTime = new Date();
    
    if (this.heartbeatCount % 12 === 0) { // Log every minute (12 x 5sec heartbeats)
      logger.debug(`Session ${this.sessionId} received ${this.heartbeatCount} heartbeats`);
    }
  }
  
  /**
   * End the session and get data
   */
  endSession(): ReadingSessionData {
    this.endTime = new Date();
    
    // Calculate duration based on heartbeat count
    // This gives us the actual "proven" reading time
    const duration = this.heartbeatCount * 5; // 5 seconds per heartbeat
    
    // Calculate total elapsed time
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
    const totalElapsedSeconds = Math.round(totalElapsed / 1000);
    
    // Set idle seconds to the difference (for backward compatibility)
    const idleSeconds = Math.max(0, totalElapsedSeconds - duration);
    
    const sessionData: ReadingSessionData = {
      session_id: this.sessionId,
      paper_id: this.paperId,
      source_id: this.sourceId,
      start_time: this.startTime.toISOString(),
      end_time: this.endTime.toISOString(),
      heartbeat_count: this.heartbeatCount,
      duration_seconds: duration,
      
      // Legacy properties for backward compatibility
      idle_seconds: idleSeconds,
      total_elapsed_seconds: totalElapsedSeconds
    };
    
    logger.debug(`Ended session ${this.sessionId} with ${this.heartbeatCount} heartbeats (${duration}s)`);
    
    return sessionData;
  }
  
  /**
   * Get time since last heartbeat in milliseconds
   */
  getTimeSinceLastHeartbeat(): number {
    return Date.now() - this.lastHeartbeatTime.getTime();
  }
  
  /**
   * Get session metadata for debugging
   */
  getMetadata(): any {
    return {
      sessionId: this.sessionId,
      sourceId: this.sourceId,
      paperId: this.paperId,
      startTime: this.startTime.toISOString(),
      heartbeatCount: this.heartbeatCount,
      lastHeartbeatTime: this.lastHeartbeatTime.toISOString(),
      elapsedTime: Math.round((Date.now() - this.startTime.getTime()) / 1000)
    };
  }
}

/**
 * Manages reading session tracking
 */
export class SessionTracker {
  private activeSession: ReadingSession | null = null;
  private paperMetadata: Map<string, PaperMetadata> = new Map();
  
  constructor() {
    logger.debug('Session tracker initialized');
  }
  
  /**
   * Start a new session
   */
  startSession(sourceId: string, paperId: string, metadata?: PaperMetadata): void {
    // End any existing session
    this.endSession();
    
    // Create new session
    this.activeSession = new ReadingSession(sourceId, paperId);
    logger.info(`Started session for ${sourceId}:${paperId}`);
    
    // Store metadata if provided
    if (metadata) {
      const key = `${sourceId}:${paperId}`;
      this.paperMetadata.set(key, metadata);
      logger.debug(`Stored metadata for ${key}`);
    }
  }
  
  /**
   * Record a heartbeat for the current session
   */
  recordHeartbeat(): boolean {
    if (this.activeSession) {
      this.activeSession.recordHeartbeat();
      return true;
    }
    return false;
  }
  
  /**
   * End the current session and get the data
   */
  endSession(): ReadingSessionData | null {
    if (!this.activeSession) {
      return null;
    }
    
    const sessionData = this.activeSession.endSession();
    logger.info(`Ended session for ${sessionData.source_id}:${sessionData.paper_id}`, {
      duration: sessionData.duration_seconds,
      heartbeats: sessionData.heartbeat_count
    });
    
    const result = sessionData;
    this.activeSession = null;
    
    return result;
  }
  
  /**
   * Get current session info
   */
  getCurrentSession(): { sourceId: string; paperId: string } | null {
    if (!this.activeSession) {
      return null;
    }
    
    return {
      sourceId: this.activeSession.sourceId,
      paperId: this.activeSession.paperId
    };
  }
  
  /**
   * Get paper metadata for the current or specified session
   */
  getPaperMetadata(sourceId?: string, paperId?: string): PaperMetadata | undefined {
    if (!sourceId || !paperId) {
      if (!this.activeSession) return undefined;
      sourceId = this.activeSession.sourceId;
      paperId = this.activeSession.paperId;
    }
    
    return this.paperMetadata.get(`${sourceId}:${paperId}`);
  }
  
  /**
   * Check if a session is active
   */
  hasActiveSession(): boolean {
    return this.activeSession !== null;
  }
  
  /**
   * Get time since last heartbeat in milliseconds
   */
  getTimeSinceLastHeartbeat(): number | null {
    if (!this.activeSession) {
      return null;
    }
    
    return this.activeSession.getTimeSinceLastHeartbeat();
  }
  
  /**
   * Get session metadata for debugging
   */
  getCurrentSessionMetadata(): any | null {
    return this.activeSession?.getMetadata() || null;
  }
}
