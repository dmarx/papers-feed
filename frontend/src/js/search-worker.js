/* frontend/src/js/search-worker.js */

// This file handles pre-computing search indices in a web worker
// to prevent blocking the main UI thread

importScripts('https://cdnjs.cloudflare.com/ajax/libs/fuse.js/6.6.2/fuse.min.js');

// Listen for messages from the main thread
self.addEventListener('message', function(e) {
    const { action, data } = e.data;
    
    if (action === 'createIndices') {
        try {
            const papers = data.papers;
            const indices = createIndices(papers);
            
            // Send the indices back to the main thread
            self.postMessage({
                status: 'success',
                indices: indices
            });
        } catch (error) {
            self.postMessage({
                status: 'error',
                message: error.message
            });
        }
    }
});

// Create search indices for all fields
function createIndices(papers) {
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
    
    // Store serialized indices
    const indices = {};
    
    // Create an index for each field
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
        
        // Create and serialize index
        const fuse = new Fuse(papers, options);
        indices[field] = fuse.getIndex();
    });
    
    // Create a combined index for all fields
    const allOptions = {
        includeScore: true,
        threshold: 0.3,
        keys: [
            { name: 'title', weight: 2.0 },
            { name: 'authors', weight: 1.0 },
            { name: 'abstract', weight: 1.0 },
            { name: 'arxivId', weight: 1.5 },
            { name: 'arxiv_tags', weight: 1.2 }
        ]
    };
    
    const allFuse = new Fuse(papers, allOptions);
    indices.all = allFuse.getIndex();
    
    return indices;
}
