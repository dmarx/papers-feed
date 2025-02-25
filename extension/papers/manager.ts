// extension/papers/manager.js
import { GitHubStoreClient } from 'gh-store-client';
import type { Json } from 'gh-store-client';
import { 
  type PaperMetadata, 
  type InteractionLog, 
  type Interaction,
  type ReadingSessionData,
  isInteractionLog
} from './types';
import { formatPrimaryId, getLegacyId, isNewFormat } from './source_utils';

/**
 * Checks if data is an interaction log
 * @param {any} data - Data to check
 * @returns {boolean} - True if data is an interaction log
 */
const isInteractionLogJs = (data) => {
  return typeof data === "object" && 
         data !== null && 
         typeof data.paper_id === "string" && 
         Array.isArray(data.interactions);
};

export class PaperManager {
  constructor(private client: GitHubStoreClient) {}

  /**
   * Get or create a paper record
   * Enhanced to support multiple sources with backward compatibility
   */
  async getOrCreatePaper(paperData: any): Promise<any> {
    // Determine the object ID to use with backward compatibility
    let objectId: string;
    let useNewFormat = false;
    
    // Enhanced to handle both legacy and new format
    if (paperData.primary_id) {
      // New format with source prefix
      objectId = `paper:${paperData.primary_id}`;
      useNewFormat = true;
    } else if (paperData.source && paperData.sourceId) {
      // New source fields but without primary_id
      const primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      paperData.primary_id = primary_id;
      objectId = `paper:${primary_id}`;
      useNewFormat = true;
    } else if (paperData.arxivId) {
      // Legacy arXiv ID format
      objectId = `paper:${paperData.arxivId}`;
      
      // For legacy compatibility, don't add new fields yet
      useNewFormat = false;
    } else {
      throw new Error("Invalid paper data: missing ID information");
    }
    
    try {
      // Try to get the paper
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      
      // Return object, potentially enhancing it with new format fields
      if (!useNewFormat || data.primary_id) {
        return data;
      }
      
      // Add new format fields to legacy data if needed
      if (data.arxivId && !data.primary_id) {
        const enhancedData = {
          ...data,
          source: 'arxiv',
          sourceId: data.arxivId,
          primary_id: formatPrimaryId('arxiv', data.arxivId)
        };
        
        // Update the object with enhanced data
        await this.client.updateObject(objectId, enhancedData);
        return enhancedData;
      }
      
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        // Create new paper with appropriate fields
        let defaultPaperData: any;
        
        if (useNewFormat) {
          // New multi-source format
          defaultPaperData = {
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
        } else {
          // Legacy format for backward compatibility
          defaultPaperData = {
            arxivId: paperData.arxivId,
            url: paperData.url || `https://arxiv.org/abs/${paperData.arxivId}`,
            title: paperData.title || paperData.arxivId,
            authors: paperData.authors || '',
            abstract: paperData.abstract || '',
            timestamp: new Date().toISOString(),
            rating: 'novote',
            published_date: paperData.published_date || '',
            arxiv_tags: paperData.arxiv_tags || []
          };
        }

        await this.client.createObject(objectId, defaultPaperData);
        return defaultPaperData;
      }
      throw error;
    }
  }

  /**
   * Get or create an interaction log
   * Enhanced with backward compatibility for legacy arXiv IDs
   */
  private async getOrCreateInteractionLog(paperId: string): Promise<InteractionLog> {
    // For backward compatibility, use legacy ID format for storage
    const legacyId = getLegacyId(paperId);
    const objectId = `interactions:${legacyId}`;
    
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
          paper_id: paperId,  // Store the full ID including prefix if present
          interactions: []
        };
        
        // For backward compatibility, also add legacy_id if different
        if (paperId !== legacyId) {
          (newLog as any).legacy_id = legacyId;
        }
        
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      throw error;
    }
  }

  /**
   * Log a reading session for a paper
   * Enhanced to work with both legacy and new IDs
   */
  async logReadingSession(
    paperId: string,
    session: ReadingSessionData,
    paperData?: any
  ): Promise<void> {
    // For backward compatibility
    let primaryId = paperId;
    let enhancedPaperData = paperData || {};
    
    // Handle legacy arXiv IDs
    if (!isNewFormat(paperId) && !enhancedPaperData.primary_id) {
      primaryId = formatPrimaryId('arxiv', paperId);
      enhancedPaperData = {
        ...enhancedPaperData,
        source: 'arxiv',
        sourceId: paperId,
        primary_id: primaryId,
        arxivId: paperId
      };
    }

    // Ensure paper exists with proper data
    if (Object.keys(enhancedPaperData).length > 0) {
      await this.getOrCreatePaper(enhancedPaperData);
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
   * Enhanced to work with both legacy and new IDs
   */
  async logAnnotation(
    paperId: string,
    key: string,
    value: Json,
    paperData?: any
  ): Promise<void> {
    // For backward compatibility
    let primaryId = paperId;
    let enhancedPaperData = paperData || {};
    
    // Handle legacy arXiv IDs
    if (!isNewFormat(paperId) && !enhancedPaperData.primary_id) {
      primaryId = formatPrimaryId('arxiv', paperId);
      enhancedPaperData = {
        ...enhancedPaperData,
        source: 'arxiv',
        sourceId: paperId,
        primary_id: primaryId,
        arxivId: paperId
      };
    }

    // Ensure paper exists with proper data
    if (Object.keys(enhancedPaperData).length > 0) {
      await this.getOrCreatePaper(enhancedPaperData);
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
   * Enhanced to work with both legacy and new IDs
   */
  async updateRating(
    paperId: string,
    rating: string,
    paperData?: any
  ): Promise<void> {
    // For backward compatibility
    let primaryId = paperId;
    let enhancedPaperData = paperData || {};
    
    // Handle legacy arXiv IDs
    if (!isNewFormat(paperId) && !enhancedPaperData.primary_id) {
      primaryId = formatPrimaryId('arxiv', paperId);
      enhancedPaperData = {
        ...enhancedPaperData,
        source: 'arxiv',
        sourceId: paperId,
        primary_id: primaryId,
        arxivId: paperId
      };
    }

    // Get existing paper data
    const paper = await this.getOrCreatePaper(enhancedPaperData);

    // Update rating
    const objectId = isNewFormat(primaryId) ? 
      `paper:${primaryId}` : 
      `paper:${paperId}`; // For backward compatibility
      
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
   * Enhanced with backward compatibility
   */
  private async addInteraction(paperId: string, interaction: Interaction): Promise<void> {
    const log = await this.getOrCreateInteractionLog(paperId);
    log.interactions.push(interaction);
    
    // Use legacy ID for storage key to maintain backward compatibility
    const legacyId = getLegacyId(paperId);
    await this.client.updateObject(`interactions:${legacyId}`, log);
  }

  // Rest of the methods (getInteractions, getPaperReadingTime, etc.) can remain unchanged
  // as they'll work with the enhanced getOrCreateInteractionLog method

  async getInteractions(
    paperId: string,
    options: {
      type?: string;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<Interaction[]> {
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
    
  async getPaperReadingTime(paperId: string): Promise<number> {
    const interactions = await this.getInteractions(paperId, { type: 'reading_session' });
    return interactions.reduce((total, i) => {
      console.log('Calculating from interaction:', i);
      
      const data = i.data;
      if (typeof data === 'object' && data !== null && 'duration_seconds' in data) {
        return total + (data.duration_seconds as number);
      }
      return total;
    }, 0);
  }

  async getPaperHistory(paperId: string): Promise<Json[]> {
    // Use legacy ID for backward compatibility
    const objectId = `paper:${getLegacyId(paperId)}`;
    return this.client.getObjectHistory(objectId);
  }
}
