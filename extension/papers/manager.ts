// extension/papers/manager.ts - Add enhanced logging for debugging the regression

import { GitHubStoreClient } from 'gh-store-client';
import type { Json } from 'gh-store-client';
import { 
  type PaperMetadata, 
  type InteractionLog, 
  type Interaction,
  type ReadingSessionData
} from './types';
import { formatPrimaryId, isNewFormat } from './source_utils';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('PaperManager');
// Create a dedicated debug logger
const debugLogger = loguru.getLogger('PaperManagerDebug');

/**
 * Checks if data is an interaction log
 */
function isInteractionLog(data: any): data is InteractionLog {
  const result = typeof data === "object" && 
         data !== null && 
         typeof data.paper_id === "string" && 
         Array.isArray(data.interactions);
         
  if (!result) {
    debugLogger.error(`Invalid interaction log format: ${JSON.stringify(data)}`);
    // Log what's missing
    if (typeof data !== "object" || data === null) {
      debugLogger.error('Not an object or null');
    } else if (typeof data.paper_id !== "string") {
      debugLogger.error(`paper_id missing or not a string: ${typeof data.paper_id}`);
    } else if (!Array.isArray(data.interactions)) {
      debugLogger.error(`interactions missing or not an array: ${typeof data.interactions}`);
    }
  }
  return result;
}

export class PaperManager {
  private client: GitHubStoreClient;
  // Concurrency control locks
  private creationLocks = new Map<string, Promise<any>>();
  
  constructor(client: GitHubStoreClient) {
    this.client = client;
    debugLogger.info('PaperManager instance created');
  }

  /**
   * Get or create a paper record
   */
  async getOrCreatePaper(paperData: any): Promise<any> {
    debugLogger.info(`getOrCreatePaper called for: ${JSON.stringify(paperData).substring(0, 200)}...`);
    
    // Ensure paperData has a primary_id
    if (!paperData.primary_id) {
      debugLogger.warning('Paper data missing primary_id, attempting to generate it');
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
        debugLogger.info(`Generated primary_id: ${paperData.primary_id}`);
      } else {
        debugLogger.error('Invalid paper data: missing required fields to generate primary_id', paperData);
        throw new Error("Invalid paper data: missing primary_id and cannot generate it");
      }
    } else if (!isNewFormat(paperData.primary_id)) {
      debugLogger.warning(`Legacy format primary_id detected: ${paperData.primary_id}`);
      if (paperData.source && paperData.sourceId) {
        const newId = formatPrimaryId(paperData.source, paperData.sourceId);
        debugLogger.info(`Converting from ${paperData.primary_id} to ${newId}`);
        paperData.primary_id = newId;
      } else {
        debugLogger.warning(`Cannot convert legacy ID ${paperData.primary_id} - missing source/sourceId`);
      }
    }
    
    const objectId = `paper:${paperData.primary_id}`;
    logger.info(`Getting or creating paper: ${objectId}`);
    debugLogger.info(`GitHub object ID: ${objectId}`);
    
    try {
      // Try to get the paper
      debugLogger.info(`Attempting to get existing paper: ${objectId}`);
      const obj = await this.client.getObject(objectId);
      const data = obj.data as Record<string, any>;
      
      logger.info(`Found existing paper: ${objectId}`);
      debugLogger.info(`Found existing paper: ${objectId}, last updated: ${obj.meta.updatedAt}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        debugLogger.info(`Paper not found, creating new paper: ${objectId}`);
        
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
        
        // Add source-specific data directly
        if (paperData.source_specific_metadata) {
          defaultPaperData.source_specific_metadata = paperData.source_specific_metadata;
        }
        
        // Always add identifiers object
        defaultPaperData.identifiers = {
          original: paperData.sourceId,
          url: paperData.url
        };
        
        // Add cross-references if available
        if (paperData.doi) {
          defaultPaperData.identifiers.doi = paperData.doi;
        }
        
        debugLogger.info(`Creating new paper with data: ${JSON.stringify(defaultPaperData).substring(0, 200)}...`);
        
        try {
          await this.client.createObject(objectId, defaultPaperData);
          logger.info(`Successfully created paper: ${objectId}`);
          debugLogger.info(`Successfully created paper in GitHub: ${objectId}`);
          return defaultPaperData;
        } catch (createError) {
          logger.error(`Error creating paper object: ${createError}`);
          debugLogger.error(`GitHub API error creating paper: ${createError}`);
          
          if (createError instanceof Error) {
            debugLogger.error(`Error details: ${createError.message}`);
            if (createError.stack) {
              debugLogger.error(`Stack trace: ${createError.stack}`);
            }
          }
          
          throw createError;
        }
      }
      debugLogger.error(`Unexpected error in getOrCreatePaper: ${error}`);
      
      if (error instanceof Error) {
        debugLogger.error(`Error details: ${error.message}`);
        if (error.stack) {
          debugLogger.error(`Stack trace: ${error.stack}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Get or create an interaction log
   */
  private async getOrCreateInteractionLog(paperId: string): Promise<InteractionLog> {
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Legacy ID format detected in getOrCreateInteractionLog: ${oldId} -> ${paperId}`);
    }
    
    const objectId = `interactions:${paperId}`;
    debugLogger.info(`Getting or creating interaction log: ${objectId}`);
    
    // Check if we're already creating this log
    if (this.creationLocks.has(objectId)) {
      debugLogger.info(`Waiting for existing creation of interaction log: ${objectId}`);
      return this.creationLocks.get(objectId) as Promise<InteractionLog>;
    }
    
    // Create a new promise for this operation
    const creationPromise = (async () => {
      try {
        debugLogger.info(`Attempting to get existing interaction log: ${objectId}`);
        const obj = await this.client.getObject(objectId);
        const data = obj.data;
        
        if (isInteractionLog(data)) {
          debugLogger.info(`Found valid interaction log for ${paperId} with ${data.interactions.length} interactions`);
          return data;
        }
        
        debugLogger.error(`Retrieved object is not a valid interaction log: ${JSON.stringify(data)}`);
        throw new Error('Invalid interaction log format');
      } catch (error) {
        if (error instanceof Error && error.message.includes('No object found')) {
          // Create new log
          debugLogger.info(`Interaction log not found, creating new one for ${paperId}`);
          const newLog: InteractionLog = {
            paper_id: paperId,
            interactions: []
          };
          
          logger.info(`Creating new interaction log: ${objectId}`);
          try {
            await this.client.createObject(objectId, newLog);
            debugLogger.info(`Successfully created interaction log: ${objectId}`);
            return newLog;
          } catch (createError) {
            debugLogger.error(`Error creating interaction log: ${createError}`);
            throw createError;
          }
        }
        debugLogger.error(`Error in getOrCreateInteractionLog: ${error}`);
        throw error;
      } finally {
        // Release the lock after a delay
        setTimeout(() => {
          debugLogger.info(`Releasing creation lock for ${objectId}`);
          this.creationLocks.delete(objectId);
        }, 500);
      }
    })();
    
    // Store the promise
    debugLogger.info(`Setting creation lock for ${objectId}`);
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
    debugLogger.info(`logReadingSession called for ${paperId}`);
    debugLogger.info(`Session data: ${JSON.stringify(session)}`);
    
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Converting legacy ID in logReadingSession: ${oldId} -> ${paperId}`);
      
      // If paperData provided, ensure it has primary_id
      if (paperData && !paperData.primary_id) {
        debugLogger.info(`Updating paperData.primary_id to ${paperId}`);
        paperData.primary_id = paperId;
      }
    }

    // Ensure paper exists with proper data
    if (paperData) {
      debugLogger.info(`Ensuring paper exists: ${paperId}`);
      try {
        await this.getOrCreatePaper(paperData);
        debugLogger.info(`Paper exists or was created: ${paperId}`);
      } catch (error) {
        debugLogger.error(`Error ensuring paper exists: ${error}`);
        throw error;
      }
    }

    // Log the annotation as interaction
    try {
      debugLogger.info(`Adding annotation interaction for ${paperId}, key=${key}`);
      await this.addInteraction(paperId, {
        type: "annotation",
        timestamp: new Date().toISOString(),
        data: { key, value }
      });
      debugLogger.info(`Successfully added annotation interaction for ${paperId}`);
    } catch (error) {
      debugLogger.error(`Error adding annotation interaction: ${error}`);
      throw error;
    }
  }

  /**
   * Update a paper's rating
   */
  async updateRating(
    paperId: string,
    rating: string,
    paperData?: any
  ): Promise<void> {
    debugLogger.info(`updateRating called for ${paperId}, rating=${rating}`);
    
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Converting legacy ID in updateRating: ${oldId} -> ${paperId}`);
      
      // If paperData provided, ensure it has primary_id
      if (paperData && !paperData.primary_id) {
        debugLogger.info(`Updating paperData.primary_id to ${paperId}`);
        paperData.primary_id = paperId;
      }
    }

    // Get existing paper data
    debugLogger.info(`Getting or creating paper before rating update: ${paperId}`);
    try {
      const paper = await this.getOrCreatePaper(paperData || { primary_id: paperId });
      debugLogger.info(`Retrieved paper for rating update: ${JSON.stringify(paper).substring(0, 200)}...`);

      // Update rating
      const objectId = `paper:${paperId}`;
      debugLogger.info(`Updating paper object with new rating: ${objectId}`);
      await this.client.updateObject(objectId, { 
        ...paper,
        rating 
      });
      debugLogger.info(`Successfully updated paper rating to ${rating}`);

      // Log rating change
      debugLogger.info(`Adding rating interaction for ${paperId}`);
      await this.addInteraction(paperId, {
        type: "rating",
        timestamp: new Date().toISOString(),
        data: { rating }
      });
      debugLogger.info(`Successfully added rating interaction for ${paperId}`);
    } catch (error) {
      debugLogger.error(`Error in updateRating: ${error}`);
      throw error;
    }
  }

  /**
   * Add an interaction to a paper's log
   */
  private async addInteraction(paperId: string, interaction: Interaction): Promise<void> {
    debugLogger.info(`addInteraction called for ${paperId}, type=${interaction.type}`);
    
    try {
      const log = await this.getOrCreateInteractionLog(paperId);
      debugLogger.info(`Retrieved interaction log with ${log.interactions.length} existing interactions`);
      
      log.interactions.push(interaction);
      debugLogger.info(`Added interaction, now ${log.interactions.length} interactions`);
      
      // Store with the standard format ID
      const objectId = `interactions:${paperId}`;
      debugLogger.info(`Updating interaction log in GitHub: ${objectId}`);
      await this.client.updateObject(objectId, log);
      debugLogger.info(`Successfully updated interaction log: ${objectId}`);
    } catch (error) {
      debugLogger.error(`Error in addInteraction: ${error}`);
      throw error;
    }
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
    debugLogger.info(`getInteractions called for ${paperId}, options=${JSON.stringify(options)}`);
    
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Converting legacy ID in getInteractions: ${oldId} -> ${paperId}`);
    }
    
    try {
      debugLogger.info(`Getting interaction log for ${paperId}`);
      const log = await this.getOrCreateInteractionLog(paperId);
      debugLogger.info(`Retrieved interaction log with ${log.interactions.length} interactions`);
      
      let interactions = log.interactions;

      if (options.type) {
        debugLogger.info(`Filtering to interaction type: ${options.type}`);
        interactions = interactions.filter((i: Interaction) => i.type === options.type);
        debugLogger.info(`After type filter: ${interactions.length} interactions remaining`);
      }

      if (options.startTime || options.endTime) {
        debugLogger.info(`Filtering by time range: ${options.startTime} to ${options.endTime}`);
        interactions = interactions.filter((i: Interaction) => {
          const time = new Date(i.timestamp);
          if (options.startTime && time < options.startTime) return false;
          if (options.endTime && time > options.endTime) return false;
          return true;
        });
        debugLogger.info(`After time filter: ${interactions.length} interactions remaining`);
      }

      return interactions;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        debugLogger.info(`No interactions found for ${paperId}, returning empty array`);
        return [];
      }
      debugLogger.error(`Error in getInteractions: ${error}`);
      throw error;
    }
  }
  
  /**
   * Get total reading time for a paper
   */
  async getPaperReadingTime(paperId: string): Promise<number> {
    debugLogger.info(`getPaperReadingTime called for ${paperId}`);
    
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Converting legacy ID in getPaperReadingTime: ${oldId} -> ${paperId}`);
    }
    
    try {
      const interactions = await this.getInteractions(paperId, { type: 'reading_session' });
      debugLogger.info(`Retrieved ${interactions.length} reading session interactions`);
      
      const totalTime = interactions.reduce((total, i) => {
        const data = i.data;
        if (typeof data === 'object' && data !== null && 'duration_seconds' in data) {
          return total + (data.duration_seconds as number);
        }
        return total;
      }, 0);
      
      debugLogger.info(`Total reading time for ${paperId}: ${totalTime} seconds`);
      return totalTime;
    } catch (error) {
      debugLogger.error(`Error in getPaperReadingTime: ${error}`);
      return 0; // Return 0 on error
    }
  }

  /**
   * Get paper history
   */
  async getPaperHistory(paperId: string): Promise<Json[]> {
    debugLogger.info(`getPaperHistory called for ${paperId}`);
    
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Converting legacy ID in getPaperHistory: ${oldId} -> ${paperId}`);
    }
    
    try {
      const objectId = `paper:${paperId}`;
      debugLogger.info(`Getting object history from GitHub: ${objectId}`);
      const history = await this.client.getObjectHistory(objectId);
      debugLogger.info(`Retrieved paper history with ${history.length} entries`);
      return history;
    } catch (error) {
      debugLogger.error(`Error in getPaperHistory: ${error}`);
      throw error;
    }
  }
}
      }
    }

    // Ensure paper exists with proper data
    if (paperData) {
      debugLogger.info(`Ensuring paper exists: ${paperId}`);
      try {
        await this.getOrCreatePaper(paperData);
        debugLogger.info(`Paper exists or was created: ${paperId}`);
      } catch (error) {
        debugLogger.error(`Error ensuring paper exists: ${error}`);
        throw error;
      }
    }

    // Log the session as interaction
    try {
      debugLogger.info(`Adding reading session interaction for ${paperId}`);
      await this.addInteraction(paperId, {
        type: "reading_session",
        timestamp: new Date().toISOString(),
        data: session
      });
      debugLogger.info(`Successfully added reading session interaction for ${paperId}`);
    } catch (error) {
      debugLogger.error(`Error adding reading session interaction: ${error}`);
      throw error;
    }
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
    debugLogger.info(`logAnnotation called for ${paperId}, key=${key}`);
    
    // Ensure we have a standard format ID
    if (!isNewFormat(paperId)) {
      const oldId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      debugLogger.warning(`Converting legacy ID in logAnnotation: ${oldId} -> ${paperId}`);
      
      // If paperData provided, ensure it has primary_id
      if (paperData && !paperData.primary_id) {
        debugLogger.info(`Updating paperData.primary_id to ${paperId}`);
        paperData.primary_id = paperId;
