// extension/content.js
console.log('ArXiv extension content script loaded');

// CSS for the annotation UI
const STYLES = `
.arxiv-annotator {
    display: inline-block;
    margin-left: 4px;
    cursor: pointer;
    font-size: 0.9em;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.arxiv-annotator:hover {
    opacity: 1;
}

.arxiv-popup {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    width: 300px;
    z-index: 10000;
}

.arxiv-popup-header {
    font-weight: bold;
    margin-bottom: 8px;
}

.arxiv-popup-buttons {
    display: flex;
    gap: 8px;
    margin: 8px 0;
}

.arxiv-popup button {
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
}

.arxiv-popup button.active {
    background: #e0e0e0;
    border-color: #aaa;
}

.arxiv-popup textarea {
    width: 100%;
    min-height: 80px;
    margin: 8px 0;
    padding: 4px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
}

.arxiv-popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}
`;

// Add styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = STYLES;
document.head.appendChild(styleSheet);

// Track active popup
let activePopup = null;

// Close popup when clicking outside
document.addEventListener('click', (e) => {
    if (activePopup && !activePopup.contains(e.target) && 
        !e.target.classList.contains('arxiv-annotator')) {
        activePopup.remove();
        activePopup = null;
    }
});

// Create popup element
function createPopup(arxivId, title = '') {
    const popup = document.createElement('div');
    popup.className = 'arxiv-popup';
    popup.innerHTML = `
        <div class="arxiv-popup-header">${title || arxivId}</div>
        <div class="arxiv-popup-buttons">
            <button class="vote-button" data-vote="thumbsup">👍 Interesting</button>
            <button class="vote-button" data-vote="thumbsdown">👎 Not Relevant</button>
        </div>
        <textarea placeholder="Add notes..."></textarea>
        <div class="arxiv-popup-actions">
            <button class="save-button">Save</button>
        </div>
    `;

    // Handle voting
    popup.querySelectorAll('.vote-button').forEach(button => {
        button.addEventListener('click', () => {
            popup.querySelectorAll('.vote-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');
        });
    });

    // Handle save
    popup.querySelector('.save-button').addEventListener('click', () => {
        const vote = popup.querySelector('.vote-button.active')?.dataset.vote;
        const notes = popup.querySelector('textarea').value;
        
        // Send to background script
        if (vote || notes) {
            chrome.runtime.sendMessage({
                type: 'updateAnnotation',
                annotationType: notes ? 'notes' : 'vote',
                data: {
                    paperId: arxivId,
                    vote,
                    notes
                }
            }, (response) => {
                console.log('Annotation saved:', response);
                popup.remove();
                activePopup = null;
            });
        }
    });

    return popup;
}

// Process a link element
async function processArxivLink(link) {
    // Skip if already processed
    if (link.classList.contains('arxiv-processed')) return;
    link.classList.add('arxiv-processed');

    // Extract arXiv ID
    const patterns = [
        /arxiv\.org\/abs\/([0-9.]+)/,
        /arxiv\.org\/pdf\/([0-9.]+)\.pdf/,
        /arxiv\.org\/\w+\/([0-9.]+)/
    ];
    
    let arxivId = null;
    for (const pattern of patterns) {
        const match = link.href.match(pattern);
        if (match) {
            arxivId = match[1];
            break;
        }
    }

    if (!arxivId) return;

    // Create annotator button
    const annotator = document.createElement('span');
    annotator.className = 'arxiv-annotator';
    annotator.textContent = '📝';
    annotator.title = 'Add annotation';
    
    // Handle click
    annotator.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();

        // Remove existing popup if any
        if (activePopup) {
            activePopup.remove();
            if (activePopup.arxivId === arxivId) {
                activePopup = null;
                return;
            }
        }

        // Create and position new popup
        const popup = createPopup(arxivId);
        const rect = annotator.getBoundingClientRect();
        popup.style.left = `${rect.left}px`;
        popup.style.top = `${rect.bottom + 5}px`;
        
        // Keep reference and show
        popup.arxivId = arxivId;
        document.body.appendChild(popup);
        activePopup = popup;

        // Fetch paper metadata if we don't have it
        chrome.runtime.sendMessage({
            type: 'getCurrentPaper',
            arxivId
        }, (paperData) => {
            if (paperData) {
                popup.querySelector('.arxiv-popup-header').textContent = paperData.title;
            }
        });
    });

    // Add to page
    link.parentNode.insertBefore(annotator, link.nextSibling);
}

// Process initial links
document.querySelectorAll('a[href*="arxiv.org"]').forEach(processArxivLink);

// Watch for new links
const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
                node.querySelectorAll('a[href*="arxiv.org"]').forEach(processArxivLink);
            }
        });
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});
