/* frontend/src/js/papers.js */

// Track active paper
let activePaperId = null;

const calculateColor = (paper, coloringEnabled = true) => {
    if (!coloringEnabled) return 'rgb(255, 255, 255)';
    
    const colorBy = document.querySelector('input[name="colorBy"]:checked').value;
    
    if (colorBy === 'freshness') {
        if (!paper.last_visited || !paper.published_date) return 'rgb(255, 255, 255)';
        
        const visitDate = new Date(paper.last_visited);
        const pubDate = new Date(paper.published_date);
        const diffDays = Math.floor((visitDate - pubDate) / (1000 * 60 * 60 * 24));
        
        const maxAge = 365;
        const freshness = Math.max(0, Math.min(1, 1 - (diffDays / maxAge)));
        const value = Math.round(255 - (freshness * 55));
        return `rgb(${value}, 255, ${value})`; // Green gradient
    } else {
        // Reading time coloring
        const readingTime = paper.total_reading_time_seconds || 0;
        const maxReadingTime = 300; // 5 minutes
        const intensity = Math.max(0, Math.min(1, readingTime / maxReadingTime));
        const value = Math.round(255 - (intensity * 55));
        return `rgb(255, ${value}, ${value})`; // Red gradient
    }
};

const setActivePaper = (paperId) => {
    // Remove active class from previous paper
    const previousActive = document.querySelector('.paper-card.active');
    if (previousActive) {
        previousActive.classList.remove('active');
    }

    // Set new active paper
    activePaperId = paperId;
    const paperCard = document.querySelector(`.paper-card[data-paper-id="${paperId}"]`);
    if (paperCard) {
        paperCard.classList.add('active');
    }

    // Show paper details
    updatePaperDetails(paperId);
};

// Load collapsed items state
const loadCollapsedState = () => {
    try {
        return JSON.parse(localStorage.getItem('collapsedItems')) || {};
    } catch (e) {
        return {};
    }
};

// Save collapsed items state
const saveCollapsedState = (state) => {
    localStorage.setItem('collapsedItems', JSON.stringify(state));
};

// Create a collapsible item
const createCollapsibleItem = (id, title, content, isHtml = false) => {
    const collapsedState = loadCollapsedState();
    const isCollapsed = collapsedState[id] || false;
    
    return `
        <div class="collapsible-item ${isCollapsed ? 'collapsed' : ''}" data-item-id="${id}">
            <div class="collapsible-header">
                <h4 class="collapsible-title">${title}</h4>
                <span class="collapsible-toggle">▼</span>
            </div>
            <div class="collapsible-content">
                <div class="collapsible-inner">
                    ${isHtml ? content : `<p class="metadata-value">${content}</p>`}
                </div>
            </div>
        </div>
    `;
};

const updatePaperDetails = async (paperId) => {
    const detailsPanel = document.getElementById('paperDetails');
    const paper = window.yamlData[paperId];

    if (!paper) {
        detailsPanel.classList.remove('visible');
        return;
    }

    // Update title
    const titleEl = detailsPanel.querySelector('.paper-details-title');
    titleEl.textContent = paper.title;

    // Update metadata section
    const metadataEl = detailsPanel.querySelector('.metadata-content');
    const metadataItems = [
        {
            id: `${paperId}-authors`,
            title: 'Authors',
            content: paper.authors
        },
        {
            id: `${paperId}-published`,
            title: 'Published',
            content: new Date(paper.published_date).toLocaleDateString()
        },
        {
            id: `${paperId}-arxiv`,
            title: 'arXiv ID',
            content: `<a href="${paper.url}" target="_blank">${paper.arxivId}</a>`,
            isHtml: true
        },
        {
            id: `${paperId}-categories`,
            title: 'Categories',
            content: paper.arxiv_tags.join(', ')
        },
        {
            id: `${paperId}-abstract`,
            title: 'Abstract',
            content: paper.abstract
        }
    ];

    metadataEl.innerHTML = `
        <div class="details-section">
            <div class="details-section-header">Paper Information</div>
            ${metadataItems.map(item => 
                createCollapsibleItem(item.id, item.title, item.content, item.isHtml)
            ).join('')}
        </div>
    `;

    // Update features section
    const featuresEl = detailsPanel.querySelector('.features-content');
    if (paper.features_path) {
        const features = await Promise.all(
            Object.entries(paper.features_path).map(async ([type, path]) => {
                try {
                    const response = await fetch(path);
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    const content = await response.text();
                    return {
                        id: `${paperId}-feature-${type}`,
                        title: formatFeatureName(type),
                        content: `<div class="feature-content markdown-body">${marked.parse(content)}</div>`,
                        isHtml: true
                    };
                } catch (error) {
                    console.error(`Error loading feature ${type}:`, error);
                    return {
                        id: `${paperId}-feature-${type}`,
                        title: formatFeatureName(type),
                        content: `<div class="feature-content error">Error loading feature content</div>`,
                        isHtml: true
                    };
                }
            })
        );

        featuresEl.innerHTML = `
            <div class="details-section">
                <div class="details-section-header">Features</div>
                ${features.map(feature => 
                    createCollapsibleItem(feature.id, feature.title, feature.content, feature.isHtml)
                ).join('')}
            </div>
        `;
    } else {
        featuresEl.innerHTML = '<p class="no-features">No features available for this paper</p>';
    }

    // Add event listeners for collapsible items
    detailsPanel.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', () => {
            const item = header.closest('.collapsible-item');
            const itemId = item.dataset.itemId;
            const collapsedState = loadCollapsedState();
            
            item.classList.toggle('collapsed');
            collapsedState[itemId] = item.classList.contains('collapsed');
            saveCollapsedState(collapsedState);
        });
    });

    // Show panel
    detailsPanel.classList.add('visible');
};

const renderPaperCard = (paper) => {
    const readingTime = paper.total_reading_time_seconds 
        ? `${Math.round(paper.total_reading_time_seconds / 60)} min read`
        : '';

    const coloringEnabled = document.getElementById('coloringToggle')?.checked ?? true;
    const bgColor = calculateColor(paper, coloringEnabled);
    
    const metaParts = [];
    metaParts.push(`<span>${paper.authors}</span>`);
    
    if (readingTime) {
        metaParts.push(`<span class="meta-divider">•</span><span>${readingTime}</span>`);
    }
    
    if (paper.published_date) {
        const pubDate = new Date(paper.published_date).toLocaleDateString();
        metaParts.push(`<span class="meta-divider">•</span><span>Published: ${pubDate}</span>`);
    }
    
    if (paper.arxiv_tags?.length > 0) {
        const tags = paper.arxiv_tags.join(', ');
        metaParts.push(`<span class="meta-divider">•</span><span>${tags}</span>`);
    }

    // Check if this is the active paper
    const isActive = paper.id === activePaperId;
    
    return `
        <article class="paper-card ${isActive ? 'active' : ''}" data-paper-id="${paper.id}">
            <div class="paper-header">
                <a href="${paper.url}" class="arxiv-id" onclick="event.stopPropagation()" 
                   style="background-color: ${bgColor}; padding: 4px 8px; border-radius: 4px;">
                    ${paper.arxivId}
                </a>
                <span class="paper-title">${paper.title}</span>
            </div>
            <div class="paper-content">
                <div class="paper-meta">${metaParts.join('')}</div>
            </div>
        </article>
    `;
};

const renderPapers = () => {
    const container = document.getElementById('papers-container');
    container.innerHTML = '';
    const collapsedDays = JSON.parse(localStorage.getItem('collapsedDays') || '{}');
    
    const papersByDay = {};
    Object.entries(window.yamlData)
        .sort(([_, a], [__, b]) => new Date(b.last_visited) - new Date(a.last_visited))
        .forEach(([id, paper]) => {
            const date = paper.last_visited.split('T')[0];
            if (!papersByDay[date]) papersByDay[date] = [];
            papersByDay[date].push({ ...paper, id });
        });

    Object.entries(papersByDay).forEach(([date, papers]) => {
        const dayGroup = document.createElement('section');
        dayGroup.className = `day-group ${collapsedDays[date] ? 'collapsed' : ''}`;
        dayGroup.dataset.date = date;

        const dayHeader = document.createElement('div');
        dayHeader.className = 'day-header';
        dayHeader.onclick = () => toggleDayGroup(dayHeader);
        dayHeader.innerHTML = `
            <span class="day-title">${formatDate(date, 'group')}</span>
            <span class="paper-count">${papers.length} paper${papers.length !== 1 ? 's' : ''}</span>
        `;

        const papersContainer = document.createElement('div');
        papersContainer.className = 'papers-container';

        const papersContainerInner = document.createElement('div');
        papersContainerInner.className = 'papers-container-inner';
        papersContainerInner.innerHTML = papers
            .map(paper => renderPaperCard(paper))
            .join('');

        papersContainer.appendChild(papersContainerInner);
        dayGroup.appendChild(dayHeader);
        dayGroup.appendChild(papersContainer);
        container.appendChild(dayGroup);

        // Add handlers to this day's papers
        addPaperHandlers(papersContainerInner);
    });
};

// Format feature names
function formatFeatureName(featureType) {
    return featureType
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function addPaperHandlers(container) {
    // Add click handlers for paper cards
    container.querySelectorAll('.paper-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger on links
            if (e.target.closest('a')) return;
            
            const paperId = card.dataset.paperId;
            setActivePaper(paperId);
        });
    });
}

const toggleDayGroup = (element) => {
    const group = element.closest('.day-group');
    group.classList.toggle('collapsed');
    const date = group.dataset.date;
    const collapsedDays = JSON.parse(localStorage.getItem('collapsedDays') || '{}');
    collapsedDays[date] = group.classList.contains('collapsed');
    localStorage.setItem('collapsedDays', JSON.stringify(collapsedDays));
};

// Initialize close button handler and section handlers
document.addEventListener('DOMContentLoaded', () => {
    const closeButton = document.getElementById('closeDetails');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            const detailsPanel = document.getElementById('paperDetails');
            detailsPanel.classList.remove('visible');
            // Clear active paper
            const activeCard = document.querySelector('.paper-card.active');
            if (activeCard) {
                activeCard.classList.remove('active');
            }
            activePaperId = null;
        });
    }

    // Initialize section handlers
    initializeSectionHandlers();
});
