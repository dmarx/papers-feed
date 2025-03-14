import { l as loguru } from './assets/logger-CPjPFdcb.js';

var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:true}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

const isInteractionLog = (data) => {
  const log = data;
  return typeof log === "object" && log !== null && typeof log.paper_id === "string" && Array.isArray(log.interactions);
};

const logger$7 = loguru.getLogger("paper-manager");
class PaperManager {
  constructor(client) {
    this.client = client;
  }
  async getOrCreatePaper(paperData) {
    const objectId = `paper:${paperData.sourceId}:${paperData.paperId}`;
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      logger$7.debug("Retrieved existing paper", {
        source: paperData.sourceId,
        paperId: paperData.paperId
      });
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        logger$7.info("Creating new paper record", {
          source: paperData.sourceId,
          paperId: paperData.paperId
        });
        await this.client.createObject(objectId, paperData);
        return paperData;
      }
      throw error;
    }
  }
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
          paper_id: `${sourceId}:${paperId}`,
          interactions: []
        };
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      throw error;
    }
  }
  async logReadingSession(sourceId, paperId, session, paperData) {
    if (paperData) {
      const fullPaperData = {
        sourceId,
        paperId,
        url: paperData.url || `unknown://${sourceId}/${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || "",
        abstract: paperData.abstract || "",
        timestamp: paperData.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        publishedDate: paperData.publishedDate || "",
        tags: paperData.tags || [],
        rating: paperData.rating || "novote",
        ...paperData
      };
      await this.getOrCreatePaper(fullPaperData);
    }
    await this.addInteraction(sourceId, paperId, {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
    });
  }
  async logAnnotation(sourceId, paperId, key, value, paperData) {
    if (paperData) {
      const fullPaperData = {
        sourceId,
        paperId,
        url: paperData.url || `unknown://${sourceId}/${paperId}`,
        title: paperData.title || paperId,
        authors: paperData.authors || "",
        abstract: paperData.abstract || "",
        timestamp: paperData.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        publishedDate: paperData.publishedDate || "",
        tags: paperData.tags || [],
        rating: paperData.rating || "novote",
        ...paperData
      };
      await this.getOrCreatePaper(fullPaperData);
    }
    await this.addInteraction(sourceId, paperId, {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    });
  }
  async updateRating(sourceId, paperId, rating, paperData) {
    let paper;
    try {
      const obj = await this.client.getObject(`paper:${sourceId}:${paperId}`);
      paper = obj.data;
    } catch (error) {
      if (paperData) {
        const fullPaperData = {
          sourceId,
          paperId,
          url: paperData.url || `unknown://${sourceId}/${paperId}`,
          title: paperData.title || paperId,
          authors: paperData.authors || "",
          abstract: paperData.abstract || "",
          timestamp: paperData.timestamp || (/* @__PURE__ */ new Date()).toISOString(),
          publishedDate: paperData.publishedDate || "",
          tags: paperData.tags || [],
          rating,
          // Use provided rating
          ...paperData
        };
        await this.client.createObject(`paper:${sourceId}:${paperId}`, fullPaperData);
        paper = fullPaperData;
      } else {
        throw new Error(`Paper ${sourceId}:${paperId} not found and no data provided to create it`);
      }
    }
    await this.client.updateObject(`paper:${sourceId}:${paperId}`, {
      ...paper,
      rating
    });
    await this.addInteraction(sourceId, paperId, {
      type: "rating",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { rating }
    });
  }
  async addInteraction(sourceId, paperId, interaction) {
    const log = await this.getOrCreateInteractionLog(sourceId, paperId);
    log.interactions.push(interaction);
    await this.client.updateObject(`interactions:${sourceId}:${paperId}`, log);
  }
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
  async getPaperHistory(sourceId, paperId) {
    const objectId = `paper:${sourceId}:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
  async listAllPapers() {
    try {
      const allObjects = await this.client.listAll();
      const papers = [];
      for (const key in allObjects) {
        if (key.startsWith("paper:")) {
          papers.push(allObjects[key].data);
        }
      }
      return papers;
    } catch (error) {
      logger$7.error("Error listing papers", error);
      return [];
    }
  }
}

const logger$6 = loguru.getLogger("session-config");
const DEFAULT_CONFIG = {
  idleThresholdMinutes: 5,
  minSessionDurationSeconds: 30,
  requireContinuousActivity: true,
  // If true, resets timer on idle
  logPartialSessions: false,
  // If true, logs sessions even if under minimum duration
  activityUpdateIntervalSeconds: 1
  // How often to update active time
};
async function loadSessionConfig() {
  try {
    const items = await chrome.storage.sync.get("sessionConfig");
    const config = { ...DEFAULT_CONFIG, ...items.sessionConfig };
    logger$6.debug("Loaded session config", config);
    return config;
  } catch (error) {
    logger$6.error("Error loading session config", error);
    return DEFAULT_CONFIG;
  }
}
function getConfigurationInMs(config) {
  return {
    idleThreshold: config.idleThresholdMinutes * 60 * 1e3,
    minSessionDuration: config.minSessionDurationSeconds * 1e3,
    activityUpdateInterval: config.activityUpdateIntervalSeconds * 1e3,
    requireContinuousActivity: config.requireContinuousActivity,
    logPartialSessions: config.logPartialSessions
  };
}

const logger$5 = loguru.getLogger("integration-manager");
class SourceIntegrationManager {
  constructor() {
    this.integrations = /* @__PURE__ */ new Map();
    logger$5.info("Source integration manager initialized");
  }
  registerIntegration(integration) {
    if (this.integrations.has(integration.id)) {
      logger$5.warning(`Integration with ID '${integration.id}' already registered, overwriting`);
    }
    this.integrations.set(integration.id, integration);
    logger$5.info(`Registered integration: ${integration.name} (${integration.id})`);
  }
  getIntegrationForUrl(url) {
    for (const integration of this.integrations.values()) {
      if (integration.canHandleUrl(url)) {
        logger$5.debug(`Found integration for URL '${url}': ${integration.id}`);
        return integration;
      }
    }
    logger$5.debug(`No integration found for URL: ${url}`);
    return null;
  }
  getAllIntegrations() {
    return Array.from(this.integrations.values());
  }
  getAllContentScriptMatches() {
    const patterns = [];
    for (const integration of this.integrations.values()) {
      patterns.push(...integration.getContentScriptMatches());
    }
    return patterns;
  }
}

const logger$4 = loguru.getLogger("metadata-transformer");
function transformMetadata(sourceId, paperId, apiData, mapping, sourceUrl) {
  const getField = (data, fieldPath) => {
    if (Array.isArray(fieldPath)) {
      for (const path of fieldPath) {
        const value2 = getField(data, path);
        if (value2 !== void 0 && value2 !== null && value2 !== "") {
          return value2;
        }
      }
      return "";
    }
    const parts = fieldPath.split(".");
    let value = data;
    for (const part of parts) {
      if (value === void 0 || value === null) return "";
      value = value[part];
    }
    return value !== void 0 && value !== null ? value : "";
  };
  const title = getField(apiData, mapping.titleField);
  const authors = mapping.extractAuthors ? mapping.extractAuthors(apiData) : Array.isArray(getField(apiData, mapping.authorsField)) ? getField(apiData, mapping.authorsField).join(", ") : getField(apiData, mapping.authorsField);
  const abstract = getField(apiData, mapping.abstractField);
  const publishedDate = mapping.extractDate ? mapping.extractDate(apiData) : getField(apiData, mapping.dateField);
  const tags = mapping.extractTags ? mapping.extractTags(apiData) : Array.isArray(getField(apiData, mapping.tagsField)) ? getField(apiData, mapping.tagsField) : [];
  const metadata = {
    sourceId,
    paperId,
    url: sourceUrl,
    title,
    authors,
    abstract,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    rating: "novote",
    publishedDate,
    tags
  };
  logger$4.debug("Transformed metadata", { sourceId, paperId });
  return metadata;
}

const logger$3 = loguru.getLogger("arxiv-integration");
class ArXivIntegration {
  constructor() {
    this.id = "arxiv";
    this.name = "arXiv.org";
    // URL patterns for papers
    this.URL_PATTERNS = [
      /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
      /arxiv\.org\/\w+\/([0-9.]+)/
    ];
    // Metadata mapping for ArXiv
    this.METADATA_MAPPING = {
      titleField: "title",
      authorsField: "authors",
      abstractField: "summary",
      dateField: "published_date",
      tagsField: "arxiv_tags",
      // Custom author extraction (since authors is an array)
      extractAuthors: (data) => {
        if (Array.isArray(data.authors)) {
          return data.authors.join(", ");
        }
        return data.authors || "";
      }
    };
  }
  /**
   * Check if this integration can handle the given URL
   */
  canHandleUrl(url) {
    return this.URL_PATTERNS.some((pattern) => pattern.test(url));
  }
  /**
   * Extract paper ID from URL
   */
  extractPaperId(url) {
    for (const pattern of this.URL_PATTERNS) {
      const match = url.match(pattern);
      if (match) {
        return match[2] || match[1];
      }
    }
    return null;
  }
  /**
   * Get patterns for the content script to detect links
   */
  getLinkPatterns() {
    return this.URL_PATTERNS.map((pattern) => ({
      sourceId: this.id,
      pattern: pattern.toString().slice(1, -1),
      // Convert to string without slashes
      extractorCode: this.extractPaperId.toString()
    }));
  }
  /**
   * Fetch paper metadata from ArXiv API
   */
  async fetchPaperMetadata(arxivId) {
    logger$3.info(`Fetching metadata for arXiv ID: ${arxivId}`);
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
      logger$3.debug(`API URL: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status}`);
      }
      const xmlText = await response.text();
      logger$3.debug("Delegating XML parsing to content script");
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        throw new Error("No active tab found to parse XML");
      }
      const parsedData = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            type: "parseArXivXML",
            xmlText
          },
          (response2) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Error parsing XML: ${chrome.runtime.lastError.message}`));
              return;
            }
            if (response2.error) {
              reject(new Error(`Error in content script: ${response2.error}`));
              return;
            }
            resolve(response2.data);
          }
        );
      });
      if (!parsedData) {
        logger$3.error("Failed to parse API response");
        return null;
      }
      const paperData = transformMetadata(
        this.id,
        arxivId,
        parsedData,
        this.METADATA_MAPPING,
        `https://arxiv.org/abs/${arxivId}`
      );
      logger$3.debug("Paper metadata processed", paperData);
      return paperData;
    } catch (error) {
      logger$3.error("Error processing arXiv metadata", error);
      return null;
    }
  }
  /**
   * Get domain patterns this integration should be activated on
   */
  getContentScriptMatches() {
    return ["*://*.arxiv.org/*"];
  }
}

const logger$2 = loguru.getLogger("session-tracker");
class SessionTracker {
  constructor(config) {
    this.config = config;
    this.activeSession = null;
    this.updateInterval = null;
    this.currentPaperId = null;
    this.currentSourceId = null;
    logger$2.debug("Session tracker initialized", config);
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
    logger$2.info(
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
    logger$2.info(
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

const logger$1 = loguru.getLogger("popup-manager");
class PopupManager {
  /**
   * Create a new popup manager
   * 
   * @param integrationProvider Function that returns available integrations
   * @param paperManagerProvider Function that returns the current paper manager
   */
  constructor(integrationProvider, paperManagerProvider) {
    this.integrationProvider = integrationProvider;
    this.paperManagerProvider = paperManagerProvider;
    this.setupMessageListeners();
    logger$1.debug("Popup manager initialized");
  }
  /**
   * Set up message listeners for popup-related messages
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === "showAnnotationPopup" && sender.tab?.id) {
        this.handleShowAnnotationPopup(
          sender.tab.id,
          message.sourceId,
          message.paperId,
          message.position
        ).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          logger$1.error("Error showing popup", error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
        return true;
      }
      if (message.type === "popupAction") {
        this.handlePopupAction(
          message.sourceId,
          message.paperId,
          message.action,
          message.data
        ).then(() => {
          sendResponse({ success: true });
        }).catch((error) => {
          logger$1.error("Error handling popup action", error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
        return true;
      }
      return false;
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
  async handleShowAnnotationPopup(tabId, sourceId, paperId, position) {
    logger$1.debug(`Showing annotation popup for ${sourceId}:${paperId}`);
    const integration = this.integrationProvider().find((i) => i.id === sourceId);
    if (!integration) {
      throw new Error(`Integration not found: ${sourceId}`);
    }
    const paperData = await integration.fetchPaperMetadata(paperId);
    if (!paperData) {
      throw new Error(`Failed to fetch metadata for ${sourceId}:${paperId}`);
    }
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
  async handlePopupAction(sourceId, paperId, action, data) {
    const paperManager = this.paperManagerProvider();
    if (!paperManager) {
      throw new Error("Paper manager not initialized");
    }
    logger$1.debug(`Handling popup action: ${action}`, { sourceId, paperId });
    if (action === "rate") {
      await paperManager.updateRating(sourceId, paperId, data.value);
      logger$1.info(`Updated rating for ${sourceId}:${paperId} to ${data.value}`);
    } else if (action === "saveNotes") {
      if (data.value) {
        await paperManager.logAnnotation(sourceId, paperId, "notes", data.value);
        logger$1.info(`Saved notes for ${sourceId}:${paperId}`);
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
  async showPopup(tabId, paperData, position) {
    const html = this.createPopupHtml(paperData);
    const handlers = this.getStandardPopupHandlers();
    await chrome.tabs.sendMessage(tabId, {
      type: "showPopup",
      sourceId: paperData.sourceId,
      paperId: paperData.paperId,
      html,
      handlers,
      position,
      paperData
      // Send full paper data for potential customization
    });
    logger$1.debug(`Showed popup for ${paperData.sourceId}:${paperData.paperId}`);
  }
  /**
   * Creates HTML for a paper annotation popup
   */
  createPopupHtml(paperData) {
    return `
     <div class="paper-popup-header">${paperData.title || paperData.paperId}</div>
     <div class="paper-popup-meta">${paperData.authors || ""}</div>
     
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
  getStandardPopupHandlers() {
    return [
      { selector: "#btn-thumbsup", event: "click", action: "rate", value: "thumbsup" },
      { selector: "#btn-thumbsdown", event: "click", action: "rate", value: "thumbsdown" },
      { selector: "#btn-save", event: "click", action: "saveNotes" }
    ];
  }
}

const logger = loguru.getLogger("background");
let githubToken = "";
let githubRepo = "";
let currentPaperData = null;
let sessionConfig = null;
let paperManager = null;
let integrationManager = null;
let sessionTracker = null;
let popupManager = null;
async function initializeIntegrations() {
  integrationManager = new SourceIntegrationManager();
  integrationManager.registerIntegration(new ArXivIntegration());
  logger.info("Integrations initialized");
}
async function initialize() {
  try {
    await initializeIntegrations();
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
      () => integrationManager ? integrationManager.getAllIntegrations() : [],
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
    if (message.type === "getCurrentPaper") {
      logger.debug("Popup requested current paper", currentPaperData);
      sendResponse(currentPaperData);
      return true;
    }
    if (message.type === "contentScriptReady" && sender.tab?.id && sender.tab?.url) {
      logger.debug("Content script ready:", sender.tab.url);
      sendPatternsToContentScript(sender.tab.id);
      sendResponse({ success: true });
      return true;
    }
    if (message.type === "processPageLinks" && sender.tab?.id && sender.tab?.url) {
      processPageLinks(sender.tab.id, sender.tab.url);
      return true;
    }
    return false;
  });
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
      if (popupManager) {
        popupManager = new PopupManager(
          () => integrationManager ? integrationManager.getAllIntegrations() : [],
          () => paperManager
        );
      }
    }
  }
});
initialize();
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
chrome.webNavigation.onCompleted.addListener(async (details) => {
  logger.debug("Navigation detected:", details.url);
  if (!integrationManager) {
    return;
  }
  const integration = integrationManager.getIntegrationForUrl(details.url);
  if (integration) {
    logger.info(`${integration.id} URL detected, processing...`);
    const paperId = integration.extractPaperId(details.url);
    if (paperId) {
      const paperData = await integration.fetchPaperMetadata(paperId);
      if (paperData && paperManager) {
        logger.debug("Paper data extracted:", paperData);
        await paperManager.getOrCreatePaper(paperData);
        sendPatternsToContentScript(details.tabId);
      }
    }
  }
}, {
  url: [{ schemes: ["http", "https"] }]
});
async function handleTabChange(tab) {
  if (!integrationManager || !tab.url || !sessionTracker) {
    return;
  }
  const integration = integrationManager.getIntegrationForUrl(tab.url);
  if (!integration) {
    logger.debug("No integration for current page, ending session");
    await endCurrentSession();
    return;
  }
  const paperId = integration.extractPaperId(tab.url);
  if (!paperId) {
    logger.debug("No paper ID found in URL, ending session");
    await endCurrentSession();
    return;
  }
  const currentPaper = sessionTracker.getCurrentPaper();
  if (currentPaper.sourceId && currentPaper.paperId && (currentPaper.sourceId !== integration.id || currentPaper.paperId !== paperId)) {
    logger.debug("Different paper detected, ending existing session");
    await endCurrentSession();
  }
  if (!currentPaper.sourceId || !currentPaper.paperId) {
    logger.info("Processing paper from integration", {
      integration: integration.id,
      paperId
    });
    const paperData = await integration.fetchPaperMetadata(paperId);
    if (paperData) {
      logger.debug("Paper metadata fetched", paperData);
      if (paperManager) {
        await paperManager.getOrCreatePaper(paperData);
      }
      currentPaperData = paperData;
      sessionTracker.startSession(integration.id, paperId);
    }
  }
}
async function endCurrentSession() {
  if (!sessionTracker || !paperManager) {
    return;
  }
  const currentPaper = sessionTracker.getCurrentPaper();
  if (currentPaper.sourceId && currentPaper.paperId) {
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
async function sendPatternsToContentScript(tabId) {
  if (!integrationManager) {
    return;
  }
  try {
    const allPatterns = integrationManager.getAllIntegrations().flatMap((integration) => integration.getLinkPatterns());
    await chrome.tabs.sendMessage(tabId, {
      type: "registerPatterns",
      patterns: allPatterns
    });
    logger.debug("Sent patterns to content script", tabId);
  } catch (error) {
    logger.error("Error sending patterns to content script", error);
  }
}
async function processPageLinks(tabId, url) {
  if (!integrationManager) {
    return;
  }
  const integration = integrationManager.getIntegrationForUrl(url);
  if (integration) {
    try {
      await chrome.tabs.sendMessage(tabId, {
        type: "processPage"
      });
    } catch (error) {
      logger.error(`Error processing page with ${integration.id} integration`, error);
    }
  }
}
function initializeDebugObjects() {
  globalThis.__DEBUG__ = {
    get paperManager() {
      return paperManager;
    },
    get integrationManager() {
      return integrationManager;
    },
    get sessionTracker() {
      return sessionTracker;
    },
    get popupManager() {
      return popupManager;
    },
    getGithubClient: () => paperManager?.client,
    getCurrentPaper: () => currentPaperData,
    getSessionConfig: () => sessionConfig,
    getSessionMetadata: () => sessionTracker?.getCurrentSessionMetadata()
  };
  logger.info("Debug objects registered");
}
//# sourceMappingURL=background.bundle.js.map
