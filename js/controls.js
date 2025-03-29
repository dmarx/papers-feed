/* frontend/src/js/controls.js */

const initializeControls = () => {
    // Initialize filter mode buttons
    const filterButtons = document.querySelectorAll('.mode-button');
    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.mode-button').forEach(b => 
                    b.classList.remove('active'));
                button.classList.add('active');
                window.filterState.mode = button.dataset.mode;
                applyFilters();
            });
        });
    }

    // Initialize clear filters button
    const clearFilters = document.getElementById('clear-filters');
    if (clearFilters) {
        clearFilters.addEventListener('click', () => {
            window.filterState.activeTags.clear();
            document.querySelectorAll('.tag-pill').forEach(pill => 
                pill.classList.remove('active'));
            applyFilters();
        });
    }

    // Initialize select all button
    const selectAll = document.getElementById('select-all');
    if (selectAll) {
        selectAll.addEventListener('click', () => {
            document.querySelectorAll('.tag-pill').forEach(pill => {
                const tag = pill.dataset.tag;
                window.filterState.activeTags.add(tag);
                pill.classList.add('active');
            });
            applyFilters();
        });
    }

    // Initialize color controls
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
            if (typeof renderPapers === 'function') {
                renderPapers();
            }
        });
        
        document.querySelectorAll('input[name="colorBy"]').forEach(radio => {
            radio.addEventListener('change', () => {
                localStorage.setItem('colorBy', radio.value);
                if (typeof renderPapers === 'function') {
                    renderPapers();
                }
            });
        });
    }
};
