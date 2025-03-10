// extension/background/github_integration.ts - GitHub API integration

import { loguru } from "../utils/logger";
import { formatPrimaryId } from '../papers/source_utils';
import credentialManager from './credential_manager';
import { PaperData } from '../types/common';

const logger = loguru.getLogger('GitHubIntegration');

/**
 * Handles GitHub integration for paper storage
 */
export class GitHubIntegration {
  /**
   * Create or update a GitHub issue for a paper
   * @param {PaperData} paperData - Paper metadata
   * @returns {Promise<PaperData|null>} Created or updated paper data
   */
  async createGithubIssue(paperData: PaperData): Promise<PaperData | null> {
    const paperManager = credentialManager.getPaperManager();
    
    if (!paperManager) {
      logger.error('Paper manager not initialized');
      return null;
    }

    // Ensure paper has primary_id
    if (!paperData.primary_id) {
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      } else {
        logger.error('Cannot create paper - no valid identifier');
        return null;
      }
    }
    
    try {
      logger.info(`Creating/getting paper issue: ${paperData.primary_id}`);
      const existingPaper = await paperManager.getOrCreatePaper(paperData);
      logger.info(`Paper metadata stored/retrieved: ${existingPaper.primary_id}`);
      return existingPaper;
    } catch (error) {
      logger.error(`Error handling paper metadata: ${error}`, error);
      return null;
    }
  }

  /**
   * Update paper rating
   * @param {PaperData} paperData - Paper metadata
   * @param {string} rating - Rating value
   * @returns {Promise<boolean>} Success status
   */
  async updateRating(paperData: PaperData, rating: string): Promise<boolean> {
    const paperManager = credentialManager.getPaperManager();
    
    if (!paperManager) {
      logger.error('Paper manager not initialized');
      return false;
    }

    try {
      // Always use primary_id for rating updates
      const paperId = paperData.primary_id;
      
      if (!paperId) {
        logger.error('Paper data missing primary_id');
        return false;
      }
      
      await paperManager.updateRating(paperId, rating, paperData);
      logger.info(`Updated rating for ${paperId}: ${rating}`);
      return true;
    } catch (error) {
      logger.error('Error updating rating:', error);
      return false;
    }
  }

  /**
   * Update paper annotation
   * @param {string} type - Annotation type
   * @param {Object} data - Annotation data
   * @returns {Promise<boolean>} Success status
   */
  async updateAnnotation(type: string, data: {
    paperId: string;
    source?: string;
    title?: string;
    vote?: string;
    notes?: string;
    [key: string]: any;
  }): Promise<boolean> {
    const paperManager = credentialManager.getPaperManager();
    
    if (!paperManager) {
      logger.error('Paper manager not initialized');
      return false;
    }

    try {
      // Ensure we have a valid paper ID
      let paperId = data.paperId;
      
      // If we get a legacy ID without the source prefix, try to determine the source from context
      if (!paperId.includes('.')) {
        // Try to determine source from data
        const source = data.source || 'arxiv'; // Default to arxiv if not specified
        paperId = formatPrimaryId(source, paperId);
        logger.info(`Converted ID to standardized format: ${paperId}`);
      }
      
      const paperData: PaperData | undefined = data.title ? {
        title: data.title,
        source: data.source || 'unknown',
        sourceId: paperId.split('.')[1] || paperId,
        primary_id: paperId,
        url: ''
      } : undefined;

      if (type === 'vote') {
        await paperManager.updateRating(
          paperId,
          data.vote!,
          paperData
        );
      } else {
        await paperManager.logAnnotation(
          paperId,
          'notes',
          data.notes!,
          paperData
        );
      }

      return true;
    } catch (error) {
      logger.error('Error logging interaction:', error);
      return false;
    }
  }
}

export default new GitHubIntegration();
