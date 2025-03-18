// utils/session-service.ts
import { loguru } from './logger';
import { PaperManager } from '../papers/manager';
import { ReadingSessionData, PaperMetadata } from '../papers/types';

const logger = loguru.getLogger('session-service');

export interface SessionInfo {
  sourceId: string;
  paperId: string;
  startTime: Date;
}

export class SessionService {
  private static instance: SessionService | null = null;
  private activeSession: SessionInfo | null = null;
  private heartbeatCount: number = 0;
  private lastHeartbeatTime: Date | null = null;
  private heartbeatInterval: number | null = null;
  private heartbeatTimeoutId: number | null = null;
  private paperMetadata: Map<string, PaperMetadata> = new Map();
  private paperManager: PaperManager | null = null;
  
  // Constants
  private readonly HEARTBEAT_INTERVAL = 5000; // 5 seconds
  private readonly HEARTBEAT_TIMEOUT = 15000; // 15 seconds
  
  private constructor() {
    logger.debug('Session service initialized');
  }
  
  // Singleton instance getter
  public static getInstance(): SessionService {
    if (!SessionService.instance) {
      SessionService.instance = new SessionService();
    }
    return SessionService.instance;
  }
  
  // Initialize with PaperManager
  public initialize(paperManager: PaperManager): void {
    this.paperManager = paperManager;
    logger.info('Session service initialized with paper manager');
  }
  
  // Start a new session
  public startSession(sourceId: string, paperId: string, metadata?: PaperMetadata): void {
    // End any existing session
    this.endSession();
    
    this.activeSession = {
      sourceId,
      paperId,
      startTime: new Date()
    };
    
    this.heartbeatCount = 0;
    this.lastHeartbeatTime = new Date();
    
    // Store metadata if provided
    if (metadata) {
      const key = `${sourceId}:${paperId}`;
      this.paperMetadata.set(key, metadata);
    }
    
    // Start heartbeat
    this.startHeartbeat();
    
    logger.info(`Started session for ${sourceId}:${paperId}`);
  }
  
  // Start heartbeat interval
  private startHeartbeat(): void {
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = window.setInterval(() => {
      this.recordHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
    
    // Schedule timeout check
    this.scheduleTimeoutCheck();
    
    logger.debug('Started heartbeat');
  }
  
  // Record a heartbeat
  public recordHeartbeat(): void {
    if (!this.activeSession) return;
    
    this.heartbeatCount++;
    this.lastHeartbeatTime = new Date();
    
    // Reschedule timeout check
    this.scheduleTimeoutCheck();
    
    if (this.heartbeatCount % 12 === 0) { // Log every minute
      logger.debug(`Session has received ${this.heartbeatCount} heartbeats`);
    }
  }
  
  // Schedule heartbeat timeout check
  private scheduleTimeoutCheck(): void {
    if (this.heartbeatTimeoutId !== null) {
      clearTimeout(this.heartbeatTimeoutId);
    }
    
    this.heartbeatTimeoutId = window.setTimeout(() => {
      this.checkHeartbeatTimeout();
    }, this.HEARTBEAT_TIMEOUT);
  }
  
  // Check if heartbeat has timed out
  private checkHeartbeatTimeout(): void {
    if (!this.activeSession || !this.lastHeartbeatTime) return;
    
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeatTime.getTime();
    
    if (timeSinceLastHeartbeat > this.HEARTBEAT_TIMEOUT) {
      logger.info('Heartbeat timeout, ending session');
      this.endSession();
    } else {
      this.scheduleTimeoutCheck();
    }
  }
  
  // End the current session
  public async endSession(): Promise<ReadingSessionData | null> {
    if (!this.activeSession) return null;
    
    // Stop heartbeat
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Clear timeout
    if (this.heartbeatTimeoutId !== null) {
      clearTimeout(this.heartbeatTimeoutId);
      this.heartbeatTimeoutId = null;
    }
    
    const endTime = new Date();
    const { sourceId, paperId, startTime } = this.activeSession;
    
    // Calculate duration based on heartbeat count
    const duration = this.heartbeatCount * 5; // 5 seconds per heartbeat
    
    // Calculate total elapsed time
    const totalElapsed = endTime.getTime() - startTime.getTime();
    const totalElapsedSeconds = Math.round(totalElapsed / 1000);
    
    // Set idle seconds to the difference (for backward compatibility)
    const idleSeconds = Math.max(0, totalElapsedSeconds - duration);
    
    const sessionId = `session_${startTime.getTime()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const sessionData: ReadingSessionData = {
      session_id: sessionId,
      paper_id: paperId,
      source_id: sourceId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      heartbeat_count: this.heartbeatCount,
      duration_seconds: duration,
      idle_seconds: idleSeconds,
      total_elapsed_seconds: totalElapsedSeconds
    };
    
    // Store session if we have paper manager and session was active
    if (this.paperManager && this.heartbeatCount > 0) {
      try {
        const metadata = this.getPaperMetadata(sourceId, paperId);
        await this.paperManager.logReadingSession(sourceId, paperId, sessionData, metadata);
        logger.info(`Session saved to storage for ${sourceId}:${paperId}`);
      } catch (error) {
        logger.error('Error saving session', error);
      }
    }
    
    // Clear session
    this.activeSession = null;
    
    logger.info(`Ended session for ${sourceId}:${paperId}`, {
      duration: sessionData.duration_seconds,
      heartbeats: sessionData.heartbeat_count
    });
    
    return sessionData;
  }
  
  // Check if session is active
  public hasActiveSession(): boolean {
    return this.activeSession !== null;
  }
  
  // Get current session
  public getCurrentSession(): { sourceId: string; paperId: string } | null {
    return this.activeSession;
  }
  
  // Get paper metadata
  public getPaperMetadata(sourceId?: string, paperId?: string): PaperMetadata | undefined {
    if (!sourceId || !paperId) {
      if (!this.activeSession) return undefined;
      sourceId = this.activeSession.sourceId;
      paperId = this.activeSession.paperId;
    }
    
    return this.paperMetadata.get(`${sourceId}:${paperId}`);
  }
  
  // Get time since last heartbeat
  public getTimeSinceLastHeartbeat(): number | null {
    if (!this.lastHeartbeatTime) return null;
    return Date.now() - this.lastHeartbeatTime.getTime();
  }
  
  // Get session statistics
  public getSessionStats(): any {
    if (!this.activeSession || !this.lastHeartbeatTime) {
      return { active: false };
    }
    
    return {
      active: true,
      sourceId: this.activeSession.sourceId,
      paperId: this.activeSession.paperId,
      startTime: this.activeSession.startTime.toISOString(),
      heartbeatCount: this.heartbeatCount,
      lastHeartbeatTime: this.lastHeartbeatTime.toISOString(),
      elapsedTime: Math.round((Date.now() - this.activeSession.startTime.getTime()) / 1000)
    };
  }
}
