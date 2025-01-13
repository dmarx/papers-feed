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

async function initializeApp() {
    try {
        // Load both data sources in parallel
        const [papersResponse] = await Promise.all([
            fetch('data/papers.json'),
            loadGitInfo() // We don't need to await its result directly
        ]);

        if (!papersResponse.ok) {
            throw new Error(`HTTP error! status: ${papersResponse.status}`);
        }
        window.yamlData = await papersResponse.json();
        
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
