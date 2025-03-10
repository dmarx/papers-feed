// extension/background/credential_manager.ts - Handles GitHub credentials

import { loguru } from "../utils/logger";
import { GitHubStoreClient } from 'gh-store-client';
import { PaperManager } from '../papers/manager';

const logger = loguru.getLogger('CredentialManager');

/**
 * Manages GitHub credentials and paper manager instantiation
 */
export class CredentialManager {
  private githubToken: string;
  private githubRepo: string;
  private paperManager: PaperManager | null;
  
  constructor() {
    this.githubToken = '';
    this.githubRepo = '';
    this.paperManager = null;
    
    // Setup storage change listener
    chrome.storage.onChanged.addListener(this._handleStorageChanges.bind(this));
  }

  /**
   * Load credentials from storage
   * @returns {Promise<{paperManager: PaperManager|null}>}
   */
  async loadCredentials(): Promise<{paperManager: PaperManager | null}> {
    const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
    this.githubToken = items.githubToken || '';
    this.githubRepo = items.githubRepo || '';
    
    logger.info('Credentials loaded:', { 
      hasToken: !!this.githubToken, 
      hasRepo: !!this.githubRepo 
    });
    
    return this._initializePaperManager();
  }

  /**
   * Initialize the paper manager if credentials are available
   * @private
   * @returns {Promise<{paperManager: PaperManager|null}>}
   */
  private async _initializePaperManager(): Promise<{paperManager: PaperManager | null}> {
    if (this.githubToken && this.githubRepo) {
      const githubClient = new GitHubStoreClient(this.githubToken, this.githubRepo);
      this.paperManager = new PaperManager(githubClient);
      logger.info('Paper manager initialized');
    } else {
      this.paperManager = null;
      logger.info('Paper manager not initialized - missing credentials');
    }
    
    return { paperManager: this.paperManager };
  }

  /**
   * Handle storage changes
   * @private
   * @param {Object} changes - Storage changes object
   */
  private async _handleStorageChanges(changes: {[key: string]: chrome.storage.StorageChange}) {
    let credentialsChanged = false;
    
    if (changes.githubToken) {
      this.githubToken = changes.githubToken.newValue;
      credentialsChanged = true;
    }
    
    if (changes.githubRepo) {
      this.githubRepo = changes.githubRepo.newValue;
      credentialsChanged = true;
    }
    
    if (credentialsChanged) {
      logger.info('GitHub credentials changed, reinitializing paper manager');
      await this._initializePaperManager();
    }
  }

  /**
   * Get the current paper manager instance
   * @returns {PaperManager|null}
   */
  getPaperManager(): PaperManager | null {
    return this.paperManager;
  }

  /**
   * Check if credentials are configured
   * @returns {boolean}
   */
  hasValidCredentials(): boolean {
    return !!(this.githubToken && this.githubRepo);
  }
}

export default new CredentialManager();
