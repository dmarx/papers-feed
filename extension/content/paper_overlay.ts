// extension/content/paper_overlay.ts
// UI overlay for annotating papers

import { loguru } from '../utils/logger';

const logger = loguru.getLogger('PaperOverlay');

/**
 * Set up paper UI overlay 
 */
export function setupPaperUIOverlay(): void {
  logger.info('Setting up paper UI overlay');
  
  // Set up annotation for paper links
  setupLinkAnnotation();
  
  // Set up floating action button for current page if it's a paper
  checkCurrentPageForPaper();
}

/**
 * Set up annotation for paper links
 */
function setupLinkAnnotation(): void {
  // Process existing links
  processExistingLinks();
  
  // Set up a MutationObserver to detect new links
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      // Process added nodes
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if node is a link
          if ((node as Element).tagName === 'A' && (node as HTMLAnchorElement).href) {
            processLink(node as HTMLAnchorElement);
          }
          
          // Check for links within the node
          (node as Element).querySelectorAll('a[href]').forEach((link) => {
            processLink(link as HTMLAnchorElement);
          });
        }
      });
    });
  });
  
  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Process existing links in the document
 */
function processExistingLinks(): void {
  document.querySelectorAll('a[href]').forEach((link) => {
    processLink(link as HTMLAnchorElement);
  });
}

/**
 * Process a link to see if it's a paper link
 * @param link Link element to process
 */
function processLink(link: HTMLAnchorElement): void {
  // Skip if already processed
  if (link.classList.contains('paper-processed')) {
    return;
  }
  
  link.classList.add('paper-processed');
  
  // Check if this is a paper URL
  window.paperTracker.isPaperUrl(link.href).then((isPaper: boolean) => {
    if (isPaper) {
      // Add paper indicator icon
      addPaperIndicator(link);
    }
  }).catch((error: Error) => {
    logger.error(`Error checking if URL is paper: ${error}`);
  });
}

/**
 * Add paper indicator icon to a link
 * @param link Link element to annotate
 */
function addPaperIndicator(link: HTMLAnchorElement): void {
  // Create indicator element
  const indicator = document.createElement('span');
  indicator.className = 'paper-indicator';
  indicator.title = 'Academic paper - Click to track';
  
  // Add click handler
  indicator.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Track the paper
    window.paperTracker.trackPaper(link.href);
    
    // Show feedback
    showTrackingFeedback(indicator);
  });
  
  // Insert after the link
  link.parentNode?.insertBefore(indicator, link.nextSibling);
}

/**
 * Show feedback when a paper is tracked
 * @param element Element to show feedback on
 */
function showTrackingFeedback(element: HTMLElement): void {
  // Add success class for animation
  element.classList.add('tracked');
  
  // Create tooltip
  const tooltip = document.createElement('div');
  tooltip.className = 'paper-tooltip';
  tooltip.textContent = 'Paper tracked!';
  
  // Position tooltip
  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.top - 30}px`;
  tooltip.style.left = `${rect.left}px`;
  
  // Add to document
  document.body.appendChild(tooltip);
  
  // Remove after animation
  setTimeout(() => {
    tooltip.remove();
    element.classList.remove('tracked');
  }, 2000);
}

/**
 * Check if the current page is a paper and add UI if needed
 */
function checkCurrentPageForPaper(): void {
  // Extract metadata from current page
  window.paperTracker.extractMetadata().then((metadata: any) => {
    if (metadata) {
      logger.info('Current page is a paper. Adding overlay UI');
      addPageOverlay(metadata);
    }
  }).catch((error: Error) => {
    logger.error(`Error checking if current page is paper: ${error}`);
  });
}

/**
 * Add overlay UI to the current page
 * @param metadata Paper metadata
 */
function addPageOverlay(metadata: any): void {
  // Create a floating action button
  const fab = document.createElement('div');
  fab.className = 'paper-fab';
  fab.title = 'Paper actions';
  
  // Add icon
  const icon = document.createElement('span');
  icon.className = 'paper-fab-icon';
  icon.textContent = '📝';
  fab.appendChild(icon);
  
  // Add click handler
  fab.addEventListener('click', () => {
    // Toggle popup
    if (document.querySelector('.paper-action-popup')) {
      removeActionPopup();
    } else {
      showActionPopup(fab, metadata);
    }
  });
  
  // Add to document
  document.body.appendChild(fab);
}

/**
 * Show action popup with paper information
 * @param trigger Trigger element
 * @param metadata Paper metadata
 */
function showActionPopup(trigger: HTMLElement, metadata: any): void {
  // Create popup
  const popup = document.createElement('div');
  popup.className = 'paper-action-popup';
  
  // Add content
  popup.innerHTML = `
    <div class="paper-popup-header">
      <div class="paper-popup-title">${metadata.title || 'Untitled Paper'}</div>
      <div class="paper-popup-source">${getSourceLabel(metadata.source)}</div>
    </div>
    <div class="paper-popup-authors">${metadata.authors || ''}</div>
    ${metadata.abstract ? `<div class="paper-popup-abstract">${metadata.abstract}</div>` : ''}
    <div class="paper-popup-actions">
      <button class="paper-action-button" data-action="rate-up">👍 Interesting</button>
      <button class="paper-action-button" data-action="rate-down">👎 Not interesting</button>
    </div>
    <textarea class="paper-notes" placeholder="Add notes..."></textarea>
    <button class="paper-save-button">Save</button>
  `;
  
  // Position popup
  const rect = trigger.getBoundingClientRect();
  popup.style.bottom = `${window.innerHeight - rect.top + 10}px`;
  popup.style.right = `${window.innerWidth - rect.right + 10}px`;
  
  // Add to document
  document.body.appendChild(popup);
  
  // Add event listeners
  popup.querySelector('.paper-save-button')?.addEventListener('click', () => {
    const notes = (popup.querySelector('.paper-notes') as HTMLTextAreaElement).value;
    if (notes) {
      saveNotes(metadata, notes);
    }
    
    // Close popup
    removeActionPopup();
  });
  
  // Add rating buttons handlers
  popup.querySelectorAll('.paper-action-button').forEach(button => {
    button.addEventListener('click', () => {
      const action = (button as HTMLElement).dataset.action;
      if (action === 'rate-up') {
        rateCurrentPaper('thumbsup');
      } else if (action === 'rate-down') {
        rateCurrentPaper('thumbsdown');
      }
      
      // Mark button as active
      popup.querySelectorAll('.paper-action-button').forEach(b => 
        b.classList.remove('active'));
      button.classList.add('active');
    });
  });
  
  // Close on outside click
  document.addEventListener('click', outsideClickHandler);
}

/**
 * Remove action popup
 */
function removeActionPopup(): void {
  document.querySelector('.paper-action-popup')?.remove();
  document.removeEventListener('click', outsideClickHandler);
}

/**
 * Handle clicks outside the popup
 */
function outsideClickHandler(e: MouseEvent): void {
  const popup = document.querySelector('.paper-action-popup');
  const fab = document.querySelector('.paper-fab');
  
  if (popup && fab && !popup.contains(e.target as Node) && !fab.contains(e.target as Node)) {
    removeActionPopup();
  }
}

/**
 * Save notes for the current paper
 * @param metadata Paper metadata
 * @param notes Notes to save
 */
function saveNotes(metadata: any, notes: string): void {
  chrome.runtime.sendMessage({
    type: 'updateAnnotation',
    annotationType: 'notes',
    data: {
      paperId: metadata.primary_id,
      source: metadata.source,
      notes,
      title: metadata.title
    }
  }, response => {
    if (response && response.success) {
      showSaveSuccess();
    }
  });
}

/**
 * Rate the current paper
 * @param rating Rating value
 */
function rateCurrentPaper(rating: string): void {
  chrome.runtime.sendMessage({
    type: 'updateRating',
    rating
  }, response => {
    if (response && response.success) {
      showSaveSuccess();
    }
  });
}

/**
 * Show save success message
 */
function showSaveSuccess(): void {
  // Create toast
  const toast = document.createElement('div');
  toast.className = 'paper-toast';
  toast.textContent = 'Saved successfully!';
  
  // Add to document
  document.body.appendChild(toast);
  
  // Remove after animation
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

/**
 * Get a human-readable label for a source
 * @param source Paper source type
 * @returns Human-readable label
 */
function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'arxiv': 'arXiv',
    'semanticscholar': 'Semantic Scholar',
    'doi': 'DOI',
    'acm': 'ACM Digital Library',
    'openreview': 'OpenReview'
  };
  
  return labels[source] || source.charAt(0).toUpperCase() + source.slice(1);
}
