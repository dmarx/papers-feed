var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:true}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

class Logger {
  constructor(name) {
    this.name = name;
  }
  info(message, ...args) {
    console.log(`[INFO] ${this.name}: ${message}`, ...args);
  }
  warning(message, ...args) {
    console.warn(`[WARNING] ${this.name}: ${message}`, ...args);
  }
  error(message, ...args) {
    console.error(`[ERROR] ${this.name}: ${message}`, ...args);
  }
  debug(message, ...args) {
    console.debug(`[DEBUG] ${this.name}: ${message}`, ...args);
  }
}
const loguru = {
  getLogger: (name) => new Logger(name)
};

const logger$3 = loguru.getLogger("PluginRegistry");
class PluginRegistry {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  register(plugin) {
    if (this.plugins.has(plugin.id)) {
      logger$3.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    this.plugins.set(plugin.id, plugin);
    logger$3.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  getAll() {
    return Array.from(this.plugins.values());
  }
  get(id) {
    return this.plugins.get(id);
  }
  findForUrl(url) {
    for (const plugin of this.plugins.values()) {
      for (const pattern of plugin.urlPatterns) {
        if (pattern.test(url)) {
          const id = plugin.extractId(url);
          if (id) {
            return { plugin, id };
          }
        }
      }
    }
    return null;
  }
}
const pluginRegistry = new PluginRegistry();

const SOURCE_PREFIXES = {
  "arxiv": "arxiv",
  "semanticscholar": "s2",
  "doi": "doi",
  "openreview": "openreview",
  "acm": "doi"
  // ACM uses DOIs
};
function formatPrimaryId(source, id) {
  const plugin = pluginRegistry.get(source);
  if (plugin && plugin.formatId) {
    return plugin.formatId(id);
  }
  const sourcePrefix = SOURCE_PREFIXES[source] || "generic";
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${sourcePrefix}.${safeId}`;
}
function isNewFormat$1(id) {
  const validPrefixes = Object.values(SOURCE_PREFIXES).map((prefix) => `${prefix}.`);
  validPrefixes.push("generic.");
  return validPrefixes.some((prefix) => id.startsWith(prefix));
}

const logger$2 = loguru.getLogger("PaperManager");
function isInteractionLog(data) {
  return typeof data === "object" && data !== null && typeof data.paper_id === "string" && Array.isArray(data.interactions);
}
class PaperManager {
  constructor(client) {
    // Concurrency control locks
    this.creationLocks = /* @__PURE__ */ new Map();
    this.client = client;
  }
  /**
   * Get or create a paper record
   */
  async getOrCreatePaper(paperData) {
    if (!paperData.primary_id) {
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      } else {
        throw new Error("Invalid paper data: missing primary_id and cannot generate it");
      }
    }
    const objectId = `paper:${paperData.primary_id}`;
    logger$2.info(`Getting or creating paper: ${objectId}`);
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      logger$2.info(`Found existing paper: ${objectId}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        const defaultPaperData = {
          primary_id: paperData.primary_id,
          source: paperData.source,
          sourceId: paperData.sourceId,
          url: paperData.url || "",
          title: paperData.title || paperData.sourceId,
          authors: paperData.authors || "",
          abstract: paperData.abstract || "",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          rating: "novote"
        };
        if (paperData.source_specific_metadata) {
          defaultPaperData.source_specific_metadata = paperData.source_specific_metadata;
        }
        defaultPaperData.identifiers = {
          original: paperData.sourceId,
          url: paperData.url
        };
        if (paperData.doi) {
          defaultPaperData.identifiers.doi = paperData.doi;
        }
        logger$2.info(`Creating new paper object: ${objectId}`);
        try {
          await this.client.createObject(objectId, defaultPaperData);
          logger$2.info(`Successfully created paper: ${objectId}`);
          return defaultPaperData;
        } catch (createError) {
          logger$2.error(`Error creating paper object: ${createError}`);
          throw createError;
        }
      }
      logger$2.error(`Error in getOrCreatePaper: ${error}`);
      throw error;
    }
  }
  /**
   * Get or create an interaction log
   */
  async getOrCreateInteractionLog(paperId) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
    }
    const objectId = `interactions:${paperId}`;
    if (this.creationLocks.has(objectId)) {
      logger$2.info(`Waiting for existing creation of interaction log: ${objectId}`);
      return this.creationLocks.get(objectId);
    }
    const creationPromise = (async () => {
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
            paper_id: paperId,
            interactions: []
          };
          logger$2.info(`Creating new interaction log: ${objectId}`);
          await this.client.createObject(objectId, newLog);
          return newLog;
        }
        throw error;
      } finally {
        setTimeout(() => {
          this.creationLocks.delete(objectId);
        }, 500);
      }
    })();
    this.creationLocks.set(objectId, creationPromise);
    return creationPromise;
  }
  /**
   * Log a reading session for a paper
   */
  async logReadingSession(paperId, session, paperData) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
      if (paperData && !paperData.primary_id) {
        paperData.primary_id = paperId;
      }
    }
    if (paperData) {
      await this.getOrCreatePaper(paperData);
    }
    await this.addInteraction(paperId, {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
    });
  }
  /**
   * Log an annotation for a paper
   */
  async logAnnotation(paperId, key, value, paperData) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
      if (paperData && !paperData.primary_id) {
        paperData.primary_id = paperId;
      }
    }
    if (paperData) {
      await this.getOrCreatePaper(paperData);
    }
    await this.addInteraction(paperId, {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    });
  }
  /**
   * Update a paper's rating
   */
  async updateRating(paperId, rating, paperData) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
      if (paperData && !paperData.primary_id) {
        paperData.primary_id = paperId;
      }
    }
    const paper = await this.getOrCreatePaper(paperData || { primary_id: paperId });
    const objectId = `paper:${paperId}`;
    await this.client.updateObject(objectId, {
      ...paper,
      rating
    });
    await this.addInteraction(paperId, {
      type: "rating",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { rating }
    });
  }
  /**
   * Add an interaction to a paper's log
   */
  async addInteraction(paperId, interaction) {
    const log = await this.getOrCreateInteractionLog(paperId);
    log.interactions.push(interaction);
    const objectId = `interactions:${paperId}`;
    await this.client.updateObject(objectId, log);
  }
  /**
   * Get interactions for a paper
   */
  async getInteractions(paperId, options = {}) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
    }
    try {
      const log = await this.getOrCreateInteractionLog(paperId);
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
   * Get total reading time for a paper
   */
  async getPaperReadingTime(paperId) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
    }
    const interactions = await this.getInteractions(paperId, { type: "reading_session" });
    return interactions.reduce((total, i) => {
      const data = i.data;
      if (typeof data === "object" && data !== null && "duration_seconds" in data) {
        return total + data.duration_seconds;
      }
      return total;
    }, 0);
  }
  /**
   * Get paper history
   */
  async getPaperHistory(paperId) {
    if (!isNewFormat$1(paperId)) {
      paperId = formatPrimaryId("arxiv", paperId);
      logger$2.warning(`Converted legacy ID to: ${paperId}`);
    }
    const objectId = `paper:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
}

// extension/config/session.js

// Default configuration values
const DEFAULT_CONFIG = {
    idleThresholdMinutes: 5,
    minSessionDurationSeconds: 30,
    // Adding more granular control
    requireContinuousActivity: true,  // If true, resets timer on idle
    logPartialSessions: false,        // If true, logs sessions even if under minimum duration
    activityUpdateIntervalSeconds: 1  // How often to update active time
};

// Load session configuration from storage
async function loadSessionConfig() {
    const items = await chrome.storage.sync.get('sessionConfig');
    return { ...DEFAULT_CONFIG, ...items.sessionConfig };
}

// Convert configuration to milliseconds for internal use
function getConfigurationInMs(config) {
    return {
        idleThreshold: config.idleThresholdMinutes * 60 * 1000,
        minSessionDuration: config.minSessionDurationSeconds * 1000,
        activityUpdateInterval: config.activityUpdateIntervalSeconds * 1000,
        requireContinuousActivity: config.requireContinuousActivity,
        logPartialSessions: config.logPartialSessions
    };
}

const logger$1 = loguru.getLogger("PluginLoader");
async function loadBuiltinPlugins() {
  logger$1.info("Loading built-in plugins");
  try {
    const pluginCount = pluginRegistry.getAll().length;
    if (pluginCount === 0) {
      logger$1.warning("No plugins were registered. Check plugin registration.");
    } else {
      logger$1.info(`${pluginCount} plugins are registered.`);
    }
  } catch (error) {
    logger$1.error("Error loading plugins", error);
    if (error instanceof Error) {
      logger$1.error(`Plugin loading error: ${error.message}`);
      if (error.stack) {
        logger$1.error(`Stack trace: ${error.stack}`);
      }
    }
  }
}
async function initializePluginSystem() {
  logger$1.info("Initializing plugin system");
  await loadBuiltinPlugins();
  const plugins2 = pluginRegistry.getAll();
  logger$1.info(`Initialized ${plugins2.length} plugins:`);
  plugins2.forEach((plugin) => {
    logger$1.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
  });
}

const logger = loguru.getLogger("Background");
const debugLogger = loguru.getLogger("DebugFlow");
let githubToken = "";
let githubRepo = "";
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let sessionConfig = null;
let paperManager = null;
const pendingUrls = /* @__PURE__ */ new Set();
class EnhancedReadingSession {
  constructor(paperData, config) {
    if (!paperData.primary_id) {
      throw new Error("Paper data must include primary_id");
    }
    this.paperId = paperData.primary_id;
    this.paperData = paperData;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.startTime = /* @__PURE__ */ new Date();
    this.activeTime = 0;
    this.idleTime = 0;
    this.lastActiveTime = /* @__PURE__ */ new Date();
    this.isTracking = true;
    this.config = config;
    this.endTime = null;
    this.finalizedData = null;
  }
  update() {
    if (this.isTracking && !this.finalizedData) {
      const now = /* @__PURE__ */ new Date();
      const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
      if (timeSinceLastActive < this.config.idleThreshold) {
        this.activeTime += timeSinceLastActive;
      } else {
        this.idleTime += timeSinceLastActive;
      }
      this.lastActiveTime = now;
    }
  }
  finalize() {
    if (this.finalizedData) {
      return this.finalizedData;
    }
    this.update();
    this.isTracking = false;
    this.endTime = /* @__PURE__ */ new Date();
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
    if (this.activeTime >= this.config.minSessionDuration) {
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
  getMetadata() {
    return {
      sourceType: this.paperData.source,
      paperId: this.paperId,
      title: this.paperData.title,
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      activeSeconds: Math.round(this.activeTime / 1e3),
      idleSeconds: Math.round(this.idleTime / 1e3)
    };
  }
}
async function loadCredentials() {
  const items = await chrome.storage.sync.get(["githubToken", "githubRepo"]);
  githubToken = items.githubToken || "";
  githubRepo = items.githubRepo || "";
  logger.info("Credentials loaded:", { hasToken: !!githubToken, hasRepo: !!githubRepo });
  if (githubToken && githubRepo) {
    const githubClient = new f(githubToken, githubRepo);
    paperManager = new PaperManager(githubClient);
    logger.info("Paper manager initialized");
  }
  sessionConfig = getConfigurationInMs(await loadSessionConfig());
  logger.info("Session configuration loaded:", sessionConfig);
  initializeDebugObjects();
}
chrome.storage.onChanged.addListener(async (changes) => {
  logger.info("Storage changes detected:", Object.keys(changes));
  if (changes.githubToken) {
    githubToken = changes.githubToken.newValue;
  }
  if (changes.githubRepo) {
    githubRepo = changes.githubRepo.newValue;
  }
  if (changes.sessionConfig) {
    sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
    logger.info("Session configuration updated:", sessionConfig);
  }
  if (changes.githubToken || changes.githubRepo) {
    if (githubToken && githubRepo) {
      const githubClient = new f(githubToken, githubRepo);
      paperManager = new PaperManager(githubClient);
      logger.info("Paper manager reinitialized");
    }
  }
});
async function initialize() {
  logger.info("Initializing extension");
  await loadCredentials();
  await initializePluginSystem();
  await setupListeners();
  logger.info("Extension initialized");
}
initialize().catch((error) => {
  logger.error("Initialization failed", error);
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logger.info("Message received:", request);
  if (request.type === "getCurrentPaper") {
    logger.info("Popup requested current paper:", currentPaperData);
    sendResponse(currentPaperData);
  } else if (request.type === "updateRating") {
    logger.info("Rating update requested:", request.rating);
    handleUpdateRating(request.rating, sendResponse);
    return true;
  } else if (request.type === "updateAnnotation") {
    logger.info("Annotation update requested:", request.annotationType, request.data);
    handleAnnotationUpdate(request.annotationType, request.data).then((response) => sendResponse(response)).catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.type === "trackPaper") {
    logger.info("Track paper requested:", request);
    handleTrackPaper(request).then((response) => sendResponse(response)).catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  }
  return true;
});
async function handleTrackPaper(request) {
  if (!paperManager) {
    throw new Error("Paper manager not initialized");
  }
  try {
    let paperData;
    const plugin = pluginRegistry.get(request.source);
    if (plugin) {
      logger.info(`Using ${plugin.name} plugin to process paper`);
      const id = plugin.extractId(request.url);
      if (!id) {
        throw new Error(`Could not extract ID from URL: ${request.url}`);
      }
      if (plugin.hasApi && plugin.fetchApiData) {
        try {
          paperData = await plugin.fetchApiData(id);
          paperData.source = request.source;
          paperData.sourceId = id;
          paperData.primary_id = plugin.formatId ? plugin.formatId(id) : formatPrimaryId(request.source, id);
          paperData.url = request.url;
        } catch (error) {
          logger.error(`Error using plugin API: ${error}`);
        }
      }
    }
    if (!paperData) {
      const id = plugin ? plugin.extractId(request.url) : request.id;
      paperData = {
        source: request.source,
        sourceId: id,
        primary_id: plugin && plugin.formatId ? plugin.formatId(id) : formatPrimaryId(request.source, id),
        url: request.url,
        title: request.title || `${request.source.toUpperCase()} Paper: ${id}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rating: "novote"
      };
    }
    if (!paperData) {
      throw new Error(`Could not process paper: ${request.url}`);
    }
    await createGithubIssue(paperData);
    return { success: true, paperData };
  } catch (error) {
    logger.error(`Error tracking paper: ${error}`);
    throw error;
  }
}
async function handleUpdateRating(rating, sendResponse) {
  if (!paperManager) {
    debugLogger.error("Paper manager not initialized");
    sendResponse({ success: false, error: "Paper manager not initialized" });
    return;
  }
  if (!currentPaperData) {
    debugLogger.error("No current paper");
    sendResponse({ success: false, error: "No current paper" });
    return;
  }
  try {
    const paperId = currentPaperData.primary_id;
    if (checkForLegacyIdFormat(paperId)) {
      debugLogger.error(`Unexpected legacy ID format in currentPaperData: ${paperId}`);
    }
    debugLogger.info(`Updating rating for ${paperId} to ${rating}`);
    await paperManager.updateRating(paperId, rating, currentPaperData);
    currentPaperData.rating = rating;
    sendResponse({ success: true });
  } catch (error) {
    debugLogger.error("Error updating rating:", error);
    sendResponse({ success: false, error: error.message });
  }
}
async function setupListeners() {
  logger.info("Setting up unified event listeners");
  const plugins = pluginRegistry.getAll();
  const hostPatterns = [];
  for (const plugin of plugins) {
    try {
      for (const pattern of plugin.urlPatterns) {
        const patternStr = pattern.toString();
        const match = patternStr.match(/([a-zA-Z0-9.-]+)\\?\.([a-zA-Z]+)/);
        if (match) {
          const domain = match[1];
          const tld = match[2];
          hostPatterns.push({ hostSuffix: `${domain}.${tld}` });
        }
      }
    } catch (err) {
      logger.error(`Error processing plugin URL patterns: ${err}`);
    }
  }
  if (hostPatterns.length === 0) {
    hostPatterns.push(
      { hostSuffix: "arxiv.org" },
      { hostSuffix: "semanticscholar.org" },
      { hostSuffix: "doi.org" },
      { hostSuffix: "dl.acm.org" },
      { hostSuffix: "openreview.net" }
    );
  }
  logger.info(`Setting up navigation listener with patterns: ${JSON.stringify(hostPatterns)}`);
  chrome.webNavigation.onCompleted.addListener(handleUnifiedNavigation, {
    url: hostPatterns
  });
  chrome.tabs.onActivated.addListener(handleUnifiedTabActivation);
  chrome.tabs.onUpdated.addListener(handleUnifiedTabUpdate);
  chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
      endCurrentSession();
    }
  });
  logger.info("All event listeners initialized");
}
function findPluginForUrl(url) {
  debugLogger.info(`Finding plugin for URL: ${url}`);
  const plugins = pluginRegistry.getAll();
  debugLogger.info(`Checking against ${plugins.length} registered plugins`);
  for (const plugin of plugins) {
    debugLogger.debug(`Testing against plugin: ${plugin.id}`);
    for (const pattern of plugin.urlPatterns) {
      const patternStr = pattern.toString();
      debugLogger.debug(`- Testing pattern: ${patternStr}`);
      const match = url.match(pattern);
      if (match) {
        debugLogger.info(`URL matches pattern for plugin: ${plugin.id}`);
        const id = plugin.extractId(url);
        if (id) {
          const primary_id = plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id);
          debugLogger.info(`Successfully extracted ID: ${id}, primary_id: ${primary_id}`);
          return {
            type: plugin.id,
            id,
            primary_id,
            url,
            plugin
          };
        } else {
          debugLogger.warning(`Pattern matched but failed to extract ID for ${plugin.id}`);
        }
      }
    }
  }
  debugLogger.warning(`No plugin found for URL: ${url}`);
  return null;
}
async function handleUnifiedNavigation(details) {
  logger.info(`Unified navigation handler: ${details.url}`);
  if (pendingUrls.has(details.url)) {
    logger.info(`URL already being processed, skipping: ${details.url}`);
    return;
  }
  pendingUrls.add(details.url);
  try {
    const sourceInfo = findPluginForUrl(details.url);
    if (!sourceInfo) {
      logger.info("Not a recognized paper URL");
      pendingUrls.delete(details.url);
      return;
    }
    logger.info(`Detected paper: ${sourceInfo.type}:${sourceInfo.id}`);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id === details.tabId) {
      await handleTabChangeWithPlugins(tabs[0]);
    } else {
      const paperData = await processPaperUrl(details.url);
      if (paperData) {
        logger.info(`Processed paper data: ${paperData.title}`);
      }
    }
  } catch (error) {
    logger.error(`Error in navigation handler: ${error}`);
  } finally {
    setTimeout(() => {
      pendingUrls.delete(details.url);
    }, 500);
  }
}
async function handleUnifiedTabActivation(activeInfo) {
  logger.info(`Unified tab activation handler: ${activeInfo.tabId}`);
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url || pendingUrls.has(tab.url)) {
    logger.info(`Tab URL empty or already being processed: ${tab.url}`);
    return;
  }
  pendingUrls.add(tab.url);
  try {
    await handleTabChangeWithPlugins(tab);
  } catch (error) {
    logger.error(`Error in tab activation handler: ${error}`);
  } finally {
    setTimeout(() => {
      pendingUrls.delete(tab.url);
    }, 500);
  }
}
async function handleUnifiedTabUpdate(tabId, changeInfo, tab) {
  if (changeInfo.status !== "complete" || !tab.url || pendingUrls.has(tab.url)) {
    return;
  }
  logger.info(`Unified tab update handler: ${tab.url}`);
  pendingUrls.add(tab.url);
  try {
    await handleTabChangeWithPlugins(tab);
  } catch (error) {
    logger.error(`Error in tab update handler: ${error}`);
  } finally {
    setTimeout(() => {
      pendingUrls.delete(tab.url);
    }, 500);
  }
}
async function processPaperUrl(url) {
  debugLogger.info(`Processing paper URL: ${url}`);
  if (pendingUrls.has(url)) {
    debugLogger.warning(`URL already being processed in processPaperUrl: ${url}`);
    return null;
  }
  pendingUrls.add(url);
  debugLogger.info(`Added ${url} to pendingUrls (now ${pendingUrls.size} pending)`);
  try {
    const sourceInfo = findPluginForUrl(url);
    if (!sourceInfo) {
      debugLogger.warning("Not a recognized paper URL in processor");
      return null;
    }
    let paperData;
    if (sourceInfo.plugin) {
      const plugin = sourceInfo.plugin;
      debugLogger.info(`Using plugin ${plugin.id} for processing`);
      if (plugin.hasApi && plugin.fetchApiData) {
        try {
          debugLogger.info(`Using ${plugin.id} plugin API to process paper, ID: ${sourceInfo.id}`);
          const apiData = await plugin.fetchApiData(sourceInfo.id);
          debugLogger.info(`API data received for ${sourceInfo.id}: ${JSON.stringify(apiData).substring(0, 200)}...`);
          if (Object.keys(apiData).length > 0) {
            paperData = {
              ...apiData,
              source: plugin.id,
              sourceId: sourceInfo.id,
              primary_id: sourceInfo.primary_id,
              url
            };
            debugLogger.info(`Created paper data from API: primary_id=${paperData.primary_id}`);
          } else {
            debugLogger.warning(`API returned empty data for ${sourceInfo.id}`);
          }
        } catch (error) {
          debugLogger.error(`Error using plugin API: ${error.message}`, error);
        }
      } else {
        debugLogger.info(`Plugin ${plugin.id} does not have API or fetchApiData method`);
      }
      if (!paperData) {
        try {
          debugLogger.info(`Attempting DOM extraction for ${plugin.id}`);
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          debugLogger.info(`Found ${tabs.length} active tabs`);
          if (tabs.length > 0 && tabs[0].id) {
            const tabId = tabs[0].id;
            debugLogger.info(`Executing script in tab ${tabId}`);
            const script = await chrome.scripting.executeScript({
              target: { tabId },
              func: () => document.documentElement.outerHTML
            });
            if (script && script[0] && script[0].result) {
              debugLogger.info(`Successfully got HTML content from tab`);
              const parser = new DOMParser();
              const doc = parser.parseFromString(script[0].result, "text/html");
              debugLogger.info(`Using plugin.extractMetadata for ${url}`);
              const metadata = await plugin.extractMetadata(doc, url);
              if (metadata && Object.keys(metadata).length > 0) {
                debugLogger.info(`Metadata extracted: ${JSON.stringify(metadata).substring(0, 200)}...`);
                paperData = {
                  ...metadata,
                  source: plugin.id,
                  sourceId: sourceInfo.id,
                  primary_id: sourceInfo.primary_id,
                  url
                };
                debugLogger.info(`Created paper data from DOM: primary_id=${paperData.primary_id}`);
              } else {
                debugLogger.warning(`No metadata extracted from DOM for ${url}`);
              }
            } else {
              debugLogger.warning(`Failed to get HTML content from tab ${tabId}`);
            }
          } else {
            debugLogger.warning(`No active tab found for DOM extraction`);
          }
        } catch (error) {
          debugLogger.error(`Error extracting from DOM: ${error.message}`, error);
        }
      }
    } else {
      debugLogger.info(`No plugin available for source type: ${sourceInfo.type}`);
    }
    if (!paperData) {
      debugLogger.info(`Creating basic paper data record for ${sourceInfo.type}:${sourceInfo.id}`);
      paperData = {
        source: sourceInfo.type,
        sourceId: sourceInfo.id,
        primary_id: sourceInfo.primary_id,
        url,
        title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rating: "novote"
      };
    }
    if (paperData) {
      debugLogger.info(`Paper data extracted, creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await createGithubIssue(paperData);
        debugLogger.info(`Successfully created/updated GitHub issue for ${paperData.primary_id}`);
      } catch (error) {
        debugLogger.error(`Error creating GitHub issue: ${error.message}`, error);
      }
    }
    return paperData;
  } catch (error) {
    debugLogger.error(`Error processing paper URL: ${error.message}`, error);
    return null;
  } finally {
    debugLogger.info(`Scheduling removal of ${url} from pendingUrls in 500ms`);
    setTimeout(() => {
      pendingUrls.delete(url);
      debugLogger.info(`Removed ${url} from pendingUrls (now ${pendingUrls.size} pending)`);
    }, 500);
  }
}
async function handleTabChangeWithPlugins(tab) {
  if (!tab.url) {
    debugLogger.warning(`Tab has no URL`);
    return;
  }
  debugLogger.info(`Handling tab change for URL: ${tab.url}`);
  const sourceInfo = findPluginForUrl(tab.url);
  if (!sourceInfo) {
    debugLogger.info("Not a recognized paper page, ending current session");
    await endCurrentSession();
    return;
  }
  if (currentSession) {
    debugLogger.info("Ending existing session before starting new one");
    await endCurrentSession();
  }
  debugLogger.info(`Processing paper URL: ${tab.url}`);
  const paperData = await processPaperUrl(tab.url);
  if (paperData) {
    debugLogger.info(`Starting new session for: ${paperData.primary_id}`);
    currentPaperData = paperData;
    try {
      debugLogger.info(`Creating new EnhancedReadingSession, config: ${JSON.stringify(sessionConfig)}`);
      currentSession = new EnhancedReadingSession(paperData, sessionConfig);
      const metadata = currentSession.getMetadata();
      debugLogger.info("New session created:", metadata);
      startActivityTracking();
      debugLogger.info(`Creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await createGithubIssue(paperData);
      } catch (error) {
        debugLogger.error(`Error creating GitHub issue: ${error}`);
      }
    } catch (error) {
      debugLogger.error(`Error creating reading session: ${error.message}`);
    }
  } else {
    debugLogger.warning(`Failed to process paper URL: ${tab.url}`);
  }
}
async function endCurrentSession() {
  if (currentSession && currentPaperData) {
    logger.info(`Ending session for: ${currentPaperData.primary_id}`);
    const sessionData = currentSession.finalize();
    if (sessionData) {
      logger.info("Creating reading event:", sessionData);
      await createReadingEvent(currentPaperData, sessionData);
    }
    currentSession = null;
    currentPaperData = null;
    stopActivityTracking();
  }
}
function startActivityTracking() {
  if (!activityInterval) {
    logger.info("Starting activity tracking");
    activityInterval = setInterval(() => {
      if (currentSession) {
        currentSession.update();
      }
    }, sessionConfig.activityUpdateInterval);
  }
}
function stopActivityTracking() {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
}
async function createReadingEvent(paperData, sessionData) {
  if (!paperManager || !paperData) {
    logger.error("Missing required data for creating reading event:", {
      hasPaperManager: !!paperManager,
      hasPaperData: !!paperData
    });
    return;
  }
  try {
    if (!paperData.primary_id) {
      logger.error("Paper data missing primary_id. This should not happen.");
      return;
    }
    const paperId = paperData.primary_id;
    await paperManager.logReadingSession(
      paperId,
      sessionData,
      paperData
    );
    logger.info("Reading session logged:", {
      paperId,
      sessionId: sessionData.session_id,
      activeTime: sessionData.duration_seconds,
      idleTime: sessionData.idle_seconds,
      totalTime: sessionData.total_elapsed_seconds
    });
  } catch (error) {
    logger.error("Error logging reading session:", error);
  }
}
async function createGithubIssue(paperData) {
  if (!paperManager) {
    debugLogger.error("Paper manager not initialized");
    return null;
  }
  if (!paperData.primary_id) {
    debugLogger.warning(`Paper data missing primary_id, attempting to generate one`);
    if (paperData.source && paperData.sourceId) {
      paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      debugLogger.info(`Generated primary_id: ${paperData.primary_id}`);
    } else {
      debugLogger.error("Cannot create paper - no valid identifier");
      return null;
    }
  }
  try {
    debugLogger.info(`Creating/getting paper issue: ${paperData.primary_id}`);
    const existingPaper = await paperManager.getOrCreatePaper(paperData);
    debugLogger.info(`Paper metadata stored/retrieved: ${existingPaper.primary_id}`);
    return existingPaper;
  } catch (error) {
    debugLogger.error(`Error handling paper metadata: ${error}`);
    return null;
  }
}
async function handleAnnotationUpdate(type, data) {
  if (!paperManager) {
    throw new Error("Paper manager not initialized");
  }
  try {
    let paperId = data.paperId;
    if (checkForLegacyIdFormat(paperId)) {
      debugLogger.warning(`Converting legacy ID format in annotation: ${paperId}`);
      paperId = formatPrimaryId("arxiv", paperId);
      debugLogger.info(`Converted to new format: ${paperId}`);
    }
    const paperData = data.title ? {
      title: data.title,
      source: data.source,
      primary_id: paperId
    } : void 0;
    if (type === "vote") {
      debugLogger.info(`Updating rating for ${paperId} to ${data.vote}`);
      await paperManager.updateRating(
        paperId,
        data.vote,
        paperData
      );
    } else {
      debugLogger.info(`Logging annotation for ${paperId}`);
      await paperManager.logAnnotation(
        paperId,
        "notes",
        data.notes,
        paperData
      );
    }
    return { success: true };
  } catch (error) {
    debugLogger.error(`Error logging interaction: ${error}`);
    throw error;
  }
}
function initializeDebugObjects() {
  self.__DEBUG__ = {
    get paperManager() {
      return paperManager;
    },
    getGithubClient: () => paperManager?.client,
    getCurrentPaper: () => currentPaperData,
    getCurrentSession: () => currentSession,
    getConfig: () => sessionConfig
  };
  logger.info("Debug objects registered, access via __DEBUG__ in service worker console");
}
function checkForLegacyIdFormat(id) {
  if (!id) return false;
  if (isNewFormat(id)) {
    return false;
  }
  debugLogger.warning(`Legacy ID format detected: ${id}`);
  return true;
}
function enhancePluginRegistryLogging() {
  const originalRegister = pluginRegistry.register;
  pluginRegistry.register = function(plugin) {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name}), version ${plugin.version}`);
    if (!plugin.urlPatterns || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    if (!plugin.extractId) {
      debugLogger.error(`Plugin ${plugin.id} missing required extractId method`);
    }
    const capabilities = [];
    if (plugin.hasApi) capabilities.push("API");
    if (plugin.formatId) capabilities.push("custom ID format");
    if (plugin.extractMetadata) capabilities.push("metadata extraction");
    debugLogger.info(`Plugin ${plugin.id} capabilities: ${capabilities.join(", ")}`);
    return originalRegister.call(this, plugin);
  };
}
function enhanceGithubClientLogging() {
  const originalLoadCredentials = loadCredentials;
  loadCredentials = async function() {
    debugLogger.info("Loading credentials and initializing GitHub client");
    await originalLoadCredentials();
    if (githubToken && githubRepo) {
      debugLogger.info(`GitHub client initialized with repo: ${githubRepo}`);
    } else {
      debugLogger.warning(`GitHub client not fully initialized: token=${!!githubToken}, repo=${!!githubRepo}`);
    }
    if (paperManager) {
      debugLogger.info("Paper manager successfully initialized");
    } else {
      debugLogger.error("Paper manager failed to initialize");
    }
    if (sessionConfig) {
      debugLogger.info(`Session config loaded: ${JSON.stringify(sessionConfig)}`);
    } else {
      debugLogger.error("Session config not loaded");
    }
  };
}
enhancePluginRegistryLogging();
enhanceGithubClientLogging();
async function runDiagnostics() {
  debugLogger.info("=== Running startup diagnostics ===");
  const plugins = pluginRegistry.getAll();
  debugLogger.info(`${plugins.length} plugins registered`);
  for (const plugin of plugins) {
    debugLogger.info(`Plugin: ${plugin.id} (${plugin.name})`);
    debugLogger.info(`- URL patterns: ${plugin.urlPatterns.map((p) => p.toString()).join(", ")}`);
    debugLogger.info(`- Has API: ${!!plugin.hasApi}`);
    debugLogger.info(`- Has custom ID format: ${!!plugin.formatId}`);
  }
  debugLogger.info(`GitHub client: token=${!!githubToken}, repo=${!!githubRepo}`);
  debugLogger.info(`Paper manager initialized: ${!!paperManager}`);
  debugLogger.info(`Session config: ${JSON.stringify(sessionConfig || "Not loaded")}`);
  const testUrls = [
    "https://arxiv.org/abs/2201.12345",
    "https://www.semanticscholar.org/paper/abcdef1234567890abcdef1234567890abcdef12",
    "https://doi.org/10.1145/3548606.3560596",
    "https://openreview.net/forum?id=abc123def456"
  ];
  debugLogger.info("Testing URL detection:");
  for (const url of testUrls) {
    const sourceInfo = findPluginForUrl(url);
    if (sourceInfo) {
      debugLogger.info(`${url} -> ${sourceInfo.type}:${sourceInfo.id} (${sourceInfo.primary_id})`);
    } else {
      debugLogger.warning(`${url} -> Not detected`);
    }
  }
  debugLogger.info("=== Diagnostics complete ===");
}
const originalInitialize = initialize;
initialize = async function() {
  debugLogger.info("Extension initialization started");
  try {
    await originalInitialize();
    debugLogger.info("Extension initialization completed successfully");
    await runDiagnostics();
  } catch (error) {
    debugLogger.error(`Initialization failed: ${error.message}`, error);
    throw error;
  }
};
const originalOnMessage = chrome.runtime.onMessage.addListener;
chrome.runtime.onMessage.addListener = function(request, sender, sendResponse) {
  debugLogger.info(`Message received: type=${request.type}, sender=${sender.tab ? sender.tab.url : "extension"}`);
  return originalOnMessage(request, sender, sendResponse);
};
//# sourceMappingURL=background.bundle.js.map
