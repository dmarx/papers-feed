/* frontend/src/js/url-state.js */

// URL State Manager
// Handles saving and restoring application state via URL parameters
// for shareable search and filter configurations

// Global URL state manager
window.urlStateManager = {
    // Last saved state, used to avoid unnecessary URL updates
    lastState: {},
    
    // Initialize the URL state manager
    init() {
        // Set up event listener for state changes
        window.addEventListener('popstate', this.handlePopState.bind(this));
        
        // Process URL parameters on initial load
        this.loadStateFromUrl();
        
        // Set up periodic state capture
        this.startStateTracking();
    },
    
    // Start tracking state changes to update URL
    startStateTracking() {
        // Check and update state every 1 second
        setInterval(() => {
            this.captureAndUpdateState();
        }, 1000);
    },
    
    // Capture current app state and update URL if needed
    captureAndUpdateState() {
        const currentState = this.captureState();
        
        // Only update URL if state has changed
        if (!this.isEqualState(currentState, this.lastState)) {
            this.updateUrl(currentState);
            this.lastState = currentState;
        }
    },
    
    // Capture the current application state
    captureState() {
        const state = {};
        
        // Capture search state
        if (window.searchState) {
            if (window.searchState.query) {
                state.q = window.searchState.query;
            }
            
            if (window.searchState.activeFields && window.searchState.activeFields.size > 0) {
                state.fields = [...window.searchState.activeFields].join(',');
            }
        }
        
        // Capture filter state
        if (window.filterState) {
            if (window.filterState.mode) {
                state.mode = window.filterState.mode;
            }
            
            if (window.filterState.activeTags && window.filterState.activeTags.size > 0) {
                state.tags = [...window.filterState.activeTags].join(',');
            }
        }
        
        return state;
    },
    
    // Update URL with current state without causing navigation
    updateUrl(state) {
        // Skip if no state to represent
        if (Object.keys(state).length === 0) {
            return;
        }
        
        // Build query string
        const queryParams = new URLSearchParams();
        Object.entries(state).forEach(([key, value]) => {
            queryParams.set(key, value);
        });
        
        // Update URL using History API without causing navigation
        const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
        window.history.replaceState(state, '', newUrl);
    },
    
    // Handle browser back/forward navigation
    handlePopState(event) {
        if (event.state) {
            this.applyState(event.state);
        } else {
            // If no state, treat as a reset
            this.resetState();
        }
    },
    
    // Load state from URL parameters on page load
    loadStateFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const state = {};
        
        // Convert URL parameters to state object
        for (const [key, value] of urlParams.entries()) {
            state[key] = value;
        }
        
        // Apply the state if there are parameters
        if (Object.keys(state).length > 0) {
            this.applyState(state);
        }
    },
    
    // Apply a state object to the application
    applyState(state) {
        // Apply search query
        if (state.q) {
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.value = state.q;
                if (window.searchState) {
                    window.searchState.query = state.q;
                }
            }
        }
        
        // Apply search fields
        if (state.fields && window.searchState) {
            const fields = state.fields.split(',');
            window.searchState.activeFields = new Set(fields);
            
            // Update checkboxes
            document.querySelectorAll('.field-checkbox').forEach(checkbox => {
                const field = checkbox.dataset.field;
                checkbox.checked = fields.includes(field);
            });
        }
        
        // Apply filter mode
        if (state.mode && window.filterState) {
            window.filterState.mode = state.mode;
            
            // Update mode buttons
            document.querySelectorAll('.mode-button').forEach(button => {
                button.classList.toggle('active', button.dataset.mode === state.mode);
            });
        }
        
        // Apply active tags
        if (state.tags && window.filterState) {
            const tags = state.tags.split(',');
            window.filterState.activeTags = new Set(tags);
            
            // Update tag pills
            document.querySelectorAll('.tag-pill').forEach(pill => {
                const tag = pill.dataset.tag;
                pill.classList.toggle('active', tags.includes(tag));
            });
        }
        
        // Apply all filters
        if (typeof window.applyFilters === 'function') {
            window.applyFilters();
        }
        
        // Apply search
        if (typeof window.searchModule?.searchPapers === 'function') {
            window.searchModule.searchPapers();
        }
    },
    
    // Reset all state to defaults
    resetState() {
        // Clear search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
        }
        
        if (window.searchState) {
            window.searchState.query = '';
        }
        
        // Reset filter mode
        if (window.filterState) {
            window.filterState.mode = 'any';
            window.filterState.activeTags.clear();
        }
        
        // Update UI
        document.querySelectorAll('.mode-button').forEach(button => {
            button.classList.toggle('active', button.dataset.mode === 'any');
        });
        
        document.querySelectorAll('.tag-pill').forEach(pill => {
            pill.classList.remove('active');
        });
        
        // Apply filters
        if (typeof window.applyFilters === 'function') {
            window.applyFilters();
        }
    },
    
    // Generate a shareable URL with the current state
    generateShareableUrl() {
        const currentState = this.captureState();
        
        // Build query string
        const queryParams = new URLSearchParams();
        Object.entries(currentState).forEach(([key, value]) => {
            queryParams.set(key, value);
        });
        
        // Get full URL (absolute)
        const url = new URL(window.location.pathname, window.location.origin);
        url.search = queryParams.toString();
        
        return url.toString();
    },
    
    // Copy current state URL to clipboard
    copyShareableUrl() {
        const url = this.generateShareableUrl();
        
        // Use clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(url)
                .then(() => true)
                .catch(() => false);
        } else {
            // Fallback method
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';  // Avoid scrolling to bottom
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                return Promise.resolve(success);
            } catch (err) {
                document.body.removeChild(textarea);
                return Promise.resolve(false);
            }
        }
    },
    
    // Check if two state objects are equal
    isEqualState(state1, state2) {
        // Check if both are objects
        if (typeof state1 !== 'object' || typeof state2 !== 'object' || 
            state1 === null || state2 === null) {
            return false;
        }
        
        const keys1 = Object.keys(state1);
        const keys2 = Object.keys(state2);
        
        if (keys1.length !== keys2.length) {
            return false;
        }
        
        return keys1.every(key => 
            state2.hasOwnProperty(key) && state1[key] === state2[key]
        );
    }
};

// Initialize the URL state manager when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.urlStateManager.init();
});
