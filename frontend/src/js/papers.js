/* frontend/src/js/papers.js */

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

const renderPaperCard = (paper, expanded) => {
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

    // Get feature content if paper is expanded
    const featureContent = expanded && paper.features_path ? `
        <div class="paper-features">
            ${Object.entries(paper.features_path).map(([featureType, path]) => `
                <div class="feature-entry" data-feature="${featureType}">
                    <div class="feature-entry-header">
                        <span class="feature-icon">📄</span>
                        <span class="feature-name">${formatFeatureName(featureType)}</span>
                        <button class="feature-expand">▼</button>
                    </div>
                    <div class="feature-content">
                        <div class="feature-content-inner" data-path="${path}">Loading...</div>
                    </div>
                </div>
            `).join('')}
        </div>
    ` : '';
    
    return `
        <article class="paper-card ${expanded ? 'expanded' : ''}" data-paper-id="${paper.id}">
            <div class="paper-header">
                <span class="expand-icon">▶</span>
                <a href="${paper.url}" class="arxiv-id" onclick="event.stopPropagation()" 
                   style="background-color: ${bgColor}; padding: 4px 8px; border-radius: 4px;">
                    ${paper.arxivId}
                </a>
                <span class="paper-title">${paper.title}</span>
            </div>
            <div class="paper-content">
                <div class="paper-content-inner">
                    <div class="paper-meta">${metaParts.join('')}</div>
                    <div class="paper-abstract">${paper.abstract}</div>
                    ${featureContent}
                </div>
            </div>
        </article>
    `;
};

const togglePaperCard = (element, event) => {
    event.stopPropagation();
    const card = element.closest('.paper-card');
    const wasExpanded = card.classList.contains('expanded');
    
    card.classList.toggle('expanded');
    
    const paperId = card.dataset.paperId;
    const expandedCards = JSON.parse(localStorage.getItem('expandedCards') || '{}');
    expandedCards[paperId] = card.classList.contains('expanded');
    localStorage.setItem('expandedCards', JSON.stringify(expandedCards));

    // If expanding, load features
    if (!wasExpanded && card.classList.contains('expanded')) {
        card.querySelectorAll('.feature-content-inner[data-path]').forEach(content => {
            if (content.innerHTML === 'Loading...') {
                fetch(content.dataset.path)
                    .then(response => response.text())
                    .then(text => {
                        content.innerHTML = text;
                    })
                    .catch(error => {
                        console.error('Error loading feature:', error);
                        content.innerHTML = 'Error loading content';
                    });
            }
        });
    }
};

const toggleDayGroup = (element) => {
    const group = element.closest('.day-group');
    group.classList.toggle('collapsed');
    const date = group.dataset.date;
    const collapsedDays = JSON.parse(localStorage.getItem('collapsedDays') || '{}');
    collapsedDays[date] = group.classList.contains('collapsed');
    localStorage.setItem('collapsedDays', JSON.stringify(collapsedDays));
};

const renderPapers = () => {
    const container = document.getElementById('papers-container');
    container.innerHTML = '';
    const expandedCards = JSON.parse(localStorage.getItem('expandedCards') || '{}');
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
            .map(paper => renderPaperCard(paper, expandedCards[paper.id]))
            .join('');

        papersContainer.appendChild(papersContainerInner);
        dayGroup.appendChild(dayHeader);
        dayGroup.appendChild(papersContainer);
        container.appendChild(dayGroup);
    });

    // Add click handlers for paper cards
    document.querySelectorAll('.paper-card').forEach(card => {
        card.onclick = (e) => togglePaperCard(card, e);
        // Initialize features if card is expanded
        if (card.classList.contains('expanded')) {
            addFeatureHandlers(card);
        }
    });
};
