// frontend/src/js/controls.js

// Handle paper details toggle
function setupPaperDetailsToggle() {
    const paperDetails = document.getElementById('paperDetails');
    const closeDetailsBtn = document.getElementById('closeDetails');
    
    // Function to show paper details
    window.showPaperDetails = function() {
        paperDetails.classList.add('visible');
    };
    
    // Function to hide paper details
    window.hidePaperDetails = function() {
        paperDetails.classList.remove('visible');
    };
    
    // Close button event listener
    closeDetailsBtn.addEventListener('click', () => {
        hidePaperDetails();
    });
    
    // ESC key listener to close details
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && paperDetails.classList.contains('visible')) {
            hidePaperDetails();
        }
    });
}

// Setup coloring controls
function setupColoringControls() {
    const coloringToggle = document.getElementById('coloringToggle');
    const colorByRadios = document.querySelectorAll('input[name="colorBy"]');

    coloringToggle.addEventListener('change', (e) => {
        const isEnabled = e.target.checked;
        document.body.classList.toggle('coloring-enabled', isEnabled);
        applyColoring();
        updateURLState();
    });

    colorByRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (coloringToggle.checked) {
                const colorBy = e.target.value;
                document.body.setAttribute('data-color-by', colorBy);
                applyColoring();
                updateURLState();
            }
        });
    });
}

// Apply coloring to arxiv IDs
function applyColoring() {
    const isEnabled = document.getElementById('coloringToggle').checked;
    const colorBy = document.querySelector('input[name="colorBy"]:checked').value;
    const arxivIds = document.querySelectorAll('.arxiv-id');
    
    arxivIds.forEach(id => {
        if (!isEnabled) {
            id.style.backgroundColor = '';
            return;
        }
        
        const paper = getPaperById(id.textContent.trim());
        if (!paper) return;
        
        let colorValue = 0;
        if (colorBy === 'freshness') {
            // Calculate freshness based on paper data
            const daysOld = getDaysOld(paper.date); // You'll need to implement this
            colorValue = Math.min(1, daysOld / 30); // Scale: 0 (new) to 1 (old)
        } else if (colorBy === 'readingTime') {
            // Calculate from reading time
            const minutes = parseFloat(paper.readTime || '0');
            colorValue = Math.min(1, minutes / 45); // Scale: 0 (short) to 1 (long)
        }
        
        // Apply color using HSL for a blue-to-red gradient
        const hue = 220 - (colorValue * 220);
        id.style.backgroundColor = `hsl(${hue}, 80%, 90%)`;
    });
}

// Initialize all controls
function initControls() {
    setupPaperDetailsToggle();
    setupColoringControls();
    
    // Set up share button functionality
    const shareButton = document.getElementById('share-button');
    const shareTooltip = document.getElementById('share-tooltip');
    
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            // Generate shareable URL with current state
            const shareableUrl = generateShareableUrl();
            
            // Copy to clipboard
            navigator.clipboard.writeText(shareableUrl).then(() => {
                // Show tooltip
                shareTooltip.classList.add('visible');
                
                // Hide tooltip after 2 seconds
                setTimeout(() => {
                    shareTooltip.classList.remove('visible');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy URL: ', err);
            });
        });
    }
}

// Helper function to get paper data by ID
function getPaperById(id) {
    // This should access your papers data structure
    // Placeholder - implement according to your data model
    return window.papersData ? window.papersData.find(p => p.id === id) : null;
}

// Helper function to calculate days old
function getDaysOld(dateStr) {
    if (!dateStr) return 30; // Default to maximum age if no date
    
    const paperDate = new Date(dateStr);
    const now = new Date();
    const diffTime = Math.abs(now - paperDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
}

// Generate a shareable URL with the current state
function generateShareableUrl() {
    const url = new URL(window.location.href);
    
    // Get current state from DOM
    const isColoringEnabled = document.getElementById('coloringToggle').checked;
    const colorBy = document.querySelector('input[name="colorBy"]:checked')?.value || 'freshness';
    
    // Add parameters
    url.searchParams.set('coloring', isColoringEnabled ? '1' : '0');
    url.searchParams.set('colorBy', colorBy);
    
    // Add search term if present
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value) {
        url.searchParams.set('search', searchInput.value);
    }
    
    return url.toString();
}

// Update URL state based on current controls
function updateURLState() {
    const newUrl = generateShareableUrl();
    window.history.replaceState({}, '', newUrl);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initControls);
