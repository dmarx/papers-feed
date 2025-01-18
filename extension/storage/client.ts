// extension/storage/client.ts
import { GitHubStoreClient } from 'gh-store-client';
import type { 
  PaperMetadata, 
  InteractionLog, 
  Interaction,
  ReadingSession 
} from './types';

export class StorageClient {
  private client: GitHubStoreClient;
  
  constructor(token: string, repo: string) {
    this.client = new GitHubStoreClient(token, repo);
  }

  // Paper metadata methods
  async getOrCreatePaperMetadata(paperData: Partial<PaperMetadata>): Promise<PaperMetadata> {
    const objectId = `paper:${paperData.arxivId}`;
    
    try {
      // Try to get existing paper
      const obj = await this.client.getObject(objectId);
      return obj.data as PaperMetadata;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        // Create new paper with default fields if it doesn't exist
        const defaultPaperData: PaperMetadata = {
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

        await this.client.createObject(objectId, defaultPaperData);
        return defaultPaperData;
      }
      throw error;
    }
  }

  // Interaction log methods
  private async getOrCreateInteractionLog(arxivId: string): Promise<InteractionLog> {
    const objectId = `interactions:${arxivId}`;
    
    try {
      const obj = await this.client.getObject(objectId);
      return obj.data as InteractionLog;
    } catch (error) {
      if (error instanceof Error && error.message.includes('No object found')) {
        const newLog: InteractionLog = {
          paper_id: arxivId,
          interactions: []
        };
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      throw error;
    }
  }

  // Log a reading session
  async logReadingSession(
    arxivId: string,
    session: ReadingSession,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists
    if (paperData) {
      await this.getOrCreatePaperMetadata({
        arxivId,
        ...paperData
      });
    }

    // Add to interaction log
    const interaction: Interaction = {
      type: 'reading_session',
      timestamp: new Date().toISOString(),
      data: session
    };

    await this.addInteraction(arxivId, interaction);
  }

  // Log an annotation
  async logAnnotation(
    arxivId: string,
    key: string,
    value: Json,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists
    if (paperData) {
      await this.getOrCreatePaperMetadata({
        arxivId,
        ...paperData
      });
    }

    // Add to interaction log
    const interaction: Interaction = {
      type: 'annotation',
      timestamp: new Date().toISOString(),
      data: { key, value }
    };

    await this.addInteraction(arxivId, interaction);
  }

  // Update paper rating
  async updateRating(
    arxivId: string,
    rating: string,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Update paper metadata
    const paper = await this.getOrCreatePaperMetadata({
      arxivId,
      ...paperData
    });
    
    await this.client.updateObject(`paper:${arxivId}`, { rating });

    // Log rating interaction
    const interaction: Interaction = {
      type: 'rating',
      timestamp: new Date().toISOString(),
      data: { rating }
    };

    await this.addInteraction(arxivId, interaction);
  }

  // Add interaction to log
  private async addInteraction(arxivId: string, interaction: Interaction): Promise<void> {
    const log = await this.getOrCreateInteractionLog(arxivId);
    
    // Add new interaction
    const updatedLog = {
      ...log,
      interactions: [...log.interactions, interaction]
    };

    await this.client.updateObject(`interactions:${arxivId}`, updatedLog);
  }

  // Get interactions for a paper
  async getInteractions(
    arxivId: string,
    options: {
      type?: string;
      startTime?: Date;
      endTime?: Date;
    } = {}
  ): Promise<Interaction[]> {
    try {
      const log = await this.getOrCreateInteractionLog(arxivId);
      let interactions = log.interactions;

      // Filter by type if specified
      if (options.type) {
        interactions = interactions.filter(i => i.type === options.type);
      }

      // Filter by time range if specified
      if (options.startTime || options.endTime) {
        interactions = interactions.filter(i => {
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

  // Get total reading time for a paper
  async getPaperReadingTime(arxivId: string): Promise<number> {
    const interactions = await this.getInteractions(arxivId, { type: 'reading_session' });
    return interactions.reduce(
      (total, i) => total + (i.data as ReadingSession).duration_seconds,
      0
    );
  }

  // Paper history
  async getPaperHistory(arxivId: string): Promise<Json[]> {
    const objectId = `paper:${arxivId}`;
    return this.client.getObjectHistory(objectId);
  }
}
