// utils/logger.ts
// Logging utility wrapping loguru
/**
 * Logger class for consistent logging throughout the extension
 */
class Logger {
    constructor(module) {
        this.module = module;
    }
    /**
     * Log debug message
     */
    debug(message, data) {
        console.debug(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log info message
     */
    info(message, data) {
        console.info(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log warning message
     */
    warning(message, data) {
        console.warn(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
    /**
     * Log error message
     */
    error(message, data) {
        console.error(`[${this.module}] ${message}`, data !== undefined ? data : '');
    }
}
/**
 * Loguru mock for browser extension use
 */
class LoguruMock {
    /**
     * Get logger for a module
     */
    getLogger(module) {
        return new Logger(module);
    }
}
// Export singleton instance
const loguru = new LoguruMock();

// extension/utils/metadata-extractor.ts
const logger = loguru.getLogger('metadata-extractor');
// Constants for standard source types
const SOURCE_TYPES = {
    PDF: 'pdf',
    URL: 'url',
};
/**
 * Base class for metadata extraction with customizable extraction methods
 * Each method can be overridden to provide source-specific extraction
 */
class MetadataExtractor {
    /**
     * Create a new metadata extractor for a document
     */
    constructor(document) {
        this.document = document;
        this.url = document.location.href;
        logger.debug('Initialized metadata extractor for:', this.url);
    }
    /**
     * Helper method to get content from meta tags
     */
    getMetaContent(selector) {
        const element = this.document.querySelector(selector);
        return element ? element.getAttribute('content') || '' : '';
    }
    /**
     * Extract and return all metadata fields
     */
    extract() {
        logger.debug('Extracting metadata from page:', this.url);
        const metadata = {
            title: this.extractTitle(),
            authors: this.extractAuthors(),
            description: this.extractDescription(),
            publishedDate: this.extractPublishedDate(),
            doi: this.extractDoi(),
            journalName: this.extractJournalName(),
            tags: this.extractTags(),
            url: this.url
        };
        logger.debug('Metadata extraction complete:', metadata);
        return metadata;
    }
    /**
     * Extract title from document
     * Considers multiple metadata standards with priority order
     */
    extractTitle() {
        // Title extraction - priority order
        return (
        // Dublin Core
        this.getMetaContent('meta[name="DC.Title"]') ||
            // Citation
            this.getMetaContent('meta[name="citation_title"]') ||
            // Open Graph
            this.getMetaContent('meta[property="og:title"]') ||
            // Standard meta
            this.getMetaContent('meta[name="title"]') ||
            // Fallback to document title
            this.document.title);
    }
    /**
     * Extract authors from document
     * Handles multiple author formats and sources
     */
    extractAuthors() {
        // Get all citation authors (some pages have multiple citation_author tags)
        const citationAuthors = [];
        this.document.querySelectorAll('meta[name="citation_author"]').forEach(el => {
            const content = el.getAttribute('content');
            if (content)
                citationAuthors.push(content);
        });
        // Get all DC creators
        const dcCreators = [];
        this.document.querySelectorAll('meta[name="DC.Creator.PersonalName"]').forEach(el => {
            const content = el.getAttribute('content');
            if (content)
                dcCreators.push(content);
        });
        // Individual author elements
        const dcCreator = this.getMetaContent('meta[name="DC.Creator.PersonalName"]');
        const citationAuthor = this.getMetaContent('meta[name="citation_author"]');
        const ogAuthor = this.getMetaContent('meta[property="og:article:author"]') ||
            this.getMetaContent('meta[name="author"]');
        // Set authors with priority
        if (dcCreators.length > 0) {
            return dcCreators.join(', ');
        }
        else if (citationAuthors.length > 0) {
            return citationAuthors.join(', ');
        }
        else if (dcCreator) {
            return dcCreator;
        }
        else if (citationAuthor) {
            return citationAuthor;
        }
        else if (ogAuthor) {
            return ogAuthor;
        }
        return '';
    }
    /**
     * Extract description/abstract from document
     */
    extractDescription() {
        return (this.getMetaContent('meta[name="DC.Description"]') ||
            this.getMetaContent('meta[name="citation_abstract"]') ||
            this.getMetaContent('meta[property="og:description"]') ||
            this.getMetaContent('meta[name="description"]'));
    }
    /**
     * Extract publication date from document
     */
    extractPublishedDate() {
        return (this.getMetaContent('meta[name="DC.Date.issued"]') ||
            this.getMetaContent('meta[name="citation_date"]') ||
            this.getMetaContent('meta[property="article:published_time"]'));
    }
    /**
     * Extract DOI (Digital Object Identifier) from document
     */
    extractDoi() {
        return (this.getMetaContent('meta[name="DC.Identifier.DOI"]') ||
            this.getMetaContent('meta[name="citation_doi"]'));
    }
    /**
     * Extract journal name from document
     */
    extractJournalName() {
        return (this.getMetaContent('meta[name="DC.Source"]') ||
            this.getMetaContent('meta[name="citation_journal_title"]'));
    }
    /**
     * Extract keywords/tags from document
     */
    extractTags() {
        const keywords = this.getMetaContent('meta[name="keywords"]') ||
            this.getMetaContent('meta[name="DC.Subject"]');
        if (keywords) {
            return keywords.split(',').map(tag => tag.trim());
        }
        return [];
    }
    /**
     * Determine if the current URL is a PDF
     */
    isPdf() {
        return isPdfUrl(this.url);
    }
    /**
     * Get the source type (PDF or URL)
     */
    getSourceType() {
        return this.isPdf() ? SOURCE_TYPES.PDF : SOURCE_TYPES.URL;
    }
    /**
     * Generate a paper ID for the current URL
     */
    generatePaperId() {
        return generatePaperIdFromUrl(this.url);
    }
}
/**
 * Create a common metadata extractor for a document
 * Factory function for creating the default extractor
 */
function createMetadataExtractor(document) {
    return new MetadataExtractor(document);
}
/**
 * Generate a paper ID from a URL
 * Creates a consistent hash-based identifier
 */
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
    // Use the first 8 characters as the ID
    return positiveHash.substring(0, 8);
}
/**
 * Determine if a URL is a PDF
 */
function isPdfUrl(url) {
    return url.toLowerCase().endsWith('.pdf');
}

// popup.ts
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
// Function to get current tab info and metadata
async function getCurrentTabInfo() {
    return new Promise((resolve) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].id) {
                // Execute script to extract metadata from page
                chrome.scripting.executeScript({
                    target: { tabId: tabs[0].id },
                    // We can import the MetadataExtractor properly with rollup.js
                    func: () => {
                        // Import statements are handled by rollup and will be included in the bundle
                        // Use the imported MetadataExtractor
                        const extractor = createMetadataExtractor(document);
                        const metadata = extractor.extract();
                        return {
                            ...metadata,
                            url: window.location.href
                        };
                    }
                }, (results) => {
                    if (results && results[0] && results[0].result) {
                        resolve({
                            ...results[0].result
                        });
                    }
                    else {
                        resolve({
                            url: tabs[0].url || '',
                            title: tabs[0].title || '',
                            authors: '',
                            description: '',
                            publishedDate: '',
                            tags: []
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
                    publishedDate: '',
                    tags: []
                });
            }
        });
    });
}
// Function to log current page as a paper
async function logCurrentPage(pageInfo) {
    console.log("Requesting background script to create paper entry");
    // Pass pageInfo to background script for processing by the source system
    chrome.runtime.sendMessage({
        type: 'createManualPaperEntry',
        pageInfo
    }, (response) => {
        const statusElement = document.getElementById('status');
        if (!statusElement)
            return;
        if (response && response.success && response.metadata) {
            const metadata = response.metadata;
            statusElement.textContent = 'Page tracked successfully!';
            // Update UI to show the logged paper
            updateUI(metadata);
            // Start a session for this paper
            chrome.runtime.sendMessage({
                type: 'startSession',
                sourceId: metadata.sourceId,
                paperId: metadata.paperId
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
