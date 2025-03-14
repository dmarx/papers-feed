// extension/papers/manager.ts
import { GitHubStoreClient } from 'gh-store-client';
import type { Json } from 'gh-store-client';
import { 
  type PaperMetadata, 
  type InteractionLog, 
  type Interaction,
  type ReadingSessionData,
  isInteractionLog
} from './types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('paper-manager');

export class PaperManager {
  constructor(private client: GitHubStoreClient) {
    logger.debug('Paper manager initialized');
  }
  
  /**
   * Get paper by source and ID
   */
  async getPaper(sourceId: string, paperId: string): Promise<PaperMetadata | null> {
    const objectId = `paper:${sourceId}:${paperId}`;
    
    try {
      const obj = await this.client.getObject(objectId);
      return obj.data as PaperMetadata;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        return null;
      }
      throw error;
    }
  }
  
  /**
   * Get or create paper metadata
   */
  async getOrCreatePaper(paperData: PaperMetadata): Promise<PaperMetadata> {
    const { sourceId, paperId } = paperData;
    const objectId = `paper:${sourceId}:${paperId}`;
    
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data as PaperMetadata;
      logger.debug(`Retrieved existing paper: ${sourceId}:${paperId}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        // Create new paper
        const defaultPaperData: PaperMetadata = {
          ...paperData,
          timestamp: new Date().toISOString(),
          rating: paperData.rating || 'novote'
        };

        await this.client.createObject(objectId, defaultPaperData);
        logger.debug(`Created new paper: ${sourceId}:${paperId}`);
        return defaultPaperData;
      }
      throw error;
    }
  }

  /**
   * Get or create interaction log for a paper
   */
  private async getOrCreateInteractionLog(sourceId: string, paperId: string): Promise<InteractionLog> {
    const objectId = `interactions:${sourceId}:${paperId}`;
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data as unknown;
      if (isInteractionLog(data)) {
        return data;
      }
      throw new Error('Invalid interaction log format');
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        const newLog: InteractionLog = {
          sourceId,
          paperId,
          interactions: []
        };
        await this.client.createObject(objectId, newLog);
        logger.debug(`Created new interaction log: ${sourceId}:${paperId}`);
        return newLog;
      }
      throw error;
    }
  }
  
  /**
   * Get GitHub client instance
   */
  getClient(): GitHubStoreClient {
    return this.client;
  }
  
  /**
   * Log a reading session
   */
  async logReadingSession(
    sourceId: string,
    paperId: string,
    session: ReadingSessionData,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists
    if (paperData) {
      await this.getOrCreatePaper({
        sourceId,
        paperId,
        url: paperData.url || `${sourceId}:${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || '',
        abstract: paperData.abstract || '',
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate: paperData.publishedDate || '',
        tags: paperData.tags || []
      });
    }

    // Log the session as an interaction
    await this.addInteraction(sourceId, paperId, {
      type: 'reading_session',
      timestamp: new Date().toISOString(),
      data: session
    });
    
    logger.info(`Logged reading session for ${sourceId}:${paperId}`, { duration: session.duration_seconds });
  }

  /**
   * Log an annotation
   */
  async logAnnotation(
    sourceId: string,
    paperId: string,
    key: string,
    value: Json,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists
    if (paperData) {
      await this.getOrCreatePaper({
        sourceId,
        paperId,
        url: paperData.url || `${sourceId}:${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || '',
        abstract: paperData.abstract || '',
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate: paperData.publishedDate || '',
        tags: paperData.tags || []
      });
    }

    // Log the annotation as an interaction
    await this.addInteraction(sourceId, paperId, {
      type: 'annotation',
      timestamp: new Date().toISOString(),
      data: { key, value }
    });
    
    logger.info(`Logged annotation for ${sourceId}:${paperId}`, { key });
  }

  /**
   * Update paper rating
   */
  async updateRating(
    sourceId: string,
    paperId: string,
    rating: string,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists and get current data
    const paper = await this.getOrCreatePaper({
      sourceId,
      paperId,
      url: paperData?.url || `${sourceId}:${paperId}`,
      title: paperData?.title || paperId,
      authors: paperData?.authors || '',
      abstract: paperData?.abstract || '',
      timestamp: new Date().toISOString(),
      rating: 'novote',
      publishedDate: paperData?.publishedDate || '',
      tags: paperData?.tags || []
    });

    // Update paper metadata with new rating
    await this.client.updateObject(`paper:${sourceId}:${paperId}`, { 
      ...paper,
      rating 
    });

    // Log rating change as an interaction
    await this.addInteraction(sourceId, paperId, {
      type: 'rating',
      timestamp: new Date().toISOString(),
      data: { rating }
    });
    
    logger.info(`Updated rating for ${sourceId}:${paperId} to ${rating}`);
  }

  /**
   * Add interaction to log
   */
  private async addInteraction(sourceId: string, paperId: string, interaction: Interaction): Promise<void> {
    const log = await this.getOrCreateInteractionLog(sourceId, paperId);
    log.interactions.push(interaction);
    await this.client.updateObject(`interactions:${sourceId}:${paperId}`, log);
  }

  /**
   * Get interactions for a paper
   */
  async getInteractions(
    sourceId: string,
    paperId: string,
    options: {
      type?: string;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<Interaction[]> {
    try {
      const log = await this.getOrCreateInteractionLog(sourceId, paperId);
      let interactions = log.interactions;

      if (options.type) {
        interactions = interactions.filter((i: Interaction) => i.type === options.type);
      }

      if (options.startTime || options.endTime) {
        interactions = interactions.filter((i: Interaction) => {
          const time = new Date(i.timestamp);
          if (options.startTime && time < options.startTime) return false;
          if (options.endTime && time > options.endTime) return false;
          return true;
        });
      }

      return interactions;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        return [];
      }
      throw error;
    }
  }
    
  /**
   * Calculate total reading time for a paper
   */
  async getPaperReadingTime(sourceId: string, paperId: string): Promise<number> {
    const interactions = await this.getInteractions(sourceId, paperId, { type: 'reading_session' });
    return interactions.reduce((total, i) => {
      const data = i.data;
      if (typeof data === 'object' && data !== null && 'duration_seconds' in data) {
        return total + (data.duration_seconds as number);
      }
      return total;
    }, 0);
  }

  /**
   * Get history of paper changes
   */
  async getPaperHistory(sourceId: string, paperId: string): Promise<Json[]> {
    const objectId = `paper:${sourceId}:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
}
