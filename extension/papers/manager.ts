// papers/manager.ts
// Source-agnostic paper data manager

import { GitHubStoreClient } from 'gh-store-client';
import type { Json } from 'gh-store-client';
import { 
  PaperMetadata, 
  InteractionLog, 
  Interaction,
  ReadingSessionData,
  isInteractionLog
} from './types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('paper-manager');

export class PaperManager {
  constructor(public client: GitHubStoreClient) {}

  async getOrCreatePaper(paperData: PaperMetadata): Promise<PaperMetadata> {
    const objectId = `paper:${paperData.sourceId}:${paperData.paperId}`;
    
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data as PaperMetadata;
      logger.debug('Retrieved existing paper', { 
        source: paperData.sourceId, 
        paperId: paperData.paperId 
      });
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        // Create new paper with provided fields
        logger.info('Creating new paper record', { 
          source: paperData.sourceId, 
          paperId: paperData.paperId 
        });
        
        await this.client.createObject(objectId, paperData);
        return paperData;
      }
      throw error;
    }
  }

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
          paper_id: `${sourceId}:${paperId}`,
          interactions: []
        };
        
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      
      throw error;
    }
  }

  async logReadingSession(
    sourceId: string,
    paperId: string,
    session: ReadingSessionData,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists if we have data
    if (paperData) {
      const fullPaperData: PaperMetadata = {
        sourceId,
        paperId,
        url: paperData.url || `unknown://${sourceId}/${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || '',
        abstract: paperData.abstract || '',
        timestamp: paperData.timestamp || new Date().toISOString(),
        publishedDate: paperData.publishedDate || '',
        tags: paperData.tags || [],
        rating: paperData.rating || 'novote',
        ...paperData
      };
      
      await this.getOrCreatePaper(fullPaperData);
    }

    // Log the session as an interaction
    await this.addInteraction(sourceId, paperId, {
      type: 'reading_session',
      timestamp: new Date().toISOString(),
      data: session
    });
  }

  async logAnnotation(
    sourceId: string,
    paperId: string,
    key: string,
    value: Json,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists if we have data
    if (paperData) {
      const fullPaperData: PaperMetadata = {
        sourceId,
        paperId,
        url: paperData.url || `unknown://${sourceId}/${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || '',
        abstract: paperData.abstract || '',
        timestamp: paperData.timestamp || new Date().toISOString(),
        publishedDate: paperData.publishedDate || '',
        tags: paperData.tags || [],
        rating: paperData.rating || 'novote',
        ...paperData
      };
      
      await this.getOrCreatePaper(fullPaperData);
    }

    // Log the annotation as an interaction
    await this.addInteraction(sourceId, paperId, {
      type: 'annotation',
      timestamp: new Date().toISOString(),
      data: { key, value }
    });
  }

  async updateRating(
    sourceId: string,
    paperId: string,
    rating: string,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Get current paper data
    let paper: PaperMetadata;
    
    try {
      const obj = await this.client.getObject(`paper:${sourceId}:${paperId}`);
      paper = obj.data as PaperMetadata;
    } catch (error) {
      // Create new paper if it doesn't exist
      if (paperData) {
        const fullPaperData: PaperMetadata = {
          sourceId,
          paperId,
          url: paperData.url || `unknown://${sourceId}/${paperId}`,
          title: paperData.title || paperId,
          authors: paperData.authors || '',
          abstract: paperData.abstract || '',
          timestamp: paperData.timestamp || new Date().toISOString(),
          publishedDate: paperData.publishedDate || '',
          tags: paperData.tags || [],
          rating: rating, // Use provided rating
          ...paperData
        };
        
        await this.client.createObject(`paper:${sourceId}:${paperId}`, fullPaperData);
        paper = fullPaperData;
      } else {
        // Can't create paper without data
        throw new Error(`Paper ${sourceId}:${paperId} not found and no data provided to create it`);
      }
    }

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
  }

  private async addInteraction(sourceId: string, paperId: string, interaction: Interaction): Promise<void> {
    const log = await this.getOrCreateInteractionLog(sourceId, paperId);
    log.interactions.push(interaction);
    await this.client.updateObject(`interactions:${sourceId}:${paperId}`, log);
  }

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
        interactions = interactions.filter((i) => i.type === options.type);
      }

      if (options.startTime || options.endTime) {
        interactions = interactions.filter((i) => {
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

  async getPaperHistory(sourceId: string, paperId: string): Promise<Json[]> {
    const objectId = `paper:${sourceId}:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
  
  async listAllPapers(): Promise<PaperMetadata[]> {
    try {
      const allObjects = await this.client.listAll();
      const papers: PaperMetadata[] = [];
      
      for (const key in allObjects) {
        if (key.startsWith('paper:')) {
          papers.push(allObjects[key].data as PaperMetadata);
        }
      }
      
      return papers;
    } catch (error) {
      logger.error('Error listing papers', error);
      return [];
    }
  }
}
