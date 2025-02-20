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
        
    // Render feature toggles
    renderFeatureToggles(Array.from(features));
}

// Render feature toggle controls
function renderFeatureToggles(features) {
    const container = document.querySelector('.feature-toggles');
    if (!container) {
        console.warn('Feature toggles container not found');
        return;
    }
    
    if (features.length === 0) {
        container.innerHTML = '<div class="no-features">No paper features currently available</div>';
        return;
    }
    
    container.innerHTML = features.map(featureType => {
        const isEnabled = window.featureState.enabledFeatures[featureType] ?? true;
        return `
            <div class="feature-toggle" data-feature="${featureType}">
                <label class="toggle-switch">
                    <input type="checkbox" ${isEnabled ? 'checked' : ''}>
                    <span class="slider"></span>
                </label>
                <div class="feature-info">
                    <span class="feature-label">${formatFeatureName(featureType)}</span>
                </div>
            </div>
        `;
    }).join('');
        
    // Add event listeners
    container.querySelectorAll('.feature-toggle').forEach(toggle => {
        const checkbox = toggle.querySelector('input[type="checkbox"]');
        const featureId = toggle.dataset.feature;
        
        if (!checkbox || !featureId) return;
        
        checkbox.addEventListener('change', () => {
            window.featureState.enabledFeatures[featureId] = checkbox.checked;
            localStorage.setItem('enabledFeatures', 
                JSON.stringify(window.featureState.enabledFeatures));
            // Refresh current paper details if active
            if (window.activePaperId) {
                updatePaperDetails(window.activePaperId);
            }
        });
    });
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
