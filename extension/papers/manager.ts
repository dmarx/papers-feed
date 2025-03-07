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
import { formatPrimaryId, isNewFormat, parseId } from './source_utils';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('PaperManager');

/**
 * Checks if data is an interaction log
 * @param data - Data to check
 * @returns Whether data is an interaction log
 */
const isInteractionLogJs = (data: any): boolean => {
  return typeof data === "object" && 
         data !== null && 
         typeof data.paper_id === "string" && 
         Array.isArray(data.interactions);
};

export class PaperManager {
  private client: GitHubStoreClient;
  // Add creation locks for concurrency control
  private creationLocks = new Map<string, Promise<any>>();
  
  constructor(client: GitHubStoreClient) {
    this.client = client;
  }

  /**
   * Get or create a paper record
   */
  async getOrCreatePaper(paperData: any): Promise<any> {
    // Ensure paperData has a primary_id
    if (!paperData.primary_id) {
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      } else if (paperData.arxivId) {
        // Legacy handling - convert to new format
        paperData.source = 'arxiv';
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = formatPrimaryId('arxiv', paperData.arxivId);
        logger.warning(`Legacy arxivId format detected. Converted to primary_id: ${paperData.primary_id}`);
      } else {
        throw new Error("Invalid paper data: missing primary_id and cannot generate it");
      }
    }
    
    const objectId = `paper:${paperData.primary_id}`;
    logger.info(`Getting or creating paper: ${objectId}`);
    
    try {
      // Try to get the paper
      const obj = await this.client.getObject(objectId);
      const data = obj.data as Record<string, any>;
      
      logger.info(`Found existing paper: ${objectId}`);
      
      // Ensure existing data has primary_id
      if (!data.primary_id) {
        // This should only happen for legacy papers
        const enhancedData = {
          ...data,
          source: paperData.source || 'arxiv',
          sourceId: paperData.sourceId || data.arxivId,
          primary_id: paperData.primary_id
        };
        
        // Update the object with enhanced data
        logger.info(`Updating legacy paper with new format fields: ${objectId}`);
        await this.client.updateObject(objectId, enhancedData);
        return enhancedData;
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        // Create new paper with appropriate fields
        const defaultPaperData: Record<string, any> = {
          primary_id: paperData.primary_id,
          source: paperData.source,
          sourceId: paperData.sourceId,
          url: paperData.url || '',
          title: paperData.title || paperData.sourceId,
          authors: paperData.authors || '',
          abstract: paperData.abstract || '',
          timestamp: new Date().toISOString(),
          rating: 'novote'
        };
        
        // For arXiv, maintain backward compatibility fields
        if (paperData.source === 'arxiv') {
          defaultPaperData.arxivId = paperData.sourceId;
          defaultPaperData.arxiv_tags = paperData.arxiv_tags || [];
          defaultPaperData.published_date = paperData.published_date || '';
        } else {
          // For other sources, add source-specific identifiers
          defaultPaperData.identifiers = {
            original: paperData.sourceId,
            url: paperData.url
          };
          
          // Add cross-references if available
          if (paperData.arxivId) {
            defaultPaperData.identifiers.arxiv = paperData.arxivId;
          }
          if (paperData.doi) {
            defaultPaperData.identifiers.doi = paperData.doi;
          }
          if (paperData.s2Id) {
            defaultPaperData.identifiers.s2 = paperData.s2Id;
          }
        }
        
        logger.info(`Creating new paper object: ${objectId}`);
        try {
          await this.client.createObject(objectId, defaultPaperData);
          logger.info(`Successfully created paper: ${objectId}`);
          return defaultPaperData;
        } catch (createError) {
          logger.error(`Error creating paper object: ${createError}`);
          throw createError;
        }
      }
      logger.error(`Error in getOrCreatePaper: ${error}`);
      throw error;
    }
  }

  /**
   * Get or create an interaction log
   */
  private async getOrCreateInteractionLog(paperId: string): Promise<InteractionLog> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. This is deprecated.`);
      paperId = formatPrimaryId('arxiv', paperId);
    }
    
    const objectId = `interactions:${paperId}`;
    
    // Check if we're already creating this log
    if (this.creationLocks.has(objectId)) {
      logger.info(`Waiting for existing creation of interaction log: ${objectId}`);
      return this.creationLocks.get(objectId) as Promise<InteractionLog>;
    }
    
    // Create a new promise for this operation
    const creationPromise = (async () => {
      try {
        const obj = await this.client.getObject(objectId);
        const data = obj.data as unknown;
        
        // Use TypeScript type guard if available, otherwise JS version
        if (typeof isInteractionLog === 'function' ? 
            isInteractionLog(data) : 
            isInteractionLogJs(data)) {
          return data as InteractionLog;
        }
        
        throw new Error('Invalid interaction log format');
      } catch (error) {
        if (error instanceof Error && error.message.includes('No object found')) {
          // Create new log
          const newLog: InteractionLog = {
            paper_id: paperId,
            interactions: []
          };
          
          // Check for legacy arxiv ID format
          const { type, id } = parseId(paperId);
          if (type === 'arxiv') {
            newLog.legacy_id = id;
          }
          
          logger.info(`Creating new interaction log: ${objectId}`);
          await this.client.createObject(objectId, newLog);
          return newLog;
        }
        throw error;
      } finally {
        // Release the lock after a delay
        setTimeout(() => {
          this.creationLocks.delete(objectId);
        }, 500);
      }
    })();
    
    // Store the promise
    this.creationLocks.set(objectId, creationPromise);
    
    return creationPromise;
  }

  /**
   * Log a reading session for a paper
   */
  async logReadingSession(
    paperId: string,
    session: ReadingSessionData,
    paperData?: any
  ): Promise<void> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId('arxiv', paperId);
      
      // If paperData provided but without primary_id, add it
      if (paperData && !paperData.primary_id) {
        paperData = {
          ...paperData,
          source: 'arxiv',
          sourceId: paperData.arxivId || paperId.split('.')[1],
          primary_id: paperId
        };
      }
    }

    // Ensure paper exists with proper data
    if (paperData) {
      await this.getOrCreatePaper(paperData);
    }

    // Log the session as interaction
    await this.addInteraction(paperId, {
      type: "reading_session",
      timestamp: new Date().toISOString(),
      data: session
    });
  }

  /**
   * Log an annotation for a paper
   */
  async logAnnotation(
    paperId: string,
    key: string,
    value: Json,
    paperData?: any
  ): Promise<void> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId('arxiv', paperId);
      
      // If paperData provided but without primary_id, add it
      if (paperData && !paperData.primary_id) {
        paperData = {
          ...paperData,
          source: 'arxiv',
          sourceId: paperData.arxivId || paperId.split('.')[1],
          primary_id: paperId
        };
      }
    }

    // Ensure paper exists with proper data
    if (paperData) {
      await this.getOrCreatePaper(paperData);
    }

    // Log the annotation as interaction
    await this.addInteraction(paperId, {
      type: "annotation",
      timestamp: new Date().toISOString(),
      data: { key, value }
    });
  }

  /**
   * Update a paper's rating
   */
  async updateRating(
    paperId: string,
    rating: string,
    paperData?: any
  ): Promise<void> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId('arxiv', paperId);
      
      // If paperData provided but without primary_id, add it
      if (paperData && !paperData.primary_id) {
        paperData = {
          ...paperData,
          source: 'arxiv',
          sourceId: paperData.arxivId || paperId.split('.')[1],
          primary_id: paperId
        };
      }
    }

    // Get existing paper data
    const paper = await this.getOrCreatePaper(paperData || { primary_id: paperId });

    // Update rating
    const objectId = `paper:${paperId}`;
    await this.client.updateObject(objectId, { 
      ...paper,
      rating 
    });

    // Log rating change
    await this.addInteraction(paperId, {
      type: "rating",
      timestamp: new Date().toISOString(),
      data: { rating }
    });
  }

  /**
   * Add an interaction to a paper's log
   */
  private async addInteraction(paperId: string, interaction: Interaction): Promise<void> {
    const log = await this.getOrCreateInteractionLog(paperId);
    log.interactions.push(interaction);
    
    // Store with the new format ID
    const objectId = `interactions:${paperId}`;
    await this.client.updateObject(objectId, log);
  }

  /**
   * Get interactions for a paper
   */
  async getInteractions(
    paperId: string,
    options: {
      type?: string;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<Interaction[]> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId('arxiv', paperId);
    }
    
    try {
      const log = await this.getOrCreateInteractionLog(paperId);
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
   * Get total reading time for a paper
   */
  async getPaperReadingTime(paperId: string): Promise<number> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId('arxiv', paperId);
    }
    
    const interactions = await this.getInteractions(paperId, { type: 'reading_session' });
    return interactions.reduce((total, i) => {
      logger.info('Calculating from interaction:', i);
      
      const data = i.data;
      if (typeof data === 'object' && data !== null && 'duration_seconds' in data) {
        return total + (data.duration_seconds as number);
      }
      return total;
    }, 0);
  }

  /**
   * Get paper history
   */
  async getPaperHistory(paperId: string): Promise<Json[]> {
    // Ensure paperId is in the new format
    if (!isNewFormat(paperId)) {
      logger.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId('arxiv', paperId);
    }
    
    const objectId = `paper:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
}
