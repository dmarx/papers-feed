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

    document.querySelectorAll('.paper-card').forEach(card => {
        const paperId = card.dataset.paperId;
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

        card.classList.toggle('filtered', !visible);
        if (visible) visibleCount++;
    });

    document.getElementById('filtered-count').textContent = visibleCount;
    document.getElementById('total-count').textContent = Object.keys(window.yamlData).length;
};

const initializeFilters = () => {
    // Initialize filter state
    window.filterState = {
        mode: 'any',
        activeTags: new Set()
    };

    // Initial render of tag cloud and counters
    renderTagCloud();
    document.getElementById('total-count').textContent = 
        Object.keys(window.yamlData).length;
};
