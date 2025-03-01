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
import { formatPrimaryId, isNewFormat } from './source_utils';
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
   * Enhanced to support multiple sources
   */
  async getOrCreatePaper(paperData: any): Promise<any> {
    // Always ensure paper has primary_id
    if (!paperData.primary_id) {
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      } else if (paperData.arxivId) {
        paperData.source = 'arxiv';
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = formatPrimaryId('arxiv', paperData.arxivId);
      } else {
        throw new Error("Invalid paper data: missing ID information");
      }
    }
    
    const objectId = `paper:${paperData.primary_id}`;
    logger.info(`Getting or creating paper: ${objectId}`);
    
    try {
      // Try to get the paper
      const obj = await this.client.getObject(objectId);
      const data = obj.data as Record<string, any>;
      
      logger.info(`Found existing paper: ${objectId}`);
      return data;
      
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        // Create new paper with appropriate fields
        const defaultPaperData = {
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
        
        // For arXiv, maintain backward compatibility
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
   * Get or create an interaction log - new style only
   */
  private async getOrCreateInteractionLog(paperId: string): Promise<InteractionLog> {
    console.log('PaperManager.getOrCreateInteractionLog called for:', paperId); // Debug
    
    // Always use primary_id format
    if (!isNewFormat(paperId)) {
      // Convert to primary_id format
      paperId = formatPrimaryId('arxiv', paperId);
      console.log('Converted to primary_id format:', paperId); // Debug
    }
    
    const objectId = `interactions:${paperId}`;
    console.log('Object ID for interaction log:', objectId); // Debug
    
    // Check if we're already creating this log
    if (this.creationLocks.has(objectId)) {
      logger.info(`Waiting for existing creation of interaction log: ${objectId}`);
      return this.creationLocks.get(objectId) as Promise<InteractionLog>;
    }
    
    // Create a new promise for this operation
    const creationPromise = (async () => {
      try {
        console.log('Attempting to get existing interaction log'); // Debug
        const obj = await this.client.getObject(objectId);
        const data = obj.data as unknown;
        
        console.log('Retrieved data:', data); // Debug
        
        // Use TypeScript type guard if available, otherwise JS version
        if (typeof isInteractionLog === 'function' ? 
            isInteractionLog(data) : 
            isInteractionLogJs(data)) {
          console.log('Valid interaction log found'); // Debug
          return data as InteractionLog;
        }
        
        console.log('Invalid interaction log format'); // Debug
        throw new Error('Invalid interaction log format');
      } catch (error) {
        if (error instanceof Error && error.message.includes('No object found')) {
          // Create new log
          console.log('Creating new interaction log'); // Debug
          const newLog: InteractionLog = {
            paper_id: paperId,
            interactions: []
          };
          
          logger.info(`Creating new interaction log: ${objectId}`);
          await this.client.createObject(objectId, newLog);
          console.log('New interaction log created successfully'); // Debug
          return newLog;
        }
        console.error('Error in getOrCreateInteractionLog:', error); // Debug
        throw error;
      } finally {
        // Release the lock after a delay
        setTimeout(() => {
          this.creationLocks.delete(objectId);
          console.log('Creation lock released for:', objectId); // Debug
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
    // New debug logging
    console.log('PaperManager.logReadingSession called with:', { 
      paperId, 
      session,
      paperData: paperData ? {...paperData} : undefined
    });

    // Ensure paperId is in primary_id format
    if (!isNewFormat(paperId)) {
      const originalId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      console.log(`Converted legacy ID ${originalId} to primary format: ${paperId}`); // Debug
      
      // Update paperData if provided
      if (paperData && !paperData.primary_id) {
        paperData.source = 'arxiv';
        paperData.sourceId = originalId;
        paperData.primary_id = paperId;
        if (!paperData.arxivId) {
          paperData.arxivId = originalId;
        }
      }
    }

    // Ensure paper exists with proper data
    if (paperData) {
      console.log('Ensuring paper exists:', paperData); // Debug
      await this.getOrCreatePaper(paperData);
    }

    // Log the session as interaction
    console.log('About to add interaction for paperId:', paperId); // Debug
    await this.addInteraction(paperId, {
      type: "reading_session",
      timestamp: new Date().toISOString(),
      data: session
    });
    console.log('Interaction added successfully'); // Debug
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
    // Ensure paperId is in primary_id format
    if (!isNewFormat(paperId)) {
      const originalId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      
      // Update paperData if provided
      if (paperData && !paperData.primary_id) {
        paperData.source = 'arxiv';
        paperData.sourceId = originalId;
        paperData.primary_id = paperId;
        if (!paperData.arxivId) {
          paperData.arxivId = originalId;
        }
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
    // Ensure paperId is in primary_id format
    if (!isNewFormat(paperId)) {
      const originalId = paperId;
      paperId = formatPrimaryId('arxiv', paperId);
      
      // Update paperData if provided
      if (paperData && !paperData.primary_id) {
        paperData.source = 'arxiv';
        paperData.sourceId = originalId;
        paperData.primary_id = paperId;
        if (!paperData.arxivId) {
          paperData.arxivId = originalId;
        }
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
    console.log('PaperManager.addInteraction called for:', paperId, 'type:', interaction.type); // Debug
    
    try {
      const log = await this.getOrCreateInteractionLog(paperId);
      console.log('Got interaction log:', log); // Debug
      
      log.interactions.push(interaction);
      
      // Use primary ID format always
      await this.client.updateObject(`interactions:${paperId}`, log);
      console.log('Interaction log updated successfully'); // Debug
    } catch (error) {
      console.error('Error in addInteraction:', error);
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
    // Ensure paperId is in primary_id format
    if (!isNewFormat(paperId)) {
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
    // Ensure paperId is in primary_id format
    if (!isNewFormat(paperId)) {
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
    // Ensure paperId is in primary_id format
    if (!isNewFormat(paperId)) {
      paperId = formatPrimaryId('arxiv', paperId);
    }
    
    const objectId = `paper:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
}
