/* frontend/src/js/search.js */

// Global search state
window.searchState = {
    query: '',
    activeFields: new Set(['title', 'authors', 'abstract', 'arxivId']), // Default fields to search
    fuseInstances: {}, // Separate Fuse instance for each field
    indexReady: false,
    worker: null
};

// Initialize Fuse.js search with field-specific indices
function initializeSearch() {
    if (!window.yamlData) {
        console.warn('yamlData not available yet');
        return;
    }
    
    const searchContainer = document.getElementById('search-container');
    if (!searchContainer) return;

    // Load saved field preferences
    loadFieldPreferences();
    
    // Start precomputing indices in worker
    startIndexWorker();
    
    // Set up event listener for the search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', debounce((e) => {
            window.searchState.query = e.target.value.trim();
            searchPapers();
        }, 150));
        
        // Clear button
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                searchInput.value = '';
                window.searchState.query = '';
                searchPapers();
            });
        }
    }
    
    // Set up field filter checkboxes
    setupFieldFilters();
    
    // Set up select/clear all buttons
    setupFieldActions();
}

// Start the worker for precomputing indices
function startIndexWorker() {
    if (typeof Worker === 'undefined') {
        console.warn('Web Workers not supported, using fallback');
        createSearchIndicesSync();
        return;
    }
    
    try {
        // Create a new worker
        window.searchState.worker = new Worker('js/search-worker.js');
        
        // Listen for messages from the worker
        window.searchState.worker.onmessage = function(e) {
            if (e.data.status === 'success') {
                // Create Fuse instances from the serialized indices
                createFuseFromIndices(e.data.indices);
                console.log('Search indices created by worker');
            } else {
                console.error('Worker error:', e.data.message);
                // Fallback to synchronous creation
                createSearchIndicesSync();
            }
        };
        
        // Start the worker with paper data
        window.searchState.worker.postMessage({
            action: 'createIndices',
            data: {
                papers: Object.values(window.yamlData)
            }
        });
    } catch (error) {
        console.error('Error starting worker:', error);
        // Fallback to synchronous creation
        createSearchIndicesSync();
    }
}

// Create Fuse instances from serialized indices
function createFuseFromIndices(indices) {
    const papers = Object.values(window.yamlData);
    
    // Create instances for each field
    Object.entries(indices).forEach(([field, index]) => {
        window.searchState.fuseInstances[field] = new Fuse(papers, {
            includeScore: true
        });
        
        // Import the pre-computed index
        window.searchState.fuseInstances[field].setIndex(index);
    });
    
    window.searchState.indexReady = true;
}

// Fallback synchronous index creation
function createSearchIndicesSync() {
    const papers = Object.values(window.yamlData);
    
    // Define configurations for each field
    const fieldConfigs = {
        title: { threshold: 0.3 },
        authors: { threshold: 0.4 },
        abstract: { threshold: 0.3 },
        arxivId: { threshold: 0.2 },
        arxiv_tags: { 
            threshold: 0.2,
            // For tags, we need to process the array structure
            getFn: (obj, path) => {
                return obj.arxiv_tags ? obj.arxiv_tags.join(' ') : '';
            }
        }
    };
    
    // Create a Fuse instance for each field
    Object.entries(fieldConfigs).forEach(([field, config]) => {
        const options = {
            includeScore: true,
            keys: [field],
            threshold: config.threshold
        };
        
        // Add getFn if specified
        if (config.getFn) {
            options.getFn = config.getFn;
        }
        
        window.searchState.fuseInstances[field] = new Fuse(papers, options);
    });
    
    // Create a combined instance for searching all fields at once
    window.searchState.fuseInstances.all = new Fuse(papers, {
        includeScore: true,
        threshold: 0.3,
        keys: [
            { name: 'title', weight: 2.0 },
            { name: 'authors', weight: 1.0 },
            { name: 'abstract', weight: 1.0 },
            { name: 'arxivId', weight: 1.5 },
            { name: 'arxiv_tags', weight: 1.2 }
        ]
    });
    
    window.searchState.indexReady = true;
    console.log('Search indices created synchronously');
}

// Set up the field filter checkboxes
function setupFieldFilters() {
    const fieldFilters = document.getElementById('field-filters');
    if (!fieldFilters) return;
    
    // Define fields and their display names
    const fields = [
        { id: 'title', label: 'Title' },
        { id: 'authors', label: 'Authors' },
        { id: 'abstract', label: 'Abstract' },
        { id: 'arxivId', label: 'ArXiv ID' },
        { id: 'arxiv_tags', label: 'Categories' }
    ];
    
    // Create checkboxes for each field
    fieldFilters.innerHTML = fields.map(field => `
        <label class="field-filter">
            <input type="checkbox" class="field-checkbox" 
                   data-field="${field.id}" 
                   ${window.searchState.activeFields.has(field.id) ? 'checked' : ''}>
            ${field.label}
        </label>
    `).join('');
    
    // Add event listeners to checkboxes
    document.querySelectorAll('.field-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const field = checkbox.dataset.field;
            if (checkbox.checked) {
                window.searchState.activeFields.add(field);
            } else {
                window.searchState.activeFields.delete(field);
            }
            
            // Save field preferences
            localStorage.setItem('searchFields', JSON.stringify([...window.searchState.activeFields]));
            
            // Re-run search if query exists
            if (window.searchState.query) {
                searchPapers();
            }
        });
    });
}

// Set up select all / clear all buttons
function setupFieldActions() {
    const selectAllBtn = document.getElementById('select-all-fields');
    const clearAllBtn = document.getElementById('clear-all-fields');
    
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.field-checkbox').forEach(checkbox => {
                checkbox.checked = true;
                window.searchState.activeFields.add(checkbox.dataset.field);
            });
            
            // Save field preferences
            localStorage.setItem('searchFields', JSON.stringify([...window.searchState.activeFields]));
            
            // Re-run search if query exists
            if (window.searchState.query) {
                searchPapers();
            }
        });
    }
    
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.field-checkbox').forEach(checkbox => {
                checkbox.checked = false;
            });
            
            window.searchState.activeFields.clear();
            
            // Save field preferences
            localStorage.setItem('searchFields', JSON.stringify([]));
            
            // Re-run search if query exists
            if (window.searchState.query) {
                searchPapers();
            }
        });
    }
}

// Load saved field preferences
function loadFieldPreferences() {
    try {
        const savedFields = JSON.parse(localStorage.getItem('searchFields'));
        if (savedFields && Array.isArray(savedFields)) {
            window.searchState.activeFields = new Set(savedFields);
        }
    } catch (e) {
        console.error('Error loading saved search fields', e);
    }
}

// Simple debounce function to limit search frequency
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            func.apply(context, args);
        }, wait);
    };
}

// Search papers with the current query across selected fields
function searchPapers() {
    const { query, activeFields, fuseInstances, indexReady } = window.searchState;
    
    // Clear all search filtering
    document.querySelectorAll('tr[data-paper-id]').forEach(row => {
        row.classList.remove('search-filtered');
    });
    
    if (!query || !indexReady || activeFields.size === 0) {
        hideEmptyDayGroups(); // do I need this here? probably doesn't hurt, anyway.
        updateSearchStats();
        return;
    }
    
    let matchingIds = new Set();
    
    // Get results from each active field and combine them
    activeFields.forEach(field => {
        const instance = fuseInstances[field];
        if (!instance) return;
        
        const results = instance.search(query);
        results.forEach(result => {
            matchingIds.add(result.item.id);
        });
    });
    
    // If we have no results and query is substantial, try a fallback search
    if (matchingIds.size === 0 && query.length > 2) {
        const fallbackResults = fuseInstances.all.search(query, { limit: 20 });
        fallbackResults.forEach(result => {
            matchingIds.add(result.item.id);
        });
    }
    
    // Hide papers that don't match
    let visibleCount = 0;
    document.querySelectorAll('tr[data-paper-id]').forEach(row => {
        const paperId = row.dataset.paperId;
        const isMatch = matchingIds.has(paperId);
        
        row.classList.toggle('search-filtered', !isMatch);
        
        if (isMatch && !row.classList.contains('filtered')) {
            visibleCount++;
        }
    });
    
    hideEmptyDayGroups();
    // Update search stats
    updateSearchStats(visibleCount);
}

// Update search result statistics
function updateSearchStats(matchCount, totalVisible) {
    const searchStats = document.getElementById('search-stats');
    if (!searchStats) return;
    
    if (!window.searchState.query) {
        searchStats.innerHTML = '';
        return;
    }
    
    if (!totalVisible) {
        totalVisible = document.querySelectorAll('tr[data-paper-id]:not(.filtered)').length;
    }
    
    if (matchCount === undefined) {
        matchCount = totalVisible;
    }
    
    // Show how many papers remain visible instead of how many are filtered
    searchStats.innerHTML = `
        <span class="search-visible-count">Showing ${matchCount} of ${totalVisible} papers</span>
    `;
}

// Apply both search and tag filters
function applyAllFilters() {
    // First apply the tag filters
    if (typeof window.applyFilters === 'function') {
        window.applyFilters();
    }
    
    // Then apply search filters on top
    searchPapers();
}

// Export functions for use in other modules
window.searchModule = {
    initializeSearch,
    searchPapers,
    applyAllFilters,
    precomputeIndices: function() {
        if (window.searchState.indexReady) return;
        createSearchIndicesSync();
    }
};

// Hide day groups that have no visible papers
function hideEmptyDayGroups() {
    // Process each day group
    document.querySelectorAll('.day-group').forEach(dayGroup => {
        // Check if the day group has any visible paper rows
        const visiblePapers = dayGroup.querySelectorAll('tr[data-paper-id]:not(.search-filtered):not(.filtered)');
        
        // Add or remove the 'empty-day' class based on whether there are visible papers
        if (visiblePapers.length === 0) {
            dayGroup.classList.add('empty-day');
        } else {
            dayGroup.classList.remove('empty-day');
        }
    });
}

// Override the existing filter function to also apply search
const originalApplyFilters = window.applyFilters;
if (originalApplyFilters) {
    window.applyFilters = function() {
        originalApplyFilters();
        searchPapers();
        hideEmptyDayGroups();
    };
}

// Initialize the search module when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Wait for yamlData to be available before initializing
    if (window.yamlData) {
        initializeSearch();
    }
});
