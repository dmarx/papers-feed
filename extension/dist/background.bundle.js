var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:!0}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

// extension/papers/types.ts
// Type definitions for paper data
/**
 * Type guard for interaction log
 */
function isInteractionLog(data) {
    const log = data;
    return (typeof log === 'object' &&
        log !== null &&
        typeof log.sourceId === 'string' &&
        typeof log.paperId === 'string' &&
        Array.isArray(log.interactions));
}

// utils/logger.ts
// Logging utility wrapping loguru
/**
 * Logger class for consistent logging throughout the extension
 */
class Logger {
    constructor(module) {
        this.module = module;
    }
    /**
     * Log debug message
     */
    debug(message, data) {
        console.debug(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log info message
     */
    info(message, data) {
        console.info(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log warning message
     */
    warning(message, data) {
        console.warn(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log error message
     */
    error(message, data) {
        console.error(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
}
/**
 * Loguru mock for browser extension use
 */
class LoguruMock {
    /**
     * Get logger for a module
     */
    getLogger(module) {
        return new Logger(module);
    }
}
// Export singleton instance
const loguru = new LoguruMock();

const logger$8 = loguru.getLogger('paper-manager');
class PaperManager {
    constructor(client) {
        this.client = client;
        logger$8.debug('Paper manager initialized');
    }
    /**
     * Get paper by source and ID
     */
    async getPaper(sourceId, paperId) {
        const objectId = `paper:${sourceId}:${paperId}`;
        try {
            const obj = await this.client.getObject(objectId);
            return obj.data;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('No object found')) {
                return null;
            }
            throw error;
        }
    }
    /**
     * Get or create paper metadata
     */
    async getOrCreatePaper(paperData) {
        const { sourceId, paperId } = paperData;
        const objectId = `paper:${sourceId}:${paperId}`;
        try {
            const obj = await this.client.getObject(objectId);
            const data = obj.data;
            logger$8.debug(`Retrieved existing paper: ${sourceId}:${paperId}`);
            return data;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('No object found')) {
                // Create new paper
                const defaultPaperData = {
                    ...paperData,
                    timestamp: new Date().toISOString(),
                    rating: paperData.rating || 'novote'
                };
                await this.client.createObject(objectId, defaultPaperData);
                logger$8.debug(`Created new paper: ${sourceId}:${paperId}`);
                return defaultPaperData;
            }
            throw error;
        }
    }
    /**
     * Get or create interaction log for a paper
     */
    async getOrCreateInteractionLog(sourceId, paperId) {
        const objectId = `interactions:${sourceId}:${paperId}`;
        try {
            const obj = await this.client.getObject(objectId);
            const data = obj.data;
            if (isInteractionLog(data)) {
                return data;
            }
            throw new Error('Invalid interaction log format');
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('No object found')) {
                const newLog = {
                    sourceId,
                    paperId,
                    interactions: []
                };
                await this.client.createObject(objectId, newLog);
                logger$8.debug(`Created new interaction log: ${sourceId}:${paperId}`);
                return newLog;
            }
            throw error;
        }
    }
    /**
     * Get GitHub client instance
     */
    getClient() {
        return this.client;
    }
    /**
     * Log a reading session
     */
    async logReadingSession(sourceId, paperId, session, paperData) {
        // Ensure paper exists
        if (paperData) {
            await this.getOrCreatePaper({
                sourceId,
                paperId,
                url: paperData.url || `${sourceId}:${paperId}`,
                title: paperData.title || paperId,
                authors: paperData.authors || '',
                abstract: paperData.abstract || '',
                timestamp: new Date().toISOString(),
                rating: 'novote',
                publishedDate: paperData.publishedDate || '',
                tags: paperData.tags || []
            });
        }
        // Log the session as an interaction
        await this.addInteraction(sourceId, paperId, {
            type: 'reading_session',
            timestamp: new Date().toISOString(),
            data: session
        });
        logger$8.info(`Logged reading session for ${sourceId}:${paperId}`, { duration: session.duration_seconds });
    }
    /**
     * Log an annotation
     */
    async logAnnotation(sourceId, paperId, key, value, paperData) {
        // Ensure paper exists
        if (paperData) {
            await this.getOrCreatePaper({
                sourceId,
                paperId,
                url: paperData.url || `${sourceId}:${paperId}`,
                title: paperData.title || paperId,
                authors: paperData.authors || '',
                abstract: paperData.abstract || '',
                timestamp: new Date().toISOString(),
                rating: 'novote',
                publishedDate: paperData.publishedDate || '',
                tags: paperData.tags || []
            });
        }
        // Log the annotation as an interaction
        await this.addInteraction(sourceId, paperId, {
            type: 'annotation',
            timestamp: new Date().toISOString(),
            data: { key, value }
        });
        logger$8.info(`Logged annotation for ${sourceId}:${paperId}`, { key });
    }
    /**
     * Update paper rating
     */
    async updateRating(sourceId, paperId, rating, paperData) {
        // Ensure paper exists and get current data
        const paper = await this.getOrCreatePaper({
            sourceId,
            paperId,
            url: paperData?.url || `${sourceId}:${paperId}`,
            title: paperData?.title || paperId,
            authors: paperData?.authors || '',
            abstract: paperData?.abstract || '',
            timestamp: new Date().toISOString(),
            rating: 'novote',
            publishedDate: paperData?.publishedDate || '',
            tags: paperData?.tags || []
        });
        // Update paper metadata with new rating
        await this.client.updateObject(`paper:${sourceId}:${paperId}`, {
            ...paper,
            rating
        });
        // Log rating change as an interaction
        await this.addInteraction(sourceId, paperId, {
            type: 'rating',
            timestamp: new Date().toISOString(),
            data: { rating }
        });
        logger$8.info(`Updated rating for ${sourceId}:${paperId} to ${rating}`);
    }
    /**
     * Add interaction to log
     */
    async addInteraction(sourceId, paperId, interaction) {
        const log = await this.getOrCreateInteractionLog(sourceId, paperId);
        log.interactions.push(interaction);
        await this.client.updateObject(`interactions:${sourceId}:${paperId}`, log);
    }
    /**
     * Get interactions for a paper
     */
    async getInteractions(sourceId, paperId, options = {}) {
        try {
            const log = await this.getOrCreateInteractionLog(sourceId, paperId);
            let interactions = log.interactions;
            if (options.type) {
                interactions = interactions.filter((i) => i.type === options.type);
            }
            if (options.startTime || options.endTime) {
                interactions = interactions.filter((i) => {
                    const time = new Date(i.timestamp);
                    if (options.startTime && time < options.startTime)
                        return false;
                    if (options.endTime && time > options.endTime)
                        return false;
                    return true;
                });
            }
            return interactions;
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('No object found')) {
                return [];
            }
            throw error;
        }
    }
    /**
     * Calculate total reading time for a paper
     */
    async getPaperReadingTime(sourceId, paperId) {
        const interactions = await this.getInteractions(sourceId, paperId, { type: 'reading_session' });
        return interactions.reduce((total, i) => {
            const data = i.data;
            if (typeof data === 'object' && data !== null && 'duration_seconds' in data) {
                return total + data.duration_seconds;
            }
            return total;
        }, 0);
    }
    /**
     * Get history of paper changes
     */
    async getPaperHistory(sourceId, paperId) {
        const objectId = `paper:${sourceId}:${paperId}`;
        return this.client.getObjectHistory(objectId);
    }
}

// config/session.ts
const logger$7 = loguru.getLogger('session-config');
// Default configuration values
const DEFAULT_CONFIG = {
    idleThresholdMinutes: 5,
    minSessionDurationSeconds: 30,
    requireContinuousActivity: true, // If true, resets timer on idle
    logPartialSessions: false, // If true, logs sessions even if under minimum duration
    activityUpdateIntervalSeconds: 1 // How often to update active time
};
/**
 * Load session configuration from storage
 */
async function loadSessionConfig() {
    try {
        const items = await chrome.storage.sync.get('sessionConfig');
        const config = { ...DEFAULT_CONFIG, ...items.sessionConfig };
        logger$7.debug('Loaded session config', config);
        return config;
    }
    catch (error) {
        logger$7.error('Error loading session config', error);
        return DEFAULT_CONFIG;
    }
}
/**
 * Convert configuration to milliseconds for internal use
 */
function getConfigurationInMs(config) {
    return {
        idleThreshold: config.idleThresholdMinutes * 60 * 1000,
        minSessionDuration: config.minSessionDurationSeconds * 1000,
        activityUpdateInterval: config.activityUpdateIntervalSeconds * 1000,
        requireContinuousActivity: config.requireContinuousActivity,
        logPartialSessions: config.logPartialSessions
    };
}

// utils/session-tracker.ts
const logger$6 = loguru.getLogger('session-tracker');
class SessionTracker {
    constructor(config) {
        this.config = config;
        this.activeSession = null;
        this.updateInterval = null;
        this.currentPaperId = null;
        this.currentSourceId = null;
        logger$6.debug('Session tracker initialized', config);
    }
    /**
     * Start tracking a new session
     */
    startSession(sourceId, paperId) {
        // End any existing session first
        this.endSession();
        // Create new session
        this.activeSession = new ReadingSession(sourceId, paperId, this.config);
        this.currentSourceId = sourceId;
        this.currentPaperId = paperId;
        // Start update interval
        this.startUpdateInterval();
        logger$6.info(`Started tracking session for ${sourceId}:${paperId}`, this.activeSession.getMetadata());
    }
    /**
     * End the current session and get the data
     */
    endSession() {
        if (!this.activeSession) {
            return null;
        }
        // Stop the update interval
        this.stopUpdateInterval();
        // Finalize the session
        const sessionData = this.activeSession.finalize();
        logger$6.info(`Ended session for ${this.currentSourceId}:${this.currentPaperId}`, sessionData ? {
            duration: sessionData.duration_seconds,
            idle: sessionData.idle_seconds
        } : 'Session too short');
        // Clear current session
        this.activeSession = null;
        this.currentSourceId = null;
        this.currentPaperId = null;
        return sessionData;
    }
    /**
     * Get the current session's metadata
     */
    getCurrentSessionMetadata() {
        return this.activeSession?.getMetadata() || null;
    }
    /**
     * Get current paper and source IDs
     */
    getCurrentPaper() {
        return {
            sourceId: this.currentSourceId,
            paperId: this.currentPaperId
        };
    }
    /**
     * Start the activity update interval
     */
    startUpdateInterval() {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
        }
        // Use 'self' instead of 'window' for service worker compatibility
        // self works in both browser and service worker contexts
        this.updateInterval = self.setInterval(() => {
            this.activeSession?.update();
        }, this.config.activityUpdateInterval);
    }
    /**
     * Stop the activity update interval
     */
    stopUpdateInterval() {
        if (this.updateInterval !== null) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}
class ReadingSession {
    constructor(sourceId, paperId, config) {
        this.sourceId = sourceId;
        this.paperId = paperId;
        this.config = config;
        this.endTime = null;
        // Time tracking
        this.activeTime = 0;
        this.idleTime = 0;
        // State
        this.isTracking = true;
        this.finalizedData = null;
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.startTime = new Date();
        this.lastActiveTime = new Date();
    }
    /**
     * Update the session's active and idle time
     */
    update() {
        if (!this.isTracking || this.finalizedData) {
            return;
        }
        const now = new Date();
        const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
        if (timeSinceLastActive < this.config.idleThreshold) {
            // User is active
            this.activeTime += timeSinceLastActive;
        }
        else {
            // User is idle
            this.idleTime += timeSinceLastActive;
        }
        this.lastActiveTime = now;
    }
    /**
     * Finalize the session and get the data
     */
    finalize() {
        if (this.finalizedData) {
            return this.finalizedData;
        }
        // Update one last time
        this.update();
        // Stop tracking
        this.isTracking = false;
        this.endTime = new Date();
        // Calculate total elapsed time
        const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
        // Check if session is long enough
        if (this.activeTime >= this.config.minSessionDuration || this.config.logPartialSessions) {
            this.finalizedData = {
                session_id: this.sessionId,
                duration_seconds: Math.round(this.activeTime / 1000),
                idle_seconds: Math.round(this.idleTime / 1000),
                start_time: this.startTime.toISOString(),
                end_time: this.endTime.toISOString(),
                total_elapsed_seconds: Math.round(totalElapsed / 1000)
            };
            return this.finalizedData;
        }
        return null;
    }
    /**
     * Get session metadata (for debugging/display)
     */
    getMetadata() {
        return {
            sessionId: this.sessionId,
            sourceId: this.sourceId,
            paperId: this.paperId,
            startTime: this.startTime.toISOString(),
            activeSeconds: Math.round(this.activeTime / 1000),
            idleSeconds: Math.round(this.idleTime / 1000),
            isTracking: this.isTracking
        };
    }
}

// extension/utils/popup-manager.ts
const logger$5 = loguru.getLogger('popup-manager');
/**
 * Manages all popup-related functionality
 */
class PopupManager {
    /**
     * Create a new popup manager
     */
    constructor(sourceManagerProvider, paperManagerProvider) {
        this.sourceManagerProvider = sourceManagerProvider;
        this.paperManagerProvider = paperManagerProvider;
        this.setupMessageListeners();
        logger$5.debug('Popup manager initialized');
    }
    /**
     * Set up message listeners for popup-related messages
     */
    setupMessageListeners() {
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            // Handle popup actions (ratings, notes, etc.)
            if (message.type === 'popupAction') {
                this.handlePopupAction(message.sourceId, message.paperId, message.action, message.data).then(() => {
                    sendResponse({ success: true });
                }).catch(error => {
                    logger$5.error('Error handling popup action', error);
                    sendResponse({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                });
                return true; // Will respond asynchronously
            }
            // Handle request to show annotation popup
            if (message.type === 'showAnnotationPopup' && sender.tab?.id) {
                this.handleShowAnnotationPopup(sender.tab.id, message.sourceId, message.paperId, message.position).then(() => {
                    sendResponse({ success: true });
                }).catch(error => {
                    logger$5.error('Error showing popup', error);
                    sendResponse({
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    });
                });
                return true; // Will respond asynchronously
            }
            return false; // Not handled
        });
    }
    /**
     * Handle a request to show an annotation popup
     */
    async handleShowAnnotationPopup(tabId, sourceId, paperId, position) {
        logger$5.debug(`Showing annotation popup for ${sourceId}:${paperId}`);
        // Check if we have source and paper manager
        const sourceManager = this.sourceManagerProvider();
        const paperManager = this.paperManagerProvider();
        if (!sourceManager) {
            throw new Error('Source manager not initialized');
        }
        if (!paperManager) {
            throw new Error('Paper manager not initialized');
        }
        try {
            // Get paper data
            const paper = await paperManager.getPaper(sourceId, paperId);
            // Create popup HTML
            const html = this.createPopupHtml(paper || {
                sourceId,
                paperId,
                title: paperId,
                authors: '',
                abstract: '',
                url: '',
                timestamp: new Date().toISOString(),
                publishedDate: '',
                tags: [],
                rating: 'novote'
            });
            // Get handlers
            const handlers = this.getStandardPopupHandlers();
            // Send message to content script to show popup
            const message = {
                type: 'showPopup',
                sourceId,
                paperId,
                html,
                handlers,
                position
            };
            await chrome.tabs.sendMessage(tabId, message);
            logger$5.debug(`Sent popup to content script for ${sourceId}:${paperId}`);
        }
        catch (error) {
            logger$5.error(`Error showing popup for ${sourceId}:${paperId}`, error);
            throw error;
        }
    }
    /**
     * Handle popup actions (ratings, notes, etc.)
     */
    async handlePopupAction(sourceId, paperId, action, data) {
        const paperManager = this.paperManagerProvider();
        if (!paperManager) {
            throw new Error('Paper manager not initialized');
        }
        logger$5.debug(`Handling popup action: ${action}`, { sourceId, paperId });
        try {
            if (action === 'rate') {
                await paperManager.updateRating(sourceId, paperId, data.value);
                logger$5.info(`Updated rating for ${sourceId}:${paperId} to ${data.value}`);
            }
            else if (action === 'saveNotes') {
                if (data.value) {
                    await paperManager.logAnnotation(sourceId, paperId, 'notes', data.value);
                    logger$5.info(`Saved notes for ${sourceId}:${paperId}`);
                }
            }
        }
        catch (error) {
            logger$5.error(`Error handling action ${action} for ${sourceId}:${paperId}`, error);
            throw error;
        }
    }
    /**
     * Create HTML for paper popup
     */
    createPopupHtml(paper) {
        return `
      <div class="paper-popup-header">${paper.title || paper.paperId}</div>
      <div class="paper-popup-meta">${paper.authors || ''}</div>
      
      <div class="paper-popup-buttons">
        <button class="vote-button" data-vote="thumbsup" id="btn-thumbsup" ${paper.rating === 'thumbsup' ? 'class="active"' : ''}>👍 Interesting</button>
        <button class="vote-button" data-vote="thumbsdown" id="btn-thumbsdown" ${paper.rating === 'thumbsdown' ? 'class="active"' : ''}>👎 Not Relevant</button>
      </div>
      
      <textarea placeholder="Add notes about this paper..." id="paper-notes"></textarea>
      
      <div class="paper-popup-actions">
        <button class="save-button" id="btn-save">Save</button>
      </div>
    `;
    }
    /**
     * Get standard popup event handlers
     */
    getStandardPopupHandlers() {
        return [
            { selector: '#btn-thumbsup', event: 'click', action: 'rate' },
            { selector: '#btn-thumbsdown', event: 'click', action: 'rate' },
            { selector: '#btn-save', event: 'click', action: 'saveNotes' }
        ];
    }
}

// source-integration/source-manager.ts
const logger$4 = loguru.getLogger('source-manager');
/**
 * Manages source integrations
 */
class SourceIntegrationManager {
    constructor() {
        this.sources = new Map();
        logger$4.info('Source integration manager initialized');
    }
    /**
     * Register a source integration
     */
    registerSource(source) {
        if (this.sources.has(source.id)) {
            logger$4.warning(`Source with ID '${source.id}' already registered, overwriting`);
        }
        this.sources.set(source.id, source);
        logger$4.info(`Registered source: ${source.name} (${source.id})`);
    }
    /**
     * Get all registered sources
     */
    getAllSources() {
        return Array.from(this.sources.values());
    }
    /**
     * Get source that can handle a URL
     */
    getSourceForUrl(url) {
        for (const source of this.sources.values()) {
            if (source.canHandleUrl(url)) {
                logger$4.debug(`Found source for URL '${url}': ${source.id}`);
                return source;
            }
        }
        logger$4.debug(`No source found for URL: ${url}`);
        return null;
    }
    /**
     * Extract paper ID from URL using appropriate source
     */
    extractPaperId(url) {
        for (const source of this.sources.values()) {
            if (source.canHandleUrl(url)) {
                const paperId = source.extractPaperId(url);
                if (paperId) {
                    logger$4.debug(`Extracted paper ID '${paperId}' from URL using ${source.id}`);
                    return { sourceId: source.id, paperId };
                }
            }
        }
        logger$4.debug(`Could not extract paper ID from URL: ${url}`);
        return null;
    }
    /**
     * Get all content script match patterns
     */
    getAllContentScriptMatches() {
        const patterns = [];
        for (const source of this.sources.values()) {
            patterns.push(...source.contentScriptMatches);
        }
        return patterns;
    }
}

// source-integration/arxiv/xml-parser.ts
const logger$3 = loguru.getLogger('arxiv-xml-parser');
/**
 * Parse ArXiv API XML response into a structured object
 */
async function parseXMLText(xmlText) {
    logger$3.debug('Parsing ArXiv XML response');
    try {
        // Parse XML to DOM
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        // Check for parse errors
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('XML parsing error: ' + parseError.textContent);
        }
        // Get entry element
        const entry = xmlDoc.querySelector('entry');
        if (!entry) {
            throw new Error('No entry element found in XML');
        }
        // Extract basic fields
        const title = entry.querySelector('title')?.textContent?.trim() || '';
        const summary = entry.querySelector('summary')?.textContent?.trim() || '';
        const published = entry.querySelector('published')?.textContent?.trim() || '';
        // Extract authors
        const authors = Array.from(entry.querySelectorAll('author name'))
            .map(name => name.textContent?.trim() || '');
        // Extract categories/tags
        const categories = new Set();
        // Primary category
        const primaryCategory = entry.querySelector('arxiv\\:primary_category, primary_category');
        if (primaryCategory && primaryCategory.hasAttribute('term')) {
            categories.add(primaryCategory.getAttribute('term') || '');
        }
        // Other categories
        const categoryElements = entry.querySelectorAll('category');
        categoryElements.forEach(cat => {
            if (cat.hasAttribute('term')) {
                categories.add(cat.getAttribute('term') || '');
            }
        });
        const result = {
            title,
            summary,
            authors,
            published_date: published,
            arxiv_tags: Array.from(categories)
        };
        logger$3.debug('XML parsing completed successfully');
        return result;
    }
    catch (error) {
        logger$3.error('Error parsing ArXiv XML', error);
        return null;
    }
}

// extension/utils/metadata-transformer.ts
const logger$2 = loguru.getLogger('metadata-transformer');
/**
 * Transform source-specific API response to standard metadata
 */
function transformMetadata(sourceId, paperId, apiData, mapping, sourceUrl) {
    // Extract fields using provided mapping
    const getField = (data, fieldPath) => {
        if (Array.isArray(fieldPath)) {
            // Try multiple possible field paths
            for (const path of fieldPath) {
                const value = getField(data, path);
                if (value !== undefined && value !== null && value !== '') {
                    return value;
                }
            }
            return '';
        }
        // Handle nested paths like "document.title"
        const parts = fieldPath.split('.');
        let value = data;
        for (const part of parts) {
            if (value === undefined || value === null)
                return '';
            value = value[part];
        }
        return value !== undefined && value !== null ? value : '';
    };
    // Extract title
    const title = getField(apiData, mapping.titleField);
    // Extract authors - either use custom function or default extraction
    const authors = mapping.extractAuthors
        ? mapping.extractAuthors(apiData)
        : Array.isArray(getField(apiData, mapping.authorsField))
            ? getField(apiData, mapping.authorsField).join(', ')
            : getField(apiData, mapping.authorsField);
    // Extract abstract
    const abstract = getField(apiData, mapping.abstractField);
    // Extract published date
    const publishedDate = mapping.extractDate
        ? mapping.extractDate(apiData)
        : getField(apiData, mapping.dateField);
    // Extract tags
    const tags = mapping.extractTags
        ? mapping.extractTags(apiData)
        : Array.isArray(getField(apiData, mapping.tagsField))
            ? getField(apiData, mapping.tagsField)
            : [];
    const metadata = {
        sourceId,
        paperId,
        url: sourceUrl,
        title,
        authors,
        abstract,
        timestamp: new Date().toISOString(),
        rating: 'novote',
        publishedDate,
        tags
    };
    logger$2.debug('Transformed metadata', { sourceId, paperId });
    return metadata;
}

// source-integration/arxiv/index.ts
const logger$1 = loguru.getLogger('arxiv-integration');
class ArXivIntegration {
    constructor() {
        this.id = 'arxiv';
        this.name = 'arXiv.org';
        // URL patterns for papers
        this.urlPatterns = [
            /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
            /arxiv\.org\/\w+\/([0-9.]+)/
        ];
        // Content script matches
        this.contentScriptMatches = [
            "*://*.arxiv.org/*"
        ];
        // Metadata mapping for ArXiv
        this.METADATA_MAPPING = {
            titleField: 'title',
            authorsField: 'authors',
            abstractField: 'summary',
            dateField: 'published_date',
            tagsField: 'arxiv_tags',
            // Custom author extraction (since authors is an array)
            extractAuthors: (data) => {
                if (Array.isArray(data.authors)) {
                    return data.authors.join(', ');
                }
                return data.authors || '';
            }
        };
    }
    /**
     * Check if this integration can handle the given URL
     */
    canHandleUrl(url) {
        return this.urlPatterns.some(pattern => pattern.test(url));
    }
    /**
     * Extract paper ID from URL
     */
    extractPaperId(url) {
        for (const pattern of this.urlPatterns) {
            const match = url.match(pattern);
            if (match) {
                return match[2] || match[1]; // The capture group with the paper ID
            }
        }
        return null;
    }
    /**
     * Extract metadata from page or fetch from API
     */
    async extractMetadata(document, paperId) {
        logger$1.info(`Extracting metadata for arXiv ID: ${paperId}`);
        // Try to extract from page first
        const pageMetadata = this.extractFromPage(document, paperId);
        if (pageMetadata) {
            logger$1.debug('Extracted metadata from page');
            return pageMetadata;
        }
        // If page extraction fails, fetch from API
        logger$1.debug('Falling back to API for metadata');
        return this.fetchFromApi(paperId);
    }
    /**
     * Extract metadata from ArXiv page
     */
    extractFromPage(document, paperId) {
        try {
            // Extract title
            const titleElement = document.querySelector('.title');
            if (!titleElement)
                return null;
            const title = titleElement.textContent?.replace('Title:', '').trim() || '';
            // Extract authors
            const authorsElement = document.querySelector('.authors');
            const authors = authorsElement?.textContent?.replace('Authors:', '').trim() || '';
            // Extract abstract
            const abstractElement = document.querySelector('.abstract');
            const abstract = abstractElement?.textContent?.replace('Abstract:', '').trim() || '';
            // Extract categories
            const categoriesElement = document.querySelector('.subjects');
            const categoriesText = categoriesElement?.textContent?.replace('Subjects:', '').trim() || '';
            const tags = categoriesText.split(';').map(tag => tag.trim());
            // Extract publication date
            const dateElement = document.querySelector('.dateline');
            const publishedDate = dateElement?.textContent?.trim() || '';
            // Create metadata object
            return {
                sourceId: this.id,
                paperId,
                url: window.location.href,
                title,
                authors,
                abstract,
                timestamp: new Date().toISOString(),
                rating: 'novote',
                publishedDate,
                tags
            };
        }
        catch (error) {
            logger$1.error('Error extracting from page:', error);
            return null;
        }
    }
    /**
     * Fetch metadata from ArXiv API
     */
    async fetchFromApi(arxivId) {
        try {
            const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
            logger$1.debug(`API URL: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`ArXiv API error: ${response.status}`);
            }
            const text = await response.text();
            const parsedXml = await parseXMLText(text);
            if (!parsedXml) {
                logger$1.error('Failed to parse API response');
                return null;
            }
            // Use the metadata transformer to convert the parsed XML to standard format
            const paperData = transformMetadata(this.id, arxivId, parsedXml, this.METADATA_MAPPING, `https://arxiv.org/abs/${arxivId}`);
            logger$1.debug('Paper metadata processed', paperData);
            return paperData;
        }
        catch (error) {
            logger$1.error('Error processing arXiv metadata', error);
            return null;
        }
    }
}
// Export a singleton instance that can be used by both background and content scripts
const arxivIntegration = new ArXivIntegration();

// extension/background.ts
const logger = loguru.getLogger('background');
// Global state
let githubToken = '';
let githubRepo = '';
let currentPaperData = null;
let sessionConfig = null;
let paperManager = null;
let sessionTracker = null;
let popupManager = null;
let sourceManager = null;
// Initialize sources
function initializeSources() {
    sourceManager = new SourceIntegrationManager();
    // Register built-in sources directly
    sourceManager.registerSource(arxivIntegration);
    logger.info('Source manager initialized');
    return sourceManager;
}
// Initialize everything
async function initialize() {
    try {
        // Initialize sources first
        initializeSources();
        // Load GitHub credentials
        const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
        githubToken = items.githubToken || '';
        githubRepo = items.githubRepo || '';
        logger.info('Credentials loaded', { hasToken: !!githubToken, hasRepo: !!githubRepo });
        // Initialize paper manager if we have credentials
        if (githubToken && githubRepo) {
            const githubClient = new f(githubToken, githubRepo);
            paperManager = new PaperManager(githubClient);
            logger.info('Paper manager initialized');
        }
        // Load session configuration
        const rawConfig = await loadSessionConfig();
        sessionConfig = getConfigurationInMs(rawConfig);
        logger.info('Session configuration loaded', sessionConfig);
        // Initialize session tracker
        sessionTracker = new SessionTracker(sessionConfig);
        logger.info('Session tracker initialized');
        // Initialize popup manager
        popupManager = new PopupManager(() => sourceManager, () => paperManager);
        logger.info('Popup manager initialized');
        // Set up message listeners
        setupMessageListeners();
        // Initialize debug objects
        initializeDebugObjects();
    }
    catch (error) {
        logger.error('Initialization error', error);
    }
}
// Set up message listeners
// Set up message listeners
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'contentScriptReady' && sender.tab?.id) {
            logger.debug('Content script ready:', sender.tab.url);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'paperMetadata' && message.metadata) {
            // Store metadata received from content script
            handlePaperMetadata(message.metadata, sender.tab?.id);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'getCurrentPaper') {
            logger.debug('Popup requested current paper', currentPaperData);
            sendResponse(currentPaperData);
            return true;
        }
        if (message.type === 'updateRating') {
            logger.debug('Rating update requested:', message.rating);
            handleUpdateRating(message.rating, sendResponse);
            return true; // Will respond asynchronously
        }
        if (message.type === 'showAnnotationPopup') {
            // This is now handled directly by the PopupManager
            return false;
        }
        if (message.type === 'popupAction') {
            // This is now handled directly by the PopupManager
            return false;
        }
        return false;
    });
}
// Handle paper metadata from content script
async function handlePaperMetadata(metadata, tabId) {
    logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
    try {
        // Store current paper data
        currentPaperData = metadata;
        // Store in GitHub if we have a paper manager
        if (paperManager) {
            await paperManager.getOrCreatePaper(metadata);
            logger.debug('Paper metadata stored in GitHub');
        }
        // Start tracking session
        if (sessionTracker) {
            sessionTracker.startSession(metadata.sourceId, metadata.paperId);
            logger.debug('Started tracking session');
        }
    }
    catch (error) {
        logger.error('Error handling paper metadata', error);
    }
}
// Handle rating update
async function handleUpdateRating(rating, sendResponse) {
    if (!paperManager) {
        sendResponse({ success: false, error: 'Paper manager not initialized' });
        return;
    }
    if (!currentPaperData) {
        sendResponse({ success: false, error: 'No current paper' });
        return;
    }
    try {
        await paperManager.updateRating(currentPaperData.sourceId, currentPaperData.paperId, rating);
        currentPaperData.rating = rating;
        sendResponse({ success: true });
    }
    catch (error) {
        logger.error('Error updating rating:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}
// Listen for credential changes
chrome.storage.onChanged.addListener(async (changes) => {
    logger.debug('Storage changes detected', Object.keys(changes));
    if (changes.githubToken) {
        githubToken = changes.githubToken.newValue;
    }
    if (changes.githubRepo) {
        githubRepo = changes.githubRepo.newValue;
    }
    if (changes.sessionConfig) {
        sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
        logger.info('Session configuration updated', sessionConfig);
        // Update session tracker with new config
        if (sessionTracker && sessionConfig) {
            sessionTracker = new SessionTracker(sessionConfig);
        }
    }
    // Reinitialize paper manager if credentials changed
    if (changes.githubToken || changes.githubRepo) {
        if (githubToken && githubRepo) {
            const githubClient = new f(githubToken, githubRepo);
            paperManager = new PaperManager(githubClient);
            logger.info('Paper manager reinitialized');
        }
    }
});
// Tab and window management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    handleTabChange(tab);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        handleTabChange(tab);
    }
});
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        // Window lost focus, end current session
        endCurrentSession();
    }
});
async function handleTabChange(tab) {
    if (!tab.url || !sessionTracker || !sourceManager) {
        return;
    }
    // Check if URL matches any registered source
    const source = sourceManager.getSourceForUrl(tab.url);
    if (!source) {
        logger.debug('No supported paper source detected, ending session');
        await endCurrentSession();
        return;
    }
    // Extract paper ID
    const extractedInfo = sourceManager.extractPaperId(tab.url);
    if (!extractedInfo) {
        logger.debug('No paper ID found in URL, ending session');
        await endCurrentSession();
        return;
    }
    // Get current session info
    const currentPaper = sessionTracker.getCurrentPaper();
    // End session if different paper
    if (currentPaper.sourceId && currentPaper.paperId &&
        (currentPaper.sourceId !== extractedInfo.sourceId ||
            currentPaper.paperId !== extractedInfo.paperId)) {
        logger.debug('Different paper detected, ending existing session');
        await endCurrentSession();
    }
    // Note: We don't start a new session here as we'll wait for the content script
    // to send us the metadata first
}
async function endCurrentSession() {
    if (!sessionTracker) {
        return;
    }
    // Get current paper info
    const currentPaper = sessionTracker.getCurrentPaper();
    if (currentPaper.sourceId && currentPaper.paperId && paperManager) {
        logger.info('Ending session for paper', {
            source: currentPaper.sourceId,
            paperId: currentPaper.paperId
        });
        // End session and get data
        const sessionData = sessionTracker.endSession();
        if (sessionData && currentPaperData) {
            logger.debug('Creating reading event', sessionData);
            // Store reading session
            await paperManager.logReadingSession(currentPaper.sourceId, currentPaper.paperId, sessionData, currentPaperData);
        }
        // Clear current paper data
        currentPaperData = null;
    }
}
// Initialize debug objects in service worker scope
function initializeDebugObjects() {
    // @ts-ignore
    globalThis.__DEBUG__ = {
        get paperManager() { return paperManager; },
        get sessionTracker() { return sessionTracker; },
        get popupManager() { return popupManager; },
        get sourceManager() { return sourceManager; },
        getGithubClient: () => paperManager ? paperManager.getClient() : null,
        getCurrentPaper: () => currentPaperData,
        getSessionConfig: () => sessionConfig,
        getSessionMetadata: () => sessionTracker?.getCurrentSessionMetadata(),
        getSources: () => sourceManager?.getAllSources()
    };
    logger.info('Debug objects registered');
}
// Initialize extension
initialize();
//# sourceMappingURL=background.bundle.js.map
