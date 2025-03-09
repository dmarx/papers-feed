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

const logger$5 = loguru.getLogger("PluginRegistry");
const debugLogger = loguru.getLogger("PluginRegistryDebug");
class PluginRegistry {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  register(plugin) {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name})`);
    if (!plugin.id || typeof plugin.id !== "string") {
      debugLogger.error(`Plugin missing valid id: ${JSON.stringify(plugin)}`);
      return;
    }
    if (!Array.isArray(plugin.urlPatterns) || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    if (!plugin.extractId || typeof plugin.extractId !== "function") {
      debugLogger.error(`Plugin ${plugin.id} missing required extractId method`);
      return;
    }
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger$5.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.hasApi}, formatId=${!!plugin.formatId}`);
    logger$5.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  getAll() {
    debugLogger.info(`Getting all plugins, currently ${this.plugins.size} registered`);
    return Array.from(this.plugins.values());
  }
  get(id) {
    debugLogger.info(`Looking up plugin by id: ${id}`);
    const plugin = this.plugins.get(id);
    if (!plugin) {
      debugLogger.warning(`No plugin found with id: ${id}`);
    } else {
      debugLogger.info(`Found plugin: ${plugin.name} (${plugin.id})`);
    }
    return plugin;
  }
  findForUrl(url) {
    debugLogger.info(`Finding plugin for URL: ${url}`);
    for (const plugin of this.plugins.values()) {
      debugLogger.info(`Testing URL against plugin: ${plugin.id}`);
      for (const pattern of plugin.urlPatterns) {
        debugLogger.info(`Testing pattern: ${pattern.toString()}`);
        if (pattern.test(url)) {
          debugLogger.info(`URL matches pattern for plugin: ${plugin.id}`);
          const id = plugin.extractId(url);
          if (id) {
            debugLogger.info(`Successfully extracted ID: ${id}`);
            return { plugin, id };
          } else {
            debugLogger.warning(`Pattern matched but failed to extract ID`);
          }
        }
      }
    }
    debugLogger.warning(`No plugin found for URL: ${url}`);
    return null;
  }
}
const pluginRegistry = new PluginRegistry();
debugLogger.info("PluginRegistry singleton instance created");

function formatPrimaryId(source, id) {
  const plugin = pluginRegistry.get(source);
  if (plugin && plugin.formatId) {
    return plugin.formatId(id);
  }
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${source}.${safeId}`;
}

const logger$4 = loguru.getLogger("PaperManager");
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
    logger$4.info(`Getting or creating paper: ${objectId}`);
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      logger$4.info(`Found existing paper: ${objectId}`);
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
        logger$4.info(`Creating new paper object: ${objectId}`);
        try {
          await this.client.createObject(objectId, defaultPaperData);
          logger$4.info(`Successfully created paper: ${objectId}`);
          return defaultPaperData;
        } catch (createError) {
          logger$4.error(`Error creating paper object: ${createError}`);
          throw createError;
        }
      }
      logger$4.error(`Error in getOrCreatePaper: ${error}`);
      throw error;
    }
  }
  /**
   * Get or create an interaction log
   */
  async getOrCreateInteractionLog(paperId) {
    const objectId = `interactions:${paperId}`;
    if (this.creationLocks.has(objectId)) {
      logger$4.info(`Waiting for existing creation of interaction log: ${objectId}`);
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
          logger$4.info(`Creating new interaction log: ${objectId}`);
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
    if (paperData) {
      if (!paperData.primary_id) {
        paperData.primary_id = paperId;
      }
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
    if (paperData) {
      if (!paperData.primary_id) {
        paperData.primary_id = paperId;
      }
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

const scriptRel = function detectScriptRel() {
  const relList = typeof document !== "undefined" && document.createElement("link").relList;
  return relList && relList.supports && relList.supports("modulepreload") ? "modulepreload" : "preload";
}();
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  let promise = Promise.resolve();
  if (true && deps && deps.length > 0) {
    document.getElementsByTagName("link");
    const cspNonceMeta = document.querySelector(
      "meta[property=csp-nonce]"
    );
    const cspNonce = cspNonceMeta?.nonce || cspNonceMeta?.getAttribute("nonce");
    promise = Promise.allSettled(
      deps.map((dep) => {
        dep = assetsURL(dep);
        if (dep in seen) return;
        seen[dep] = true;
        const isCss = dep.endsWith(".css");
        const cssSelector = isCss ? '[rel="stylesheet"]' : "";
        if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
          return;
        }
        const link = document.createElement("link");
        link.rel = isCss ? "stylesheet" : scriptRel;
        if (!isCss) {
          link.as = "script";
        }
        link.crossOrigin = "";
        link.href = dep;
        if (cspNonce) {
          link.setAttribute("nonce", cspNonce);
        }
        document.head.appendChild(link);
        if (isCss) {
          return new Promise((res, rej) => {
            link.addEventListener("load", res);
            link.addEventListener(
              "error",
              () => rej(new Error(`Unable to preload CSS for ${dep}`))
            );
          });
        }
      })
    );
  }
  function handlePreloadError(err) {
    const e = new Event("vite:preloadError", {
      cancelable: true
    });
    e.payload = err;
    self.dispatchEvent(e);
    if (!e.defaultPrevented) {
      throw err;
    }
  }
  return promise.then((res) => {
    for (const item of res || []) {
      if (item.status !== "rejected") continue;
      handlePreloadError(item.reason);
    }
    return baseModule().catch(handlePreloadError);
  });
};

const logger$3 = loguru.getLogger("PluginLoader");
let pluginsInitialized = false;
let initializationPromise = null;
async function loadBuiltinPlugins() {
  logger$3.info("Loading built-in plugins");
  try {
    const pluginCount = pluginRegistry.getAll().length;
    if (pluginCount === 0) {
      logger$3.warning("No plugins were registered. Attempting emergency registration.");
      try {
        await __vitePreload(() => import('./assets/arxiv_plugin-BHmSzkUq.js'),true?[]:void 0);
        await __vitePreload(() => import('./assets/semantic_scholar_plugin-lumw_UZw.js'),true?[]:void 0);
        await __vitePreload(() => import('./assets/openreview_plugin-D10kTOwB.js'),true?[]:void 0);
        const emergencyCount = pluginRegistry.getAll().length;
        if (emergencyCount > 0) {
          logger$3.info(`Emergency plugin loading successful: ${emergencyCount} plugins registered`);
        } else {
          throw new Error("Failed to load any plugins even with emergency loading");
        }
      } catch (emergencyError) {
        logger$3.error("Emergency plugin loading failed:", emergencyError);
        throw emergencyError;
      }
    } else {
      logger$3.info(`${pluginCount} plugins are registered.`);
    }
  } catch (error) {
    logger$3.error("Error loading plugins", error);
    if (error instanceof Error) {
      logger$3.error(`Plugin loading error: ${error.message}`);
      if (error.stack) {
        logger$3.error(`Stack trace: ${error.stack}`);
      }
    }
    throw error;
  }
}
async function initializePluginSystem(retries = 3) {
  if (pluginsInitialized) {
    return;
  }
  if (initializationPromise) {
    return initializationPromise;
  }
  logger$3.info("Initializing plugin system");
  initializationPromise = (async () => {
    let attemptCount = 0;
    let lastError = null;
    while (attemptCount < retries) {
      try {
        await loadBuiltinPlugins();
        const loadedPlugins = pluginRegistry.getAll();
        logger$3.info(`Initialized ${loadedPlugins.length} plugins:`);
        loadedPlugins.forEach((plugin) => {
          logger$3.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
        });
        pluginsInitialized = true;
        return;
      } catch (error) {
        attemptCount++;
        lastError = error instanceof Error ? error : new Error(String(error));
        logger$3.warning(`Plugin initialization attempt ${attemptCount} failed: ${lastError.message}`);
        if (attemptCount < retries) {
          const delay = Math.pow(2, attemptCount) * 500;
          logger$3.info(`Retrying plugin initialization in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    logger$3.error(`Plugin initialization failed after ${retries} attempts.`);
    if (lastError) {
      throw lastError;
    } else {
      throw new Error("Plugin initialization failed for unknown reasons");
    }
  })();
  try {
    await initializationPromise;
    return;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}
function arePluginsInitialized() {
  return pluginsInitialized;
}
function getPluginInitializationState() {
  return {
    initialized: pluginsInitialized,
    initializationInProgress: !!initializationPromise,
    pluginCount: pluginRegistry.getAll().length
  };
}

const logger$2 = loguru.getLogger("URLDetectionService");
class URLDetectionService {
  constructor() {
    // Track URLs being processed to prevent duplicates
    this.pendingUrls = /* @__PURE__ */ new Set();
    // Debounce configuration
    this.debounceTime = 500;
    // ms
    this.debounceTimers = /* @__PURE__ */ new Map();
    // Cache successful detections to avoid repeat processing
    this.detectionCache = /* @__PURE__ */ new Map();
    this.maxCacheSize = 100;
    logger$2.info("URL Detection Service initialized");
  }
  /**
   * Detect paper source from URL
   * @param {string} url URL to analyze
   * @returns {Promise<DetectedSourceInfo|null>} Detected source info or null
   */
  async detectSource(url) {
    if (!url) {
      logger$2.warning("Empty URL provided to detectSource");
      return null;
    }
    if (this.detectionCache.has(url)) {
      logger$2.info(`Cache hit for ${url}`);
      return this.detectionCache.get(url);
    }
    if (!arePluginsInitialized()) {
      logger$2.info("Plugins not initialized, initializing now...");
      try {
        await initializePluginSystem();
      } catch (error) {
        logger$2.error("Failed to initialize plugins:", error);
        return null;
      }
    }
    if (this.isUrlPending(url)) {
      logger$2.info(`URL already being processed: ${url}`);
      return null;
    }
    try {
      this.addPendingUrl(url);
      const result = pluginRegistry.findForUrl(url);
      if (result) {
        const sourceInfo = {
          type: result.plugin.id,
          id: result.id,
          primary_id: result.plugin.formatId ? result.plugin.formatId(result.id) : formatPrimaryId(result.plugin.id, result.id),
          url,
          plugin: result.plugin
        };
        this.addToCache(url, sourceInfo);
        logger$2.info(`Detected source using plugin registry: ${sourceInfo.type}:${sourceInfo.id}`);
        return sourceInfo;
      }
      const plugins = pluginRegistry.getAll();
      for (const plugin of plugins) {
        for (const pattern of plugin.urlPatterns) {
          const match = url.match(pattern);
          if (match) {
            const id = plugin.extractId(url);
            if (id) {
              const sourceInfo = {
                type: plugin.id,
                id,
                primary_id: plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id),
                url,
                plugin
              };
              this.addToCache(url, sourceInfo);
              logger$2.info(`Detected source using manual check: ${sourceInfo.type}:${sourceInfo.id}`);
              return sourceInfo;
            }
          }
        }
      }
      logger$2.info(`No matching source found for URL: ${url}`);
      return null;
    } finally {
      this.removePendingUrlWithDelay(url);
    }
  }
  /**
   * Check if a URL is valid for paper detection
   * @param {string} url URL to check
   * @returns {boolean} True if URL is valid
   */
  isValidUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      new URL(url);
      const commonDomains = [
        "arxiv.org",
        "semanticscholar.org",
        "doi.org",
        "dl.acm.org",
        "openreview.net",
        "s2-research.org"
      ];
      return commonDomains.some((domain) => url.includes(domain));
    } catch (e) {
      return false;
    }
  }
  /**
   * Check if URL is currently being processed
   * @param {string} url URL to check
   * @returns {boolean} True if URL is pending
   */
  isUrlPending(url) {
    return this.pendingUrls.has(url);
  }
  /**
   * Add URL to pending set
   * @param {string} url URL to add
   */
  addPendingUrl(url) {
    this.pendingUrls.add(url);
  }
  /**
   * Remove URL from pending set
   * @param {string} url URL to remove
   */
  removePendingUrl(url) {
    this.pendingUrls.delete(url);
    if (this.debounceTimers.has(url)) {
      clearTimeout(this.debounceTimers.get(url));
      this.debounceTimers.delete(url);
    }
  }
  /**
   * Remove URL from pending set after a delay
   * @param {string} url URL to remove
   * @param {number} delay Delay in ms (default: debounceTime)
   */
  removePendingUrlWithDelay(url, delay) {
    if (this.debounceTimers.has(url)) {
      clearTimeout(this.debounceTimers.get(url));
    }
    const timer = setTimeout(() => {
      this.pendingUrls.delete(url);
      this.debounceTimers.delete(url);
    }, delay || this.debounceTime);
    this.debounceTimers.set(url, timer);
  }
  /**
   * Add a successful detection to cache
   * @param {string} url URL 
   * @param {DetectedSourceInfo} info Detection info
   */
  addToCache(url, info) {
    if (!url) {
      logger$2.warning("Attempted to cache with empty URL");
      return;
    }
    if (this.detectionCache.size >= this.maxCacheSize) {
      const oldestKey = this.detectionCache.keys().next().value;
      if (oldestKey) {
        this.detectionCache.delete(oldestKey);
      }
    }
    this.detectionCache.set(url, info);
  }
  /**
   * Clear the detection cache
   */
  clearCache() {
    this.detectionCache.clear();
  }
  /**
   * Reset the service state
   * Used for testing and emergency recovery
   */
  reset() {
    this.pendingUrls.clear();
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.clearCache();
    logger$2.info("URL Detection Service has been reset");
  }
  /**
   * Get service status information
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      pendingUrlsCount: this.pendingUrls.size,
      activeTimersCount: this.debounceTimers.size,
      cacheSize: this.detectionCache.size,
      pluginsInitialized: arePluginsInitialized(),
      pluginCount: pluginRegistry.getAll().length
    };
  }
}
const urlDetectionService = new URLDetectionService();

const logger$1 = loguru.getLogger("BackgroundIntegration");
async function initializeEnhancedServices() {
  logger$1.info("Initializing enhanced services");
  try {
    await initializePluginSystem(3);
    const pluginState = getPluginInitializationState();
    logger$1.info("Plugin system initialized:", pluginState);
    if (typeof self !== "undefined" && "__DEBUG__" in self) {
      self.__DEBUG__.enhancedServices = {
        urlDetectionService,
        getPluginState: getPluginInitializationState,
        handleUrl: processUrl
      };
      logger$1.info("Debug API extended with enhanced services");
    }
  } catch (error) {
    logger$1.error("Failed to initialize enhanced services:", error);
    throw error;
  }
}
async function processUrl(url) {
  if (!urlDetectionService.isValidUrl(url)) {
    logger$1.info(`Invalid or unsupported URL: ${url}`);
    return null;
  }
  try {
    return await urlDetectionService.detectSource(url);
  } catch (error) {
    logger$1.error(`Error processing URL ${url}:`, error);
    return null;
  }
}
async function processTab(tab) {
  if (!tab.url) {
    logger$1.info("Tab has no URL");
    return null;
  }
  return processUrl(tab.url);
}
async function processNavigation(details) {
  if (!details.url) {
    logger$1.info("Navigation event has no URL");
    return null;
  }
  return processUrl(details.url);
}
async function extractMetadataFromSource(sourceInfo) {
  if (!sourceInfo || !sourceInfo.plugin) {
    logger$1.info("No valid source info or plugin");
    return null;
  }
  try {
    if (sourceInfo.plugin.hasApi && sourceInfo.plugin.fetchApiData) {
      try {
        logger$1.info(`Using ${sourceInfo.plugin.id} plugin API to extract metadata`);
        const apiData = await sourceInfo.plugin.fetchApiData(sourceInfo.id);
        if (apiData && Object.keys(apiData).length > 0) {
          return {
            ...apiData,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (apiError) {
        logger$1.error(`Error using plugin API: ${apiError}`);
      }
    }
    return {
      source: sourceInfo.type,
      sourceId: sourceInfo.id,
      primary_id: sourceInfo.primary_id,
      url: sourceInfo.url,
      title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rating: "novote"
    };
  } catch (error) {
    logger$1.error(`Error extracting metadata: ${error}`);
    return null;
  }
}
async function extractMetadataFromDOM(tabId, sourceInfo) {
  if (!sourceInfo || !sourceInfo.plugin || !sourceInfo.plugin.extractMetadata) {
    return null;
  }
  try {
    logger$1.info(`Attempting DOM extraction for ${sourceInfo.type}`);
    const script = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML
    });
    if (script && script[0] && script[0].result) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(script[0].result, "text/html");
      const metadata = await sourceInfo.plugin.extractMetadata(doc, sourceInfo.url);
      if (metadata && Object.keys(metadata).length > 0) {
        return {
          ...metadata,
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url
        };
      }
    }
  } catch (error) {
    logger$1.error(`Error extracting metadata from DOM: ${error}`);
  }
  return null;
}
async function fullyProcessUrl(url, tabId = null) {
  try {
    const sourceInfo = await processUrl(url);
    if (!sourceInfo) {
      logger$1.info(`No source detected for URL: ${url}`);
      return null;
    }
    logger$1.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id}`);
    let paperData = await extractMetadataFromSource(sourceInfo);
    if (tabId && (!paperData || !paperData.title || paperData.title.includes(sourceInfo.id))) {
      logger$1.info("API extraction failed or returned minimal data, trying DOM extraction");
      const domData = await extractMetadataFromDOM(tabId, sourceInfo);
      if (domData) {
        paperData = {
          ...paperData,
          ...domData,
          // Ensure critical fields are preserved
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url
        };
      }
    }
    if (paperData) {
      logger$1.info(`Successfully processed paper: ${paperData.title || paperData.primary_id}`);
    }
    return paperData;
  } catch (error) {
    logger$1.error(`Error fully processing URL ${url}:`, error);
    return null;
  }
}

const logger = loguru.getLogger("Background");
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
  await initializeEnhancedServices();
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
    if (request.url) {
      paperData = await fullyProcessUrl(request.url);
    } else if (request.source && request.id) {
      const primary_id = formatPrimaryId(request.source, request.id);
      paperData = {
        source: request.source,
        sourceId: request.id,
        primary_id,
        url: request.url || "",
        title: request.title || `${request.source.toUpperCase()} Paper: ${request.id}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rating: "novote"
      };
    } else {
      throw new Error("Invalid request: missing URL or source/id");
    }
    if (!paperData) {
      throw new Error(`Could not process paper: ${request.url || request.id}`);
    }
    const createdPaper = await createGithubIssue(paperData);
    return { success: true, paperData: createdPaper };
  } catch (error) {
    logger.error(`Error tracking paper: ${error}`);
    throw error;
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
    const paperId = currentPaperData.primary_id;
    await paperManager.updateRating(paperId, rating, currentPaperData);
    currentPaperData.rating = rating;
    sendResponse({ success: true });
  } catch (error) {
    logger.error("Error updating rating:", error);
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
async function handleUnifiedNavigation(details) {
  logger.info(`Unified navigation handler: ${details.url}`);
  try {
    const sourceInfo = await processNavigation(details);
    if (!sourceInfo) {
      logger.info("Not a recognized paper URL");
      return;
    }
    logger.info(`Detected paper: ${sourceInfo.type}:${sourceInfo.id}`);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id === details.tabId) {
      await handleTabChangeWithPlugins(tabs[0]);
    } else {
      const paperData = await fullyProcessUrl(details.url);
      if (paperData) {
        logger.info(`Processed paper data: ${paperData.title}`);
      }
    }
  } catch (error) {
    logger.error(`Error in navigation handler: ${error}`);
  }
}
async function handleUnifiedTabActivation(activeInfo) {
  logger.info(`Unified tab activation handler: ${activeInfo.tabId}`);
  const tab = await chrome.tabs.get(activeInfo.tabId);
  if (!tab.url || pendingUrls.has(tab.url)) {
    logger.info(`Tab URL empty or already being processed: ${tab.url}`);
    return;
  }
  try {
    pendingUrls.add(tab.url);
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
  try {
    pendingUrls.add(tab.url);
    await handleTabChangeWithPlugins(tab);
  } catch (error) {
    logger.error(`Error in tab update handler: ${error}`);
  } finally {
    setTimeout(() => {
      pendingUrls.delete(tab.url);
    }, 500);
  }
}
async function handleTabChangeWithPlugins(tab) {
  if (!tab.url) return;
  const sourceInfo = await processTab(tab);
  if (!sourceInfo) {
    logger.info("Not a recognized paper page, ending current session");
    await endCurrentSession();
    return;
  }
  if (currentSession) {
    logger.info("Ending existing session before starting new one");
    await endCurrentSession();
  }
  logger.info(`Processing paper URL: ${tab.url}`);
  const paperData = await fullyProcessUrl(tab.url, tab.id);
  if (paperData) {
    logger.info(`Starting new session for: ${paperData.primary_id}`);
    currentPaperData = paperData;
    currentSession = new EnhancedReadingSession(paperData, sessionConfig);
    const metadata = currentSession.getMetadata();
    logger.info("New session created:", metadata);
    startActivityTracking();
    logger.info(`Creating GitHub issue for: ${paperData.primary_id}`);
    try {
      await createGithubIssue(paperData);
    } catch (error) {
      logger.error(`Error creating GitHub issue: ${error}`);
    }
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
    logger.error("Paper manager not initialized");
    return null;
  }
  if (!paperData.primary_id) {
    if (paperData.source && paperData.sourceId) {
      paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
    } else {
      logger.error("Cannot create paper - no valid identifier");
      return null;
    }
  }
  try {
    logger.info(`Creating/getting paper issue: ${paperData.primary_id}`);
    const existingPaper = await paperManager.getOrCreatePaper(paperData);
    logger.info(`Paper metadata stored/retrieved: ${existingPaper.primary_id}`);
    return existingPaper;
  } catch (error) {
    logger.error(`Error handling paper metadata: ${error}`, error);
    return null;
  }
}
async function handleAnnotationUpdate(type, data) {
  if (!paperManager) {
    throw new Error("Paper manager not initialized");
  }
  try {
    let paperId = data.paperId;
    if (!paperId.includes(".")) {
      const source = data.source || "arxiv";
      paperId = formatPrimaryId(source, paperId);
      logger.info(`Converted ID to standardized format: ${paperId}`);
    }
    const paperData = data.title ? {
      title: data.title,
      source: data.source,
      primary_id: paperId
    } : void 0;
    if (type === "vote") {
      await paperManager.updateRating(
        paperId,
        data.vote,
        paperData
      );
    } else {
      await paperManager.logAnnotation(
        paperId,
        "notes",
        data.notes,
        paperData
      );
    }
    return { success: true };
  } catch (error) {
    logger.error("Error logging interaction:", error);
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

export { loguru as l, pluginRegistry as p };
//# sourceMappingURL=background.bundle.js.map
