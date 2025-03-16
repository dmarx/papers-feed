// popup.ts
// TypeScript conversion of popup.js
console.log('Popup script starting...');
// Function to get paper data from background script
async function getCurrentPaper() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'getCurrentPaper' }, (response) => {
            console.log('Got paper data from background:', response);
            resolve(response);
        });
    });
}
// Function to extract metadata from the page
function extractPageMetadata() {
    const metadata = {
        title: '',
        authors: '',
        description: '',
        publishedDate: ''
    };
    // Try to get Open Graph title
    const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (ogTitle) {
        metadata.title = ogTitle;
    }
    else {
        // Fallback to document title
        metadata.title = document.title;
    }
    // Try to get authors from Open Graph
    const ogAuthor = document.querySelector('meta[property="og:article:author"]')?.getAttribute('content') ||
        document.querySelector('meta[name="author"]')?.getAttribute('content');
    if (ogAuthor) {
        metadata.authors = ogAuthor;
    }
    // Try to get description from Open Graph
    const ogDescription = document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
        document.querySelector('meta[name="description"]')?.getAttribute('content');
    if (ogDescription) {
        metadata.description = ogDescription;
    }
    // Try to get published date
    const ogPublishedTime = document.querySelector('meta[property="article:published_time"]')?.getAttribute('content');
    if (ogPublishedTime) {
        metadata.publishedDate = ogPublishedTime;
    }
    return metadata;
}
// Function to get current tab info and metadata
async function getCurrentTabInfo() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                // Execute script to extract metadata from page
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    func: extractPageMetadata
                }, (results) => {
                    if (results && results[0] && results[0].result) {
                        resolve({
                            url: tabs[0].url || '',
                            title: tabs[0].title || '',
                            ...results[0].result
                        });
                    }
                    else {
                        resolve({
                            url: tabs[0].url || '',
                            title: tabs[0].title || '',
                            authors: '',
                            description: '',
                            publishedDate: ''
                        });
                    }
                });
            }
            else {
                resolve({
                    url: '',
                    title: '',
                    authors: '',
                    description: '',
                    publishedDate: ''
                });
            }
        });
    });
}
// Generate a paper ID from a URL
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
    // Determine the source type based on URL
    let sourceType = 'url';
    if (url.toLowerCase().endsWith('.pdf')) {
        sourceType = 'pdf';
    }
    return `${sourceType}.${positiveHash.substring(0, 8)}`;
}
// Function to update UI with paper data
function updateUI(paperData) {
    const titleElement = document.getElementById('paperTitle');
    const authorsElement = document.getElementById('paperAuthors');
    const statusElement = document.getElementById('status');
    const manualLogSection = document.getElementById('manualLogSection');
    if (!titleElement || !authorsElement || !statusElement || !manualLogSection) {
        console.error('Required DOM elements not found');
        return;
    }
    if (paperData) {
        // Show detected paper data
        titleElement.textContent = paperData.title || paperData.paperId;
        authorsElement.textContent = paperData.authors;
        statusElement.textContent = 'Paper tracked! Issue created on GitHub.';
        // Enable rating buttons
        const thumbsUpButton = document.getElementById('thumbsUp');
        const thumbsDownButton = document.getElementById('thumbsDown');
        if (thumbsUpButton && thumbsDownButton) {
            thumbsUpButton.disabled = false;
            thumbsDownButton.disabled = false;
            // Set active state on rating buttons
            thumbsUpButton.classList.toggle('active', paperData.rating === 'thumbsup');
            thumbsDownButton.classList.toggle('active', paperData.rating === 'thumbsdown');
        }
        // Hide manual log section
        manualLogSection.style.display = 'none';
    }
    else {
        // No paper detected - show manual log option
        titleElement.textContent = 'No paper detected';
        authorsElement.textContent = '';
        statusElement.textContent = 'Current page not recognized as a paper';
        // Disable rating buttons
        const thumbsUpButton = document.getElementById('thumbsUp');
        const thumbsDownButton = document.getElementById('thumbsDown');
        if (thumbsUpButton && thumbsDownButton) {
            thumbsUpButton.disabled = true;
            thumbsDownButton.disabled = true;
        }
        // Show manual log section
        manualLogSection.style.display = 'block';
    }
}
// Function to log current page as a paper (one-click experience)
async function logCurrentPage(pageInfo) {
    console.log("attempting to log paper");
    // Generate a paper ID from the URL
    const paperId = generatePaperIdFromUrl(pageInfo.url);
    console.log("generated paperId:", paperId);
    // Use 'pdf' or 'url' as the source identifier
    const sourceId = pageInfo.url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'url';
    // Create paper metadata with extracted info
    const metadata = {
        sourceId: sourceId,
        paperId: paperId,
        url: pageInfo.url,
        title: pageInfo.title || paperId,
        authors: pageInfo.authors || '',
        abstract: pageInfo.description || '',
        timestamp: new Date().toISOString(),
        publishedDate: pageInfo.publishedDate || '',
        tags: [],
        rating: 'novote'
    };
    console.log("PaperMetadata:", metadata);
    // Send to background script
    chrome.runtime.sendMessage({
        type: 'manualPaperLog',
        metadata: metadata
    }, (response) => {
        const statusElement = document.getElementById('status');
        if (!statusElement)
            return;
        if (response && response.success) {
            statusElement.textContent = 'Page tracked successfully!';
            // Update UI to show the logged paper
            updateUI(metadata);
            // Start a session for this paper
            chrome.runtime.sendMessage({
                type: 'startSession',
                sourceId: sourceId,
                paperId: paperId
            });
            // Enable rating buttons
            const thumbsUpButton = document.getElementById('thumbsUp');
            const thumbsDownButton = document.getElementById('thumbsDown');
            if (thumbsUpButton && thumbsDownButton) {
                thumbsUpButton.disabled = false;
                thumbsDownButton.disabled = false;
            }
            // Hide manual log section
            const manualLogSection = document.getElementById('manualLogSection');
            if (manualLogSection) {
                manualLogSection.style.display = 'none';
            }
        }
        else {
            statusElement.textContent = 'Error: ' + (response?.error || 'Failed to log paper');
        }
    });
}
// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Popup opened');
    // Get current tab info with metadata
    const tabInfo = await getCurrentTabInfo();
    console.log('Current tab:', tabInfo);
    // Get paper from the session tracker
    let paperData = null;
    let retries = 3;
    while (retries > 0 && !paperData) {
        paperData = await getCurrentPaper();
        if (!paperData) {
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms before retry
            retries--;
        }
    }
    updateUI(paperData);
    // Set up rating handlers
    const thumbsUpButton = document.getElementById('thumbsUp');
    if (thumbsUpButton) {
        thumbsUpButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                type: 'updateRating',
                rating: 'thumbsup'
            }, (response) => {
                const statusElement = document.getElementById('status');
                const thumbsUpButton = document.getElementById('thumbsUp');
                const thumbsDownButton = document.getElementById('thumbsDown');
                if (!statusElement || !thumbsUpButton || !thumbsDownButton)
                    return;
                if (response && response.success) {
                    statusElement.textContent = 'Rating updated to: thumbs up';
                    thumbsUpButton.classList.add('active');
                    thumbsDownButton.classList.remove('active');
                    setTimeout(() => window.close(), 1500);
                }
                else {
                    statusElement.textContent = 'Error: ' + (response?.error || 'Unknown error');
                }
            });
        });
    }
    const thumbsDownButton = document.getElementById('thumbsDown');
    if (thumbsDownButton) {
        thumbsDownButton.addEventListener('click', () => {
            chrome.runtime.sendMessage({
                type: 'updateRating',
                rating: 'thumbsdown'
            }, (response) => {
                const statusElement = document.getElementById('status');
                const thumbsUpButton = document.getElementById('thumbsUp');
                const thumbsDownButton = document.getElementById('thumbsDown');
                if (!statusElement || !thumbsUpButton || !thumbsDownButton)
                    return;
                if (response && response.success) {
                    statusElement.textContent = 'Rating updated to: thumbs down';
                    thumbsDownButton.classList.add('active');
                    thumbsUpButton.classList.remove('active');
                    setTimeout(() => window.close(), 1500);
                }
                else {
                    statusElement.textContent = 'Error: ' + (response?.error || 'Unknown error');
                }
            });
        });
    }
    // Set up one-click logging button
    const logPageButton = document.getElementById('logPageButton');
    if (logPageButton) {
        console.log("Attaching logPageButton event listener...");
        logPageButton.addEventListener('click', () => {
            console.log("logPageButton clicked...");
            logCurrentPage(tabInfo);
        });
    }
});
//# sourceMappingURL=popup.bundle.js.map
