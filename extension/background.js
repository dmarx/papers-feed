// background.js
import { loadSessionConfig, getConfigurationInMs } from './config/session.js';

let githubToken = '';
let githubRepo = '';
let currentPaperData = null;
let currentSession = null;
let activityInterval = null;
let activityTimeout = null;
let sessionConfig = null;

// Load credentials and configuration when extension starts
async function loadCredentials() {
    const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
    githubToken = items.githubToken || '';
    githubRepo = items.githubRepo || '';
    console.log('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
    
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
            } else if (this.config.requireContinuousActivity) {
                // Reset active time if continuous activity is required
                this.activeTime = 0;
            }
            
            this.lastActiveTime = now;
        }
    }

    end() {
        this.isTracking = false;
        this.update();
        
        if (this.config.logPartialSessions) {
            return this.activeTime;
        }
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
        if (currentPaperData && currentPaperData.issueNumber) {
            updatePaperRating(currentPaperData.issueNumber, request.rating)
                .then(() => {
                    currentPaperData.rating = request.rating;
                    sendResponse({success: true});
                })
                .catch(error => {
                    console.error('Error updating rating:', error);
                    sendResponse({success: false, error: error.message});
                });
            return true; // Will respond asynchronously
        } else {
            sendResponse({success: false, error: 'No current paper or issue number'});
        }
    }
    return true;
});

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
    if (activityTimeout) {
        clearTimeout(activityTimeout);
        activityTimeout = null;
    }
}

async function createReadingEvent(paperData, sessionDuration) {
    if (!githubToken || !githubRepo || !paperData) {
        console.error('Missing required data for creating reading event:', {
            hasToken: !!githubToken,
            hasRepo: !!githubRepo,
            hasPaperData: !!paperData
        });
        return;
    }

    const seconds = Math.round(sessionDuration / 1000);
    if (sessionDuration < sessionConfig.minSessionDuration) {
        console.log('Session too short to log:', seconds, 'seconds');
        return;
    }

    console.log('Creating reading event:', {
        arxivId: paperData.arxivId,
        duration: seconds,
        title: paperData.title
    });

    const eventData = {
        type: 'reading_session',
        arxivId: paperData.arxivId, // TODO: change to arxiv_id throughout
        timestamp: new Date().toISOString(),
        duration_seconds: seconds,
        title: paperData.title,
        authors: paperData.authors,
        abstract: paperData.abstract,
        url: paperData.url,
        session_config: {
            idle_threshold_seconds: sessionConfig.idleThreshold / 1000,
            min_duration_seconds: sessionConfig.minSessionDuration / 1000,
            continuous_activity_required: sessionConfig.requireContinuousActivity,
            partial_sessions_logged: sessionConfig.logPartialSessions
        }
    };

    const issueBody = JSON.stringify(eventData, null, 2);

    try {
        const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                title: `[Reading] ${paperData.title || paperData.arxivId} (${seconds}s)`,
                body: issueBody,
                labels: ['reading-session']
            })
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const issueData = await response.json();
        console.log('Reading event created:', issueData.html_url);
        return issueData;
    } catch (error) {
        console.error('Error creating reading event:', error);
    }
}

// Update parseXMLText function to extract publication date and categories
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

        // Extract categories/tags
        const getCategories = (text) => {
            const categories = new Set();
            
            // Get primary category
            const primaryMatch = text.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
            if (primaryMatch) {
                categories.add(primaryMatch[1]);
            }
            
            // Get all categories
            const categoryRegex = /<category[^>]*term="([^"]+)"/g;
            let match;
            while (match = categoryRegex.exec(text)) {
                categories.add(match[1]);
            }
            
            return Array.from(categories);
        };

        // Get publication date (first version)
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

// Update processArxivUrl function to include new fields
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

// Update createGithubIssue to add tags to labels
async function createGithubIssue(paperData) {
    if (!githubToken || !githubRepo) {
        console.error('GitHub credentials not set. Please configure extension options.');
        return;
    }

    try {
        console.log('Creating GitHub issue for paper:', paperData.arxivId);
        const issueBody = JSON.stringify(paperData, null, 2);

        // Create issue labels starting with paper and rating
        const issueLabels = ['paper', `rating:${paperData.rating}`];
        
        // // Add arXiv tags as labels if they exist
        // if (paperData.arxiv_tags && paperData.arxiv_tags.length > 0) {
        //     // Add tags in format "arxiv:cs.AI", "arxiv:cs.LG", etc.
        //     issueLabels.push(...paperData.arxiv_tags.map(tag => `arxiv:${tag}`));
        // }

        const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                title: `[Paper] ${paperData.title || paperData.arxivId}`,
                body: issueBody,
                labels: issueLabels
            })
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const issueData = await response.json();
        console.log('GitHub issue created successfully:', issueData.html_url);
        return issueData;
    } catch (error) {
        console.error('Error creating Github issue:', error);
    }
}

async function updatePaperRating(issueNumber, rating) {
    if (!githubToken || !githubRepo) {
        console.error('GitHub credentials not set. Please configure extension options.');
        return;
    }

    try {
        console.log(`Updating rating for issue ${issueNumber} to ${rating}`);
        
        // Update issue labels
        await fetch(`https://api.github.com/repos/${githubRepo}/issues/${issueNumber}/labels`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify([
                'paper',
                `rating:${rating}`
            ])
        });

        // Add comment about rating change
        await fetch(`https://api.github.com/repos/${githubRepo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers: {
                'Authorization': `token ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                body: `Updated paper rating to: ${rating}`
            })
        });

        console.log('Rating updated successfully');
    } catch (error) {
        console.error('Error updating rating:', error);
        throw error;
    }
}
