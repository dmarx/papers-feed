var f=(i=>(i.GH_STORE="gh-store",i.STORED_OBJECT="stored-object",i.DEPRECATED="deprecated-object",i.UID_PREFIX="UID:",i.ALIAS_TO_PREFIX="ALIAS-TO:",i))(f||{});var m=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let t=this.cache.get(e);if(t){if(Date.now()-t.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return t.lastAccessed=Date.now(),this.updateAccessOrder(e),t.issueNumber}}set(e,t,r){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let s=this.accessOrder[this.accessOrder.length-1];s&&(this.cache.delete(s),this.removeFromAccessOrder(s));}this.cache.set(e,{issueNumber:t,lastAccessed:Date.now(),createdAt:r.createdAt,updatedAt:r.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,t){let r=this.cache.get(e);return r?t>r.updatedAt:!0}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let t=this.accessOrder.indexOf(e);t>-1&&this.accessOrder.splice(t,1);}};var y="0.11.1";var d=class{constructor(e,t,r={}){if(this.token=e,this.repo=t,!this.repo)throw new Error("Repository is required");this.config={baseLabel:r.baseLabel??"stored-object",uidPrefix:r.uidPrefix??"UID:",reactions:{processed:r.reactions?.processed??"+1",initialState:r.reactions?.initialState??"rocket"}},this.cache=new m(r.cache);}isPublic(){return this.token===null}async fetchFromGitHub(e,t={}){let r=new URL(`https://api.github.com/repos/${this.repo}${e}`);t.params&&(Object.entries(t.params).forEach(([a,n])=>{r.searchParams.append(a,n);}),delete t.params);let s={Accept:"application/vnd.github.v3+json"};if(t.headers){let a=t.headers;Object.keys(a).forEach(n=>{s[n]=a[n];});}this.token&&(s.Authorization=`token ${this.token}`);let i=await fetch(r.toString(),{...t,headers:s});if(!i.ok)throw new Error(`GitHub API error: ${i.status}`);return i.json()}createCommentPayload(e,t,r){let s={_data:e,_meta:{client_version:y,timestamp:new Date().toISOString(),update_mode:"append",issue_number:t}};return r&&(s.type=r),s}async getObject(e){let t=this.cache.get(e),r;if(t)try{r=await this.fetchFromGitHub(`/issues/${t}`),this._verifyIssueLabels(r,e)||(this.cache.remove(e),r=void 0);}catch{this.cache.remove(e);}if(!r){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:["gh-store",this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);r=c[0];}if(!r?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let s=JSON.parse(r.body),i=new Date(r.created_at),a=new Date(r.updated_at);return this.cache.set(e,r.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,issueNumber:r.number,createdAt:i,updatedAt:a,version:await this._getVersion(r.number)},data:s}}async createObject(e,t,r=[]){if(!this.token)throw new Error("Authentication required for creating objects");let s=`${this.config.uidPrefix}${e}`,i=["gh-store",this.config.baseLabel,s,...r],a=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(t,null,2),labels:i})});this.cache.set(e,a.number,{createdAt:new Date(a.created_at),updatedAt:new Date(a.updated_at)});let n=this.createCommentPayload(t,a.number,"initial_state"),c=await this.fetchFromGitHub(`/issues/${a.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(n,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${c.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${c.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${a.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:s,issueNumber:a.number,createdAt:new Date(a.created_at),updatedAt:new Date(a.updated_at),version:1},data:t}}_verifyIssueLabels(e,t){let r=new Set([this.config.baseLabel,`${this.config.uidPrefix}${t}`]);return e.labels.some(s=>r.has(s.name))}async updateObject(e,t){if(!this.token)throw new Error("Authentication required for updating objects");let r=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!r||r.length===0)throw new Error(`No object found with ID: ${e}`);let s=r[0],i=this.createCommentPayload(t,s.number);return await this.fetchFromGitHub(`/issues/${s.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${s.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),t={};for(let r of e)if(!r.labels.some(s=>s.name==="archived"))try{let s=this._getObjectIdFromLabels(r),i=JSON.parse(r.body),a={objectId:s,label:s,issueNumber:r.number,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:await this._getVersion(r.number)};t[s]={meta:a,data:i};}catch{continue}return t}async listUpdatedSince(e){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),r={};for(let s of t)if(!s.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(s),a=JSON.parse(s.body),n=new Date(s.updated_at);if(n>e){let c={objectId:i,label:i,issueNumber:s.number,createdAt:new Date(s.created_at),updatedAt:n,version:await this._getVersion(s.number)};r[i]={meta:c,data:a};}}catch{continue}return r}async getObjectHistory(e){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],s=await this.fetchFromGitHub(`/issues/${r.number}/comments`),i=[];for(let a of s)try{let n=JSON.parse(a.body),c="update",u,p={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",u=n._data,p=n._meta||p):"type"in n&&n.type==="initial_state"?(c="initial_state",u=n.data):u=n:u=n,i.push({timestamp:a.created_at,type:c,data:u,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let t of e.labels)if(t.name!==this.config.baseLabel&&t.name.startsWith(this.config.uidPrefix))return t.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};var E={level:"info",silent:!1},A={error:3,warn:2,info:1,debug:0},b=class{constructor(e,t={}){this.entries=[];this.moduleName=e,this.config={...E,...t};}debug(e,t){this.log("debug",e,t);}info(e,t){this.log("info",e,t);}warn(e,t){this.log("warn",e,t);}error(e,t){this.log("error",e,t);}log(e,t,r){if(A[e]<A[this.config.level])return;let s={timestamp:new Date().toISOString(),level:e,module:this.moduleName,message:t,metadata:r};this.entries.push(s);}getEntries(){return [...this.entries]}clearEntries(){this.entries=[];}configure(e){this.config={...this.config,...e};}getConfig(){return {...this.config}}};new b("CanonicalStore");

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
     * Alias for warning method (to match loguru API)
     */
    warn(message, data) {
        this.warning(message, data);
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

const logger$9 = loguru.getLogger('paper-manager');
class PaperManager {
    constructor(client, sourceManager) {
        this.client = client;
        this.sourceManager = sourceManager;
        logger$9.debug('Paper manager initialized');
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
            logger$9.debug(`Retrieved existing paper: ${paperIdentifier}`);
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
                const newobj = await this.client.createObject(objectId, defaultPaperData);
                logger$9.debug(`Created new paper: ${paperIdentifier}`);
                // reopen to trigger metadata hydration
                await this.client.fetchFromGitHub(`/issues/${newobj.meta.issueNumber}`, {
                    method: "PATCH",
                    body: JSON.stringify({ state: "open" })
                });
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
                logger$9.debug(`Created new interaction log: ${paperIdentifier}`);
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
        logger$9.info(`Logged reading session for ${paperIdentifier}`, { duration: session.duration_seconds });
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
        logger$9.info(`Logged annotation for ${paperIdentifier}`, { key });
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
        logger$9.info(`Updated rating for ${paperIdentifier} to ${rating}`);
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

// session-service.ts
const logger$8 = loguru.getLogger('session-service');
/**
 * Session tracking service for paper reading sessions
 *
 * Manages session state, heartbeats, and persistence
 * Designed for use in the background script (Service Worker)
 */
class SessionService {
    /**
     * Create a new session service
     */
    constructor(paperManager) {
        this.paperManager = paperManager;
        this.activeSession = null;
        this.timeoutId = null;
        this.paperMetadata = new Map();
        // Configuration
        this.HEARTBEAT_TIMEOUT = 15000; // 15 seconds
        logger$8.debug('Session service initialized');
    }
    /**
     * Start a new session for a paper
     */
    startSession(sourceId, paperId, metadata) {
        // End any existing session
        this.endSession();
        // Create new session
        this.activeSession = {
            sourceId,
            paperId,
            startTime: new Date(),
            heartbeatCount: 0,
            lastHeartbeatTime: new Date()
        };
        // Store metadata if provided
        if (metadata) {
            const key = `${sourceId}:${paperId}`;
            this.paperMetadata.set(key, metadata);
            logger$8.debug(`Stored metadata for ${key}`);
        }
        // Start timeout check
        this.scheduleTimeoutCheck();
        logger$8.info(`Started session for ${sourceId}:${paperId}`);
    }
    /**
     * Record a heartbeat for the current session
     */
    recordHeartbeat() {
        if (!this.activeSession) {
            return false;
        }
        this.activeSession.heartbeatCount++;
        this.activeSession.lastHeartbeatTime = new Date();
        // Reschedule timeout
        this.scheduleTimeoutCheck();
        if (this.activeSession.heartbeatCount % 12 === 0) { // Log every minute (12 x 5sec heartbeats)
            logger$8.debug(`Session received ${this.activeSession.heartbeatCount} heartbeats`);
        }
        return true;
    }
    /**
     * Schedule a check for heartbeat timeout
     */
    scheduleTimeoutCheck() {
        // Clear existing timeout
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
        // Set new timeout
        this.timeoutId = self.setTimeout(() => {
            this.checkTimeout();
        }, this.HEARTBEAT_TIMEOUT);
    }
    /**
     * Check if the session has timed out due to missing heartbeats
     */
    checkTimeout() {
        if (!this.activeSession)
            return;
        const now = Date.now();
        const lastTime = this.activeSession.lastHeartbeatTime.getTime();
        if ((now - lastTime) > this.HEARTBEAT_TIMEOUT) {
            logger$8.info('Session timeout detected');
            this.endSession();
        }
        else {
            this.scheduleTimeoutCheck();
        }
    }
    /**
     * End the current session and get the data
     */
    endSession() {
        if (!this.activeSession)
            return null;
        // Clear timeout
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        const { sourceId, paperId, startTime, heartbeatCount } = this.activeSession;
        const endTime = new Date();
        // Calculate duration (5 seconds per heartbeat)
        const duration = heartbeatCount * 5;
        // Calculate total elapsed time
        const totalElapsed = endTime.getTime() - startTime.getTime();
        const totalElapsedSeconds = Math.round(totalElapsed / 1000);
        // Set idle seconds to the difference (for backward compatibility)
        const idleSeconds = Math.max(0, totalElapsedSeconds - duration);
        // Create session data
        const sessionData = {
            session_id: `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            source_id: sourceId,
            paper_id: paperId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            heartbeat_count: heartbeatCount,
            duration_seconds: duration,
            // Legacy fields
            idle_seconds: idleSeconds,
            total_elapsed_seconds: totalElapsedSeconds
        };
        // Store session if it was meaningful and we have a paper manager
        if (this.paperManager && heartbeatCount > 0) {
            const metadata = this.getPaperMetadata(sourceId, paperId);
            this.paperManager.logReadingSession(sourceId, paperId, sessionData, metadata)
                .catch(err => logger$8.error('Failed to store session', err));
        }
        logger$8.info(`Ended session for ${sourceId}:${paperId}`, {
            duration,
            heartbeats: heartbeatCount
        });
        // Clear active session
        this.activeSession = null;
        return sessionData;
    }
    /**
     * Check if a session is currently active
     */
    hasActiveSession() {
        return this.activeSession !== null;
    }
    /**
     * Get information about the current session
     */
    getCurrentSession() {
        if (!this.activeSession)
            return null;
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
     * Store paper metadata
     */
    storePaperMetadata(metadata) {
        const key = `${metadata.sourceId}:${metadata.paperId}`;
        this.paperMetadata.set(key, metadata);
    }
    /**
     * Get time since last heartbeat in milliseconds
     */
    getTimeSinceLastHeartbeat() {
        if (!this.activeSession) {
            return null;
        }
        return Date.now() - this.activeSession.lastHeartbeatTime.getTime();
    }
    /**
     * Get session statistics for debugging
     */
    getSessionStats() {
        if (!this.activeSession) {
            return { active: false };
        }
        return {
            active: true,
            sourceId: this.activeSession.sourceId,
            paperId: this.activeSession.paperId,
            startTime: this.activeSession.startTime.toISOString(),
            heartbeatCount: this.activeSession.heartbeatCount,
            lastHeartbeatTime: this.activeSession.lastHeartbeatTime.toISOString(),
            elapsedTime: Math.round((Date.now() - this.activeSession.startTime.getTime()) / 1000)
        };
    }
}

// extension/utils/popup-manager.ts
const logger$7 = loguru.getLogger('popup-manager');
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
        logger$7.debug('Popup manager initialized');
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
                    logger$7.error('Error handling popup action', error);
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
                    logger$7.error('Error showing popup', error);
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
        logger$7.debug(`Showing annotation popup for ${sourceId}:${paperId}`);
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
            logger$7.debug(`Sent popup to content script for ${sourceId}:${paperId}`);
        }
        catch (error) {
            logger$7.error(`Error showing popup for ${sourceId}:${paperId}`, error);
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
        logger$7.debug(`Handling popup action: ${action}`, { sourceId, paperId });
        try {
            if (action === 'rate') {
                await paperManager.updateRating(sourceId, paperId, data.value);
                logger$7.info(`Updated rating for ${sourceId}:${paperId} to ${data.value}`);
            }
            else if (action === 'saveNotes') {
                if (data.value) {
                    await paperManager.logAnnotation(sourceId, paperId, 'notes', data.value);
                    logger$7.info(`Saved notes for ${sourceId}:${paperId}`);
                }
            }
        }
        catch (error) {
            logger$7.error(`Error handling action ${action} for ${sourceId}:${paperId}`, error);
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
const logger$6 = loguru.getLogger('source-manager');
/**
 * Manages source integrations
 */
class SourceIntegrationManager {
    constructor() {
        this.sources = new Map();
        logger$6.info('Source integration manager initialized');
    }
    /**
     * Register a source integration
     */
    registerSource(source) {
        if (this.sources.has(source.id)) {
            logger$6.warning(`Source with ID '${source.id}' already registered, overwriting`);
        }
        this.sources.set(source.id, source);
        logger$6.info(`Registered source: ${source.name} (${source.id})`);
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
                logger$6.debug(`Found source for URL '${url}': ${source.id}`);
                return source;
            }
        }
        logger$6.debug(`No source found for URL: ${url}`);
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
                    logger$6.debug(`Extracted paper ID '${paperId}' from URL using ${source.id}`);
                    return { sourceId: source.id, paperId };
                }
            }
        }
        logger$6.debug(`Could not extract paper ID from URL: ${url}`);
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
        logger$6.warning(`Source '${sourceId}' not found, using default format for paper ID`);
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
        logger$6.warning(`Source '${sourceId}' not found, using default format for object ID`);
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

// extension/utils/icon-manager.ts
const logger$5 = loguru.getLogger('icon-manager');
var IconState;
(function (IconState) {
    IconState["DEFAULT"] = "default";
    IconState["DETECTED"] = "detected";
    IconState["TRACKED"] = "tracked";
})(IconState || (IconState = {}));
// Your excellent SVG definitions (keeping them as-is)
const ICON_CONFIGS = {
    [IconState.DEFAULT]: {
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <path fill="#AAB8C2" d="M35 26a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V6.313C1 4.104 6.791 0 9 0h20.625C32.719 0 35 2.312 35 5.375V26z"/>
  <path fill="#F5F8FA" d="M33 30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6c0-4.119-.021-4 5-4h21a4 4 0 0 1 4 4v24z"/>
  <path fill="#FFF"     d="M31 31a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v24z"/>
  <path fill="#AAB8C2" d="M31 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4v22z"/>
  <path fill="#E1E8ED" d="M29 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4h19.335C27.544 8 29 9.456 29 11.665V32z"/>
  <path fill="#AAB8C2" d="M6 6C4.312 6 4.269 4.078 5 3.25C5.832 2.309 7.125 2 9.438 2H11V0H8.281C4.312 0 1 2.5 1 5.375V32a4 4 0 0 0 4 4h2V6H6z"/>
  <g fill="#DD2E44">
    <path d="M17 4v23l4-6l4 6V4z"/>
    <path d="M25 28a1 1 0 0 1-.832-.445L21 22.803l-3.168 4.752A.998.998 0 0 1 16 27V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v23a1 1 0 0 1-1 1zm-4-8c.334 0 .646.167.832.445L24 23.697V5h-6v18.697l2.168-3.252c.186-.278.498-.445.832-.445z"/>
  </g>
  <path fill="#F5F8FA" d="M15 2h12v2H15z"/>
</svg>
    `.trim(),
        title: 'Academic Paper Tracker',
    },
    [IconState.DETECTED]: {
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <path fill="#1DA1F2" d="M35 26a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V6.313C1 4.104 6.791 0 9 0h20.625C32.719 0 35 2.312 35 5.375V26z"/>
  <path fill="#E8F5FE" d="M33 30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6c0-4.119-.021-4 5-4h21a4 4 0 0 1 4 4v24z"/>
  <path fill="#FFF"     d="M31 31a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v24z"/>
  <path fill="#1DA1F2" d="M31 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4v22z"/>
  <path fill="#E8F5FE" d="M29 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4h19.335C27.544 8 29 9.456 29 11.665V32z"/>
  <path fill="#1DA1F2" d="M6 6C4.312 6 4.269 4.078 5 3.25C5.832 2.309 7.125 2 9.438 2H11V0H8.281C4.312 0 1 2.5 1 5.375V32a4 4 0 0 0 4 4h2V6H6z"/>
  <g fill="#0A84FF">
    <path d="M17 4v23l4-6l4 6V4z"/>
    <path d="M25 28a1 1 0 0 1-.832-.445L21 22.803l-3.168 4.752A.998.998 0 0 1 16 27V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v23a1 1 0 0 1-1 1zm-4-8c.334 0 .646.167.832.445L24 23.697V5h-6v18.697l2.168-3.252c.186-.278.498-.445.832-.445z"/>
  </g>
  <path fill="#E8F5FE" d="M15 2h12v2H15z"/>
</svg>
    `.trim(),
        title: 'Paper Detected - Academic Paper Tracker',
    },
    [IconState.TRACKED]: {
        svg: `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
  <path fill="#228B22" d="M35 26a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4V6.313C1 4.104 6.791 0 9 0h20.625C32.719 0 35 2.312 35 5.375V26z"/>
  <path fill="#E8F5EE" d="M33 30a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V6c0-4.119-.021-4 5-4h21a4 4 0 0 1 4 4v24z"/>
  <path fill="#FFF"     d="M31 31a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h24a3 3 0 0 1 3 3v24z"/>
  <path fill="#228B22" d="M31 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4h21a4 4 0 0 1 4 4v22z"/>
  <path fill="#E8F5EE" d="M29 32a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V12a4 4 0 0 1 4-4h19.335C27.544 8 29 9.456 29 11.665V32z"/>
  <path fill="#228B22" d="M6 6C4.312 6 4.269 4.078 5 3.25C5.832 2.309 7.125 2 9.438 2H11V0H8.281C4.312 0 1 2.5 1 5.375V32a4 4 0 0 0 4 4h2V6H6z"/>
  <g fill="#006400">
    <path d="M17 4v23l4-6l4 6V4z"/>
    <path d="M25 28a1 1 0 0 1-.832-.445L21 22.803l-3.168 4.752A.998.998 0 0 1 16 27V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v23a1 1 0 0 1-1 1zm-4-8c.334 0 .646.167.832.445L24 23.697V5h-6v18.697l2.168-3.252c.186-.278.498-.445.832-.445z"/>
  </g>
  <path fill="#E8F5EE" d="M15 2h12v2H15z"/>
</svg>
    `.trim(),
        title: 'Paper Tracked - Academic Paper Tracker',
    },
};
const ICON_SIZES = [16, 32, 48, 128];
class IconManager {
    constructor() {
        this.tabStates = new Map();
        this.pendingUpdates = new Map(); // NEW: Prevent race conditions
        this.iconCache = new Map(); // NEW: Cache rasterized icons
        this.setupTabListeners();
        this.preloadIcons(); // NEW: Pre-rasterize all icons at startup
        logger$5.debug('Icon manager initialized');
    }
    setupTabListeners() {
        chrome.tabs.onRemoved.addListener((tabId) => {
            this.tabStates.delete(tabId);
            this.pendingUpdates.delete(tabId);
            logger$5.debug(`Cleaned up icon state for closed tab ${tabId}`);
        });
        chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
            if (changeInfo.status === 'loading' && changeInfo.url) {
                this.setIconState(tabId, IconState.DEFAULT);
                logger$5.debug(`Reset icon for tab ${tabId} navigating to ${changeInfo.url}`);
            }
        });
    }
    // NEW: Pre-rasterize all icons for better performance
    async preloadIcons() {
        try {
            for (const state of Object.values(IconState)) {
                const config = ICON_CONFIGS[state];
                const imageDataMap = {};
                for (const px of ICON_SIZES) {
                    const imgData = await this.rasterizeSvgToImageData(config.svg, px, px);
                    imageDataMap[px.toString()] = imgData;
                }
                this.iconCache.set(state, imageDataMap);
            }
            logger$5.debug('Pre-loaded all icon states');
        }
        catch (error) {
            logger$5.error('Failed to preload icons:', error);
        }
    }
    async setIconState(tabId, state) {
        // NEW: Check if already in this state (deduplication)
        const currentState = this.tabStates.get(tabId);
        if (currentState === state) {
            logger$5.debug(`Icon already in ${state} state for tab ${tabId}, skipping`);
            return;
        }
        // NEW: Wait for any pending updates to avoid race conditions
        const pending = this.pendingUpdates.get(tabId);
        if (pending) {
            try {
                await pending;
            }
            catch (error) {
                logger$5.warn(`Previous icon update failed for tab ${tabId}:`, error);
            }
        }
        // Create update promise
        const updatePromise = this.performIconUpdate(tabId, state);
        this.pendingUpdates.set(tabId, updatePromise);
        try {
            await updatePromise;
            this.tabStates.set(tabId, state);
            logger$5.debug(`Set icon state to ${state} for tab ${tabId}`);
        }
        catch (error) {
            logger$5.error(`Failed to set icon state for tab ${tabId}:`, error);
            throw error;
        }
        finally {
            this.pendingUpdates.delete(tabId);
        }
    }
    async performIconUpdate(tabId, state) {
        const config = ICON_CONFIGS[state];
        // Check if tab still exists
        try {
            await chrome.tabs.get(tabId);
        }
        catch (error) {
            logger$5.debug(`Tab ${tabId} no longer exists, skipping icon update`);
            return;
        }
        try {
            // NEW: Use cached icons if available, otherwise rasterize on demand
            let imageDataMap = this.iconCache.get(state);
            if (!imageDataMap) {
                logger$5.debug(`Cache miss for ${state}, rasterizing on demand`);
                imageDataMap = {};
                for (const px of ICON_SIZES) {
                    const imgData = await this.rasterizeSvgToImageData(config.svg, px, px);
                    imageDataMap[px.toString()] = imgData;
                }
                this.iconCache.set(state, imageDataMap);
            }
            await chrome.action.setIcon({
                tabId,
                imageData: imageDataMap,
            });
            await chrome.action.setTitle({
                tabId,
                title: config.title,
            });
        }
        catch (error) {
            // Handle specific Chrome API errors gracefully
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('No tab with id') ||
                errorMessage.includes('Cannot access')) {
                logger$5.debug(`Cannot update icon for tab ${tabId}: ${errorMessage}`);
                return;
            }
            throw error;
        }
    }
    async rasterizeSvgToImageData(svgText, widthPx, heightPx) {
        try {
            const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
            const bitmap = await createImageBitmap(svgBlob, {
                resizeWidth: widthPx,
                resizeHeight: heightPx,
                resizeQuality: 'high',
            });
            const offscreen = new OffscreenCanvas(widthPx, heightPx);
            const ctx = offscreen.getContext('2d');
            if (!ctx) {
                throw new Error('Failed to get 2D context from OffscreenCanvas');
            }
            ctx.clearRect(0, 0, widthPx, heightPx);
            ctx.drawImage(bitmap, 0, 0, widthPx, heightPx);
            return ctx.getImageData(0, 0, widthPx, heightPx);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger$5.error(`Failed to rasterize SVG at ${widthPx}x${heightPx}:`, errorMessage);
            throw error;
        }
    }
    getIconState(tabId) {
        return this.tabStates.get(tabId) || IconState.DEFAULT;
    }
    async setPaperDetected(tabId) {
        await this.setIconState(tabId, IconState.DETECTED);
    }
    async setPaperTracked(tabId) {
        await this.setIconState(tabId, IconState.TRACKED);
    }
    async resetIcon(tabId) {
        await this.setIconState(tabId, IconState.DEFAULT);
    }
    async setBadgeText(tabId, text, color) {
        try {
            await chrome.action.setBadgeText({ tabId, text });
            if (color) {
                await chrome.action.setBadgeBackgroundColor({ tabId, color });
            }
            logger$5.debug(`Set badge text "${text}" for tab ${tabId}`);
        }
        catch (error) {
            logger$5.error(`Failed to set badge text for tab ${tabId}:`, error);
        }
    }
    async clearBadge(tabId) {
        await this.setBadgeText(tabId, '');
    }
    // NEW: Utility method to add dynamic badges/indicators
    async setPaperCount(tabId, count) {
        if (count > 0) {
            await this.setBadgeText(tabId, count.toString(), '#FF4444');
        }
        else {
            await this.clearBadge(tabId);
        }
    }
    // NEW: Reset all tabs to default (useful for extension restart)
    async resetAllIcons() {
        try {
            const tabs = await chrome.tabs.query({});
            await Promise.allSettled(tabs.map(tab => tab.id ? this.resetIcon(tab.id) : Promise.resolve()));
            logger$5.info('Reset all tab icons');
        }
        catch (error) {
            logger$5.error('Failed to reset all icons:', error);
        }
    }
    // NEW: Get cache statistics for debugging
    getCacheStats() {
        let totalSize = 0;
        for (const imageDataMap of this.iconCache.values()) {
            for (const imageData of Object.values(imageDataMap)) {
                totalSize += imageData.data.length;
            }
        }
        return {
            states: this.iconCache.size,
            totalSize
        };
    }
}

// extension/source-integration/metadata-extractor.ts
const logger$4 = loguru.getLogger('metadata-extractor');
// Constants for standard source types
const SOURCE_TYPES = {
    PDF: 'pdf',
    URL: 'url',
};
/**
 * Base class for metadata extraction with customizable extraction methods
 * Each method can be overridden to provide source-specific extraction
 */
class MetadataExtractor {
    /**
     * Create a new metadata extractor for a document
     */
    constructor(document) {
        this.document = document;
        this.url = document.location.href;
        logger$4.debug('Initialized metadata extractor for:', this.url);
    }
    /**
     * Helper method to get content from meta tags
     */
    getMetaContent(selector) {
        const element = this.document.querySelector(selector);
        return element ? element.getAttribute('content') || '' : '';
    }
    /**
     * Extract and return all metadata fields
     */
    extract() {
        logger$4.debug('Extracting metadata from page:', this.url);
        const metadata = {
            title: this.extractTitle(),
            authors: this.extractAuthors(),
            description: this.extractDescription(),
            publishedDate: this.extractPublishedDate(),
            doi: this.extractDoi(),
            journalName: this.extractJournalName(),
            tags: this.extractTags(),
            url: this.url
        };
        logger$4.debug('Metadata extraction complete:', metadata);
        return metadata;
    }
    /**
     * Extract title from document
     * Considers multiple metadata standards with priority order
     */
    extractTitle() {
        // Title extraction - priority order
        return (
        // Dublin Core
        this.getMetaContent('meta[name="DC.Title"]') || this.getMetaContent('meta[name="dc.title"]') ||
            // Citation
            this.getMetaContent('meta[name="citation_title"]') ||
            // Open Graph
            this.getMetaContent('meta[property="og:title"]') ||
            // Standard meta
            this.getMetaContent('meta[name="title"]') ||
            // Fallback to document title
            this.document.title);
    }
    /**
     * Extract authors from document
     * Handles multiple author formats and sources
     */
    extractAuthors() {
        // Get all citation authors (some pages have multiple citation_author tags)
        const citationAuthors = [];
        this.document.querySelectorAll('meta[name="citation_author"]').forEach(el => {
            const content = el.getAttribute('content');
            if (content)
                citationAuthors.push(content);
        });
        // Get all DC creators
        const dcCreators = [];
        this.document.querySelectorAll('meta[name="DC.Creator.PersonalName"]').forEach(el => {
            const content = el.getAttribute('content');
            if (content)
                dcCreators.push(content);
        });
        // Individual author elements
        const dcCreator = this.getMetaContent('meta[name="DC.Creator.PersonalName"]') || this.getMetaContent('meta[name="dc.creator.personalname"]');
        const citationAuthor = this.getMetaContent('meta[name="citation_author"]');
        const ogAuthor = this.getMetaContent('meta[property="og:article:author"]') ||
            this.getMetaContent('meta[name="author"]');
        // Set authors with priority
        if (dcCreators.length > 0) {
            return dcCreators.join(', ');
        }
        else if (citationAuthors.length > 0) {
            return citationAuthors.join(', ');
        }
        else if (dcCreator) {
            return dcCreator;
        }
        else if (citationAuthor) {
            return citationAuthor;
        }
        else if (ogAuthor) {
            return ogAuthor;
        }
        return '';
    }
    /**
     * Extract description/abstract from document
     */
    extractDescription() {
        return (this.getMetaContent('meta[name="DC.Description"]') || this.getMetaContent('meta[name="dc.description"]') ||
            this.getMetaContent('meta[name="citation_abstract"]') ||
            this.getMetaContent('meta[property="og:description"]') ||
            this.getMetaContent('meta[name="description"]'));
    }
    /**
     * Extract publication date from document
     */
    extractPublishedDate() {
        return (this.getMetaContent('meta[name="DC.Date.issued"]') || this.getMetaContent('meta[name="dc.date.issued"]') || this.getMetaContent('meta[name="dc.date"]') || this.getMetaContent('meta[name="dc.Date"]') || this.getMetaContent('meta[name="DC.Date"]') ||
            this.getMetaContent('meta[name="citation_date"]') ||
            this.getMetaContent('meta[property="article:published_time"]'));
    }
    /**
     * Extract DOI (Digital Object Identifier) from document
     */
    extractDoi() {
        return (this.getMetaContent('meta[name="DC.Identifier.DOI"]') || this.getMetaContent('meta[name="dc.identifier.doi"]') ||
            this.getMetaContent('meta[name="citation_doi"]'));
    }
    /**
     * Extract journal name from document
     */
    extractJournalName() {
        return (this.getMetaContent('meta[name="DC.Source"]') || this.getMetaContent('meta[name="dc.source"]') ||
            this.getMetaContent('meta[name="citation_journal_title"]'));
    }
    /**
     * Extract keywords/tags from document
     */
    extractTags() {
        const keywords = this.getMetaContent('meta[name="keywords"]') ||
            this.getMetaContent('meta[name="DC.Subject"]') || this.getMetaContent('meta[name="dc.subject"]');
        if (keywords) {
            return keywords.split(',').map(tag => tag.trim());
        }
        return [];
    }
    /**
     * Determine if the current URL is a PDF
     */
    isPdf() {
        return isPdfUrl(this.url);
    }
    /**
     * Get the source type (PDF or URL)
     */
    getSourceType() {
        return this.isPdf() ? SOURCE_TYPES.PDF : SOURCE_TYPES.URL;
    }
    /**
     * Generate a paper ID for the current URL
     */
    generatePaperId() {
        return generatePaperIdFromUrl(this.url);
    }
}
/**
 * Create a common metadata extractor for a document
 * Factory function for creating the default extractor
 */
function createMetadataExtractor(document) {
    return new MetadataExtractor(document);
}
/**
 * Generate a paper ID from a URL
 * Creates a consistent hash-based identifier
 */
function generatePaperIdFromUrl(url) {
    // Use a basic hash function to create an ID from the URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
        const char = url.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    // Create a positive hexadecimal string
    const positiveHash = Math.abs(hash).toString(16).toUpperCase();
    // Use the first 8 characters as the ID
    return positiveHash.substring(0, 8);
}
/**
 * Determine if a URL is a PDF
 */
function isPdfUrl(url) {
    return url.toLowerCase().endsWith('.pdf');
}

// extension/source-integration/base-source.ts
const logger$3 = loguru.getLogger('base-source');
/**
 * Base class for source integrations
 * Provides default implementations for all methods
 * Specific sources can override as needed
 */
class BaseSourceIntegration {
    constructor() {
        // Default properties - set for generic web pages
        this.id = 'url';
        this.name = 'Web Page';
        this.urlPatterns = [
            /^https?:\/\/(?!.*\.pdf($|\?|#)).*$/i // Match HTTP/HTTPS URLs that aren't PDFs
        ];
        this.contentScriptMatches = [];
    }
    /**
     * Check if this integration can handle the given URL
     * Default implementation checks against urlPatterns
     */
    canHandleUrl(url) {
        return this.urlPatterns.some(pattern => pattern.test(url));
    }
    /**
     * Extract paper ID from URL
     * Default implementation creates a hash from the URL
     */
    extractPaperId(url) {
        return generatePaperIdFromUrl(url);
    }
    /**
     * Create a metadata extractor for the given document
     * Override this method to provide a custom extractor for your source
     */
    createMetadataExtractor(document) {
        return createMetadataExtractor(document);
    }
    /**
     * Extract metadata from a page
     * Default implementation uses common metadata extraction
     */
    async extractMetadata(document, paperId) {
        try {
            logger$3.debug(`Extracting metadata using base extractor for ID: ${paperId}`);
            // Create a metadata extractor for this document
            const extractor = this.createMetadataExtractor(document);
            // Extract metadata
            const extracted = extractor.extract();
            const url = document.location.href;
            // Determine source type (PDF or URL)
            const sourceType = extractor.getSourceType();
            // Create PaperMetadata object
            return {
                sourceId: this.id,
                //paperId: this.formatPaperId(paperId),
                paperId: paperId,
                url: url,
                title: extracted.title || document.title || paperId,
                authors: extracted.authors || '',
                abstract: extracted.description || '',
                timestamp: new Date().toISOString(),
                rating: 'novote',
                publishedDate: extracted.publishedDate || '',
                tags: extracted.tags || [],
                doi: extracted.doi,
                journalName: extracted.journalName,
                sourceType: sourceType // Store the source type for reference
            };
        }
        catch (error) {
            logger$3.error('Error extracting metadata with base extractor', error);
            return null;
        }
    }
    /**
     * Format a paper identifier for this source
     * Default implementation uses the format: sourceId.paperId
     */
    formatPaperId(paperId) {
        return `${this.id}.${paperId}`;
    }
    /**
     * Parse a paper identifier specific to this source
     * Default implementation handles source.paperId format and extracts paperId
     */
    parsePaperId(identifier) {
        const prefix = `${this.id}.`;
        if (identifier.startsWith(prefix)) {
            return identifier.substring(prefix.length);
        }
        // Try legacy format (sourceId:paperId)
        const legacyPrefix = `${this.id}:`;
        if (identifier.startsWith(legacyPrefix)) {
            logger$3.debug(`Parsed legacy format identifier: ${identifier}`);
            return identifier.substring(legacyPrefix.length);
        }
        return null;
    }
    /**
     * Format a storage object ID for this source
     * Default implementation uses the format: type:sourceId.paperId
     */
    formatObjectId(type, paperId) {
        return `${type}:${this.formatPaperId(paperId)}`;
    }
}

// extension/source-integration/arxiv/index.ts
const logger$2 = loguru.getLogger('arxiv-integration');
/**
 * Custom metadata extractor for arXiv pages
 */
class ArxivMetadataExtractor extends MetadataExtractor {
    constructor(document, apiMetadata) {
        super(document);
        this.apiMetadata = apiMetadata;
    }
    /**
     * Override title extraction to use API data if available
     */
    extractTitle() {
        if (this.apiMetadata?.title) {
            return this.apiMetadata.title;
        }
        // arXiv-specific selectors
        //const arxivTitle = this.document.querySelector('.title.mathjax')?.textContent?.trim();
        //return arxivTitle || super.extractTitle();
        return super.extractTitle();
    }
    /**
     * Override authors extraction to use API data if available
     */
    extractAuthors() {
        if (this.apiMetadata?.authors) {
            return this.apiMetadata.authors;
        }
        // arXiv-specific selectors
        const authorLinks = this.document.querySelectorAll('.authors a');
        if (authorLinks.length > 0) {
            return Array.from(authorLinks)
                .map(link => link.textContent?.trim())
                .filter(Boolean)
                .join(', ');
        }
        return super.extractAuthors();
    }
    /**
     * Override description extraction to use API data if available
     */
    extractDescription() {
        if (this.apiMetadata?.description) {
            return this.apiMetadata.description;
        }
        // arXiv-specific selectors
        const abstract = this.document.querySelector('.abstract')?.textContent?.trim();
        if (abstract) {
            // Remove "Abstract:" prefix if present
            return abstract.replace(/^Abstract:\s*/i, '');
        }
        return super.extractDescription();
    }
    /**
     * Override published date extraction to use API data if available
     */
    extractPublishedDate() {
        if (this.apiMetadata?.publishedDate) {
            return this.apiMetadata.publishedDate;
        }
        // arXiv-specific date extraction
        const datelineElement = this.document.querySelector('.dateline');
        if (datelineElement) {
            const dateText = datelineElement.textContent;
            const dateMatch = dateText?.match(/\(Submitted on ([^)]+)\)/);
            if (dateMatch) {
                return dateMatch[1];
            }
        }
        return super.extractPublishedDate();
    }
    /**
     * Override DOI extraction to use API data if available
     */
    extractDoi() {
        return this.apiMetadata?.doi || super.extractDoi();
    }
    /**
     * Override journal extraction to use API data if available
     */
    extractJournalName() {
        return this.apiMetadata?.journalName || super.extractJournalName();
    }
    /**
     * Override tags extraction to use API data if available
     */
    extractTags() {
        if (this.apiMetadata?.tags) {
            return this.apiMetadata.tags;
        }
        // arXiv-specific category extraction
        const subjects = this.document.querySelector('.subjects')?.textContent?.trim();
        if (subjects) {
            return subjects.split(/[;,]/).map(tag => tag.trim()).filter(Boolean);
        }
        return super.extractTags();
    }
}
/**
 * ArXiv integration with custom metadata extraction
 */
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
        // readonly contentScriptMatches = [
        //   "*://*.arxiv.org/*"
        // ];
        // ArXiv API endpoint
        this.API_BASE_URL = 'https://export.arxiv.org/api/query';
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
     * Create a custom metadata extractor for arXiv
     */
    createMetadataExtractor(document) {
        return new ArxivMetadataExtractor(document);
    }
    /**
     * Fetch metadata from ArXiv API
     */
    async fetchFromApi(paperId) {
        try {
            const apiUrl = `${this.API_BASE_URL}?id_list=${paperId}`;
            logger$2.debug(`Fetching from ArXiv API: ${apiUrl}`);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                logger$2.error(`ArXiv API request failed with status: ${response.status}`);
                return null;
            }
            const xmlText = await response.text();
            // Parse XML to JSON
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            // Convert XML to a more manageable format
            const entry = xmlDoc.querySelector('entry');
            if (!entry) {
                logger$2.warn('No entry found in ArXiv API response');
                return null;
            }
            // Extract metadata from XML
            const title = entry.querySelector('title')?.textContent?.trim() || '';
            const summary = entry.querySelector('summary')?.textContent?.trim() || '';
            const published = entry.querySelector('published')?.textContent?.trim() || '';
            // Extract authors
            const authorElements = entry.querySelectorAll('author name');
            const authors = Array.from(authorElements)
                .map(el => el.textContent?.trim())
                .filter(Boolean)
                .join(', ');
            // Extract DOI if available
            const doi = entry.querySelector('arxiv\\:doi, doi')?.textContent?.trim();
            // Extract journal reference if available
            const journalRef = entry.querySelector('arxiv\\:journal_ref, journal_ref')?.textContent?.trim();
            // Extract categories
            const categoryElements = entry.querySelectorAll('category');
            const categories = Array.from(categoryElements)
                .map(el => el.getAttribute('term'))
                .filter(Boolean);
            return {
                title,
                authors,
                description: summary,
                publishedDate: published,
                doi,
                journalName: journalRef,
                tags: categories
            };
        }
        catch (error) {
            logger$2.error('Error fetching from ArXiv API', error);
            return null;
        }
    }
    /**
     * Extract metadata from page or fetch from API
     * Override parent method to handle the API fallback
     */
    async extractMetadata(document, paperId) {
        try {
            logger$2.info(`Extracting metadata for arXiv ID: ${paperId}`);
            // Try to extract from page first
            const extractor = this.createMetadataExtractor(document);
            const pageMetadata = extractor.extract();
            // Check if we have the essential fields
            const hasTitle = pageMetadata.title && pageMetadata.title !== document.title;
            const hasAuthors = pageMetadata.authors && pageMetadata.authors.length > 0;
            const hasAbstract = pageMetadata.description && pageMetadata.description.length > 0;
            if (hasTitle && hasAuthors && hasAbstract) {
                logger$2.debug('Successfully extracted complete metadata from page');
                return this.convertToPageMetadata(pageMetadata, paperId, extractor.getSourceType());
            }
            // If page extraction is incomplete, fetch from API
            logger$2.info('Page metadata incomplete, fetching from ArXiv API');
            const apiMetadata = await this.fetchFromApi(paperId);
            if (!apiMetadata) {
                logger$2.warn('Failed to fetch metadata from ArXiv API, using partial page data');
                return this.convertToPageMetadata(pageMetadata, paperId, extractor.getSourceType());
            }
            // Create a new extractor with API data
            const enhancedExtractor = new ArxivMetadataExtractor(document, apiMetadata);
            const mergedMetadata = enhancedExtractor.extract();
            logger$2.debug('Merged metadata from page and API', mergedMetadata);
            return this.convertToPageMetadata(mergedMetadata, paperId, enhancedExtractor.getSourceType());
        }
        catch (error) {
            logger$2.error('Error extracting metadata for arXiv', error);
            return null;
        }
    }
    /**
     * Convert ExtractedMetadata to PaperMetadata
     */
    convertToPageMetadata(extracted, paperId, sourceType) {
        return {
            sourceId: this.id,
            paperId: paperId,
            url: extracted.url || '',
            title: extracted.title,
            authors: extracted.authors,
            abstract: extracted.description,
            timestamp: new Date().toISOString(),
            rating: 'novote',
            publishedDate: extracted.publishedDate,
            tags: extracted.tags || [],
            doi: extracted.doi,
            journalName: extracted.journalName,
            sourceType: sourceType
        };
    }
}
// Export a singleton instance that can be used by both background and content scripts
const arxivIntegration = new ArXivIntegration();

// extension/source-integration/openreview/index.ts
const logger$1 = loguru.getLogger('openreview-integration');
/**
 * Custom metadata extractor for OpenReview pages
 */
class OpenReviewMetadataExtractor extends MetadataExtractor {
    /**
     * Extract metadata from OpenReview pages
     */
    extract() {
        // First try to extract using standard methods
        const baseMetadata = super.extract();
        try {
            // Get title from OpenReview-specific elements
            const title = this.document.querySelector('.citation_title')?.textContent ||
                this.document.querySelector('.forum-title h2')?.textContent;
            // Get authors
            const authorElements = Array.from(this.document.querySelectorAll('.forum-authors a'));
            const authors = authorElements
                .map(el => el.textContent)
                .filter(Boolean)
                .join(', ');
            // Get abstract
            const abstract = this.document.querySelector('meta[name="citation_abstract"]')?.getAttribute('content') ||
                Array.from(this.document.querySelectorAll('.note-content-field'))
                    .find(el => el.textContent?.includes('Abstract'))
                    ?.nextElementSibling?.textContent;
            // Get publication date
            const dateText = this.document.querySelector('.date.item')?.textContent;
            let publishedDate = '';
            if (dateText) {
                const dateMatch = dateText.match(/Published: ([^,]+)/);
                if (dateMatch) {
                    publishedDate = dateMatch[1];
                }
            }
            // Get DOI if available
            const doi = this.document.querySelector('meta[name="citation_doi"]')?.getAttribute('content') || '';
            // Get conference/journal name
            const venueElements = this.document.querySelectorAll('.forum-meta .item');
            let venue = '';
            for (let i = 0; i < venueElements.length; i++) {
                const el = venueElements[i];
                if (el.querySelector('.glyphicon-folder-open')) {
                    venue = el.textContent?.trim() || '';
                    break;
                }
            }
            // Get tags/keywords
            const keywordsElement = Array.from(this.document.querySelectorAll('.note-content-field'))
                .find(el => el.textContent?.includes('Keywords'));
            let tags = [];
            if (keywordsElement) {
                const keywordsValue = keywordsElement.nextElementSibling?.textContent;
                if (keywordsValue) {
                    tags = keywordsValue.split(',').map(tag => tag.trim());
                }
            }
            return {
                title: title || baseMetadata.title,
                authors: authors || baseMetadata.authors,
                description: abstract || baseMetadata.description,
                publishedDate: publishedDate || baseMetadata.publishedDate,
                doi: doi || baseMetadata.doi,
                journalName: venue || baseMetadata.journalName,
                tags: tags.length ? tags : baseMetadata.tags,
                url: this.url
            };
        }
        catch (error) {
            logger$1.error('Error during OpenReview-specific extraction', error);
            return baseMetadata;
        }
    }
}
/**
 * OpenReview integration with custom metadata extraction
 */
class OpenReviewIntegration extends BaseSourceIntegration {
    constructor() {
        super(...arguments);
        this.id = 'openreview';
        this.name = 'OpenReview';
        // URL patterns for papers
        this.urlPatterns = [
            /openreview\.net\/forum\?id=([a-zA-Z0-9]+)/,
            /openreview\.net\/pdf\?id=([a-zA-Z0-9]+)/
        ];
    }
    // Content script matches
    // readonly contentScriptMatches = [
    //   "*://*.openreview.net/*"
    // ];
    /**
     * Extract paper ID from URL
     */
    extractPaperId(url) {
        for (const pattern of this.urlPatterns) {
            const match = url.match(pattern);
            if (match) {
                return match[1]; // The capture group with the paper ID
            }
        }
        return null;
    }
    /**
     * Create a custom metadata extractor for OpenReview
     */
    createMetadataExtractor(document) {
        return new OpenReviewMetadataExtractor(document);
    }
    /**
     * Extract metadata from page
     * Override parent method to handle OpenReview-specific extraction
     */
    async extractMetadata(document, paperId) {
        logger$1.info(`Extracting metadata for OpenReview ID: ${paperId}`);
        // Extract metadata using our custom extractor
        const metadata = await super.extractMetadata(document, paperId);
        if (metadata) {
            // Add any OpenReview-specific metadata processing here
            logger$1.debug('Extracted metadata from OpenReview page');
            // Check if we're on a PDF page and adjust metadata accordingly
            if (document.location.href.includes('/pdf?id=')) {
                metadata.sourceType = 'pdf';
            }
        }
        return metadata;
    }
}
// Export a singleton instance that can be used by both background and content scripts
const openReviewIntegration = new OpenReviewIntegration();

// extension/source-integration/nature/index.ts
loguru.getLogger('nature-integration');
/**
 * Custom metadata extractor for Nature.com pages
 */
class NatureMetadataExtractor extends MetadataExtractor {
    /**
     * Override title extraction to use meta tag first
     */
    extractTitle() {
        const metaTitle = this.getMetaContent('meta[name="citation_title"]') ||
            this.getMetaContent('meta[property="og:title"]');
        return metaTitle || super.extractTitle();
    }
    /**
     * Override authors extraction to use meta tag first
     */
    extractAuthors() {
        const metaAuthors = this.getMetaContent('meta[name="citation_author"]');
        if (metaAuthors) {
            return metaAuthors;
        }
        // Fallback to HTML extraction
        const authorElements = this.document.querySelectorAll('.c-article-author-list__item');
        if (authorElements.length > 0) {
            return Array.from(authorElements)
                .map(el => el.textContent?.trim())
                .filter(Boolean)
                .join(', ');
        }
        return super.extractAuthors();
    }
    /**
     * Extract keywords/tags from document
     */
    extractTags() {
        const keywords = this.getMetaContent('meta[name="dc.subject"]');
        if (keywords) {
            return keywords.split(',').map(tag => tag.trim());
        }
        return [];
    }
    /**
     * Override description extraction to use meta tag first
     */
    extractDescription() {
        const metaDescription = this.getMetaContent('meta[name="description"]') ||
            this.getMetaContent('meta[property="og:description"]');
        return metaDescription || super.extractDescription();
    }
    /**
     * Override published date extraction to use meta tag
     */
    extractPublishedDate() {
        return this.getMetaContent('meta[name="citation_publication_date"]') || super.extractPublishedDate();
    }
    /**
     * Override DOI extraction to use meta tag
     */
    extractDoi() {
        return this.getMetaContent('meta[name="citation_doi"]') || super.extractDoi();
    }
}
/**
 * Nature.com integration with custom metadata extraction
 */
class NatureIntegration extends BaseSourceIntegration {
    constructor() {
        super(...arguments);
        this.id = 'nature';
        this.name = 'Nature';
        // URL pattern for Nature articles with capture group for ID
        this.urlPatterns = [
            /nature\.com\/articles\/([^?]+)/,
        ];
    }
    // Content script matches  
    // readonly contentScriptMatches = [
    //   "*://*.nature.com/articles/*"
    // ];
    /**
     * Extract paper ID from URL
     */
    extractPaperId(url) {
        const match = url.match(this.urlPatterns[0]);
        return match ? match[1] : null;
    }
    /**
     * Create a custom metadata extractor for Nature.com
     */
    createMetadataExtractor(document) {
        return new NatureMetadataExtractor(document);
    }
}
// Export a singleton instance 
const natureIntegration = new NatureIntegration();

// extension/source-integration/pnas/index.ts
class PnasIntegration extends BaseSourceIntegration {
    constructor() {
        super(...arguments);
        this.id = 'pnas';
        this.name = 'PNAS';
        this.urlPatterns = [
            /pnas\.org\/doi\/10\.1073\/pnas\.([0-9]+)/
        ];
    }
    // readonly contentScriptMatches = [
    //   "*://*.pnas.org/doi/*"
    // ];
    // upstream BaseSourceIntegration.extractPaperId should default to this behavior when able
    extractPaperId(url) {
        const match = url.match(this.urlPatterns[0]);
        return match ? match[1] : null;
    }
}
const pnasIntegration = new PnasIntegration();

// extension/source-integration/misc/index.ts
class MiscIntegration extends BaseSourceIntegration {
    constructor() {
        super(...arguments);
        this.id = 'url-misc';
        this.name = 'misc tracked url';
        this.urlPatterns = []; // set this empty to disable attaching the content injection icon thing
        // add URLs here to track
        this.contentScriptMatches = [
            "sciencedirect.com/science/article/",
            "philpapers.org/rec/",
            "proceedings.neurips.cc/paper_files/paper/",
            "journals.sagepub.com/doi/",
            "link.springer.com/article/",
            ".science.org/doi/",
            "journals.aps.org/prx/abstract/",
            "onlinelibrary.wiley.com/doi/",
            "cell.com/trends/cognitive-sciences/fulltext/",
            "researchgate.net/publication/",
            "psycnet.apa.org/record/",
            "biorxiv.org/content/",
            "osf.io/preprints/",
            "frontiersin.org/journals/",
            "jstor.org/",
            "proceedings.mlr.press/",
            "journals.plos.org/plosone/article",
            "ieeexplore.ieee.org/document/",
            "royalsocietypublishing.org/doi/",
            "papers.nips.cc/paper_files/paper/",
            "philarchive.org/archive/",
            "tandfonline.com/doi/",
            "iopscience.iop.org/article/",
            "academic.oup.com/brain/article/",
            "elifesciences.org/articles/",
            "escholarship.org/content/",
            "pmc.ncbi.nlm.nih.gov/articles/",
            "pubmed.ncbi.nlm.nih.gov/",
            "openaccess.thecvf.com/content/",
            "zenodo.org/records/",
            "journals.asm.org/doi/full/",
            "physoc.onlinelibrary.wiley.com/doi/full/",
            "storage.courtlistener.com/recap/",
            "bmj.com/content/",
            "ntsb.gov/investigations/pages",
            "ntsb.gov/investigations/AccidentReports",
            "aclanthology.org/",
            "journals.ametsoc.org/view/journals/",
            "substack.com/p/",
            "citeseerx.",
            "/doi/",
            "/pdf/",
        ];
    }
    canHandleUrl(url) {
        return this.contentScriptMatches.some(pattern => url.includes(pattern));
    }
}
const miscIntegration = new MiscIntegration();

// extension/source-integration/registry.ts
const sourceIntegrations = [
    arxivIntegration,
    openReviewIntegration,
    natureIntegration,
    pnasIntegration,
    miscIntegration,
];

// background.ts
const logger = loguru.getLogger('background');
// Global state
let githubToken = '';
let githubRepo = '';
let paperManager = null;
let sessionService = null;
let popupManager = null;
let sourceManager = null;
let iconManager = null;
// Initialize sources
function initializeSources() {
    sourceManager = new SourceIntegrationManager();
    // Register all sources from the central registry
    for (const integration of sourceIntegrations) {
        sourceManager.registerSource(integration);
    }
    logger.info('Source manager initialized with integrations:', sourceIntegrations.map(int => int.id).join(', '));
    return sourceManager;
}
// Initialize everything
async function initialize() {
    try {
        // Initialize sources first
        initializeSources();
        // Initialize icon manager
        iconManager = new IconManager();
        logger.info('Icon manager initialized');
        // Load GitHub credentials
        const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
        githubToken = items.githubToken || '';
        githubRepo = items.githubRepo || '';
        logger.info('Credentials loaded', { hasToken: !!githubToken, hasRepo: !!githubRepo });
        // Initialize paper manager if we have credentials
        if (githubToken && githubRepo) {
            const githubClient = new d(githubToken, githubRepo);
            // Pass the source manager to the paper manager
            paperManager = new PaperManager(githubClient, sourceManager);
            logger.info('Paper manager initialized');
            // Initialize session service with paper manager
            sessionService = new SessionService(paperManager);
        }
        else {
            // Initialize session service without paper manager
            sessionService = new SessionService(null);
        }
        logger.info('Session service initialized');
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
        if (message.type === 'paperMetadata' && message.metadata && sender.tab?.id) {
            // Store metadata received from content script and update icon
            handlePaperMetadata(message.metadata, sender.tab.id);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'paperDetected' && sender.tab?.id) {
            // Paper detected but not yet stored - show detected state
            handlePaperDetected(sender.tab.id, message.sourceId, message.paperId);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'noPaperDetected' && sender.tab?.id) {
            // No paper detected - reset to default icon
            handleNoPaperDetected(sender.tab.id);
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'getCurrentPaper') {
            const session = sessionService?.getCurrentSession();
            const paperMetadata = session
                ? sessionService?.getPaperMetadata(session.sourceId, session.paperId)
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
            handleSessionHeartbeat();
            sendResponse({ success: true });
            return true;
        }
        if (message.type === 'endSession') {
            handleEndSession(message.reason || 'user_action');
            sendResponse({ success: true });
            return true;
        }
        // New handler for manual paper logging from popup
        if (message.type === 'manualPaperLog' && message.metadata && sender.tab?.id) {
            handleManualPaperLog(message.metadata, sender.tab.id)
                .then(() => sendResponse({ success: true }))
                .catch(error => {
                logger.error('Error handling manual paper log', error);
                sendResponse({
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            });
            return true; // Will respond asynchronously
        }
        // Other message handlers are managed by PopupManager
        return false; // Not handled
    });
}
// Handle paper detected (before storage)
async function handlePaperDetected(tabId, sourceId, paperId) {
    if (!iconManager)
        return;
    try {
        await iconManager.setPaperDetected(tabId);
        logger.debug(`Set detected icon for ${sourceId}:${paperId} in tab ${tabId}`);
    }
    catch (error) {
        logger.error('Error setting detected icon', error);
    }
}
// Handle no paper detected
async function handleNoPaperDetected(tabId) {
    if (!iconManager)
        return;
    try {
        await iconManager.resetIcon(tabId);
        logger.debug(`Reset icon for tab ${tabId}`);
    }
    catch (error) {
        logger.error('Error resetting icon', error);
    }
}
// Handle paper metadata from content script
async function handlePaperMetadata(metadata, tabId) {
    logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
    try {
        // Store metadata in session service
        if (sessionService) {
            sessionService.storePaperMetadata(metadata);
        }
        // Store in GitHub if we have a paper manager
        if (paperManager) {
            await paperManager.getOrCreatePaper(metadata);
            logger.debug('Paper metadata stored in GitHub');
            // Update icon to tracked state
            if (iconManager) {
                await iconManager.setPaperTracked(tabId);
                logger.debug(`Set tracked icon for ${metadata.sourceId}:${metadata.paperId} in tab ${tabId}`);
            }
        }
        else {
            // No paper manager - just show detected state
            if (iconManager) {
                await iconManager.setPaperDetected(tabId);
            }
        }
    }
    catch (error) {
        logger.error('Error handling paper metadata', error);
        // On error, show detected state instead of tracked
        if (iconManager) {
            await iconManager.setPaperDetected(tabId);
        }
    }
}
// Handle rating update
async function handleUpdateRating(rating, sendResponse) {
    if (!paperManager || !sessionService) {
        sendResponse({ success: false, error: 'Services not initialized' });
        return;
    }
    const session = sessionService.getCurrentSession();
    if (!session) {
        sendResponse({ success: false, error: 'No current session' });
        return;
    }
    const metadata = sessionService.getPaperMetadata();
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
    if (!sessionService) {
        logger.error('Session service not initialized');
        return;
    }
    // Get metadata if available
    const existingMetadata = sessionService.getPaperMetadata(sourceId, paperId);
    // Start the session
    sessionService.startSession(sourceId, paperId, existingMetadata);
    logger.info(`Started session for ${sourceId}:${paperId}`);
}
// Handle session heartbeat
function handleSessionHeartbeat() {
    if (!sessionService) {
        logger.error('Session service not initialized');
        return;
    }
    sessionService.recordHeartbeat();
}
// Handle session end request
function handleEndSession(reason) {
    if (!sessionService) {
        logger.error('Session service not initialized');
        return;
    }
    const session = sessionService.getCurrentSession();
    if (session) {
        logger.info(`Ending session: ${reason}`);
        sessionService.endSession();
    }
}
async function handleManualPaperLog(metadata, tabId) {
    logger.info(`Received manual paper log: ${metadata.sourceId}:${metadata.paperId}`);
    try {
        // Store metadata in session service
        if (sessionService) {
            sessionService.storePaperMetadata(metadata);
        }
        // Store in GitHub if we have a paper manager
        if (paperManager) {
            await paperManager.getOrCreatePaper(metadata);
            logger.debug('Manually logged paper stored in GitHub');
            // Update icon to tracked state
            if (iconManager) {
                await iconManager.setPaperTracked(tabId);
                logger.debug(`Set tracked icon for manually logged paper in tab ${tabId}`);
            }
        }
    }
    catch (error) {
        logger.error('Error handling manual paper log', error);
        throw error;
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
            const githubClient = new d(githubToken, githubRepo);
            // Pass the source manager to the paper manager
            paperManager = new PaperManager(githubClient, sourceManager);
            logger.info('Paper manager reinitialized');
            // Reinitialize session service with new paper manager
            sessionService = new SessionService(paperManager);
            logger.info('Session service reinitialized');
        }
    }
});
// Initialize debug objects in service worker scope
function initializeDebugObjects() {
    // @ts-ignore
    self.__DEBUG__ = {
        get paperManager() { return paperManager; },
        get sessionService() { return sessionService; },
        get popupManager() { return popupManager; },
        get sourceManager() { return sourceManager; },
        get iconManager() { return iconManager; },
        getGithubClient: () => paperManager ? paperManager.getClient() : null,
        getCurrentPaper: () => {
            const session = sessionService?.getCurrentSession();
            return session ? sessionService?.getPaperMetadata(session.sourceId, session.paperId) : null;
        },
        getSessionStats: () => sessionService?.getSessionStats(),
        getSources: () => sourceManager?.getAllSources(),
        forceEndSession: () => sessionService?.endSession(),
        setIconState: (tabId, state) => iconManager?.setIconState(tabId, state)
    };
    logger.info('Debug objects registered');
}
// Initialize extension
initialize();
//# sourceMappingURL=background.bundle.js.map
