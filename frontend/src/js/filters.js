/* frontend/src/js/filters.js */

// Global filter state
window.filterState = {
    mode: 'any',
    activeTags: new Set()
};

const renderTagCloud = () => {
    const tags = new Map();
    
    // Collect tags and counts
    Object.values(window.yamlData).forEach(paper => {
        if (paper.arxiv_tags) {
            paper.arxiv_tags.forEach(tag => {
                const count = tags.get(tag) || 0;
                tags.set(tag, count + 1);
            });
        }
    });

    // Sort tags by count
    const sortedTags = Array.from(tags.entries())
        .sort(([, a], [, b]) => b - a);

    // Render tag cloud
    const tagCloud = document.getElementById('tag-cloud');
    if (!tagCloud) return;
    
    tagCloud.innerHTML = sortedTags.map(([tag, count]) => {
        const { name, color } = getCategoryInfo(tag);
        return `
            <button class="tag-pill" data-tag="${tag}" style="background-color: ${color}">
                <span class="tag-name">${tag}</span>
                <span class="tag-count">${count}</span>
                <span class="tooltip">${name}</span>
            </button>
        `;
    }).join('');

    // Re-add click handlers
    document.querySelectorAll('.tag-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const tag = pill.dataset.tag;
            if (window.filterState.activeTags.has(tag)) {
                window.filterState.activeTags.delete(tag);
                pill.classList.remove('active');
            } else {
                window.filterState.activeTags.add(tag);
                pill.classList.add('active');
            }
            applyFilters();
        });
    });
};

const applyFilters = () => {
    const { mode, activeTags } = window.filterState;
    let visibleCount = 0;

    document.querySelectorAll('tr[data-paper-id]').forEach(row => {
        const paperId = row.dataset.paperId;
        const paper = window.yamlData[paperId];
        const paperTags = new Set(paper.arxiv_tags || []);

        let visible = true;
        if (activeTags.size > 0) {
            if (mode === 'any') {
                visible = Array.from(activeTags).some(tag => 
                    paperTags.has(tag));
            } else if (mode === 'all') {
                visible = Array.from(activeTags).every(tag => 
                    paperTags.has(tag));
            } else if (mode === 'none') {
                visible = Array.from(activeTags).every(tag => 
                    !paperTags.has(tag));
            }
        }

        row.classList.toggle('filtered', !visible);
        if (visible) visibleCount++;
    });

    // Update counters
    const filteredCount = document.getElementById('filtered-count');
    const totalCount = document.getElementById('total-count');
    if (filteredCount) filteredCount.textContent = visibleCount;
    if (totalCount) totalCount.textContent = Object.keys(window.yamlData).length;
};

const initializeFilters = () => {
    // Initialize filter state
    window.filterState = {
        mode: 'any',
        activeTags: new Set()
    };

    // Initial render of tag cloud and counters
    renderTagCloud();
    const totalCount = document.getElementById('total-count');
    if (totalCount) {
        totalCount.textContent = Object.keys(window.yamlData).length;
    }
};
