/* frontend/src/js/controls.js */

const toggleAllDays = (shouldCollapse) => {
    const dayGroups = document.querySelectorAll('.day-group');
    const collapsedDays = JSON.parse(localStorage.getItem('collapsedDays') || '{}');
    
    dayGroups.forEach(group => {
        if (shouldCollapse) {
            group.classList.add('collapsed');
            collapsedDays[group.dataset.date] = true;
        } else {
            group.classList.remove('collapsed');
            delete collapsedDays[group.dataset.date];
        }
    });
    
    localStorage.setItem('collapsedDays', JSON.stringify(collapsedDays));
};

const toggleAllPapers = (shouldCollapse) => {
    const visiblePapers = document.querySelectorAll('.day-group:not(.collapsed) .paper-card');
    const expandedCards = JSON.parse(localStorage.getItem('expandedCards') || '{}');
    
    visiblePapers.forEach(card => {
        if (shouldCollapse) {
            card.classList.remove('expanded');
            delete expandedCards[card.dataset.paperId];
        } else {
            card.classList.add('expanded');
            expandedCards[card.dataset.paperId] = true;
        }
    });
    
    localStorage.setItem('expandedCards', JSON.stringify(expandedCards));
};

const initializeControls = () => {
    // Color controls
    const coloringToggle = document.getElementById('coloringToggle');
    if (coloringToggle) {
        // Load saved preferences
        const savedColoring = localStorage.getItem('coloringEnabled');
        if (savedColoring !== null) {
            coloringToggle.checked = savedColoring === 'true';
        }
        
        const savedColorBy = localStorage.getItem('colorBy');
        if (savedColorBy) {
            const radio = document.querySelector(`input[name="colorBy"][value="${savedColorBy}"]`);
            if (radio) radio.checked = true;
        }
        
        // Add listeners
        coloringToggle.addEventListener('change', () => {
            localStorage.setItem('coloringEnabled', coloringToggle.checked);
            renderPapers();
        });
        
        document.querySelectorAll('input[name="colorBy"]').forEach(radio => {
            radio.addEventListener('change', () => {
                localStorage.setItem('colorBy', radio.value);
                renderPapers();
            });
        });
    }

    // Filter mode buttons
    document.querySelectorAll('.mode-button').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.mode-button').forEach(b => 
                b.classList.remove('active'));
            button.classList.add('active');
            window.filterState.mode = button.dataset.mode;
            applyFilters();
        });
    });

    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        window.filterState.activeTags.clear();
        document.querySelectorAll('.tag-pill').forEach(pill => 
            pill.classList.remove('active'));
        applyFilters();
    });

    // Select all tags
    document.getElementById('select-all').addEventListener('click', () => {
        document.querySelectorAll('.tag-pill').forEach(pill => {
            const tag = pill.dataset.tag;
            window.filterState.activeTags.add(tag);
            pill.classList.add('active');
        });
        applyFilters();
    });

    // Controls panel visibility
    const showControls = document.getElementById('showControls');
    const controlsPanel = document.getElementById('controlsPanel');
    const closeControls = document.getElementById('closeControls');

    showControls.addEventListener('click', () => {
        controlsPanel.classList.add('expanded');
        showControls.style.visibility = 'hidden';
    });

    closeControls.addEventListener('click', () => {
        controlsPanel.classList.remove('expanded');
        showControls.style.visibility = 'visible';
    });

    // Close panel when clicking outside
    document.addEventListener('click', (event) => {
        if (!controlsPanel.contains(event.target) && 
            event.target !== showControls && 
            controlsPanel.classList.contains('expanded')) {
            controlsPanel.classList.remove('expanded');
            showControls.style.visibility = 'visible';
        }
    });

    // Bulk collapse/expand functionality
    document.getElementById('executeAction').addEventListener('click', () => {
        const target = document.querySelector('input[name="target"]:checked').value;
        const action = document.querySelector('input[name="action"]:checked').value;
        const shouldCollapse = action === 'collapse';
        
        if (target === 'days') {
            toggleAllDays(shouldCollapse);
        } else {
            toggleAllPapers(shouldCollapse);
        }
    });
};
