var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:!0}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

// extension/papers/types.ts
// Updated for heartbeat-based session tracking
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
    constructor(client, sourceManager) {
        this.client = client;
        this.sourceManager = sourceManager;
        logger$8.debug('Paper manager initialized');
    }
    /**
     * Get paper by source and ID
     */
    async getPaper(sourceId, paperId) {
        const objectId = this.sourceManager.formatObjectId('paper', sourceId, paperId);
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
        const objectId = this.sourceManager.formatObjectId('paper', sourceId, paperId);
        const paperIdentifier = this.sourceManager.formatPaperId(sourceId, paperId);
        try {
            const obj = await this.client.getObject(objectId);
            const data = obj.data;
            logger$8.debug(`Retrieved existing paper: ${paperIdentifier}`);
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
                logger$8.debug(`Created new paper: ${paperIdentifier}`);
                return defaultPaperData;
            }
            throw error;
        }
    }
    /**
     * Get or create interaction log for a paper
     */
    async getOrCreateInteractionLog(sourceId, paperId) {
        const objectId = this.sourceManager.formatObjectId('interactions', sourceId, paperId);
        const paperIdentifier = this.sourceManager.formatPaperId(sourceId, paperId);
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
                logger$8.debug(`Created new interaction log: ${paperIdentifier}`);
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
                url: paperData.url || this.sourceManager.formatPaperId(sourceId, paperId),
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
        const paperIdentifier = this.sourceManager.formatPaperId(sourceId, paperId);
        logger$8.info(`Logged reading session for ${paperIdentifier}`, { duration: session.duration_seconds });
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
                url: paperData.url || this.sourceManager.formatPaperId(sourceId, paperId),
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
        const paperIdentifier = this.sourceManager.formatPaperId(sourceId, paperId);
        logger$8.info(`Logged annotation for ${paperIdentifier}`, { key });
    }
    /**
     * Update paper rating
     */
    async updateRating(sourceId, paperId, rating, paperData) {
        // Ensure paper exists and get current data
        const paper = await this.getOrCreatePaper({
            sourceId,
            paperId,
            url: paperData?.url || this.sourceManager.formatPaperId(sourceId, paperId),
            title: paperData?.title || paperId,
            authors: paperData?.authors || '',
            abstract: paperData?.abstract || '',
            timestamp: new Date().toISOString(),
            rating: 'novote',
            publishedDate: paperData?.publishedDate || '',
            tags: paperData?.tags || []
        });
        const objectId = this.sourceManager.formatObjectId('paper', sourceId, paperId);
        // Update paper metadata with new rating
        await this.client.updateObject(objectId, {
            ...paper,
            rating
        });
        // Log rating change as an interaction
        await this.addInteraction(sourceId, paperId, {
            type: 'rating',
            timestamp: new Date().toISOString(),
            data: { rating }
        });
        const paperIdentifier = this.sourceManager.formatPaperId(sourceId, paperId);
        logger$8.info(`Updated rating for ${paperIdentifier} to ${rating}`);
    }
    /**
     * Add interaction to log
     */
    async addInteraction(sourceId, paperId, interaction) {
        const log = await this.getOrCreateInteractionLog(sourceId, paperId);
        log.interactions.push(interaction);
        const objectId = this.sourceManager.formatObjectId('interactions', sourceId, paperId);
        await this.client.updateObject(objectId, log);
    }
}

// utils/session-tracker.ts
const logger$7 = loguru.getLogger('session-tracker');
/**
 * Class representing a single reading session
 */
class ReadingSession {
    constructor(sourceId, paperId) {
        this.heartbeatCount = 0;
        this.endTime = null;
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.sourceId = sourceId;
        this.paperId = paperId;
        this.startTime = new Date();
        this.lastHeartbeatTime = this.startTime;
        logger$7.debug(`Created new reading session: ${this.sessionId} for ${sourceId}:${paperId}`);
    }
    /**
     * Record a heartbeat
     */
    recordHeartbeat() {
        this.heartbeatCount++;
        this.lastHeartbeatTime = new Date();
        if (this.heartbeatCount % 12 === 0) { // Log every minute (12 x 5sec heartbeats)
            logger$7.debug(`Session ${this.sessionId} received ${this.heartbeatCount} heartbeats`);
        }
    }
    /**
     * End the session and get data
     */
    endSession() {
        this.endTime = new Date();
        // Calculate duration based on heartbeat count
        // This gives us the actual "proven" reading time
        const duration = this.heartbeatCount * 5; // 5 seconds per heartbeat
        // Calculate total elapsed time
        const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
        const totalElapsedSeconds = Math.round(totalElapsed / 1000);
        // Set idle seconds to the difference (for backward compatibility)
        const idleSeconds = Math.max(0, totalElapsedSeconds - duration);
        const sessionData = {
            session_id: this.sessionId,
            paper_id: this.paperId,
            source_id: this.sourceId,
            start_time: this.startTime.toISOString(),
            end_time: this.endTime.toISOString(),
            heartbeat_count: this.heartbeatCount,
            duration_seconds: duration,
            // Legacy properties for backward compatibility
            idle_seconds: idleSeconds,
            total_elapsed_seconds: totalElapsedSeconds
        };
        logger$7.debug(`Ended session ${this.sessionId} with ${this.heartbeatCount} heartbeats (${duration}s)`);
        return sessionData;
    }
    /**
     * Get time since last heartbeat in milliseconds
     */
    getTimeSinceLastHeartbeat() {
        return Date.now() - this.lastHeartbeatTime.getTime();
    }
    /**
     * Get session metadata for debugging
     */
    getMetadata() {
        return {
            sessionId: this.sessionId,
            sourceId: this.sourceId,
            paperId: this.paperId,
            startTime: this.startTime.toISOString(),
            heartbeatCount: this.heartbeatCount,
            lastHeartbeatTime: this.lastHeartbeatTime.toISOString(),
            elapsedTime: Math.round((Date.now() - this.startTime.getTime()) / 1000)
        };
    }
}
/**
 * Manages reading session tracking
 */
class SessionTracker {
    constructor() {
        this.activeSession = null;
        this.paperMetadata = new Map();
        logger$7.debug('Session tracker initialized');
    }
    /**
     * Start a new session
     */
    startSession(sourceId, paperId, metadata) {
        // End any existing session
        this.endSession();
        // Create new session
        this.activeSession = new ReadingSession(sourceId, paperId);
        logger$7.info(`Started session for ${sourceId}:${paperId}`);
        // Store metadata if provided
        if (metadata) {
            const key = `${sourceId}:${paperId}`;
            this.paperMetadata.set(key, metadata);
            logger$7.debug(`Stored metadata for ${key}`);
        }
    }
    /**
     * Record a heartbeat for the current session
     */
    recordHeartbeat() {
        if (this.activeSession) {
            this.activeSession.recordHeartbeat();
            return true;
        }
        return false;
    }
    /**
     * End the current session and get the data
     */
    endSession() {
        if (!this.activeSession) {
            return null;
        }
        const sessionData = this.activeSession.endSession();
        logger$7.info(`Ended session for ${sessionData.source_id}:${sessionData.paper_id}`, {
            duration: sessionData.duration_seconds,
            heartbeats: sessionData.heartbeat_count
        });
        const result = sessionData;
        this.activeSession = null;
        return result;
    }
    /**
     * Get current session info
     */
    getCurrentSession() {
        if (!this.activeSession) {
            return null;
        }
        return {
            sourceId: this.activeSession.sourceId,
            paperId: this.activeSession.paperId
        };
    }
    /**
     * Get paper metadata for the current or specified session
     */
    getPaperMetadata(sourceId, paperId) {
        if (!sourceId || !paperId) {
            if (!this.activeSession)
                return undefined;
            sourceId = this.activeSession.sourceId;
            paperId = this.activeSession.paperId;
        }
        return this.paperMetadata.get(`${sourceId}:${paperId}`);
    }
    /**
     * Check if a session is active
     */
    hasActiveSession() {
        return this.activeSession !== null;
    }
    /**
     * Get time since last heartbeat in milliseconds
     */
    getTimeSinceLastHeartbeat() {
        if (!this.activeSession) {
            return null;
        }
        return this.activeSession.getTimeSinceLastHeartbeat();
    }
    /**
     * Get session metadata for debugging
     */
    getCurrentSessionMetadata() {
        return this.activeSession?.getMetadata() || null;
    }
}

// extension/utils/popup-manager.ts
const logger$6 = loguru.getLogger('popup-manager');
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
        logger$6.debug('Popup manager initialized');
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
                    logger$6.error('Error handling popup action', error);
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
                    logger$6.error('Error showing popup', error);
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
        logger$6.debug(`Showing annotation popup for ${sourceId}:${paperId}`);
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
            logger$6.debug(`Sent popup to content script for ${sourceId}:${paperId}`);
        }
        catch (error) {
            logger$6.error(`Error showing popup for ${sourceId}:${paperId}`, error);
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
        logger$6.debug(`Handling popup action: ${action}`, { sourceId, paperId });
        try {
            if (action === 'rate') {
                await paperManager.updateRating(sourceId, paperId, data.value);
                logger$6.info(`Updated rating for ${sourceId}:${paperId} to ${data.value}`);
            }
            else if (action === 'saveNotes') {
                if (data.value) {
                    await paperManager.logAnnotation(sourceId, paperId, 'notes', data.value);
                    logger$6.info(`Saved notes for ${sourceId}:${paperId}`);
                }
            }
        }
        catch (error) {
            logger$6.error(`Error handling action ${action} for ${sourceId}:${paperId}`, error);
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

// extension/source-integration/source-manager.ts
const logger$5 = loguru.getLogger('source-manager');
/**
 * Manages source integrations
 */
class SourceIntegrationManager {
    constructor() {
        this.sources = new Map();
        logger$5.info('Source integration manager initialized');
    }
    /**
     * Register a source integration
     */
    registerSource(source) {
        if (this.sources.has(source.id)) {
            logger$5.warning(`Source with ID '${source.id}' already registered, overwriting`);
        }
        this.sources.set(source.id, source);
        logger$5.info(`Registered source: ${source.name} (${source.id})`);
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
                logger$5.debug(`Found source for URL '${url}': ${source.id}`);
                return source;
            }
        }
        logger$5.debug(`No source found for URL: ${url}`);
        return null;
    }
    /**
     * Get source by ID
     */
    getSourceById(sourceId) {
        const source = this.sources.get(sourceId);
        return source || null;
    }
    /**
     * Extract paper ID from URL using appropriate source
     */
    extractPaperId(url) {
        for (const source of this.sources.values()) {
            if (source.canHandleUrl(url)) {
                const paperId = source.extractPaperId(url);
                if (paperId) {
                    logger$5.debug(`Extracted paper ID '${paperId}' from URL using ${source.id}`);
                    return { sourceId: source.id, paperId };
                }
            }
        }
        logger$5.debug(`Could not extract paper ID from URL: ${url}`);
        return null;
    }
    /**
     * Format a paper identifier using the appropriate source
     */
    formatPaperId(sourceId, paperId) {
        const source = this.sources.get(sourceId);
        if (source) {
            return source.formatPaperId(paperId);
        }
        // Fallback if source not found
        logger$5.warning(`Source '${sourceId}' not found, using default format for paper ID`);
        return `${sourceId}.${paperId}`;
    }
    /**
     * Format an object ID using the appropriate source
     */
    formatObjectId(type, sourceId, paperId) {
        const source = this.sources.get(sourceId);
        if (source) {
            return source.formatObjectId(type, paperId);
        }
        // Fallback if source not found
        logger$5.warning(`Source '${sourceId}' not found, using default format for object ID`);
        return `${type}:${sourceId}.${paperId}`;
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

// extension/source-integration/base-source.ts
const logger$4 = loguru.getLogger('base-source');
/**
 * Abstract base class for source integrations
 * Provides default implementations for identifier formatting methods
 */
class BaseSourceIntegration {
    /**
     * Format a paper identifier for this source
     * Default implementation uses the format: sourceId.paperId
     * Override this method if a source needs a different format
     */
    formatPaperId(paperId) {
        return `${this.id}.${paperId}`;
    }
    /**
     * Parse a paper identifier specific to this source
     * Default implementation handles source.paperId format and extracts paperId
     * Override this method if a source uses a different format
     */
    parsePaperId(identifier) {
        const prefix = `${this.id}.`;
        if (identifier.startsWith(prefix)) {
            return identifier.substring(prefix.length);
        }
        // Try legacy format (sourceId:paperId)
        const legacyPrefix = `${this.id}:`;
        if (identifier.startsWith(legacyPrefix)) {
            logger$4.debug(`Parsed legacy format identifier: ${identifier}`);
            return identifier.substring(legacyPrefix.length);
        }
        return null;
    }
    /**
     * Format a storage object ID for this source
     * Default implementation uses the format: type:sourceId.paperId
     * Override this method if a source needs a different format
     */
    formatObjectId(type, paperId) {
        return `${type}:${this.formatPaperId(paperId)}`;
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

// extension/source-integration/arxiv/index.ts
const logger$1 = loguru.getLogger('arxiv-integration');
class ArXivIntegration extends BaseSourceIntegration {
    constructor() {
        super(...arguments);
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
let paperManager = null;
let sessionTracker = null;
let popupManager = null;
let sourceManager = null;
// Heartbeat timeout check
const HEARTBEAT_TIMEOUT = 15000; // 15 seconds (3 times the 5-second heartbeat interval)
let heartbeatTimeoutId = null;
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
            // Pass the source manager to the paper manager
            paperManager = new PaperManager(githubClient, sourceManager);
            logger.info('Paper manager initialized');
        }
        // Initialize session tracker
        sessionTracker = new SessionTracker();
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
function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.type === 'contentScriptReady' && sender.tab?.id) {
            logger.debug('Content script ready:', sender.tab.url);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'paperMetadata' && message.metadata) {
            // Store metadata received from content script
            handlePaperMetadata(message.metadata);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'getCurrentPaper') {
            const paperMetadata = sessionTracker?.getCurrentSession()
                ? sessionTracker?.getPaperMetadata()
                : null;
            logger.debug('Popup requested current paper', paperMetadata);
            sendResponse(paperMetadata);
            return true;
        }
        if (message.type === 'updateRating') {
            logger.debug('Rating update requested:', message.rating);
            handleUpdateRating(message.rating, sendResponse);
            return true; // Will respond asynchronously
        }
        if (message.type === 'startSession') {
            handleStartSession(message.sourceId, message.paperId);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'sessionHeartbeat') {
            handleSessionHeartbeat(message.sourceId, message.paperId, message.timestamp);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'endSession') {
            handleEndSession(message.sourceId, message.paperId, message.reason || 'user_action');
            sendResponse({ success: true });
            return true;
        }
        // Other message handlers are managed by PopupManager
        return false;
    });
}
// Handle paper metadata from content script
async function handlePaperMetadata(metadata) {
    logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
    try {
        // Store in GitHub if we have a paper manager
        if (paperManager) {
            await paperManager.getOrCreatePaper(metadata);
            logger.debug('Paper metadata stored in GitHub');
        }
    }
    catch (error) {
        logger.error('Error handling paper metadata', error);
    }
}
// Handle rating update
async function handleUpdateRating(rating, sendResponse) {
    if (!paperManager || !sessionTracker) {
        sendResponse({ success: false, error: 'Services not initialized' });
        return;
    }
    const session = sessionTracker.getCurrentSession();
    if (!session) {
        sendResponse({ success: false, error: 'No current session' });
        return;
    }
    const metadata = sessionTracker.getPaperMetadata();
    if (!metadata) {
        sendResponse({ success: false, error: 'No paper metadata available' });
        return;
    }
    try {
        await paperManager.updateRating(session.sourceId, session.paperId, rating, metadata);
        // Update stored metadata with new rating
        metadata.rating = rating;
        sendResponse({ success: true });
    }
    catch (error) {
        logger.error('Error updating rating:', error);
        sendResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
}
// Handle session start request
function handleStartSession(sourceId, paperId) {
    if (!sessionTracker) {
        logger.error('Session tracker not initialized');
        return;
    }
    // Get metadata if available
    const existingMetadata = sessionTracker.getPaperMetadata(sourceId, paperId);
    // Start the session
    sessionTracker.startSession(sourceId, paperId, existingMetadata);
    logger.info(`Started session for ${sourceId}:${paperId}`);
    // Schedule heartbeat check
    scheduleHeartbeatCheck();
}
// Handle session heartbeat
function handleSessionHeartbeat(sourceId, paperId, timestamp) {
    if (!sessionTracker) {
        logger.error('Session tracker not initialized');
        return;
    }
    const session = sessionTracker.getCurrentSession();
    // Verify session matches
    if (session && session.sourceId === sourceId && session.paperId === paperId) {
        sessionTracker.recordHeartbeat();
        // Reschedule heartbeat check
        scheduleHeartbeatCheck();
        logger.debug(`Heartbeat received for ${sourceId}:${paperId}`);
    }
    else {
        // Heartbeat for non-current session - probably a race condition
        logger.warning(`Received heartbeat for non-current session: ${sourceId}:${paperId}`);
        // Start new session if needed
        if (!session) {
            handleStartSession(sourceId, paperId);
        }
    }
}
// Handle session end request
function handleEndSession(sourceId, paperId, reason) {
    const session = sessionTracker?.getCurrentSession();
    // Only end if it matches current session
    if (session && session.sourceId === sourceId && session.paperId === paperId) {
        logger.info(`Ending session for ${sourceId}:${paperId}`, { reason });
        endCurrentSession();
    }
    else {
        logger.warning(`Received end request for non-current session: ${sourceId}:${paperId}`);
    }
}
// Schedule heartbeat timeout check
function scheduleHeartbeatCheck() {
    // Clear any existing timeout
    if (heartbeatTimeoutId !== null) {
        clearTimeout(heartbeatTimeoutId);
        heartbeatTimeoutId = null;
    }
    // Only schedule if we have an active session
    if (!sessionTracker || !sessionTracker.hasActiveSession()) {
        return;
    }
    // Set timeout to check for missed heartbeats
    heartbeatTimeoutId = self.setTimeout(() => {
        checkHeartbeat();
    }, HEARTBEAT_TIMEOUT);
}
// Check if we've missed too many heartbeats
function checkHeartbeat() {
    if (!sessionTracker || !sessionTracker.hasActiveSession()) {
        return;
    }
    const timeSinceLastHeartbeat = sessionTracker.getTimeSinceLastHeartbeat();
    if (timeSinceLastHeartbeat && timeSinceLastHeartbeat > HEARTBEAT_TIMEOUT) {
        // Too much time since last heartbeat, end the session
        logger.info('Heartbeat timeout, ending session');
        endCurrentSession();
    }
    else {
        // Still active, reschedule check
        scheduleHeartbeatCheck();
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
    // Reinitialize paper manager if credentials changed
    if (changes.githubToken || changes.githubRepo) {
        if (githubToken && githubRepo) {
            const githubClient = new f(githubToken, githubRepo);
            // Pass the source manager to the paper manager
            paperManager = new PaperManager(githubClient, sourceManager);
            logger.info('Paper manager reinitialized');
        }
    }
});
// End current session and save data
async function endCurrentSession() {
    if (!sessionTracker) {
        return;
    }
    // Get current session
    const session = sessionTracker.getCurrentSession();
    if (!session) {
        return;
    }
    // Get paper metadata
    const metadata = sessionTracker.getPaperMetadata();
    // End the session
    const sessionData = sessionTracker.endSession();
    // Store session data if we have it and a paper manager
    if (sessionData && paperManager) {
        logger.debug('Creating reading event', sessionData);
        try {
            // Store reading session
            await paperManager.logReadingSession(session.sourceId, session.paperId, sessionData, metadata);
            logger.info(`Session saved to GitHub for ${session.sourceId}:${session.paperId}`);
        }
        catch (error) {
            logger.error('Error saving session', error);
        }
    }
    // Clear heartbeat timeout
    if (heartbeatTimeoutId !== null) {
        clearTimeout(heartbeatTimeoutId);
        heartbeatTimeoutId = null;
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
        getCurrentPaper: () => sessionTracker?.getPaperMetadata(),
        getSessionInfo: () => sessionTracker?.getCurrentSessionMetadata(),
        getSources: () => sourceManager?.getAllSources(),
        forceEndSession: () => endCurrentSession()
    };
    logger.info('Debug objects registered');
}
// Initialize extension
initialize();
//# sourceMappingURL=background.bundle.js.map
