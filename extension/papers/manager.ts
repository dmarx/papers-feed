// extension/papers/manager.ts
import { GitHubStoreClient } from 'gh-store-client';
import type { Json } from 'gh-store-client';
import { 
  type PaperMetadata, 
  type InteractionLog, 
  type Interaction,
  type ReadingSession,
  isReadingSession,
  isInteractionLog
} from './types';

export class PaperManager {
  constructor(private client: GitHubStoreClient) {}

  async getOrCreatePaper(paperData: Partial<PaperMetadata> & { arxivId: string }): Promise<PaperMetadata> {
    const objectId = `paper:${paperData.arxivId}`;
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data as PaperMetadata;
      return data;
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

  private async getOrCreateInteractionLog(arxivId: string): Promise<InteractionLog> {
    const objectId = `interactions:${arxivId}`;
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
          paper_id: arxivId,
          interactions: []
        };
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      throw error;
    }
  }

  async logReadingSession(
    arxivId: string,
    session: ReadingSession,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists
    if (paperData) {
      await this.getOrCreatePaper({
        arxivId,
        ...paperData
      });
    }

    // Log the session as an interaction
    await this.addInteraction(arxivId, {
      type: 'reading_session',
      timestamp: new Date().toISOString(),
      data: session
    });
  }

  async logAnnotation(
    arxivId: string,
    key: string,
    value: Json,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists
    if (paperData) {
      await this.getOrCreatePaper({
        arxivId,
        ...paperData
      });
    }

    // Log the annotation as an interaction
    await this.addInteraction(arxivId, {
      type: 'annotation',
      timestamp: new Date().toISOString(),
      data: { key, value }
    });
  }

  async updateRating(
    arxivId: string,
    rating: string,
    paperData?: Partial<PaperMetadata>
  ): Promise<void> {
    // Ensure paper exists and get current data
    const paper = await this.getOrCreatePaper({
      arxivId,
      ...paperData
    });

    // Update paper metadata with new rating
    await this.client.updateObject(`paper:${arxivId}`, { 
      ...paper,
      rating 
    });

    // Log rating change as a single interaction
    await this.addInteraction(arxivId, {
      type: 'rating',
      timestamp: new Date().toISOString(),
      data: { rating }
    });
  }

  private async addInteraction(arxivId: string, interaction: Interaction): Promise<void> {
    const log = await this.getOrCreateInteractionLog(arxivId);
    log.interactions.push(interaction);
    await this.client.updateObject(`interactions:${arxivId}`, log);
  }

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

  async getPaperReadingTime(arxivId: string): Promise<number> {
    const interactions = await this.getInteractions(arxivId, { type: 'reading_session' });
    return interactions.reduce((total, i) => {
      if (isReadingSession(i.data)) {
        return total + i.data.duration_seconds;
      }
      return total;
    }, 0);
  }

  async getPaperHistory(arxivId: string): Promise<Json[]> {
    const objectId = `paper:${arxivId}`;
    return this.client.getObjectHistory(objectId);
  }
}
