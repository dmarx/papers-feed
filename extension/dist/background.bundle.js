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
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/
    ],
    id_extractors: [
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
function getLegacyId(primaryId) {
  if (!primaryId.includes(".")) {
    return primaryId;
  }
  const { type, id } = parseId(primaryId);
  if (type === "arxiv") {
    return id;
  }
  return primaryId;
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

const isInteractionLogJs = (data) => {
  return typeof data === "object" && data !== null && typeof data.paper_id === "string" && Array.isArray(data.interactions);
};
class PaperManager {
  constructor(client) {
    this.client = client;
  }
  /**
   * Get or create a paper record
   * Enhanced to support multiple sources with backward compatibility
   */
  async getOrCreatePaper(paperData) {
    let objectId;
    let useNewFormat = false;
    if (paperData.primary_id) {
      objectId = `paper:${paperData.primary_id}`;
      useNewFormat = true;
    } else if (paperData.source && paperData.sourceId) {
      const primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      paperData.primary_id = primary_id;
      objectId = `paper:${primary_id}`;
      useNewFormat = true;
    } else if (paperData.arxivId) {
      objectId = `paper:${paperData.arxivId}`;
      useNewFormat = false;
    } else {
      throw new Error("Invalid paper data: missing ID information");
    }
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      if (!useNewFormat || data.primary_id) {
        return data;
      }
      if (data.arxivId && !data.primary_id) {
        const enhancedData = {
          ...data,
          source: "arxiv",
          sourceId: data.arxivId,
          primary_id: formatPrimaryId("arxiv", data.arxivId)
        };
        await this.client.updateObject(objectId, enhancedData);
        return enhancedData;
      }
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        let defaultPaperData;
        if (useNewFormat) {
          defaultPaperData = {
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
        } else {
          defaultPaperData = {
            arxivId: paperData.arxivId,
            url: paperData.url || `https://arxiv.org/abs/${paperData.arxivId}`,
            title: paperData.title || paperData.arxivId,
            authors: paperData.authors || "",
            abstract: paperData.abstract || "",
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            rating: "novote",
            published_date: paperData.published_date || "",
            arxiv_tags: paperData.arxiv_tags || []
          };
        }
        await this.client.createObject(objectId, defaultPaperData);
        return defaultPaperData;
      }
      throw error;
    }
  }
  /**
   * Get or create an interaction log
   * Enhanced with backward compatibility for legacy arXiv IDs
   */
  async getOrCreateInteractionLog(paperId) {
    const legacyId = getLegacyId(paperId);
    const objectId = `interactions:${legacyId}`;
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
          // Store the full ID including prefix if present
          interactions: []
        };
        if (paperId !== legacyId) {
          newLog.legacy_id = legacyId;
        }
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      throw error;
    }
  }
  /**
   * Log a reading session for a paper
   * Enhanced to work with both legacy and new IDs
   */
  async logReadingSession(paperId, session, paperData) {
    let primaryId = paperId;
    let enhancedPaperData = paperData || {};
    if (!isNewFormat(paperId) && !enhancedPaperData.primary_id) {
      primaryId = formatPrimaryId("arxiv", paperId);
      enhancedPaperData = {
        ...enhancedPaperData,
        source: "arxiv",
        sourceId: paperId,
        primary_id: primaryId,
        arxivId: paperId
      };
    }
    if (Object.keys(enhancedPaperData).length > 0) {
      await this.getOrCreatePaper(enhancedPaperData);
    }
    await this.addInteraction(paperId, {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
    });
  }
  /**
   * Log an annotation for a paper
   * Enhanced to work with both legacy and new IDs
   */
  async logAnnotation(paperId, key, value, paperData) {
    let primaryId = paperId;
    let enhancedPaperData = paperData || {};
    if (!isNewFormat(paperId) && !enhancedPaperData.primary_id) {
      primaryId = formatPrimaryId("arxiv", paperId);
      enhancedPaperData = {
        ...enhancedPaperData,
        source: "arxiv",
        sourceId: paperId,
        primary_id: primaryId,
        arxivId: paperId
      };
    }
    if (Object.keys(enhancedPaperData).length > 0) {
      await this.getOrCreatePaper(enhancedPaperData);
    }
    await this.addInteraction(paperId, {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    });
  }
  /**
   * Update a paper's rating
   * Enhanced to work with both legacy and new IDs
   */
  async updateRating(paperId, rating, paperData) {
    let primaryId = paperId;
    let enhancedPaperData = paperData || {};
    if (!isNewFormat(paperId) && !enhancedPaperData.primary_id) {
      primaryId = formatPrimaryId("arxiv", paperId);
      enhancedPaperData = {
        ...enhancedPaperData,
        source: "arxiv",
        sourceId: paperId,
        primary_id: primaryId,
        arxivId: paperId
      };
    }
    const paper = await this.getOrCreatePaper(enhancedPaperData);
    const objectId = isNewFormat(primaryId) ? `paper:${primaryId}` : `paper:${paperId}`;
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
   * Enhanced with backward compatibility
   */
  async addInteraction(paperId, interaction) {
    const log = await this.getOrCreateInteractionLog(paperId);
    log.interactions.push(interaction);
    const legacyId = getLegacyId(paperId);
    await this.client.updateObject(`interactions:${legacyId}`, log);
  }
  // Rest of the methods (getInteractions, getPaperReadingTime, etc.) can remain unchanged
  // as they'll work with the enhanced getOrCreateInteractionLog method
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
  async getPaperReadingTime(paperId) {
    const interactions = await this.getInteractions(paperId, { type: "reading_session" });
    return interactions.reduce((total, i) => {
      console.log("Calculating from interaction:", i);
      const data = i.data;
      if (typeof data === "object" && data !== null && "duration_seconds" in data) {
        return total + data.duration_seconds;
      }
      return total;
    }, 0);
  }
  async getPaperHistory(paperId) {
    const objectId = `paper:${getLegacyId(paperId)}`;
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

async function extractMetadataFromPage(tabId) {
  try {
    const result = await chrome.tabs.executeScript(tabId, {
      code: `
        (function() {
          try {
            // Try to extract from common meta tags first
            const metadata = {
              title: document.querySelector('meta[name="citation_title"]')?.content ||
                     document.querySelector('meta[property="og:title"]')?.content ||
                     document.title,
              authors: document.querySelector('meta[name="citation_author"]')?.content ||
                       document.querySelector('meta[name="citation_authors"]')?.content ||
                       document.querySelector('meta[name="author"]')?.content,
              abstract: document.querySelector('meta[name="description"]')?.content ||
                        document.querySelector('meta[property="og:description"]')?.content ||
                        document.querySelector('meta[name="citation_abstract"]')?.content,
              published_date: document.querySelector('meta[name="citation_publication_date"]')?.content ||
                              document.querySelector('meta[name="citation_date"]')?.content,
              doi: document.querySelector('meta[name="citation_doi"]')?.content,
              url: document.querySelector('meta[property="og:url"]')?.content || window.location.href,
              citations: null
            };
            
            // Source-specific extraction fallbacks
            if (!metadata.title) {
              const h1 = document.querySelector('h1');
              if (h1) metadata.title = h1.textContent.trim();
            }
            
            if (!metadata.abstract) {
              // Try common abstract containers
              const abstractEl = document.querySelector('.abstract') || 
                                document.querySelector('#abstract') ||
                                document.querySelector('[class*="abstract"]') ||
                                document.querySelector('[id*="abstract"]');
              if (abstractEl) metadata.abstract = abstractEl.textContent.trim();
            }
            
            // DOI-specific extraction
            if (!metadata.doi && window.location.href.includes('doi.org')) {
              const match = window.location.href.match(/doi\\.org\\/(10\\.[0-9.]+\\/[^\\s&/?#]+[^\\s&/?#.:])/);
              if (match) metadata.doi = match[1];
            }
            
            // ACM-specific extraction
            if (window.location.href.includes('dl.acm.org')) {
              // Try to get citation count
              const citationEl = document.querySelector('.citation-metrics');
              if (citationEl) {
                const citText = citationEl.textContent;
                const citMatch = citText?.match(/(\\d+)\\s+citations/i);
                if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
              }
              
              // Try to extract DOI from URL or page
              if (!metadata.doi) {
                const doiMatch = window.location.href.match(/dl\\.acm\\.org\\/doi\\/(10\\.[0-9.]+\\/[^\\s&/?#]+[^\\s&/?#.:])/);
                if (doiMatch) metadata.doi = doiMatch[1];
              }
            }
            
            // Semantic Scholar specific extraction
            if (window.location.href.includes('semanticscholar.org')) {
              // Try to get citation count
              const citationEl = document.querySelector('[data-test-id="citation-count"]');
              if (citationEl) {
                const citText = citationEl.textContent;
                const citMatch = citText?.match(/(\\d+)/);
                if (citMatch) metadata.citations = parseInt(citMatch[1], 10);
              }
              
              // Format authors if found in a specific format
              const authorElements = document.querySelectorAll('[data-test-id="author-list"] a');
              if (authorElements.length > 0) {
                metadata.authors = Array.from(authorElements)
                  .map(el => el.textContent?.trim())
                  .filter(Boolean)
                  .join(', ');
              }
            }
            
            return metadata;
          } catch (e) {
            console.error('Error extracting metadata:', e);
            return null;
          }
        })();
      `
    });
    if (result && result[0]) {
      return result[0];
    }
  } catch (error) {
    console.error("Error executing metadata extraction script:", error);
  }
  return null;
}
async function processPaperUrl$1(url, processArxivUrl) {
  console.log("Processing URL for multiple sources:", url);
  const sourceInfo = MultiSourceDetector.detect(url);
  if (!sourceInfo) {
    console.log("No paper source detected, falling back to arXiv-only processing");
    return processArxivUrl ? processArxivUrl(url) : null;
  }
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  console.log(`Detected ${sourceType} paper with ID: ${sourceId}`);
  let paperData = {
    source: sourceType,
    sourceId,
    primary_id,
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
        if (metadata.citations) {
          paperData.citations = metadata.citations;
        }
      } else {
        paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
      }
    } else {
      paperData.title = `${sourceType.toUpperCase()} Paper: ${sourceId}`;
    }
  } catch (error) {
    console.error("Error extracting metadata:", error);
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
  console.log("Processed paper data:", paperData);
  return paperData;
}

// extension/background_multi_source.js
// Extension to support multiple paper sources


/**
 * Enhanced version of processArxivUrl that supports multiple sources
 * 
 * @param {string} url - URL to process
 * @returns {Promise<Object|null>} - Paper data or null
 */
async function processPaperUrl(url) {
  console.log('Multi-source processing for URL:', url);
  
  // Use detector to identify paper source
  const sourceInfo = MultiSourceDetector.detect(url);
  
  // If not a recognized paper URL, exit
  if (!sourceInfo) {
    console.log('No recognized paper source detected in URL');
    
    // Try legacy arXiv detection as fallback - this will be provided by the background script
    if (typeof processArxivUrl === 'function') {
      return processArxivUrl(url);
    }
    return null;
  }
  
  console.log('Detected paper source:', sourceInfo);
  
  const { type: sourceType, id: sourceId, primary_id } = sourceInfo;
  
  // For arXiv, use the existing well-tested processor if available
  if (sourceType === 'arxiv' && typeof processArxivUrl === 'function') {
    const paperData = await processArxivUrl(url);
    
    // Enhance with multi-source fields if successful
    if (paperData) {
      paperData.source = 'arxiv';
      paperData.sourceId = paperData.arxivId;
      paperData.primary_id = primary_id;
    }
    
    return paperData;
  }
  
  // Delegate to the TypeScript implementation in papers/process_paper_url.ts
  // This uses the imported processUrl function
  try {
    const paperData = await processPaperUrl$1(url);
    return paperData;
  } catch (error) {
    console.error('Error processing paper URL:', error);
    
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
}

/**
 * Setup listener for new paper sources
 */
function setupMultiSourceListener() {
  // Create a new listener for additional paper sources
  chrome.webNavigation.onCompleted.addListener(async (details) => {
    console.log('Multi-source navigation detected:', details.url);
    
    // Skip arXiv URLs which are handled by the original listener
    if (details.url.includes('arxiv.org')) {
      return;
    }
    
    // Process other paper URLs
    const paperData = await processPaperUrl(details.url);
    if (paperData) {
      console.log('Paper data extracted:', paperData);
      
      // Create or update paper in storage
      // The createGithubIssue function will be provided by the background script
      if (typeof createGithubIssue === 'function') {
        await createGithubIssue(paperData);
      } else {
        console.error('createGithubIssue function not available');
      }
    }
  }, {
    url: [
      { hostSuffix: 'semanticscholar.org' },
      { hostSuffix: 'doi.org' },
      { hostSuffix: 'dl.acm.org' },
      { hostSuffix: 'openreview.net' }
    ]
  });
  
  console.log('Multi-source paper detection enabled');
}

/**
 * Enhanced tab change handler for multiple sources
 * 
 * @param {Object} tab - Current tab data
 * @param {Function} originalHandler - Original handler for legacy support
 */
async function enhancedHandleTabChange(tab, originalHandler) {
  const url = tab?.url || '';
  
  // Use detector to identify paper source
  const sourceInfo = MultiSourceDetector.detect(url);
  const isPaperUrl = !!sourceInfo;
  
  console.log('Tab change detected:', { isPaperUrl, url, sourceInfo });
  
  if (!isPaperUrl) {
    console.log('Not a recognized paper page, ending current session');
    
    // The endCurrentSession function will be provided by the background script
    if (typeof endCurrentSession === 'function') {
      await endCurrentSession();
    }
    return;
  }
  
  // For arXiv papers, use the original handler for full compatibility
  if (sourceInfo.type === 'arxiv' && originalHandler) {
    return originalHandler(tab);
  }
  
  // Background script variables/functions that we need to access
  if (typeof currentSession !== 'undefined' && currentSession) {
    console.log('Ending existing session before starting new one');
    if (typeof endCurrentSession === 'function') {
      await endCurrentSession();
    }
  }
  
  console.log('Processing paper URL for new session');
  const paperData = await processPaperUrl(url);
  
  if (paperData && typeof ReadingSession === 'function' && typeof sessionConfig !== 'undefined') {
    // Use appropriate ID based on availability - maintaining backward compatibility
    const trackingId = paperData.arxivId || paperData.sourceId;
    
    console.log('Starting new session for:', trackingId);
    
    // Set currentPaperData and currentSession - these are global variables in the background script
    if (typeof currentSession !== 'undefined') {
      currentSession = new ReadingSession(trackingId, sessionConfig);
      const metadata = currentSession.getMetadata();
      console.log('New session created:', metadata);
      
      if (typeof startActivityTracking === 'function') {
        startActivityTracking();
      }
    }
    
    if (typeof currentPaperData !== 'undefined') {
      currentPaperData = paperData;
    }
    
    return paperData;
  }
  
  return null;
}

/**
 * Initialize the multi-source support
 */
function initMultiSourceSupport() {
  // Setup listener for additional paper sources
  setupMultiSourceListener();
  
  console.log('Multi-source paper support initialized');
  
  // Return overrides that can be applied to the main module
  return {
    processPaperUrl,
    enhancedHandleTabChange
  };
}

// background.js

let githubToken = '';
let githubRepo = '';
let currentPaperData$1 = null;
let currentSession$1 = null;
let activityInterval = null;
let sessionConfig$1 = null;
let paperManager = null;

// Store references to functions that will be enhanced
let originalHandleTabChange = null;
let enhancedTabChangeHandler = null;

let ReadingSession$1 = class ReadingSession {
    constructor(arxivId, config) {
       this.arxivId = arxivId;
       this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
       this.startTime = new Date();
       this.activeTime = 0;
       this.idleTime = 0;
       this.lastActiveTime = new Date();
       this.isTracking = true;
       this.config = config;
       this.endTime = null;
       this.finalizedData = null;
    }
    
    update() {
       if (this.isTracking && !this.finalizedData) {
           const now = new Date();
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
       this.endTime = new Date();
       const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
    
       if (this.activeTime >= this.config.minSessionDuration) {
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
    
    end() {
       return this.finalize();
    }
    
    getMetadata() {
       return {
           sessionId: this.sessionId,
           startTime: this.startTime.toISOString(),
           activeSeconds: Math.round(this.activeTime / 1000),
           idleSeconds: Math.round(this.idleTime / 1000)
       };
    }
};

// Load credentials and configuration when extension starts
async function loadCredentials() {
    const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
    githubToken = items.githubToken || '';
    githubRepo = items.githubRepo || '';
    console.log('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
    
    // Initialize paper manager if we have credentials
    if (githubToken && githubRepo) {
        const githubClient = new f(githubToken, githubRepo);
        paperManager = new PaperManager(githubClient);
        console.log('Paper manager initialized');
    }
    
    // Load session configuration
    sessionConfig$1 = getConfigurationInMs(await loadSessionConfig());
    console.log('Session configuration loaded:', sessionConfig$1);

    // Initialize multi-source support
    enhancedInitialization();
    
    // Initialize debug objects after everything is loaded
    initializeDebugObjects();
}

// Initialize multi-source support
function enhancedInitialization() {
    // Save original functions for compatibility
    originalHandleTabChange = handleTabChange;
    
    // Initialize multi-source support
    const { enhancedHandleTabChange } = initMultiSourceSupport();
    
    // Store enhanced functions
    enhancedTabChangeHandler = enhancedHandleTabChange;
    
    // Debug information
    console.log('Multi-source paper support initialized');
}

// Listen for credential changes
chrome.storage.onChanged.addListener(async (changes) => {
    console.log('Storage changes detected:', Object.keys(changes));
    if (changes.githubToken) {
        githubToken = changes.githubToken.newValue;
    }
    if (changes.githubRepo) {
        githubRepo = changes.githubRepo.newValue;
    }
    if (changes.sessionConfig) {
        sessionConfig$1 = getConfigurationInMs(changes.sessionConfig.newValue);
        console.log('Session configuration updated:', sessionConfig$1);
    }
    
    // Reinitialize paper manager if credentials changed
    if (changes.githubToken || changes.githubRepo) {
        if (githubToken && githubRepo) {
            const githubClient = new f(githubToken, githubRepo);
            paperManager = new PaperManager(githubClient);
            console.log('Paper manager reinitialized');
        }
    }
});

// Initialize credentials
loadCredentials();

// Message passing between background and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received:', request);
    
    if (request.type === 'getCurrentPaper') {
        console.log('Popup requested current paper:', currentPaperData$1);
        sendResponse(currentPaperData$1);
    }
    else if (request.type === 'updateRating') {
        console.log('Rating update requested:', request.rating);
        handleUpdateRating(request.rating, sendResponse);
        return true; // Will respond asynchronously
    }
    else if (request.type === 'updateAnnotation') {
        console.log('Annotation update requested:', request.annotationType, request.data);
        handleAnnotationUpdate(request.annotationType, request.data)
            .then(response => sendResponse(response))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Will respond asynchronously
    }
    return true;
});

async function handleUpdateRating(rating, sendResponse) {
    if (!paperManager) {
        sendResponse({ success: false, error: 'Paper manager not initialized' });
        return;
    }

    if (!currentPaperData$1) {
        sendResponse({ success: false, error: 'No current paper' });
        return;
    }

    try {
        const paperId = currentPaperData$1.arxivId || currentPaperData$1.sourceId;
        await paperManager.updateRating(paperId, rating, currentPaperData$1);
        currentPaperData$1.rating = rating;
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error updating rating:', error);
        sendResponse({ success: false, error: error.message });
    }
}

// Tab and window management
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    // Use enhanced tab change handler if available, otherwise fall back to original
    if (enhancedTabChangeHandler) {
        enhancedTabChangeHandler(tab, originalHandleTabChange);
    } else {
        handleTabChange(tab);
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        // Use enhanced tab change handler if available, otherwise fall back to original
        if (enhancedTabChangeHandler) {
            enhancedTabChangeHandler(tab, originalHandleTabChange);
        } else {
            handleTabChange(tab);
        }
    }
});

chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        endCurrentSession$1();
    }
});

// Listen for URL changes
chrome.webNavigation.onCompleted.addListener(async (details) => {
    console.log('Navigation detected:', details.url);
    if (details.url.includes('arxiv.org')) {
        console.log('arXiv URL detected, processing...');
        const paperData = await processArxivUrl$1(details.url);
        if (paperData) {
            console.log('Paper data extracted:', paperData);
            await createGithubIssue$1(paperData);
        } else {
            console.log('Failed to extract paper data');
        }
    }
}, {
    url: [{
        hostSuffix: 'arxiv.org'
    }]
});

// Original handleTabChange function
async function handleTabChange(tab) {
    const isArxiv = tab.url?.includes('arxiv.org/');
    console.log('Tab change detected:', { isArxiv, url: tab.url });
    
    if (!isArxiv) {
        console.log('Not an arXiv page, ending current session');
        await endCurrentSession$1();
        return;
    }

    if (currentSession$1) {
        console.log('Ending existing session before starting new one');
        await endCurrentSession$1();
    }

    console.log('Processing arXiv URL for new session');
    currentPaperData$1 = await processArxivUrl$1(tab.url);
    if (currentPaperData$1) {
        console.log('Starting new session for:', currentPaperData$1.arxivId);
        currentSession$1 = new ReadingSession$1(currentPaperData$1.arxivId, sessionConfig$1);
        const metadata = currentSession$1.getMetadata();
        console.log('New session created:', metadata);
        startActivityTracking$1();
    }
}

async function endCurrentSession$1() {
    if (currentSession$1 && currentPaperData$1) {
        console.log('Ending session for:', currentPaperData$1.arxivId || currentPaperData$1.sourceId);
        const sessionData = currentSession$1.finalize();
        if (sessionData) {
            console.log('Creating reading event:', sessionData);
            await enhancedCreateReadingEvent(currentPaperData$1, sessionData);
        }
        currentSession$1 = null;
        currentPaperData$1 = null;
        stopActivityTracking();
    }
}

function startActivityTracking$1() {
    if (!activityInterval) {
        console.log('Starting activity tracking');
        activityInterval = setInterval(() => {
            if (currentSession$1) {
                currentSession$1.update();
            }
        }, sessionConfig$1.activityUpdateInterval);
    }
}

function stopActivityTracking() {
    if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
    }
}

// Enhanced createReadingEvent function for multi-source support
async function enhancedCreateReadingEvent(paperData, sessionData) {
    if (!paperManager || !paperData) {
        console.error('Missing required data for creating reading event:', {
            hasPaperManager: !!paperManager,
            hasPaperData: !!paperData
        });
        return;
    }

    try {
        // Determine which ID to use for logging
        const paperIdForLogging = paperData.arxivId || 
                            (paperData.source && paperData.sourceId ? 
                            paperData.sourceId : 
                            null);
        
        if (!paperIdForLogging) {
            console.error('No valid paper ID found for logging');
            return;
        }
        
        await paperManager.logReadingSession(
            paperIdForLogging,
            sessionData,
            paperData
        );
        
        console.log('Reading session logged:', {
            paperId: paperIdForLogging,
            sessionId: sessionData.session_id,
            activeTime: sessionData.duration_seconds,
            idleTime: sessionData.idle_seconds,
            totalTime: sessionData.total_elapsed_seconds
        });
        
    } catch (error) {
        console.error('Error logging reading session:', error);
    }
}

async function createGithubIssue$1(paperData) {
    if (!paperManager) {
        console.error('Paper manager not initialized');
        return;
    }

    try {
        const existingPaper = await paperManager.getOrCreatePaper(paperData);
        console.log('Paper metadata stored/retrieved:', existingPaper.arxivId || existingPaper.sourceId);
        return existingPaper;
    } catch (error) {
        console.error('Error handling paper metadata:', error);
    }
}

async function handleAnnotationUpdate(type, data) {
    if (!paperManager) {
        throw new Error('Paper manager not initialized');
    }

    try {
        const paperData = data.title ? {
            title: data.title,
            source: data.source
        } : undefined;

        if (type === 'vote') {
            await paperManager.updateRating(
                data.paperId,
                data.vote,
                paperData
            );
        } else {
            await paperManager.logAnnotation(
                data.paperId,
                'notes',
                data.notes,
                paperData
            );
        }

        return { success: true };
    } catch (error) {
        console.error('Error logging interaction:', error);
        throw error;
    }
}

async function parseXMLText(xmlText) {
    console.log('Parsing XML response...');
    try {
        const getTagContent = (tag, text) => {
            const entryRegex = /<entry>([\s\S]*?)<\/entry>/;
            const entryMatch = text.match(entryRegex);
            
            if (entryMatch) {
                const entryContent = entryMatch[1];
                const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
                const match = entryContent.match(regex);
                return match ? match[1].trim() : '';
            }
            return '';
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
            const categories = new Set();
            
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
            title: getTagContent('title', xmlText),
            summary: getTagContent('summary', xmlText),
            authors: getAuthors(xmlText),
            published_date: getPublishedDate(xmlText),
            arxiv_tags: getCategories(xmlText)
        };
        
        console.log('Parsed XML:', parsed);
        return parsed;
    } catch (error) {
        console.error('Error parsing XML:', error);
        return null;
    }
}

async function processArxivUrl$1(url) {
    console.log('Processing URL:', url);
    
    let arxivId = null;
    const match = url.match(/arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/);
    if (match) {
        arxivId = match[2];
    }
    
    if (!arxivId) {
        console.log('No arXiv ID found in URL');
        return null;
    }
    
    console.log('Found arXiv ID:', arxivId);
    
    try {
        const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
        console.log('Fetching from arXiv API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`ArXiv API error: ${response.status}`);
        }
        
        const text = await response.text();
        const parsed = await parseXMLText(text);
        
        if (!parsed) {
            console.log('Failed to parse API response');
            return null;
        }
        
        const paperData = {
            arxivId,
            url,
            title: parsed.title,
            authors: parsed.authors.join(", "),
            abstract: parsed.summary,
            timestamp: new Date().toISOString(),
            rating: 'novote',
            published_date: parsed.published_date,
            arxiv_tags: parsed.arxiv_tags
        };
        
        console.log('Paper data processed:', paperData);
        return paperData;
    } catch (error) {
        console.error('Error processing arXiv URL:', error);
        return null;
    }
}

// Initialize debug objects in service worker scope
function initializeDebugObjects() {
    // Don't use window in service worker context
    self.__DEBUG__ = {
        get paperManager() { return paperManager; },
        getGithubClient: () => paperManager?.client,
        getCurrentPaper: () => currentPaperData$1,
        getCurrentSession: () => currentSession$1,
        getConfig: () => sessionConfig$1
    };

    console.log('Debug objects registered, access via __DEBUG__ in service worker console');
}
//# sourceMappingURL=background.bundle.js.map
