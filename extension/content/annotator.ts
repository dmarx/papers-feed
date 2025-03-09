// content/annotator.ts - Paper annotation UI components and functionality

import { fetchPaperMetadata } from './metadata_fetcher';
import { getSourceLabel, formatPrimaryId } from './paper_detector';

/**
 * Paper metadata from API
 */
interface PaperMetadata {
  title?: string;
  authors?: string;
  abstract?: string;
  [key: string]: any;
}

/**
 * Create a wrapper element for the popup
 * @returns {HTMLElement} Popup wrapper element
 */
export function createPopupWrapper(): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'paper-popup-container';
  wrapper.style.position = 'relative';
  return wrapper;
}

/**
 * Create popup element for paper annotation
 * @param {string} source Paper source
 * @param {string} id Paper ID
 * @param {string} initialTitle Optional initial title
 * @returns {Promise<HTMLElement>} Popup element
 */
export async function createPopup(
  source: string, 
  id: string, 
  initialTitle = ''
): Promise<HTMLElement> {
  console.log(`Creating popup for ${source}:${id}`);
  
  // Calculate the standardized primary ID
  const primary_id = formatPrimaryId(source, id);
  
  // Fetch metadata
  const metadata = await fetchPaperMetadata(source, id);
  console.log('Fetched metadata:', metadata);

  // Create the popup element
  const popup = document.createElement('div');
  popup.className = 'paper-popup';
  
  // Add enhanced styles
  Object.assign(popup.style, {
    position: 'absolute',
    zIndex: '10000',
    background: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    padding: '12px',
    width: '300px',
    maxWidth: '90vw',
    fontSize: '14px',
    fontFamily: 'system-ui, sans-serif'
  });
  
  // Create popup content
  popup.innerHTML = `
    <div class="paper-popup-source source-${source}" style="
      display: inline-block;
      font-size: 11px;
      border-radius: 4px;
      padding: 2px 6px;
      margin-bottom: 10px;
      color: white;
      font-weight: 500;
      background-color: ${getSourceColor(source)};
    ">${getSourceLabel(source)}</div>
    <div class="paper-popup-header" style="
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.4;
    ">${metadata?.title || initialTitle || id}</div>
    <div class="paper-popup-meta" style="
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
      line-height: 1.4;
    ">${metadata?.authors || ''}</div>
    <div class="paper-popup-buttons" style="
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    ">
      <button class="vote-button" data-vote="thumbsup" style="
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f5f5f5;
        cursor: pointer;
      ">👍 Interesting</button>
      <button class="vote-button" data-vote="thumbsdown" style="
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f5f5f5;
        cursor: pointer;
      ">👎 Not Relevant</button>
    </div>
    <textarea placeholder="Add notes..." style="
      width: 100%;
      min-height: 80px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 13px;
      margin-bottom: 10px;
      resize: vertical;
    "></textarea>
    <div class="paper-popup-actions" style="
      display: flex;
      justify-content: flex-end;
    ">
      <button class="save-button" style="
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background: #0366d6;
        color: white;
        cursor: pointer;
        font-weight: 500;
      ">Save</button>
    </div>
  `;

  // Add event listeners for voting
  popup.querySelectorAll('.vote-button').forEach(button => {
    button.addEventListener('click', () => {
      popup.querySelectorAll('.vote-button').forEach(b => {
        (b as HTMLElement).style.background = '#f5f5f5';
        (b as HTMLElement).style.borderColor = '#ddd';
        b.classList.remove('active');
      });
      
      button.classList.add('active');
      (button as HTMLElement).style.background = '#e0f7fa';
      (button as HTMLElement).style.borderColor = '#4dd0e1';
    });
  });

  // Add event listener for save button
  const saveButton = popup.querySelector('.save-button');
  
  if (saveButton) {
    saveButton.addEventListener('click', () => {
      const vote = popup.querySelector('.vote-button.active')?.getAttribute('data-vote');
      const notes = (popup.querySelector('textarea') as HTMLTextAreaElement).value;
      
      // Format data for the background script with primary_id
      if (vote || notes) {
        chrome.runtime.sendMessage({
          type: 'updateAnnotation',
          annotationType: notes ? 'notes' : 'vote',
          data: {
            paperId: primary_id, // Use the formatted primary ID
            source: source,
            vote,
            notes,
            title: metadata?.title,
            authors: metadata?.authors,
            abstract: metadata?.abstract,
            timestamp: new Date().toISOString()
          }
        }, (response) => {
          console.log('Annotation saved:', response);
          
          // Add success feedback
          const feedbackEl = document.createElement('div');
          feedbackEl.textContent = 'Saved successfully!';
          feedbackEl.style.color = '#4CAF50';
          feedbackEl.style.padding = '8px';
          feedbackEl.style.textAlign = 'center';
          feedbackEl.style.fontWeight = 'bold';
          
          const actionsContainer = popup.querySelector('.paper-popup-actions');
          if (actionsContainer) {
            actionsContainer.parentElement!.insertBefore(feedbackEl, actionsContainer);
          }
          
          // Remove the popup after a delay
          setTimeout(() => {
            popup.parentElement?.remove();
          }, 1500);
        });
      }
    });
  }

  // Store source info on the popup element - use simple property access
  // Use Object.defineProperties to attach properties
  Object.defineProperties(popup, {
    paperSource: {
      value: source,
      writable: true,
      enumerable: true
    },
    paperId: {
      value: id,
      writable: true,
      enumerable: true
    },
    primary_id: {
      value: primary_id,
      writable: true,
      enumerable: true
    }
  });
  
  return popup;
}

/**
 * Get color for source branding
 * @param {string} source Source type
 * @returns {string} CSS color
 */
function getSourceColor(source: string): string {
  const colors: Record<string, string> = {
    'arxiv': '#B31B1B',
    'semanticscholar': '#2e7d32',
    'doi': '#0277bd',
    'acm': '#0277bd',
    'openreview': '#6d4c41'
  };
  
  return colors[source] || '#666666';
}

/**
 * Initialize annotator module
 */
export function initializeAnnotator(): void {
  console.log('Initializing paper annotator module');
  
  // CSS is now imported in index.ts via import './styles.css'
  // which is more maintainable than injecting it here
  
  // Initialize any event listeners or other setup needed
  document.addEventListener('click', (e) => {
    // Close popups when clicking outside them
    if (
      e.target && 
      !(e.target as HTMLElement).closest('.paper-popup') && 
      !(e.target as HTMLElement).closest('.paper-annotator')
    ) {
      // Get all popup containers and remove them
      document.querySelectorAll('.paper-popup-container').forEach(container => {
        if (container.contains(document.activeElement)) {
          // Don't remove if it contains the active element (like a focused textarea)
          return;
        }
        container.remove();
      });
    }
  });
}
