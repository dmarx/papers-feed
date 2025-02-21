/* frontend/src/js/features.js */

// Global state for feature preferences
window.featureState = {
    // Map of feature IDs to their enabled state
    enabledFeatures: JSON.parse(localStorage.getItem('enabledFeatures') || '{}')
};

// Initialize features based on what's available in the data
function initializeFeatures() {
    if (!window.yamlData) {
        console.warn('yamlData not available yet');
        return;
    }

    // Discover all unique feature types across all papers
    const features = new Set();
    
    // Scan papers for available features
    Object.values(window.yamlData).forEach(paper => {
        if (paper.features_path) {
            Object.keys(paper.features_path).forEach(feature => {
                features.add(feature);
            });
        }
    });
    
    // Initialize enabled state for discovered features
    features.forEach(feature => {
        if (!(feature in window.featureState.enabledFeatures)) {
            window.featureState.enabledFeatures[feature] = true; // Enable by default
        }
    });
    
    // Save to localStorage
    localStorage.setItem('enabledFeatures', 
        JSON.stringify(window.featureState.enabledFeatures));
}

// Format feature name for display (also used in papers.js)
function formatFeatureName(featureType) {
    return featureType
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Initialize features when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for yamlData to be available
    if (window.yamlData) {
        initializeFeatures();
    }
});
