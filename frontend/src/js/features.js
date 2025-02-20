/* frontend/src/js/features.js */

// Global state for feature preferences
window.featureState = {
    // Map of feature IDs to their enabled state
    enabledFeatures: JSON.parse(localStorage.getItem('enabledFeatures') || '{}'),
    
    // Known feature types and their metadata
    knownFeatures: {
        'summary': {
            icon: '📝',
            label: 'Summary',
            description: 'AI-generated summary of the paper'
        },
        'keyPoints': {
            icon: '💡',
            label: 'Key Points',
            description: 'Main takeaways and contributions'
        },
        'analysis': {
            icon: '📊',
            label: 'Analysis',
            description: 'Technical analysis and insights'
        }
    }
};

// Initialize features based on what's available in the data
function initializeFeatures() {
    const features = new Set();
    
    // Scan papers for available features
    Object.values(window.yamlData).forEach(paper => {
        if (paper.features) {
            Object.keys(paper.features).forEach(feature => features.add(feature));
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
    renderFeatureToggles();
}

// Render feature toggle controls
function renderFeatureToggles() {
    const container = document.querySelector('.feature-toggles');
    if (!container) return;
    
    container.innerHTML = Object.entries(window.featureState.knownFeatures)
        .map(([id, feature]) => {
            const isEnabled = window.featureState.enabledFeatures[id] ?? true;
            return `
                <div class="feature-toggle" data-feature="${id}">
                    <label class="toggle-switch">
                        <input type="checkbox" 
                               ${isEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                    <div class="feature-info">
                        <span class="feature-icon">${feature.icon}</span>
                        <span class="feature-label">${feature.label}</span>
                    </div>
                    <div class="feature-description">${feature.description}</div>
                </div>
            `;
        })
        .join('');
        
    // Add event listeners
    container.querySelectorAll('.feature-toggle').forEach(toggle => {
        const featureId = toggle.dataset.feature;
        const checkbox = toggle.querySelector('input[type="checkbox"]');
        
        checkbox.addEventListener('change', () => {
            window.featureState.enabledFeatures[featureId] = checkbox.checked;
            localStorage.setItem('enabledFeatures', 
                JSON.stringify(window.featureState.enabledFeatures));
            renderPapers(); // Re-render papers to update feature visibility
        });
    });
}

// Get feature content for a paper
function getPaperFeatures(paper) {
    if (!paper.features) return null;
    
    const features = [];
    Object.entries(paper.features).forEach(([id, content]) => {
        if (window.featureState.enabledFeatures[id]) {
            const metadata = window.featureState.knownFeatures[id] || {
                icon: '📄',
                label: id.charAt(0).toUpperCase() + id.slice(1)
            };
            features.push({
                id,
                content,
                ...metadata
            });
        }
    });
    
    return features.length > 0 ? features : null;
}

// Render features section for a paper
function renderPaperFeatures(paper) {
    const features = getPaperFeatures(paper);
    if (!features) return '';
    
    const featureIcons = features
        .map(f => `<span class="feature-icon" title="${f.label}">${f.icon}</span>`)
        .join('');
        
    const featureSections = features
        .map(feature => `
            <div class="feature-entry" data-feature="${feature.id}">
                <div class="feature-entry-header">
                    <span class="feature-icon">${feature.icon}</span>
                    <span class="feature-name">${feature.label}</span>
                    <button class="feature-expand">▼</button>
                </div>
                <div class="feature-content">
                    <div class="feature-content-inner">${feature.content}</div>
                </div>
            </div>
        `)
        .join('');
    
    return `
        <div class="feature-icons">
            ${featureIcons}
        </div>
        <div class="paper-features">
            ${featureSections}
        </div>
    `;
}

// Add feature click handlers for a paper card
function addFeatureHandlers(paperCard) {
    // Feature entry expansion
    paperCard.querySelectorAll('.feature-entry').forEach(entry => {
        const header = entry.querySelector('.feature-entry-header');
        header.addEventListener('click', () => {
            entry.classList.toggle('expanded');
        });
    });
}

// Initialize features when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Wait for yamlData to be available
    if (window.yamlData) {
        initializeFeatures();
    }
});
