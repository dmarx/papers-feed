/* frontend/src/js/main.js */

async function initializeApp() {
    try {
        // Fetch the papers data
        const response = await fetch('data/papers.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        window.yamlData = await response.json();
        
        // Initialize all components
        initializeControls();
        initializeFilters();
        renderPapers();
        applyFilters();
    } catch (error) {
        console.error('Failed to load papers data:', error);
        document.getElementById('papers-container').innerHTML = `
            <div class="error-message">
                Failed to load papers data. Please try refreshing the page.
            </div>
        `;
    }
}

// Start the app when the document is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
