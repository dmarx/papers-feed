import { l as loguru } from './assets/logger-BXFtlJ3r.js';
import { g as getConfigurationInMs, l as loadSessionConfig } from './assets/session-CR7DXVu2.js';
import { a as arxivIntegration } from './assets/index-q428Duvn.js';

var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:true}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

function isInteractionLog(data) {
  const log = data;
  return typeof log === "object" && log !== null && typeof log.sourceId === "string" && typeof log.paperId === "string" && Array.isArray(log.interactions);
}

const logger$4 = loguru.getLogger("paper-manager");
class PaperManager {
  constructor(client) {
    this.client = client;
    logger$4.debug("Paper manager initialized");
  }
  /**
   * Get paper by source and ID
   */
  async getPaper(sourceId, paperId) {
    const objectId = `paper:${sourceId}:${paperId}`;
    try {
      const obj = await this.client.getObject(objectId);
      return obj.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
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
      logger$4.debug(`Retrieved existing paper: ${sourceId}:${paperId}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        const defaultPaperData = {
          ...paperData,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          rating: paperData.rating || "novote"
        };
        await this.client.createObject(objectId, defaultPaperData);
        logger$4.debug(`Created new paper: ${sourceId}:${paperId}`);
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
      throw new Error("Invalid interaction log format");
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        const newLog = {
          sourceId,
          paperId,
          interactions: []
        };
        await this.client.createObject(objectId, newLog);
        logger$4.debug(`Created new interaction log: ${sourceId}:${paperId}`);
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
    if (paperData) {
      await this.getOrCreatePaper({
        sourceId,
        paperId,
        url: paperData.url || `${sourceId}:${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || "",
        abstract: paperData.abstract || "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rating: "novote",
        publishedDate: paperData.publishedDate || "",
        tags: paperData.tags || []
      });
    }
    await this.addInteraction(sourceId, paperId, {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
    });
    logger$4.info(`Logged reading session for ${sourceId}:${paperId}`, { duration: session.duration_seconds });
  }
  /**
   * Log an annotation
   */
  async logAnnotation(sourceId, paperId, key, value, paperData) {
    if (paperData) {
      await this.getOrCreatePaper({
        sourceId,
        paperId,
        url: paperData.url || `${sourceId}:${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || "",
        abstract: paperData.abstract || "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rating: "novote",
        publishedDate: paperData.publishedDate || "",
        tags: paperData.tags || []
      });
    }
    await this.addInteraction(sourceId, paperId, {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    });
    logger$4.info(`Logged annotation for ${sourceId}:${paperId}`, { key });
  }
  /**
   * Update paper rating
   */
  async updateRating(sourceId, paperId, rating, paperData) {
    const paper = await this.getOrCreatePaper({
      sourceId,
      paperId,
      url: paperData?.url || `${sourceId}:${paperId}`,
      title: paperData?.title || paperId,
      authors: paperData?.authors || "",
      abstract: paperData?.abstract || "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rating: "novote",
      publishedDate: paperData?.publishedDate || "",
      tags: paperData?.tags || []
    });
    await this.client.updateObject(`paper:${sourceId}:${paperId}`, {
      ...paper,
      rating
    });
    await this.addInteraction(sourceId, paperId, {
      type: "rating",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { rating }
    });
    logger$4.info(`Updated rating for ${sourceId}:${paperId} to ${rating}`);
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
          if (options.startTime && time < options.startTime) return false;
          if (options.endTime && time > options.endTime) return false;
          return true;
        });
      }
      return interactions;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        return [];
      }
      throw error;
    }
  }
  /**
   * Calculate total reading time for a paper
   */
  async getPaperReadingTime(sourceId, paperId) {
    const interactions = await this.getInteractions(sourceId, paperId, { type: "reading_session" });
    return interactions.reduce((total, i) => {
      const data = i.data;
      if (typeof data === "object" && data !== null && "duration_seconds" in data) {
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

const logger$3 = loguru.getLogger("session-tracker");
class SessionTracker {
  constructor(config) {
    this.config = config;
    this.activeSession = null;
    this.updateInterval = null;
    this.currentPaperId = null;
    this.currentSourceId = null;
    logger$3.debug("Session tracker initialized", config);
  }
  /**
   * Start tracking a new session
   */
  startSession(sourceId, paperId) {
    this.endSession();
    this.activeSession = new ReadingSession(sourceId, paperId, this.config);
    this.currentSourceId = sourceId;
    this.currentPaperId = paperId;
    this.startUpdateInterval();
    logger$3.info(
      `Started tracking session for ${sourceId}:${paperId}`,
      this.activeSession.getMetadata()
    );
  }
  /**
   * End the current session and get the data
   */
  endSession() {
    if (!this.activeSession) {
      return null;
    }
    this.stopUpdateInterval();
    const sessionData = this.activeSession.finalize();
    logger$3.info(
      `Ended session for ${this.currentSourceId}:${this.currentPaperId}`,
      sessionData ? {
        duration: sessionData.duration_seconds,
        idle: sessionData.idle_seconds
      } : "Session too short"
    );
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
    this.updateInterval = window.setInterval(() => {
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
    this.startTime = /* @__PURE__ */ new Date();
    this.lastActiveTime = /* @__PURE__ */ new Date();
  }
  /**
   * Update the session's active and idle time
   */
  update() {
    if (!this.isTracking || this.finalizedData) {
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
    if (timeSinceLastActive < this.config.idleThreshold) {
      this.activeTime += timeSinceLastActive;
    } else {
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
    this.update();
    this.isTracking = false;
    this.endTime = /* @__PURE__ */ new Date();
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
    if (this.activeTime >= this.config.minSessionDuration || this.config.logPartialSessions) {
      this.finalizedData = {
        session_id: this.sessionId,
        duration_seconds: Math.round(this.activeTime / 1e3),
        idle_seconds: Math.round(this.idleTime / 1e3),
        start_time: this.startTime.toISOString(),
        end_time: this.endTime.toISOString(),
        total_elapsed_seconds: Math.round(totalElapsed / 1e3)
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
      activeSeconds: Math.round(this.activeTime / 1e3),
      idleSeconds: Math.round(this.idleTime / 1e3),
      isTracking: this.isTracking
    };
  }
}

const logger$2 = loguru.getLogger("popup-manager");
class PopupManager {
  /**
   * Create a new popup manager
   */
  constructor(sourceManagerProvider, paperManagerProvider) {
    this.sourceManagerProvider = sourceManagerProvider;
    this.paperManagerProvider = paperManagerProvider;
    this.setupMessageListeners();
    logger$2.debug("Popup manager initialized");
  }
  /**
   * Set up message listeners for popup-related messages
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "popupAction") {
        this.handlePopupAction(
          message.sourceId,
          message.paperId,
          message.action,
          message.data
        ).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          logger$2.error("Error handling popup action", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        });
        return true;
      }
      if (message.type === "showAnnotationPopup" && sender.tab?.id) {
        this.handleShowAnnotationPopup(
          sender.tab.id,
          message.sourceId,
          message.paperId,
          message.position
        ).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          logger$2.error("Error showing popup", error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : "Unknown error"
          });
        });
        return true;
      }
      return false;
    });
  }
  /**
   * Handle a request to show an annotation popup
   */
  async handleShowAnnotationPopup(tabId, sourceId, paperId, position) {
    logger$2.debug(`Showing annotation popup for ${sourceId}:${paperId}`);
    const sourceManager = this.sourceManagerProvider();
    const paperManager = this.paperManagerProvider();
    if (!sourceManager) {
      throw new Error("Source manager not initialized");
    }
    if (!paperManager) {
      throw new Error("Paper manager not initialized");
    }
    try {
      const paper = await paperManager.getPaper(sourceId, paperId);
      const html = this.createPopupHtml(paper || {
        sourceId,
        paperId,
        title: paperId,
        authors: "",
        abstract: "",
        url: "",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        publishedDate: "",
        tags: [],
        rating: "novote"
      });
      const handlers = this.getStandardPopupHandlers();
      const message = {
        type: "showPopup",
        sourceId,
        paperId,
        html,
        handlers,
        position
      };
      await chrome.tabs.sendMessage(tabId, message);
      logger$2.debug(`Sent popup to content script for ${sourceId}:${paperId}`);
    } catch (error) {
      logger$2.error(`Error showing popup for ${sourceId}:${paperId}`, error);
      throw error;
    }
  }
  /**
   * Handle popup actions (ratings, notes, etc.)
   */
  async handlePopupAction(sourceId, paperId, action, data) {
    const paperManager = this.paperManagerProvider();
    if (!paperManager) {
      throw new Error("Paper manager not initialized");
    }
    logger$2.debug(`Handling popup action: ${action}`, { sourceId, paperId });
    try {
      if (action === "rate") {
        await paperManager.updateRating(sourceId, paperId, data.value);
        logger$2.info(`Updated rating for ${sourceId}:${paperId} to ${data.value}`);
      } else if (action === "saveNotes") {
        if (data.value) {
          await paperManager.logAnnotation(sourceId, paperId, "notes", data.value);
          logger$2.info(`Saved notes for ${sourceId}:${paperId}`);
        }
      }
    } catch (error) {
      logger$2.error(`Error handling action ${action} for ${sourceId}:${paperId}`, error);
      throw error;
    }
  }
  /**
   * Create HTML for paper popup
   */
  createPopupHtml(paper) {
    return `
      <div class="paper-popup-header">${paper.title || paper.paperId}</div>
      <div class="paper-popup-meta">${paper.authors || ""}</div>
      
      <div class="paper-popup-buttons">
        <button class="vote-button" data-vote="thumbsup" id="btn-thumbsup" ${paper.rating === "thumbsup" ? 'class="active"' : ""}>👍 Interesting</button>
        <button class="vote-button" data-vote="thumbsdown" id="btn-thumbsdown" ${paper.rating === "thumbsdown" ? 'class="active"' : ""}>👎 Not Relevant</button>
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
      { selector: "#btn-thumbsup", event: "click", action: "rate" },
      { selector: "#btn-thumbsdown", event: "click", action: "rate" },
      { selector: "#btn-save", event: "click", action: "saveNotes" }
    ];
  }
}

const logger$1 = loguru.getLogger("source-manager");
class SourceIntegrationManager {
  constructor() {
    this.sources = /* @__PURE__ */ new Map();
    logger$1.info("Source integration manager initialized");
  }
  /**
   * Register a source integration
   */
  registerSource(source) {
    if (this.sources.has(source.id)) {
      logger$1.warning(`Source with ID '${source.id}' already registered, overwriting`);
    }
    this.sources.set(source.id, source);
    logger$1.info(`Registered source: ${source.name} (${source.id})`);
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
        logger$1.debug(`Found source for URL '${url}': ${source.id}`);
        return source;
      }
    }
    logger$1.debug(`No source found for URL: ${url}`);
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
          logger$1.debug(`Extracted paper ID '${paperId}' from URL using ${source.id}`);
          return { sourceId: source.id, paperId };
        }
      }
    }
    logger$1.debug(`Could not extract paper ID from URL: ${url}`);
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

const logger = loguru.getLogger("background");
let githubToken = "";
let githubRepo = "";
let currentPaperData = null;
let sessionConfig = null;
let paperManager = null;
let sessionTracker = null;
let popupManager = null;
let sourceManager = null;
function initializeSources() {
  sourceManager = new SourceIntegrationManager();
  sourceManager.registerSource(arxivIntegration);
  logger.info("Source manager initialized");
  return sourceManager;
}
async function initialize() {
  try {
    initializeSources();
    const items = await chrome.storage.sync.get(["githubToken", "githubRepo"]);
    githubToken = items.githubToken || "";
    githubRepo = items.githubRepo || "";
    logger.info("Credentials loaded", { hasToken: !!githubToken, hasRepo: !!githubRepo });
    if (githubToken && githubRepo) {
      const githubClient = new f(githubToken, githubRepo);
      paperManager = new PaperManager(githubClient);
      logger.info("Paper manager initialized");
    }
    const rawConfig = await loadSessionConfig();
    sessionConfig = getConfigurationInMs(rawConfig);
    logger.info("Session configuration loaded", sessionConfig);
    sessionTracker = new SessionTracker(sessionConfig);
    logger.info("Session tracker initialized");
    popupManager = new PopupManager(
      () => sourceManager,
      () => paperManager
    );
    logger.info("Popup manager initialized");
    setupMessageListeners();
    initializeDebugObjects();
  } catch (error) {
    logger.error("Initialization error", error);
  }
}
function setupMessageListeners() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "contentScriptReady" && sender.tab?.id) {
      logger.debug("Content script ready:", sender.tab.url);
      sendResponse({ success: true });
      return true;
    }
    if (message.type === "paperMetadata" && message.metadata) {
      handlePaperMetadata(message.metadata, sender.tab?.id);
      sendResponse({ success: true });
      return true;
    }
    if (message.type === "getCurrentPaper") {
      logger.debug("Popup requested current paper", currentPaperData);
      sendResponse(currentPaperData);
      return true;
    }
    if (message.type === "updateRating") {
      logger.debug("Rating update requested:", message.rating);
      handleUpdateRating(message.rating, sendResponse);
      return true;
    }
    if (message.type === "showAnnotationPopup") {
      return false;
    }
    if (message.type === "popupAction") {
      return false;
    }
    return false;
  });
}
async function handlePaperMetadata(metadata, tabId) {
  logger.info(`Received metadata for ${metadata.sourceId}:${metadata.paperId}`);
  try {
    currentPaperData = metadata;
    if (paperManager) {
      await paperManager.getOrCreatePaper(metadata);
      logger.debug("Paper metadata stored in GitHub");
    }
    if (sessionTracker) {
      sessionTracker.startSession(metadata.sourceId, metadata.paperId);
      logger.debug("Started tracking session");
    }
  } catch (error) {
    logger.error("Error handling paper metadata", error);
  }
}
async function handleUpdateRating(rating, sendResponse) {
  if (!paperManager) {
    sendResponse({ success: false, error: "Paper manager not initialized" });
    return;
  }
  if (!currentPaperData) {
    sendResponse({ success: false, error: "No current paper" });
    return;
  }
  try {
    await paperManager.updateRating(
      currentPaperData.sourceId,
      currentPaperData.paperId,
      rating
    );
    currentPaperData.rating = rating;
    sendResponse({ success: true });
  } catch (error) {
    logger.error("Error updating rating:", error);
    sendResponse({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
  }
}
chrome.storage.onChanged.addListener(async (changes) => {
  logger.debug("Storage changes detected", Object.keys(changes));
  if (changes.githubToken) {
    githubToken = changes.githubToken.newValue;
  }
  if (changes.githubRepo) {
    githubRepo = changes.githubRepo.newValue;
  }
  if (changes.sessionConfig) {
    sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
    logger.info("Session configuration updated", sessionConfig);
    if (sessionTracker && sessionConfig) {
      sessionTracker = new SessionTracker(sessionConfig);
    }
  }
  if (changes.githubToken || changes.githubRepo) {
    if (githubToken && githubRepo) {
      const githubClient = new f(githubToken, githubRepo);
      paperManager = new PaperManager(githubClient);
      logger.info("Paper manager reinitialized");
    }
  }
});
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tab = await chrome.tabs.get(activeInfo.tabId);
  handleTabChange(tab);
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete") {
    handleTabChange(tab);
  }
});
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    endCurrentSession();
  }
});
async function handleTabChange(tab) {
  if (!tab.url || !sessionTracker || !sourceManager) {
    return;
  }
  const source = sourceManager.getSourceForUrl(tab.url);
  if (!source) {
    logger.debug("No supported paper source detected, ending session");
    await endCurrentSession();
    return;
  }
  const extractedInfo = sourceManager.extractPaperId(tab.url);
  if (!extractedInfo) {
    logger.debug("No paper ID found in URL, ending session");
    await endCurrentSession();
    return;
  }
  const currentPaper = sessionTracker.getCurrentPaper();
  if (currentPaper.sourceId && currentPaper.paperId && (currentPaper.sourceId !== extractedInfo.sourceId || currentPaper.paperId !== extractedInfo.paperId)) {
    logger.debug("Different paper detected, ending existing session");
    await endCurrentSession();
  }
}
async function endCurrentSession() {
  if (!sessionTracker) {
    return;
  }
  const currentPaper = sessionTracker.getCurrentPaper();
  if (currentPaper.sourceId && currentPaper.paperId && paperManager) {
    logger.info("Ending session for paper", {
      source: currentPaper.sourceId,
      paperId: currentPaper.paperId
    });
    const sessionData = sessionTracker.endSession();
    if (sessionData && currentPaperData) {
      logger.debug("Creating reading event", sessionData);
      await paperManager.logReadingSession(
        currentPaper.sourceId,
        currentPaper.paperId,
        sessionData,
        currentPaperData
      );
    }
    currentPaperData = null;
  }
}
function initializeDebugObjects() {
  globalThis.__DEBUG__ = {
    get paperManager() {
      return paperManager;
    },
    get sessionTracker() {
      return sessionTracker;
    },
    get popupManager() {
      return popupManager;
    },
    get sourceManager() {
      return sourceManager;
    },
    getGithubClient: () => paperManager ? paperManager.getClient() : null,
    getCurrentPaper: () => currentPaperData,
    getSessionConfig: () => sessionConfig,
    getSessionMetadata: () => sessionTracker?.getCurrentSessionMetadata(),
    getSources: () => sourceManager?.getAllSources()
  };
  logger.info("Debug objects registered");
}
initialize();
//# sourceMappingURL=background.bundle.js.map
