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
            if (typeof renderPapers === 'function') {
                renderPapers(); // Re-render papers to update feature visibility
            }
        });
    });
}

// Format feature type into display name
function formatFeatureName(featureType) {
    return featureType
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Get feature content for a paper
function getPaperFeatures(paper) {
    if (!paper?.features_path) return null;
    
    const features = [];
    Object.entries(paper.features_path).forEach(([id, path]) => {
        if (window.featureState.enabledFeatures[id]) {
            features.push({
                id,
                path,
                label: formatFeatureName(id)
            });
        }
    });
    
    return features.length > 0 ? features : null;
}

// Render features section for a paper
function renderPaperFeatures(paper) {
    console.log('Rendering features for paper:', paper);
    const features = getPaperFeatures(paper);
    if (!features) {
        console.log('No features found for paper');
        return '';
    }
    
    console.log('Found features:', features);
    
    const featureSections = features
        .map(feature => {
            console.log('Rendering feature:', feature);
            return `
                <div class="feature-entry" data-feature="${feature.id}">
                    <div class="feature-entry-header">
                        <span class="feature-icon">📄</span>
                        <span class="feature-name">${feature.label}</span>
                        <button class="feature-expand">▼</button>
                    </div>
                    <div class="feature-content" data-path="${feature.path}">
                        <div class="feature-content-inner">Loading...</div>
                    </div>
                </div>
            `;
        })
        .join('');
    
    return `<div class="paper-features">${featureSections}</div>`;
}

// Load feature content
async function loadFeatureContent(contentDiv) {
    console.log('loadFeatureContent called with:', contentDiv); // Add this
    console.log('loadFeatureContent caller:', new Error().stack); // And this to see who's calling
    console.log('Loading feature content for:', contentDiv);
    console.log('Dataset:', contentDiv?.dataset);
    console.log('Parent element:', contentDiv?.parentElement);
    
    if (!contentDiv) {
        console.error('Content div is null');
        return;
    }
    
    if (!contentDiv.dataset) {
        console.error('Dataset not found on element:', contentDiv);
        return;
    }
    
    if (!contentDiv.dataset.path) {
        console.error('No path found in dataset:', contentDiv.dataset);
        return;
    }

    try {
        console.log('Fetching from path:', contentDiv.dataset.path);
        const response = await fetch(contentDiv.dataset.path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const content = await response.text();
        console.log('Loaded content:', content.substring(0, 100) + '...');
        
        const contentInner = contentDiv.querySelector('.feature-content-inner');
        if (contentInner) {
            contentInner.innerHTML = content;
        }
    } catch (error) {
        console.error('Error loading feature content:', error);
        const contentInner = contentDiv.querySelector('.feature-content-inner');
        if (contentInner) {
            contentInner.innerHTML = 'Error loading feature content';
        }
    }
}

// Add feature click handlers for a paper card
function addFeatureHandlers(paperCard) {
    console.log('Adding feature handlers to:', paperCard);
    
    if (!paperCard) {
        console.error('Paper card is null');
        return;
    }

    // Feature entry expansion
    paperCard.querySelectorAll('.feature-entry').forEach(entry => {
        const header = entry.querySelector('.feature-entry-header');
        const content = entry.querySelector('.feature-content');
        
        console.log('Found feature entry:', {
            header: header,
            content: content,
            dataset: content?.dataset,
            path: content?.dataset?.path
        });
        
        if (!header || !content) {
            console.error('Missing header or content elements');
            return;
        }
        
        header.addEventListener('click', (e) => {
            console.log('Feature header clicked');
            e.preventDefault();
            e.stopPropagation();
            
            entry.classList.toggle('expanded');
            
            // Load content if not already loaded
            if (!content.dataset.loaded) {
                console.log('Loading content for first time');
                loadFeatureContent(content);
                content.dataset.loaded = 'true';
            }
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
