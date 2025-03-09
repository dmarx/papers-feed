// extension/background/message_handlers.ts - Message passing handlers

import { loguru } from "../utils/logger";
import { formatPrimaryId } from '../papers/source_utils';
import { fullyProcessUrl } from '../papers/paper_processor';
import sessionManager from './session_manager';
import githubIntegration from './github_integration';

const logger = loguru.getLogger('MessageHandlers');

interface MessageResponse {
  success: boolean;
  error?: string;
  paperData?: any;
  [key: string]: any;
}

interface TrackPaperRequest {
  type: string;
  url?: string;
  source?: string;
  id?: string;
  title?: string;
  [key: string]: any;
}

interface AnnotationData {
  paperId: string;
  source?: string;
  title?: string;
  vote?: string;
  notes?: string;
  [key: string]: any;
}

/**
 * Handles messages from popup and content scripts
 */
export class MessageHandlers {
  constructor() {
    // Set up message listener
    chrome.runtime.onMessage.addListener(this.handleMessage.bind(this));
    logger.info('Message handler initialized');
  }

  /**
   * Main message handler
   * @param {Object} request - Message request
   * @param {Object} sender - Message sender
   * @param {Function} sendResponse - Send response function
   * @returns {boolean} True if response will be sent asynchronously
   */
  handleMessage(
    request: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): boolean {
    logger.info('Message received:', request);
    
    if (request.type === 'getCurrentPaper') {
      const currentPaper = sessionManager.getCurrentPaper();
      logger.info('Popup requested current paper:', currentPaper);
      sendResponse(currentPaper);
    }
    else if (request.type === 'updateRating') {
      logger.info('Rating update requested:', request.rating);
      this.handleUpdateRating(request.rating, sendResponse);
      return true; // Will respond asynchronously
    }
    else if (request.type === 'updateAnnotation') {
      logger.info('Annotation update requested:', request.annotationType, request.data);
      this.handleAnnotationUpdate(request.annotationType, request.data)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
    }
    else if (request.type === 'trackPaper') {
      logger.info('Track paper requested:', request);
      this.handleTrackPaper(request)
        .then(response => sendResponse(response))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Will respond asynchronously
    }
    
    return true;
  }

  /**
   * Handle update rating message
   * @param {string} rating - Rating value
   * @param {Function} sendResponse - Send response function
   * @returns {Promise<void>}
   */
  async handleUpdateRating(rating: string, sendResponse: (response: MessageResponse) => void): Promise<void> {
    const currentPaper = sessionManager.getCurrentPaper();
    
    if (!currentPaper) {
      sendResponse({ success: false, error: 'No current paper' });
      return;
    }

    try {
      const success = await githubIntegration.updateRating(currentPaper, rating);
      
      if (success) {
        // Update current paper data
        currentPaper.rating = rating;
        sendResponse({ success: true });
      } else {
        sendResponse({ success: false, error: 'Failed to update rating' });
      }
    } catch (error) {
      logger.error('Error updating rating:', error);
      sendResponse({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  /**
   * Handle annotation update message
   * @param {string} annotationType - Annotation type
   * @param {AnnotationData} data - Annotation data
   * @returns {Promise<MessageResponse>} Response object
   */
  async handleAnnotationUpdate(annotationType: string, data: AnnotationData): Promise<MessageResponse> {
    try {
      const success = await githubIntegration.updateAnnotation(annotationType, data);
      return { success };
    } catch (error) {
      logger.error('Error updating annotation:', error);
      throw error;
    }
  }

  /**
   * Handle track paper message
   * @param {TrackPaperRequest} request - Track paper request
   * @returns {Promise<MessageResponse>} Response object
   */
  async handleTrackPaper(request: TrackPaperRequest): Promise<MessageResponse> {
    try {
      // Process the paper URL using enhanced services
      let paperData;
      
      if (request.url) {
        // If it's a URL, use fullyProcessUrl
        paperData = await fullyProcessUrl(request.url);
      } else if (request.source && request.id) {
        // If it's just source and ID, create basic data
        const primary_id = formatPrimaryId(request.source, request.id);
        paperData = {
          source: request.source,
          sourceId: request.id,
          primary_id: primary_id,
          url: request.url || '',
          title: request.title || `${request.source.toUpperCase()} Paper: ${request.id}`,
          timestamp: new Date().toISOString(),
          rating: 'novote'
        };
      } else {
        throw new Error('Invalid request: missing URL or source/id');
      }
      
      if (!paperData) {
        throw new Error(`Could not process paper: ${request.url || request.id}`);
      }
      
      // Create GitHub issue for the paper
      const createdPaper = await githubIntegration.createGithubIssue(paperData);
      
      return { success: true, paperData: createdPaper };
    } catch (error) {
      logger.error(`Error tracking paper: ${error}`);
      throw error;
    }
  }
}

export default new MessageHandlers();
