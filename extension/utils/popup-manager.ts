// utils/popup-manager.ts
// Complete popup management system

import { PaperMetadata } from '../papers/types';
import { loguru } from './logger';
import { PaperManager } from '../papers/manager';
import { SourceIntegration } from '../source-integration/types';

const logger = loguru.getLogger('popup-manager');

/**
 * Manages all popup-related functionality throughout the extension
 */
export class PopupManager {
  // Integration registry - needed to find the right integration for a URL
  private integrationProvider: () => SourceIntegration[];
  
  // Paper manager - needed to store annotations and ratings
  private paperManagerProvider: () => PaperManager | null;
  
 /**
  * Create a new popup manager
  * 
  * @param integrationProvider Function that returns available integrations
  * @param paperManagerProvider Function that returns the current paper manager
  */
 constructor(
   integrationProvider: () => SourceIntegration[],
   paperManagerProvider: () => PaperManager | null
 ) {
   this.integrationProvider = integrationProvider;
   this.paperManagerProvider = paperManagerProvider;
   
   this.setupMessageListeners();
   logger.debug('Popup manager initialized');
 }
 
 /**
  * Set up message listeners for popup-related messages
  */
 private setupMessageListeners(): void {
   chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
     // Handle request to show annotation popup
     if (message.type === 'showAnnotationPopup' && sender.tab?.id) {
       this.handleShowAnnotationPopup(
         sender.tab.id,
         message.sourceId,
         message.paperId,
         message.position
       ).then(() => {
         sendResponse({ success: true });
       }).catch(error => {
         logger.error('Error showing popup', error);
         sendResponse({ 
           success: false, 
           error: error.message 
         });
       });
       
       return true; // Will respond asynchronously
     }
     
     // Handle popup actions (ratings, notes, etc.)
     if (message.type === 'popupAction') {
       this.handlePopupAction(
         message.sourceId,
         message.paperId,
         message.action,
         message.data
       ).then(() => {
         sendResponse({ success: true });
       }).catch(error => {
         logger.error('Error handling popup action', error);
         sendResponse({ 
           success: false, 
           error: error.message 
         });
       });
       
       return true; // Will respond asynchronously
     }
     
     return false; // Not handled
   });
 }
 
 /**
  * Handle a request to show an annotation popup
  * 
  * @param tabId Tab ID to show popup in
  * @param sourceId Source integration ID
  * @param paperId Paper ID
  * @param position Position to show popup at
  */
 private async handleShowAnnotationPopup(
   tabId: number,
   sourceId: string,
   paperId: string,
   position: { x: number, y: number }
 ): Promise<void> {
   logger.debug(`Showing annotation popup for ${sourceId}:${paperId}`);
   
   // Find the integration
   const integration = this.integrationProvider()
     .find(i => i.id === sourceId);
   
   if (!integration) {
     throw new Error(`Integration not found: ${sourceId}`);
   }
   
   // Fetch paper metadata
   const paperData = await integration.fetchPaperMetadata(paperId);
   
   if (!paperData) {
     throw new Error(`Failed to fetch metadata for ${sourceId}:${paperId}`);
   }
   
   // Show the popup
   await this.showPopup(tabId, paperData, position);
 }
 
 /**
  * Handle popup actions (ratings, notes, etc.)
  * 
  * @param sourceId Source integration ID
  * @param paperId Paper ID
  * @param action Action type (e.g., 'rate', 'saveNotes')
  * @param data Action data
  */
 private async handlePopupAction(
   sourceId: string,
   paperId: string,
   action: string,
   data: any
 ): Promise<void> {
   const paperManager = this.paperManagerProvider();
   
   if (!paperManager) {
     throw new Error('Paper manager not initialized');
   }
   
   logger.debug(`Handling popup action: ${action}`, { sourceId, paperId });
   
   if (action === 'rate') {
     await paperManager.updateRating(sourceId, paperId, data.value);
     logger.info(`Updated rating for ${sourceId}:${paperId} to ${data.value}`);
   } 
   else if (action === 'saveNotes') {
     if (data.value) {
       await paperManager.logAnnotation(sourceId, paperId, 'notes', data.value);
       logger.info(`Saved notes for ${sourceId}:${paperId}`);
     }
   }
 }
 
 /**
  * Show a popup in a tab
  * 
  * @param tabId Tab ID to show popup in
  * @param paperData Paper data to show in popup
  * @param position Position to show popup at
  */
 private async showPopup(
   tabId: number,
   paperData: PaperMetadata,
   position: { x: number, y: number }
 ): Promise<void> {
   // Create popup HTML
   const html = this.createPopupHtml(paperData);
   
   // Get standard handlers
   const handlers = this.getStandardPopupHandlers();
   
   // Show popup
   await chrome.tabs.sendMessage(tabId, {
     type: 'showPopup',
     sourceId: paperData.sourceId,
     paperId: paperData.paperId,
     html,
     handlers,
     position,
     paperData // Send full paper data for potential customization
   });
   
   logger.debug(`Showed popup for ${paperData.sourceId}:${paperData.paperId}`);
 }
 
 /**
  * Creates HTML for a paper annotation popup
  */
 private createPopupHtml(paperData: PaperMetadata): string {
   return `
     <div class="paper-popup-header">${paperData.title || paperData.paperId}</div>
     <div class="paper-popup-meta">${paperData.authors || ''}</div>
     
     <div class="paper-popup-buttons">
       <button class="vote-button" data-vote="thumbsup" id="btn-thumbsup">👍 Interesting</button>
       <button class="vote-button" data-vote="thumbsdown" id="btn-thumbsdown">👎 Not Relevant</button>
     </div>
     
     <textarea placeholder="Add notes about this paper..." id="paper-notes"></textarea>
     
     <div class="paper-popup-actions">
       <button class="save-button" id="btn-save">Save</button>
     </div>
   `;
 }
 
 /**
  * Standard popup event handlers for all popups
  */
 private getStandardPopupHandlers(): Array<{
   selector: string;
   event: string;
   action: string;
   value?: string;
 }> {
   return [
     { selector: '#btn-thumbsup', event: 'click', action: 'rate', value: 'thumbsup' },
     { selector: '#btn-thumbsdown', event: 'click', action: 'rate', value: 'thumbsdown' },
     { selector: '#btn-save', event: 'click', action: 'saveNotes' }
   ];
 }
}
