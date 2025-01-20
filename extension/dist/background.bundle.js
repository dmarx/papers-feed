var u=class{constructor(t,e,s={}){this.token=t,this.repo=e,this.config={baseLabel:s.baseLabel??"stored-object",uidPrefix:s.uidPrefix??"UID:",reactions:{processed:s.reactions?.processed??"+1",initialState:s.reactions?.initialState??"rocket"}};}async fetchFromGitHub(t,e={}){let s=new URL(`https://api.github.com/repos/${this.repo}${t}`);e.params&&(Object.entries(e.params).forEach(([i,n])=>{s.searchParams.append(i,n);}),delete e.params);let r=await fetch(s.toString(),{...e,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...e.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}async getObject(t){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${t}`].join(","),state:"closed"}});if(!e||e.length===0)throw new Error(`No object found with ID: ${t}`);let s=e[0],r=JSON.parse(s.body);return {meta:{objectId:t,label:`${this.config.uidPrefix}${t}`,createdAt:new Date(s.created_at),updatedAt:new Date(s.updated_at),version:await this._getVersion(s.number)},data:r}}async createObject(t,e){let s=`${this.config.uidPrefix}${t}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${t}`,body:JSON.stringify(e,null,2),labels:[this.config.baseLabel,s]})}),i={type:"initial_state",data:e,timestamp:new Date().toISOString()},n=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${n.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${n.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:t,label:s,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:e}}async updateObject(t,e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${t}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${t}`);let r=s[0];return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(e,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(t)}async listAll(){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),e={};for(let s of t)if(!s.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(s),i=JSON.parse(s.body),n={objectId:r,label:r,createdAt:new Date(s.created_at),updatedAt:new Date(s.updated_at),version:await this._getVersion(s.number)};e[r]={meta:n,data:i};}catch{continue}return e}async listUpdatedSince(t){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:t.toISOString()}}),s={};for(let r of e)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),n=JSON.parse(r.body),o=new Date(r.updated_at);if(o>t){let h={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:o,version:await this._getVersion(r.number)};s[i]={meta:h,data:n};}}catch{continue}return s}async getObjectHistory(t){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${t}`].join(","),state:"all"}});if(!e||e.length===0)throw new Error(`No object found with ID: ${t}`);let s=e[0],r=await this.fetchFromGitHub(`/issues/${s.number}/comments`),i=[];for(let n of r)try{let o=JSON.parse(n.body);i.push({timestamp:n.created_at,type:o.type||"update",data:o.data||o,commentId:n.id});}catch{continue}return i}async _getVersion(t){return (await this.fetchFromGitHub(`/issues/${t}/comments`)).length+1}_getObjectIdFromLabels(t){for(let e of t.labels)if(e.name!==this.config.baseLabel&&e.name.startsWith(this.config.uidPrefix))return e.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

const isReadingSession = (data) => {
  const session = data;
  return typeof session === "object" && session !== null && typeof session.duration_seconds === "number";
};
const isInteractionLog = (data) => {
  const log = data;
  return typeof log === "object" && log !== null && typeof log.paper_id === "string" && Array.isArray(log.interactions);
};

class StorageClient {
  constructor(token, repo) {
    this.client = new u(token, repo);
  }
  // Paper metadata methods
  async getOrCreatePaperMetadata(paperData) {
    const objectId = `paper:${paperData.arxivId}`;
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      if (typeof data === "object" && data !== null) {
        return data;
      }
      throw new Error("Invalid paper metadata format");
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
  // Interaction log methods
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
  // Log a reading session
  async logReadingSession(arxivId, session, paperData) {
    if (paperData) {
      await this.getOrCreatePaperMetadata({
        arxivId,
        ...paperData
      });
    }
    const interaction = {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
      // Safe because ReadingSession matches Json structure
    };
    await this.addInteraction(arxivId, interaction);
  }
  // Log an annotation
  async logAnnotation(arxivId, key, value, paperData) {
    if (paperData) {
      await this.getOrCreatePaperMetadata({
        arxivId,
        ...paperData
      });
    }
    const interaction = {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    };
    await this.addInteraction(arxivId, interaction);
  }
  // Update paper rating
  async updateRating(arxivId, rating, paperData) {
    await this.getOrCreatePaperMetadata({
      arxivId,
      ...paperData
    });
    await this.client.updateObject(`paper:${arxivId}`, { rating });
    const interaction = {
      type: "rating",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { rating }
    };
    await this.addInteraction(arxivId, interaction);
  }
  // Add interaction to log
  async addInteraction(arxivId, interaction) {
    const log = await this.getOrCreateInteractionLog(arxivId);
    const updatedLog = {
      ...log,
      interactions: [...log.interactions, interaction]
    };
    await this.client.updateObject(`interactions:${arxivId}`, updatedLog);
  }
  // Get interactions for a paper
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
  // Get total reading time for a paper
  async getPaperReadingTime(arxivId) {
    const interactions = await this.getInteractions(arxivId, { type: "reading_session" });
    return interactions.reduce(
      (total, i) => {
        if (isReadingSession(i.data)) {
          return total + i.data.duration_seconds;
        }
        return total;
      },
      0
    );
  }
  // Paper history
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
let storageClient = null;

// Load credentials and configuration when extension starts
async function loadCredentials() {
    const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
    githubToken = items.githubToken || '';
    githubRepo = items.githubRepo || '';
    console.log('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
    
    // Initialize storage client if we have credentials
    if (githubToken && githubRepo) {
        storageClient = new StorageClient(githubToken, githubRepo);
        console.log('Storage client initialized');
    }
    
    // Load session configuration
    sessionConfig = getConfigurationInMs(await loadSessionConfig());
    console.log('Session configuration loaded:', sessionConfig);
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
    
    // Reinitialize storage client if credentials changed
    if (changes.githubToken || changes.githubRepo) {
        if (githubToken && githubRepo) {
            storageClient = new StorageClient(githubToken, githubRepo);
            console.log('Storage client reinitialized');
        }
    }
});

// Reading Session class to track individual reading sessions
class ReadingSession {
    constructor(arxivId, config) {
        this.arxivId = arxivId;
        this.startTime = Date.now();
        this.activeTime = 0;
        this.lastActiveTime = Date.now();
        this.isTracking = true;
        this.config = config;
    }

    update() {
        if (this.isTracking) {
            const now = Date.now();
            const timeSinceLastActive = now - this.lastActiveTime;
            
            if (timeSinceLastActive < this.config.idleThreshold) {
                this.activeTime += timeSinceLastActive;
            // } else if (this.config.requireContinuousActivity) {
            //     // Reset active time if continuous activity is required
            //     this.activeTime = 0;
            }
            
            this.lastActiveTime = now;
        }
    }

    end() {
        this.update();
        this.isTracking = false;
          
        // if (this.config.logPartialSessions) {
        //     return this.activeTime;
        // }
        return this.activeTime >= this.config.minSessionDuration ? this.activeTime : 0;
    }
}

// Initialize credentials
loadCredentials();

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
    if (!storageClient) {
        sendResponse({ success: false, error: 'Storage client not initialized' });
        return;
    }

    if (!currentPaperData) {
        sendResponse({ success: false, error: 'No current paper' });
        return;
    }

    try {
        await storageClient.updateRating(currentPaperData.arxivId, rating, currentPaperData);
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

async function handleTabChange(tab) {
    const isArxiv = tab.url?.includes('arxiv.org/');
    console.log('Tab change detected:', { isArxiv, url: tab.url });
    
    if (!isArxiv) {
        console.log('Not an arXiv page, ending current session');
        await endCurrentSession();
        return;
    }

    // End any existing session before starting a new one
    if (currentSession) {
        console.log('Ending existing session before starting new one');
        await endCurrentSession();
    }

    // Always process the URL and start a new session
    console.log('Processing arXiv URL for new session');
    currentPaperData = await processArxivUrl(tab.url);
    if (currentPaperData) {
        console.log('Starting new session for:', currentPaperData.arxivId);
        currentSession = new ReadingSession(currentPaperData.arxivId, sessionConfig);
        startActivityTracking();
    }
}

async function endCurrentSession() {
    if (currentSession && currentPaperData) {
        console.log('Ending session for:', currentPaperData.arxivId);
        const duration = currentSession.end();
        if (duration > 0) {
            console.log('Creating reading event with duration:', duration);
            await createReadingEvent(currentPaperData, duration);
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

async function createReadingEvent(paperData, sessionDuration) {
    if (!storageClient || !paperData) {
        console.error('Missing required data for creating reading event:', {
            hasStorageClient: !!storageClient,
            hasPaperData: !!paperData
        });
        return;
    }

    const seconds = Math.round(sessionDuration / 1000);
    if (sessionDuration < sessionConfig.minSessionDuration) {
        console.log('Session too short to log:', seconds, 'seconds');
        return;
    }

    const sessionData = {
        duration_seconds: seconds //,
        // session_config: {
        //     idle_threshold_seconds: sessionConfig.idleThreshold / 1000,
        //     min_duration_seconds: sessionConfig.minSessionDuration / 1000,
        //     continuous_activity_required: sessionConfig.requireContinuousActivity,
        //     partial_sessions_logged: sessionConfig.logPartialSessions
        // }
    };

    try {
        await storageClient.logReadingSession(
            paperData.arxivId,
            sessionData,
            paperData
        );
        console.log('Reading session logged:', sessionData);
        
        // Get and log total reading time
        const totalTime = await storageClient.getPaperReadingTime(paperData.arxivId);
        console.log('Total reading time:', totalTime, 'seconds');
    } catch (error) {
        console.error('Error logging reading session:', error);
    }
}

// Update paper creation to use storage client
async function createGithubIssue(paperData) {
    if (!storageClient) {
        console.error('Storage client not initialized');
        return;
    }

    try {
        const existingPaper = await storageClient.getOrCreatePaperMetadata(paperData);
        console.log('Paper metadata stored/retrieved:', existingPaper.arxivId);
        return existingPaper;
    } catch (error) {
        console.error('Error handling paper metadata:', error);
    }
}

// Update annotation handler to use interaction log
async function handleAnnotationUpdate(type, data) {
    if (!storageClient) {
        throw new Error('Storage client not initialized');
    }

    try {
        // Include paper data if provided
        const paperData = data.title ? {
            title: data.title,
            //authors: data.authors,
            //abstract: data.abstract
        } : undefined;

        if (type === 'vote') {
            // await storageClient.updateRating(
            //     data.paperId,
            //     data.vote,
            //     paperData
            // );
            await storageClient.logAnnotation(
                data.paperId,
                'vote',
                data.vote,
                paperData
            );
        } else {
            await storageClient.logAnnotation(
                data.paperId,
                'notes',  // todo: let user provide custom key
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
//# sourceMappingURL=background.bundle.js.map
