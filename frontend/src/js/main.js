/* frontend/src/js/main.js */

async function loadGitInfo() {
    try {
        const response = await fetch('data/git-info.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const gitInfo = await response.json();
        
        // Update the footer elements
        document.querySelector('.git-info-repo').textContent = gitInfo.repo;
        document.querySelector('.git-info-branch').textContent = gitInfo.branch;
        document.querySelector('.git-info-commit').textContent = gitInfo.commit;
    } catch (error) {
        console.error('Failed to load git info:', error);
        document.querySelector('.git-info').style.display = 'none';
    }
}

async function loadPaperData() {
    const response = await fetch('data/papers.json');
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process feature data
    Object.values(data).forEach(paper => {
        // Look for features directory in paper data
        if (paper.features_path) {
            try {
                // Attempt to load features for this paper
                paper.features = {};
                Object.entries(paper.features_path).forEach(([featureType, path]) => {
                    fetch(path)
                        .then(response => response.text())
                        .then(content => {
                            paper.features[featureType] = content;
                            // Re-render if this paper is currently expanded
                            const paperCard = document.querySelector(`.paper-card[data-paper-id="${paper.id}"]`);
                            if (paperCard?.classList.contains('expanded')) {
                                renderPapers();
                            }
                        })
                        .catch(error => {
                            console.error(`Failed to load feature ${featureType} for paper ${paper.id}:`, error);
                        });
                });
            } catch (error) {
                console.error(`Failed to process features for paper ${paper.id}:`, error);
            }
        }
    });
    
    return data;
}

// Update the initializeApp function to call this new function
async function initializeApp() {
    try {
        // Load paper data and git info in parallel
        const [data] = await Promise.all([
            loadPaperData(),
            loadGitInfo()
        ]);
        
        // Store data globally
        window.yamlData = data;
        
        // Initialize all components
        initializeControls();
        initializeFilters();
        initializeFeatures(); // New initialization for features
        
        // Add this line to initialize search (if available)
        if (typeof window.searchModule?.initializeSearch === 'function') {
            window.searchModule.initializeSearch();
        }
        
        // Add this line to initialize share button
        initializeShareButton();
        
        renderPapers();
        applyFilters();
        
    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.getElementById('papers-container').innerHTML = `
            <div class="error-message">
                Failed to load papers data. Please try refreshing the page.
                <br>
                Error: ${error.message}
            </div>
        `;
    }
}

// Function to check if features are loaded for a paper
function areFeaturesLoaded(paper) {
    if (!paper.features_path) return true;
    return Object.keys(paper.features_path).every(
        featureType => paper.features?.[featureType]
    );
}

// Function to retry loading papers periodically until features are loaded
function waitForFeatures(timeout = 30000, interval = 1000) {
    const startTime = Date.now();
    
    function checkFeatures() {
        if (!window.yamlData) return false;
        
        // Check if all papers have their features loaded
        return Object.values(window.yamlData).every(areFeaturesLoaded);
    }
    
    return new Promise((resolve, reject) => {
        const check = () => {
            if (checkFeatures()) {
                resolve();
            } else if (Date.now() - startTime > timeout) {
                reject(new Error('Timeout waiting for features to load'));
            } else {
                setTimeout(check, interval);
            }
        };
        check();
    });
}

function initializeShareButton() {
    const shareButton = document.getElementById('share-button');
    const shareTooltip = document.getElementById('share-tooltip');
    
    if (!shareButton || !shareTooltip) return;
    
    shareButton.addEventListener('click', async () => {
        if (!window.urlStateManager) {
            console.error('URL State Manager not available');
            return;
        }
        
        // Copy URL to clipboard
        const success = await window.urlStateManager.copyShareableUrl();
        
        if (success) {
            // Show tooltip
            shareTooltip.classList.add('visible');
            
            // Hide tooltip after 2 seconds
            setTimeout(() => {
                shareTooltip.classList.remove('visible');
            }, 2000);
        } else {
            // Show error in tooltip
            shareTooltip.textContent = 'Failed to copy URL';
            shareTooltip.classList.add('visible');
            
            setTimeout(() => {
                shareTooltip.classList.remove('visible');
                shareTooltip.textContent = 'URL copied to clipboard!';
            }, 2000);
        }
    });
}

// Start the app when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for use in other modules
window.papersApp = {
    renderPapers,
    applyFilters,
    waitForFeatures
};
