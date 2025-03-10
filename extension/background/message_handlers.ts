// extension/background/message_handlers.ts
// Message handling for plugin system

import { loguru } from "../utils/logger";
import { urlDetectionService } from '../papers/detection_service';
import { pluginRegistry } from '../papers/plugins/registry';
import { fullyProcessUrl } from '../papers/paper_processor';
import sessionManager from './session_manager';
import githubIntegration from './github_integration';
import { PaperData } from '../types/common';

const logger = loguru.getLogger('MessageHandlers');

interface MessageResponse {
  success: boolean;
  error?: string;
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
    
    // Handle different message types
    switch(request.type) {
      case 'getCurrentPaper':
        this.handleGetCurrentPaper(sendResponse);
        break;
        
      case 'updateRating':
        this.handleUpdateRating(request.rating, sendResponse);
        return true; // Will respond asynchronously
        
      case 'updateAnnotation':
        this.handleAnnotationUpdate(request.annotationType, request.data)
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
        
      case 'trackPaper':
        this.handleTrackPaper(request)
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
        
      // Plugin system specific messages
      case 'detectPaperSource':
        this.handleDetectPaperSource(request.url, sendResponse);
        return true;
        
      case 'getPluginForUrl':
        this.handleGetPluginForUrl(request.url, sendResponse);
        return true;
        
      case 'getExtractorForUrl':
        this.handleGetExtractorForUrl(request.url, sendResponse);
        return true;
        
      case 'getPluginExtractor':
        this.handleGetPluginExtractor(request.pluginId, sendResponse);
        return true;
        
      case 'metadataExtracted':
        this.handleMetadataExtracted(request.data, sender, sendResponse);
        return true;
        
      case 'contentScriptReady':
        this.handleContentScriptReady(request.url, sender, sendResponse);
        return true;
        
      default:
        logger.warning(`Unknown message type: ${request.type}`);
        sendResponse({ success: false, error: `Unknown message type: ${request.type}` });
    }
    
    return true;
  }

  /**
   * Handle get current paper
   * @param {Function} sendResponse - Send response function
   */
  handleGetCurrentPaper(sendResponse: (response: any) => void): void {
    const currentPaper = sessionManager.getCurrentPaper();
    logger.info('Popup requested current paper:', currentPaper);
    sendResponse(currentPaper);
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
   * @param {any} data - Annotation data
   * @returns {Promise<MessageResponse>} Response object
   */
  async handleAnnotationUpdate(annotationType: string, data: any): Promise<MessageResponse> {
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
   * @param {any} request - Track paper request
   * @returns {Promise<MessageResponse>} Response object
   */
  async handleTrackPaper(request: any): Promise<MessageResponse> {
    try {
      let paperData: PaperData | null = null;
      
      if (request.url) {
        // Process using URL
        paperData = await fullyProcessUrl(request.url);
      } else if (request.source && request.id) {
        // If we have explicit source and ID, create basic data
        const plugin = pluginRegistry.get(request.source);
        
        // Format primary ID
        const primary_id = plugin ? 
          plugin.formatId(request.id) : 
          `${request.source}.${request.id}`;
        
        paperData = {
          source: request.source,
          sourceId: request.id,
          primary_id,
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

  /**
   * Handle detect paper source message
   * @param {string} url - URL to detect
   * @param {Function} sendResponse - Send response function
   */
  async handleDetectPaperSource(url: string, sendResponse: (response: any) => void): Promise<void> {
    try {
      const sourceInfo = await urlDetectionService.detectSource(url);
      
      if (sourceInfo) {
        sendResponse({
          success: true,
          detected: true,
          sourceType: sourceInfo.type,
          sourceId: sourceInfo.id,
          primaryId: sourceInfo.primary_id,
          pluginId: sourceInfo.plugin?.id
        });
      } else {
        sendResponse({
          success: true,
          detected: false
        });
      }
    } catch (error) {
      logger.error(`Error detecting paper source: ${error}`);
      sendResponse({
        success: false,
        error: String(error)
      });
    }
  }

  /**
   * Handle get plugin for URL message
   * @param {string} url - URL to find plugin for
   * @param {Function} sendResponse - Send response function
   */
  async handleGetPluginForUrl(url: string, sendResponse: (response: any) => void): Promise<void> {
    try {
      const sourceInfo = await urlDetectionService.detectSource(url);
      
      if (sourceInfo && sourceInfo.plugin) {
        sendResponse({
          success: true,
          pluginId: sourceInfo.plugin.id,
          sourceId: sourceInfo.id,
          primaryId: sourceInfo.primary_id
        });
      } else {
        sendResponse({
          success: true,
          pluginId: null
        });
      }
    } catch (error) {
      logger.error(`Error finding plugin for URL: ${error}`);
      sendResponse({
        success: false,
        error: String(error)
      });
    }
  }

  /**
   * Handle get extractor for URL message
   * @param {string} url - URL to get extractor for
   * @param {Function} sendResponse - Send response function
   */
  async handleGetExtractorForUrl(url: string, sendResponse: (response: any) => void): Promise<void> {
    try {
      const extractorCode = await urlDetectionService.getExtractorForUrl(url);
      
      if (extractorCode) {
        sendResponse({
          success: true,
          extractorCode
        });
      } else {
        sendResponse({
          success: false,
          error: 'No extractor available for this URL'
        });
      }
    } catch (error) {
      logger.error(`Error getting extractor for URL: ${error}`);
      sendResponse({
        success: false,
        error: String(error)
      });
    }
  }

  /**
   * Handle get plugin extractor message
   * @param {string} pluginId - Plugin ID
   * @param {Function} sendResponse - Send response function
   */
  handleGetPluginExtractor(pluginId: string, sendResponse: (response: any) => void): void {
    try {
      const extractorCode = urlDetectionService.getExtractorForPlugin(pluginId);
      
      if (extractorCode) {
        sendResponse({
          success: true,
          extractorCode
        });
      } else {
        sendResponse({
          success: false,
          error: `No extractor found for plugin: ${pluginId}`
        });
      }
    } catch (error) {
      logger.error(`Error getting plugin extractor: ${error}`);
      sendResponse({
        success: false,
        error: String(error)
      });
    }
  }

  /**
   * Handle metadata extracted message
   * @param {any} metadata - Extracted metadata
   * @param {chrome.runtime.MessageSender} sender - Message sender
   * @param {Function} sendResponse - Send response function
   */
  async handleMetadataExtracted(
    metadata: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      if (!metadata) {
        sendResponse({
          success: false,
          error: 'No metadata provided'
        });
        return;
      }
      
      // Validate metadata and ensure primary_id exists
      if (!metadata.primary_id) {
        // Try to generate primary_id if possible
        if (metadata.source && metadata.sourceId) {
          const plugin = pluginRegistry.get(metadata.source);
          metadata.primary_id = plugin ? 
            plugin.formatId(metadata.sourceId) : 
            `${metadata.source}.${metadata.sourceId}`;
        } else {
          sendResponse({
            success: false,
            error: 'Invalid metadata: missing primary_id and cannot generate it'
          });
          return;
        }
      }
      
      // Now metadata.primary_id is guaranteed to exist
      const storedPaper = await githubIntegration.createGithubIssue(metadata);
      
      if (storedPaper) {
        // Start a session for this paper if the tab is active
        if (sender.tab && sender.tab.active) {
          sessionManager.startSession(storedPaper);
        }
        
        sendResponse({
          success: true,
          paperData: storedPaper
        });
      } else {
        sendResponse({
          success: false,
          error: 'Failed to store paper metadata'
        });
      }
    } catch (error) {
      logger.error(`Error processing extracted metadata: ${error}`);
      sendResponse({
        success: false,
        error: String(error)
      });
    }
  }

  /**
   * Handle content script ready message
   * @param {string} url - Page URL
   * @param {chrome.runtime.MessageSender} sender - Message sender
   * @param {Function} sendResponse - Send response function
   */
  async handleContentScriptReady(
    url: string, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response: any) => void
  ): Promise<void> {
    try {
      logger.info(`Content script ready on: ${url}`);
      
      // Check if this is a supported paper source
      const sourceInfo = await urlDetectionService.detectSource(url);
      
      if (sourceInfo && sourceInfo.plugin) {
        logger.info(`Detected paper in content script: ${sourceInfo.type}:${sourceInfo.id}`);
        
        // If tab is active, we'll let the content script extract metadata
        if (sender.tab && sender.tab.active) {
          sendResponse({
            success: true,
            isPaperSource: true,
            sourceType: sourceInfo.type,
            sourceId: sourceInfo.id,
            primaryId: sourceInfo.primary_id
          });
        } else {
          // For non-active tabs, we can still process server-side
          const paperData = await fullyProcessUrl(url);
          
          if (paperData) {
            await githubIntegration.createGithubIssue(paperData);
            logger.info(`Processed paper in background: ${paperData.title}`);
          }
          
          sendResponse({
            success: true,
            isPaperSource: true,
            processed: !!paperData
          });
        }
      } else {
        sendResponse({
          success: true,
          isPaperSource: false
        });
      }
    } catch (error) {
      logger.error(`Error handling content script ready: ${error}`);
      sendResponse({
        success: false,
        error: String(error)
      });
    }
  }
}

export default new MessageHandlers();
