var u=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:true}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var h=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new u(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i={type:"initial_state",data:s,timestamp:new Date().toISOString()},a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0];return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(s,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),o=new Date(r.updated_at);if(o>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:o,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let o=JSON.parse(a.body);i.push({timestamp:a.created_at,type:o.type||"update",data:o.data||o,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

const isReadingSession = (data) => {
  const session = data;
  return typeof session === "object" && session !== null && typeof session.session_id === "string" && typeof session.duration_seconds === "number" && typeof session.idle_seconds === "number" && typeof session.start_time === "string" && typeof session.end_time === "string" && typeof session.total_elapsed_seconds === "number";
};
const isInteractionLog = (data) => {
  const log = data;
  return typeof log === "object" && log !== null && typeof log.paper_id === "string" && Array.isArray(log.interactions);
};

class PaperManager {
  constructor(client) {
    this.client = client;
  }
  async getOrCreatePaper(paperData) {
    const objectId = `paper:${paperData.arxivId}`;
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        const defaultPaperData = {
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
        await this.client.createObject(objectId, defaultPaperData);
        return defaultPaperData;
      }
      throw error;
    }
  }
  async getOrCreateInteractionLog(arxivId) {
    const objectId = `interactions:${arxivId}`;
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
          paper_id: arxivId,
          interactions: []
        };
        await this.client.createObject(objectId, newLog);
        return newLog;
      }
      throw error;
    }
  }
  async logReadingSession(arxivId, session, paperData) {
    if (paperData) {
      await this.getOrCreatePaper({
        arxivId,
        ...paperData
      });
    }
    await this.addInteraction(arxivId, {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
    });
  }
  async logAnnotation(arxivId, key, value, paperData) {
    if (paperData) {
      await this.getOrCreatePaper({
        arxivId,
        ...paperData
      });
    }
    await this.addInteraction(arxivId, {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    });
  }
  async updateRating(arxivId, rating, paperData) {
    const paper = await this.getOrCreatePaper({
      arxivId,
      ...paperData
    });
    await this.client.updateObject(`paper:${arxivId}`, {
      ...paper,
      rating
    });
    await this.addInteraction(arxivId, {
      type: "rating",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { rating }
    });
  }
  async addInteraction(arxivId, interaction) {
    const log = await this.getOrCreateInteractionLog(arxivId);
    log.interactions.push(interaction);
    await this.client.updateObject(`interactions:${arxivId}`, log);
  }
  async getInteractions(arxivId, options = {}) {
    try {
      const log = await this.getOrCreateInteractionLog(arxivId);
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
  async getPaperReadingTime(arxivId) {
    const interactions = await this.getInteractions(arxivId, { type: "reading_session" });
    return interactions.reduce((total, i) => {
      if (isReadingSession(i.data)) {
        return total + i.data.duration_seconds;
      }
      return total;
    }, 0);
  }
  async getPaperHistory(arxivId) {
    const objectId = `paper:${arxivId}`;
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

// background.js

let githubToken = '';
let githubRepo = '';
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let sessionConfig = null;
let paperManager = null;

class ReadingSession {
    constructor(arxivId, config) {
        this.arxivId = arxivId;
        this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        this.startTime = new Date();
        this.activeTime = 0;
        this.idleTime = 0;
        this.lastActiveTime = new Date();
        this.isTracking = true;
        this.config = config;
    }

    update() {
        if (this.isTracking) {
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

    end() {
        this.update();
        this.isTracking = false;
        
        const endTime = new Date();
        const totalElapsed = endTime.getTime() - this.startTime.getTime();
        
        if (this.activeTime >= this.config.minSessionDuration) {
            return {
                session_id: this.sessionId,
                duration_seconds: Math.round(this.activeTime / 1000),
                idle_seconds: Math.round(this.idleTime / 1000),
                start_time: this.startTime.toISOString(),
                end_time: endTime.toISOString(),
                total_elapsed_seconds: Math.round(totalElapsed / 1000)
            };
        }
        
        return null;
    }

    getMetadata() {
        return {
            sessionId: this.sessionId,
            startTime: this.startTime.toISOString(),
            activeSeconds: Math.round(this.activeTime / 1000),
            idleSeconds: Math.round(this.idleTime / 1000)
        };
    }
}

// Load credentials and configuration when extension starts
async function loadCredentials() {
    const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
    githubToken = items.githubToken || '';
    githubRepo = items.githubRepo || '';
    console.log('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
    
    // Initialize paper manager if we have credentials
    if (githubToken && githubRepo) {
        const githubClient = new h(githubToken, githubRepo);
        paperManager = new PaperManager(githubClient);
        console.log('Paper manager initialized');
    }
    
    // Load session configuration
    sessionConfig = getConfigurationInMs(await loadSessionConfig());
    console.log('Session configuration loaded:', sessionConfig);

    // Initialize debug objects after everything is loaded
    initializeDebugObjects();
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
        sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
        console.log('Session configuration updated:', sessionConfig);
    }
    
    // Reinitialize paper manager if credentials changed
    if (changes.githubToken || changes.githubRepo) {
        if (githubToken && githubRepo) {
            const githubClient = new h(githubToken, githubRepo);
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
        console.log('Popup requested current paper:', currentPaperData);
        sendResponse(currentPaperData);
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

    if (!currentPaperData) {
        sendResponse({ success: false, error: 'No current paper' });
        return;
    }

    try {
        await paperManager.updateRating(currentPaperData.arxivId, rating, currentPaperData);
        currentPaperData.rating = rating;
        sendResponse({ success: true });
    } catch (error) {
        console.error('Error updating rating:', error);
        sendResponse({ success: false, error: error.message });
    }
}

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
        endCurrentSession();
    }
});

// Listen for URL changes
chrome.webNavigation.onCompleted.addListener(async (details) => {
    console.log('Navigation detected:', details.url);
    if (details.url.includes('arxiv.org')) {
        console.log('arXiv URL detected, processing...');
        const paperData = await processArxivUrl(details.url);
        if (paperData) {
            console.log('Paper data extracted:', paperData);
            await createGithubIssue(paperData);
        } else {
            console.log('Failed to extract paper data');
        }
    }
}, {
    url: [{
        hostSuffix: 'arxiv.org'
    }]
});

async function handleTabChange(tab) {
    const isArxiv = tab.url?.includes('arxiv.org/');
    console.log('Tab change detected:', { isArxiv, url: tab.url });
    
    if (!isArxiv) {
        console.log('Not an arXiv page, ending current session');
        await endCurrentSession();
        return;
    }

    if (currentSession) {
        console.log('Ending existing session before starting new one');
        await endCurrentSession();
    }

    console.log('Processing arXiv URL for new session');
    currentPaperData = await processArxivUrl(tab.url);
    if (currentPaperData) {
        console.log('Starting new session for:', currentPaperData.arxivId);
        currentSession = new ReadingSession(currentPaperData.arxivId, sessionConfig);
        const metadata = currentSession.getMetadata();
        console.log('New session created:', metadata);
        startActivityTracking();
    }
}

async function endCurrentSession() {
    if (currentSession && currentPaperData) {
        console.log('Ending session for:', currentPaperData.arxivId);
        const sessionData = currentSession.end();
        if (sessionData) {
            console.log('Creating reading event:', sessionData);
            await createReadingEvent(currentPaperData, sessionData);
        }
        currentSession = null;
        currentPaperData = null;
        stopActivityTracking();
    }
}

function startActivityTracking() {
    if (!activityInterval) {
        console.log('Starting activity tracking');
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
        console.error('Missing required data for creating reading event:', {
            hasPaperManager: !!paperManager,
            hasPaperData: !!paperData
        });
        return;
    }

    try {
        await paperManager.logReadingSession(
            paperData.arxivId,
            sessionData,
            paperData
        );
        console.log('Reading session logged:', {
            arxivId: paperData.arxivId,
            sessionId: sessionData.session_id,
            activeTime: sessionData.duration_seconds,
            idleTime: sessionData.idle_seconds,
            totalTime: sessionData.total_elapsed_seconds
        });
        
        const totalTime = await paperManager.getPaperReadingTime(paperData.arxivId);
        console.log('Total reading time across all sessions:', totalTime, 'seconds');
    } catch (error) {
        console.error('Error logging reading session:', error);
    }
}

async function createGithubIssue(paperData) {
    if (!paperManager) {
        console.error('Paper manager not initialized');
        return;
    }

    try {
        const existingPaper = await paperManager.getOrCreatePaper(paperData);
        console.log('Paper metadata stored/retrieved:', existingPaper.arxivId);
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

async function processArxivUrl(url) {
    console.log('Processing URL:', url);
    
    const patterns = [
        /arxiv\.org\/abs\/([0-9.]+)/,
        /arxiv\.org\/pdf\/([0-9.]+)\.pdf/,
        /arxiv\.org\/\w+\/([0-9.]+)/
    ];
    
    let arxivId = null;
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) {
            arxivId = match[1];
            break;
        }
    }
    
    if (!arxivId) {
        console.log('No arXiv ID found in URL');
        return null;
    }
    
    console.log('Found arXiv ID:', arxivId);
    
    try {
        const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
        console.log('Fetching from arXiv API:', apiUrl);
        
        const response = await fetch(apiUrl);
        console.log('API response status:', response.status);
        
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
    // @ts-ignore
    globalThis.__DEBUG__ = {
        get paperManager() { return paperManager; },
        getGithubClient: () => paperManager?.client,
        getCurrentPaper: () => currentPaperData,
        getCurrentSession: () => currentSession,
        getConfig: () => sessionConfig
    };

    console.log('Debug objects registered, access via __DEBUG__ in service worker console');
}
//# sourceMappingURL=background.bundle.js.map
