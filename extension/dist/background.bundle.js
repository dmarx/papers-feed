var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:true}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

const isInteractionLog = (data) => {
  const log = data;
  return typeof log === "object" && log !== null && typeof log.paper_id === "string" && Array.isArray(log.interactions);
};

const SOURCE_TYPES = {
  "arxiv": {
    prefix: "arxiv",
    url_patterns: [
      /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
      /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/
    ],
    id_extractors: [
      (match) => match[2],
      (match) => match[1] + (match[2] || "")
    ],
    id_format: /[0-9]{4}\.[0-9]{4,5}(v[0-9]+)?/
  },
  "semanticscholar": {
    prefix: "s2",
    url_patterns: [
      /semanticscholar\.org\/paper\/([a-f0-9]+)/,
      /s2-research\.org\/papers\/([a-f0-9]+)/
    ],
    id_extractors: [
      (match) => match[1],
      (match) => match[1]
    ],
    id_format: /[a-f0-9]{40}/
  },
  "doi": {
    prefix: "doi",
    url_patterns: [
      /doi\.org\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    id_extractors: [
      (match) => match[1]
    ],
    id_format: /10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+/
  },
  "acm": {
    prefix: "doi",
    // ACM uses DOIs
    url_patterns: [
      /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    id_extractors: [
      (match) => match[1]
    ],
    id_format: /10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+/
  },
  "openreview": {
    prefix: "openreview",
    url_patterns: [
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/,
      // Add support for PDF links on OpenReview
      /openreview\.net\/pdf\?id=([a-zA-Z0-9_\-]+)/
    ],
    id_extractors: [
      (match) => match[1],
      (match) => match[1]
    ],
    id_format: /[a-zA-Z0-9_\-]+/
  }
};
function formatPrimaryId(source, id) {
  const sourcePrefix = SOURCE_TYPES[source]?.prefix || "generic";
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${sourcePrefix}.${safeId}`;
}
function parseId(prefixedId) {
  const [prefix, ...idParts] = prefixedId.split(".");
  const id = idParts.join(".");
  const prefixToSource = {
    "arxiv": "arxiv",
    "s2": "semanticscholar",
    "doi": "doi",
    "openreview": "openreview"
  };
  return {
    type: prefixToSource[prefix] || "generic",
    id: prefix === "doi" ? id.replace(/_/g, "/") : id
  };
}
function detectSourceFromUrl(url) {
  for (const [sourceType, definition] of Object.entries(SOURCE_TYPES)) {
    for (let i = 0; i < definition.url_patterns.length; i++) {
      const match = url.match(definition.url_patterns[i]);
      if (match) {
        const id = definition.id_extractors[i](match);
        return {
          type: sourceType,
          id,
          primary_id: formatPrimaryId(sourceType, id),
          url
        };
      }
    }
  }
  return null;
}
function isNewFormat(id) {
  const validPrefixes = Object.values(SOURCE_TYPES).map((def) => `${def.prefix}.`);
  validPrefixes.push("generic.");
  return validPrefixes.some((prefix) => id.startsWith(prefix));
}

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

const logger$5 = loguru.getLogger("PaperManager");
const isInteractionLogJs = (data) => {
  return typeof data === "object" && data !== null && typeof data.paper_id === "string" && Array.isArray(data.interactions);
};
class PaperManager {
  constructor(client) {
    // Add creation locks for concurrency control
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
      } else if (paperData.arxivId) {
        paperData.source = "arxiv";
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = formatPrimaryId("arxiv", paperData.arxivId);
        logger$5.warning(`Legacy arxivId format detected. Converted to primary_id: ${paperData.primary_id}`);
      } else {
        throw new Error("Invalid paper data: missing primary_id and cannot generate it");
      }
    }
    const objectId = `paper:${paperData.primary_id}`;
    logger$5.info(`Getting or creating paper: ${objectId}`);
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      logger$5.info(`Found existing paper: ${objectId}`);
      if (!data.primary_id) {
        const enhancedData = {
          ...data,
          source: paperData.source || "arxiv",
          sourceId: paperData.sourceId || data.arxivId,
          primary_id: paperData.primary_id
        };
        logger$5.info(`Updating legacy paper with new format fields: ${objectId}`);
        await this.client.updateObject(objectId, enhancedData);
        return enhancedData;
      }
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
        if (paperData.source === "arxiv") {
          defaultPaperData.arxivId = paperData.sourceId;
          defaultPaperData.arxiv_tags = paperData.arxiv_tags || [];
          defaultPaperData.published_date = paperData.published_date || "";
        } else {
          defaultPaperData.identifiers = {
            original: paperData.sourceId,
            url: paperData.url
          };
          if (paperData.arxivId) {
            defaultPaperData.identifiers.arxiv = paperData.arxivId;
          }
          if (paperData.doi) {
            defaultPaperData.identifiers.doi = paperData.doi;
          }
          if (paperData.s2Id) {
            defaultPaperData.identifiers.s2 = paperData.s2Id;
          }
        }
        logger$5.info(`Creating new paper object: ${objectId}`);
        try {
          await this.client.createObject(objectId, defaultPaperData);
          logger$5.info(`Successfully created paper: ${objectId}`);
          return defaultPaperData;
        } catch (createError) {
          logger$5.error(`Error creating paper object: ${createError}`);
          throw createError;
        }
      }
      logger$5.error(`Error in getOrCreatePaper: ${error}`);
      throw error;
    }
  }
  /**
   * Get or create an interaction log
   */
  async getOrCreateInteractionLog(paperId) {
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. This is deprecated.`);
      paperId = formatPrimaryId("arxiv", paperId);
    }
    const objectId = `interactions:${paperId}`;
    if (this.creationLocks.has(objectId)) {
      logger$5.info(`Waiting for existing creation of interaction log: ${objectId}`);
      return this.creationLocks.get(objectId);
    }
    const creationPromise = (async () => {
      try {
        const obj = await this.client.getObject(objectId);
        const data = obj.data;
        if (typeof isInteractionLog === "function" ? isInteractionLog(data) : isInteractionLogJs(data)) {
          return data;
        }
        throw new Error("Invalid interaction log format");
      } catch (error) {
        if (error instanceof Error && error.message.includes("No object found")) {
          const newLog = {
            paper_id: paperId,
            interactions: []
          };
          const { type, id } = parseId(paperId);
          if (type === "arxiv") {
            newLog.legacy_id = id;
          }
          logger$5.info(`Creating new interaction log: ${objectId}`);
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
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId("arxiv", paperId);
      if (paperData && !paperData.primary_id) {
        paperData = {
          ...paperData,
          source: "arxiv",
          sourceId: paperData.arxivId || paperId.split(".")[1],
          primary_id: paperId
        };
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
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId("arxiv", paperId);
      if (paperData && !paperData.primary_id) {
        paperData = {
          ...paperData,
          source: "arxiv",
          sourceId: paperData.arxivId || paperId.split(".")[1],
          primary_id: paperId
        };
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
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId("arxiv", paperId);
      if (paperData && !paperData.primary_id) {
        paperData = {
          ...paperData,
          source: "arxiv",
          sourceId: paperData.arxivId || paperId.split(".")[1],
          primary_id: paperId
        };
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
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId("arxiv", paperId);
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
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId("arxiv", paperId);
    }
    const interactions = await this.getInteractions(paperId, { type: "reading_session" });
    return interactions.reduce((total, i) => {
      logger$5.info("Calculating from interaction:", i);
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
    if (!isNewFormat(paperId)) {
      logger$5.warning(`Legacy format paperId detected: ${paperId}. Converting to new format.`);
      paperId = formatPrimaryId("arxiv", paperId);
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

class MultiSourceDetector {
  /**
   * Detect paper source and metadata from URL
   * 
   * @param {string} url - URL to analyze
   * @returns {SourceInfo|null} Paper source information or null if not detected
   */
  static detect(url) {
    return detectSourceFromUrl(url);
  }
  /**
   * Process a URL to extract paper data
   * This is an enhanced version of the original processArxivUrl function
   * 
   * @param {string} url - URL to process
   * @param {Function} existingProcessArxivUrl - The original arXiv processing function
   * @returns {Promise<any|null>} Paper data or null if not detected/processed
   */
  static async processUrl(url, existingProcessArxivUrl) {
    const sourceInfo = this.detect(url);
    if (!sourceInfo) {
      return existingProcessArxivUrl ? existingProcessArxivUrl(url) : null;
    }
    if (sourceInfo.type === "arxiv" && existingProcessArxivUrl) {
      const paperData2 = await existingProcessArxivUrl(url);
      if (paperData2) {
        paperData2.source = "arxiv";
        paperData2.sourceId = paperData2.arxivId;
        paperData2.primary_id = formatPrimaryId("arxiv", paperData2.arxivId);
      }
      return paperData2;
    }
    const { type, id, primary_id } = sourceInfo;
    const paperData = {
      source: type,
      sourceId: id,
      primary_id,
      url,
      title: `${type.toUpperCase()} Paper: ${id}`,
      // Generic title as placeholder
      authors: "",
      abstract: "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rating: "novote"
    };
    return paperData;
  }
}

const logger$4 = loguru.getLogger("PluginRegistry");
class PluginRegistry {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  register(plugin) {
    if (this.plugins.has(plugin.id)) {
      logger$4.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    this.plugins.set(plugin.id, plugin);
    logger$4.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
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

const logger$3 = loguru.getLogger("PaperProcessor");
async function extractMetadataFromPage(tabId) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        try {
          const getMetaContent = (selector) => {
            const element = document.querySelector(selector);
            return element && "content" in element ? element.content : void 0;
          };
          const metadata = {
            title: getMetaContent('meta[name="citation_title"]') || getMetaContent('meta[property="og:title"]') || document.title,
            authors: getMetaContent('meta[name="citation_author"]') || getMetaContent('meta[name="citation_authors"]') || getMetaContent('meta[name="author"]'),
            abstract: getMetaContent('meta[name="description"]') || getMetaContent('meta[property="og:description"]') || getMetaContent('meta[name="citation_abstract"]'),
            published_date: getMetaContent('meta[name="citation_publication_date"]') || getMetaContent('meta[name="citation_date"]'),
            doi: getMetaContent('meta[name="citation_doi"]'),
            url: getMetaContent('meta[property="og:url"]') || self.location.href,
            citations: null
          };
          if (!metadata.title) {
            const h1 = document.querySelector("h1");
            if (h1 && h1.textContent) metadata.title = h1.textContent.trim();
          }
          if (!metadata.abstract) {
            const abstractEl = document.querySelector(".abstract") || document.querySelector("#abstract") || document.querySelector('[class*="abstract"]') || document.querySelector('[id*="abstract"]');
            if (abstractEl && abstractEl.textContent) metadata.abstract = abstractEl.textContent.trim();
          }
          if (!metadata.doi && self.location.href.includes("doi.org")) {
            const match = self.location.href.match(/doi\.org\/(10\.[0-9.]+\/[^\s&/?#]+[^\s&/?#.:])/);
            if (match) metadata.doi = match[1];
          }
          if (self.location.href.includes("dl.acm.org")) {
            const citationEl = document.querySelector(".citation-metrics");
            if (citationEl && citationEl.textContent) {
              const citText = citationEl.textContent;
              const citMatch = citText.match(/(\d+)\s+citations/i);
              if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
            }
            if (!metadata.doi) {
              const doiMatch = self.location.href.match(/dl\.acm\.org\/doi\/(10\.[0-9.]+\/[^\s&/?#]+[^\s&/?#.:])/);
              if (doiMatch) metadata.doi = doiMatch[1];
            }
          }
          if (self.location.href.includes("semanticscholar.org")) {
            const citationEl = document.querySelector('[data-test-id="citation-count"]');
            if (citationEl && citationEl.textContent) {
              const citText = citationEl.textContent;
              const citMatch = citText.match(/(\d+)/);
              if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
            }
            const authorElements = document.querySelectorAll('[data-test-id="author-list"] a');
            if (authorElements.length > 0) {
              metadata.authors = Array.from(authorElements).map((el) => el.textContent?.trim()).filter(Boolean).join(", ");
            }
          }
          if (self.location.href.includes("openreview.net")) {
            if (!metadata.authors) {
              const authorElements = document.querySelectorAll('meta[name="citation_author"]');
              if (authorElements.length > 0) {
                metadata.authors = Array.from(authorElements).map((el) => el.content).filter(Boolean).join(", ");
              } else {
                const authorEl = document.querySelector(".signatures, .author, .authors");
                if (authorEl && authorEl.textContent) {
                  metadata.authors = authorEl.textContent.trim();
                }
              }
            }
            if (!metadata.abstract) {
              const abstractEl = document.querySelector('strong.note-content-field:contains("Abstract") ~ span.note-content-value');
              if (abstractEl && abstractEl.textContent) {
                metadata.abstract = abstractEl.textContent.trim();
              }
            }
          }
          return metadata;
        } catch (e) {
          console.error("Error extracting metadata:", e);
          return null;
        }
      }
    });
    if (results && results[0] && results[0].result) {
      const result = results[0].result;
      const metadata = {
        title: result.title,
        authors: result.authors,
        abstract: result.abstract,
        published_date: result.published_date,
        doi: result.doi,
        url: result.url,
        citations: result.citations !== null ? result.citations : void 0
      };
      return metadata;
    }
  } catch (error) {
    logger$3.error("Error executing metadata extraction script:", error);
  }
  return null;
}
function findPluginForUrl$1(url) {
  const plugins = pluginRegistry.getAll();
  for (const plugin of plugins) {
    for (const pattern of plugin.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        const id = plugin.extractId(url);
        if (id) {
          return {
            type: plugin.id,
            id,
            primary_id: plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id),
            url,
            plugin
          };
        }
      }
    }
  }
  return MultiSourceDetector.detect(url);
}
async function processPaperUrl$1(url, processArxivUrl) {
  logger$3.info("Processing URL for multiple sources:", url);
  const sourceInfo = findPluginForUrl$1(url);
  if (!sourceInfo) {
    logger$3.info("No paper source detected");
    return null;
  }
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  logger$3.info(`Detected ${sourceType} paper with ID: ${sourceId}`);
  if (sourceInfo.plugin) {
    const plugin = sourceInfo.plugin;
    if (plugin.hasApi && plugin.fetchApiData) {
      try {
        logger$3.info(`Using ${plugin.id} plugin API`);
        const apiData = await plugin.fetchApiData(sourceId);
        if (Object.keys(apiData).length > 0) {
          return {
            ...apiData,
            source: plugin.id,
            sourceId,
            primary_id,
            url
          };
        }
      } catch (error) {
        logger$3.error(`Error using plugin API: ${error}`);
      }
    }
  }
  if (sourceType === "arxiv" && processArxivUrl) {
    const paperData2 = await processArxivUrl(url);
    if (paperData2) {
      paperData2.source = "arxiv";
      paperData2.sourceId = paperData2.arxivId;
      paperData2.primary_id = primary_id;
    }
    return paperData2;
  }
  let paperData = {
    source: sourceType,
    sourceId,
    primary_id,
    // The standardized format ID
    url,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    rating: "novote"
  };
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id) {
      const metadata = await extractMetadataFromPage(tabs[0].id);
      if (metadata) {
        paperData.title = metadata.title || `${sourceType.toUpperCase()} Paper: ${sourceId}`;
        paperData.authors = metadata.authors || "";
        paperData.abstract = metadata.abstract || "";
        paperData.published_date = metadata.published_date || "";
        if (metadata.doi) {
          paperData.doi = metadata.doi;
        }
        if (metadata.citations !== void 0) {
          paperData.citations = metadata.citations;
        }
      } else {
        paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
      }
    } else {
      paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
    }
  } catch (error) {
    logger$3.error("Error extracting metadata:", error);
    paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
  }
  paperData.identifiers = {
    original: sourceId,
    url
  };
  if (sourceType === "doi" || sourceType === "acm") {
    paperData.doi = sourceId;
    paperData.identifiers.doi = sourceId;
  } else if (sourceType === "semanticscholar") {
    paperData.s2Id = sourceId;
    paperData.identifiers.s2 = sourceId;
  }
  logger$3.info("Processed paper data:", paperData);
  return paperData;
}

// extension/background_multi_source.js
// Extension to support multiple paper sources


const logger$2 = loguru.getLogger('MultiSourceSupport');

/**
 * Context for external functions provided by the background script
 */
let externalContext = {
  createGithubIssue: null,
  endCurrentSession: null,
  EnhancedReadingSession: null,
  sessionConfig: null,
  startActivityTracking: null,
  setCurrentPaperData: null,
  processArxivUrl: null
};

// Track URLs that are being processed to avoid duplicates
const pendingUrls$1 = new Set();

/**
 * Enhanced version of processArxivUrl that supports multiple sources
 * 
 * @param {string} url - URL to process
 * @returns {Promise<Object|null>} - Paper data or null
 */
async function processPaperUrl(url) {
  logger$2.info(`Multi-source processing for URL: ${url}`);
  
  // Prevent duplicate processing
  if (pendingUrls$1.has(url)) {
    logger$2.info(`URL already being processed, skipping: ${url}`);
    return null;
  }
  
  // Mark URL as being processed
  pendingUrls$1.add(url);
  
  try {
    // Use detector to identify paper source
    const sourceInfo = MultiSourceDetector.detect(url);
    
    // If not a recognized paper URL, exit
    if (!sourceInfo) {
      logger$2.info('No recognized paper source detected in URL');
      
      // Try legacy arXiv detection as fallback
      if (externalContext.processArxivUrl) {
        return externalContext.processArxivUrl(url);
      }
      return null;
    }
    
    logger$2.info(`Detected paper source: ${sourceInfo.type}:${sourceInfo.id}`);
    
    const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
    
    // For arXiv, use the existing well-tested processor if available
    if (sourceType === 'arxiv' && externalContext.processArxivUrl) {
      const paperData = await externalContext.processArxivUrl(url);
      
      // Ensure it has all required fields
      if (paperData) {
        if (!paperData.source) paperData.source = 'arxiv';
        if (!paperData.sourceId) paperData.sourceId = paperData.arxivId;
        if (!paperData.primary_id) paperData.primary_id = primary_id;
      }
      
      return paperData;
    }
    
    // Delegate to the TypeScript implementation in papers/process_paper_url.ts
    try {
      const paperData = await processPaperUrl$1(url, externalContext.processArxivUrl);
      
      // Store in GitHub if available - but don't await to avoid race conditions
      if (paperData && externalContext.createGithubIssue) {
        externalContext.createGithubIssue(paperData).catch(e => {
          logger$2.error('Error storing paper data in GitHub:', e);
        });
      }
      
      return paperData;
    } catch (error) {
      logger$2.error('Error processing paper URL:', error);
      
      // Create basic paper data as fallback
      return {
        source: sourceType,
        sourceId: sourceId,
        primary_id: primary_id,
        url: url,
        title: `${sourceType.toUpperCase()} Paper: ${sourceId}`,
        timestamp: new Date().toISOString(),
        rating: 'novote'
      };
    }
  } catch (error) {
    logger$2.error(`Unexpected error in processPaperUrl: ${error}`);
    return null;
  } finally {
    // Remove URL from pending after a delay to prevent immediate reprocessing
    setTimeout(() => {
      pendingUrls$1.delete(url);
    }, 500);
  }
}

/**
 * Enhanced tab change handler for multiple sources
 * 
 * @param {Object} tab - Current tab data
 * @param {Function} originalHandler - Original handler for legacy support
 */
async function enhancedHandleTabChange(tab, originalHandler) {
  if (!tab || !tab.url) {
    return;
  }
  
  const url = tab.url;
  
  // Prevent duplicate processing
  if (pendingUrls$1.has(url)) {
    logger$2.info(`URL already being processed in enhancedHandleTabChange: ${url}`);
    return;
  }
  
  // Mark URL as being processed
  pendingUrls$1.add(url);
  
  try {
    // Use detector to identify paper source
    const sourceInfo = MultiSourceDetector.detect(url);
    const isPaperUrl = !!sourceInfo;
    
    logger$2.info(`Tab change detected:`, { isPaperUrl, url, sourceInfo });
    
    if (!isPaperUrl) {
      logger$2.info('Not a recognized paper page, ending current session');
      
      // End current session if available
      if (externalContext.endCurrentSession) {
        await externalContext.endCurrentSession();
      }
      return;
    }
    
    // For arXiv papers, use the original handler for full compatibility
    if (sourceInfo.type === 'arxiv' && originalHandler) {
      return originalHandler(tab);
    }
    
    // For other sources, end any existing session
    if (externalContext.endCurrentSession) {
      await externalContext.endCurrentSession();
    }
    
    logger$2.info('Processing paper URL for new session');
    const paperData = await processPaperUrl(url);
    
    if (paperData) {
      logger$2.info(`Starting new session for: ${paperData.primary_id}`);
      
      if (externalContext.EnhancedReadingSession && externalContext.sessionConfig) {
        // Create a new session with the updated EnhancedReadingSession class
        // which requires paperData instead of just an ID
        const currentSession = new externalContext.EnhancedReadingSession(paperData, externalContext.sessionConfig);
        const metadata = currentSession.getMetadata();
        logger$2.info('New session created:', metadata);
        
        // Set the current paper data
        if (externalContext.setCurrentPaperData) {
          externalContext.setCurrentPaperData(paperData);
        }
        
        // Start tracking activity
        if (externalContext.startActivityTracking) {
          externalContext.startActivityTracking();
        }
        
        // Return the paper data
        return paperData;
      }
    }
    
    return null;
  } catch (error) {
    logger$2.error(`Error in enhanced tab change handler: ${error}`);
    return null;
  } finally {
    // Remove URL from pending after a delay
    setTimeout(() => {
      pendingUrls$1.delete(url);
    }, 500);
  }
}

/**
 * Initialize the multi-source support
 * 
 * @param {Object} context - External functions from background script
 */
function initMultiSourceSupport(context = {}) {
  // Store external context
  externalContext = {
    ...externalContext,
    ...context
  };
  
  logger$2.info('Multi-source paper support initialized with context:', 
    Object.keys(externalContext).filter(k => !!externalContext[k]));
  
  // Return overrides that can be applied to the main module
  return {
    processPaperUrl,
    enhancedHandleTabChange
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
let githubToken = "";
let githubRepo = "";
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let sessionConfig = null;
let paperManager = null;
let originalProcessArxivUrl = null;
let enhancedProcessPaperUrl = null;
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
  console.log("Credentials loaded:", { hasToken: !!githubToken, hasRepo: !!githubRepo });
  if (githubToken && githubRepo) {
    const githubClient = new f(githubToken, githubRepo);
    paperManager = new PaperManager(githubClient);
    console.log("Paper manager initialized");
  }
  sessionConfig = getConfigurationInMs(await loadSessionConfig());
  console.log("Session configuration loaded:", sessionConfig);
  enhancedInitialization();
  initializeDebugObjects();
}
function enhancedInitialization() {
  originalProcessArxivUrl = processArxivUrl;
  const { processPaperUrl} = initMultiSourceSupport({
    createGithubIssue,
    // Pass createGithubIssue function to background_multi_source
    endCurrentSession,
    // Pass endCurrentSession function
    EnhancedReadingSession,
    // Pass EnhancedReadingSession class
    sessionConfig,
    // Pass sessionConfig
    startActivityTracking,
    // Pass startActivityTracking function
    setCurrentPaperData,
    // New helper function to set current paper data
    processArxivUrl
    // Pass the original arXiv processor
  });
  enhancedProcessPaperUrl = processPaperUrl;
  console.log("Multi-source paper support initialized");
}
function setCurrentPaperData(data) {
  currentPaperData = data;
  return currentPaperData;
}
chrome.storage.onChanged.addListener(async (changes) => {
  console.log("Storage changes detected:", Object.keys(changes));
  if (changes.githubToken) {
    githubToken = changes.githubToken.newValue;
  }
  if (changes.githubRepo) {
    githubRepo = changes.githubRepo.newValue;
  }
  if (changes.sessionConfig) {
    sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
    console.log("Session configuration updated:", sessionConfig);
  }
  if (changes.githubToken || changes.githubRepo) {
    if (githubToken && githubRepo) {
      const githubClient = new f(githubToken, githubRepo);
      paperManager = new PaperManager(githubClient);
      console.log("Paper manager reinitialized");
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
  console.log("Message received:", request);
  if (request.type === "getCurrentPaper") {
    console.log("Popup requested current paper:", currentPaperData);
    sendResponse(currentPaperData);
  } else if (request.type === "updateRating") {
    console.log("Rating update requested:", request.rating);
    handleUpdateRating(request.rating, sendResponse);
    return true;
  } else if (request.type === "updateAnnotation") {
    console.log("Annotation update requested:", request.annotationType, request.data);
    handleAnnotationUpdate(request.annotationType, request.data).then((response) => sendResponse(response)).catch((error) => sendResponse({ success: false, error: error.message }));
    return true;
  } else if (request.type === "trackPaper") {
    console.log("Track paper requested:", request);
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
      if (!paperData && enhancedProcessPaperUrl) {
        paperData = await enhancedProcessPaperUrl(request.url);
      }
    } else if (request.source === "arxiv" && originalProcessArxivUrl) {
      paperData = await originalProcessArxivUrl(request.url);
      if (paperData) {
        paperData.source = "arxiv";
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = formatPrimaryId("arxiv", paperData.arxivId);
      }
    } else if (enhancedProcessPaperUrl) {
      paperData = await enhancedProcessPaperUrl(request.url);
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
    console.error("Error updating rating:", error);
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
  if (pendingUrls.has(details.url)) {
    logger.info(`URL already being processed, skipping: ${details.url}`);
    return;
  }
  pendingUrls.add(details.url);
  try {
    const sourceInfo = MultiSourceDetector.detect(details.url);
    if (!sourceInfo) {
      logger.info("Not a recognized paper URL");
      return;
    }
    logger.info(`Detected paper: ${sourceInfo.type}:${sourceInfo.id}`);
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].id === details.tabId) {
      await handleTabChangeWithPlugins(tabs[0]);
    } else {
      const paperData = await processUnifiedPaperUrl(details.url);
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
function findPluginForUrl(url) {
  const plugins = pluginRegistry.getAll();
  for (const plugin of plugins) {
    for (const pattern of plugin.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        const id = plugin.extractId(url);
        if (id) {
          return {
            type: plugin.id,
            id,
            primary_id: plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id),
            plugin
          };
        }
      }
    }
  }
  return MultiSourceDetector.detect(url);
}
async function processUnifiedPaperUrl(url) {
  logger.info(`Processing paper URL: ${url}`);
  if (pendingUrls.has(url)) {
    logger.info(`URL already being processed in processUnifiedPaperUrl: ${url}`);
    return null;
  }
  pendingUrls.add(url);
  try {
    const sourceInfo = MultiSourceDetector.detect(url);
    if (!sourceInfo) {
      logger.info("Not a recognized paper URL in processor");
      return null;
    }
    let paperData;
    if (sourceInfo.type === "arxiv" && originalProcessArxivUrl) {
      paperData = await originalProcessArxivUrl(url);
      if (paperData) {
        paperData.source = "arxiv";
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = sourceInfo.primary_id;
      }
    } else if (enhancedProcessPaperUrl) {
      paperData = await enhancedProcessPaperUrl(url);
    }
    if (paperData) {
      logger.info(`Paper data extracted, creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await createGithubIssue(paperData);
      } catch (error) {
        logger.error(`Error creating GitHub issue: ${error}`);
      }
    }
    return paperData;
  } catch (error) {
    logger.error(`Error processing paper URL: ${error}`);
    return null;
  } finally {
    setTimeout(() => {
      pendingUrls.delete(url);
    }, 500);
  }
}
async function handleTabChangeWithPlugins(tab) {
  if (!tab.url) return;
  const sourceInfo = findPluginForUrl(tab.url);
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
  let paperData;
  if (sourceInfo.plugin) {
    const plugin = sourceInfo.plugin;
    if (plugin.hasApi && plugin.fetchApiData) {
      try {
        logger.info(`Using ${plugin.id} plugin API for tab`);
        const apiData = await plugin.fetchApiData(sourceInfo.id);
        if (Object.keys(apiData).length > 0) {
          paperData = {
            ...apiData,
            source: plugin.id,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: tab.url
          };
        }
      } catch (error) {
        logger.error(`Error using plugin API for tab: ${error}`);
      }
    }
  }
  if (!paperData) {
    if (sourceInfo.type === "arxiv" && originalProcessArxivUrl) {
      paperData = await originalProcessArxivUrl(tab.url);
      if (paperData) {
        paperData.source = "arxiv";
        paperData.sourceId = paperData.arxivId;
        paperData.primary_id = sourceInfo.primary_id;
      }
    } else if (enhancedProcessPaperUrl) {
      paperData = await enhancedProcessPaperUrl(tab.url);
    }
  }
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
      await enhancedCreateReadingEvent(currentPaperData, sessionData);
    }
    currentSession = null;
    currentPaperData = null;
    stopActivityTracking();
  }
}
function startActivityTracking() {
  if (!activityInterval) {
    console.log("Starting activity tracking");
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
async function enhancedCreateReadingEvent(paperData, sessionData) {
  if (!paperManager || !paperData) {
    console.error("Missing required data for creating reading event:", {
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
    } else if (paperData.arxivId) {
      paperData.source = "arxiv";
      paperData.sourceId = paperData.arxivId;
      paperData.primary_id = formatPrimaryId("arxiv", paperData.arxivId);
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
      logger.warning(`Legacy ID format detected in annotation: ${paperId}`);
      paperId = formatPrimaryId("arxiv", paperId);
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
    console.error("Error logging interaction:", error);
    throw error;
  }
}
async function parseXMLText(xmlText) {
  console.log("Parsing XML response...");
  try {
    const getTagContent = (tag, text) => {
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/;
      const entryMatch = text.match(entryRegex);
      if (entryMatch) {
        const entryContent = entryMatch[1];
        const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s");
        const match = entryContent.match(regex);
        return match ? match[1].trim() : "";
      }
      return "";
    };
    const getAuthors = (text) => {
      const authors = [];
      const regex = /<author>[^]*?<name>([^]*?)<\/name>[^]*?<\/author>/g;
      let match;
      while (match = regex.exec(text)) {
        authors.push(match[1].trim());
      }
      return authors;
    };
    const getCategories = (text) => {
      const categories = /* @__PURE__ */ new Set();
      const primaryMatch = text.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
      if (primaryMatch) {
        categories.add(primaryMatch[1]);
      }
      const categoryRegex = /<category[^>]*term="([^"]+)"/g;
      let match;
      while (match = categoryRegex.exec(text)) {
        categories.add(match[1]);
      }
      return Array.from(categories);
    };
    const getPublishedDate = (text) => {
      const match = text.match(/<published>([^<]+)<\/published>/);
      return match ? match[1].trim() : null;
    };
    const parsed = {
      title: getTagContent("title", xmlText),
      summary: getTagContent("summary", xmlText),
      authors: getAuthors(xmlText),
      published_date: getPublishedDate(xmlText),
      arxiv_tags: getCategories(xmlText)
    };
    console.log("Parsed XML:", parsed);
    return parsed;
  } catch (error) {
    console.error("Error parsing XML:", error);
    return null;
  }
}
async function processArxivUrl(url) {
  console.log("Processing URL:", url);
  let arxivId = null;
  const match = url.match(/arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/);
  if (match) {
    arxivId = match[2];
  }
  if (!arxivId) {
    console.log("No arXiv ID found in URL");
    return null;
  }
  console.log("Found arXiv ID:", arxivId);
  try {
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
    console.log("Fetching from arXiv API:", apiUrl);
    const response = await fetch(apiUrl);
    console.log("API response status:", response.status);
    if (!response.ok) {
      throw new Error(`ArXiv API error: ${response.status}`);
    }
    const text = await response.text();
    const parsed = await parseXMLText(text);
    if (!parsed) {
      console.log("Failed to parse API response");
      return null;
    }
    const paperData = {
      arxivId,
      source: "arxiv",
      sourceId: arxivId,
      primary_id: formatPrimaryId("arxiv", arxivId),
      url,
      title: parsed.title,
      authors: parsed.authors.join(", "),
      abstract: parsed.summary,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rating: "novote",
      published_date: parsed.published_date,
      arxiv_tags: parsed.arxiv_tags
    };
    console.log("Paper data processed:", paperData);
    return paperData;
  } catch (error) {
    console.error("Error processing arXiv URL:", error);
    return null;
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
  console.log("Debug objects registered, access via __DEBUG__ in service worker console");
}
//# sourceMappingURL=background.bundle.js.map
