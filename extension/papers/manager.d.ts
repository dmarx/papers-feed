// extension/papers/manager.d.ts - Additional type declarations for PaperManager

import { GitHubStoreClient } from 'gh-store-client';

// Declaration for PaperManager to help with typing
export class PaperManager {
  /**
   * GitHub client implementation
   * @private - enforced by TypeScript
   */
  private client: GitHubStoreClient;

  /**
   * Create a new PaperManager
   * @param client GitHub client for storage
   */
  constructor(client: GitHubStoreClient);
  
  /**
   * Get or create a paper record
   */
  getOrCreatePaper(paperData: any): Promise<any>;
  
  /**
   * Get or create an interaction log
   */
  private getOrCreateInteractionLog(paperId: string): Promise<any>;
  
  /**
   * Log a reading session for a paper
   */
  logReadingSession(paperId: string, session: any, paperData?: any): Promise<void>;
  
  /**
   * Log an annotation for a paper
   */
  logAnnotation(paperId: string, key: string, value: any, paperData?: any): Promise<void>;
  
  /**
   * Update a paper's rating
   */
  updateRating(paperId: string, rating: string, paperData?: any): Promise<void>;
  
  /**
   * Add an interaction to a paper's log
   */
  private addInteraction(paperId: string, interaction: any): Promise<void>;
  
  /**
   * Get interactions for a paper
   */
  getInteractions(paperId: string, options?: any): Promise<any[]>;
  
  /**
   * Get total reading time for a paper
   */
  getPaperReadingTime(paperId: string): Promise<number>;
  
  /**
   * Get paper history
   */
  getPaperHistory(paperId: string): Promise<any[]>;
}
