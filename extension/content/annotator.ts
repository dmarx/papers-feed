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
 * @returns {Promise<HTMLElement & { paperSource?: string; paperId?: string; primary_id?: string }>} Popup element
 */
export async function createPopup(
  source: string, 
  id: string, 
  initialTitle = ''
): Promise<HTMLElement & { paperSource?: string; paperId?: string; primary_id?: string }> {
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

  // Store source info on the popup element
  (popup as HTMLElement & { paperSource: string; paperId: string; primary_id: string }).paperSource = source;
  (popup as HTMLElement & { paperSource: string; paperId: string; primary_id: string }).paperId = id;
  (popup as HTMLElement & { paperSource: string; paperId: string; primary_id: string }).primary_id = primary_id;
  
  return popup as HTMLElement & { paperSource?: string; paperId?: string; primary_id?: string };
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
  // Add global CSS for annotators
  const style = document.createElement('style');
  style.textContent = `
    .paper-annotator {
      display: inline-block;
      width: 16px;
      height: 16px;
      margin-left: 5px;
      vertical-align: middle;
      cursor: pointer;
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      opacity: 0.7;
      transition: opacity 0.2s ease;
    }
    
    .paper-annotator:hover {
      opacity: 1;
    }
    
    .annotator-arxiv {
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23B31B1B"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14h-2V9h-2V7h4v10z"/></svg>');
    }
    
    .annotator-semanticscholar {
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232e7d32"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>');
    }
    
    .annotator-doi, .annotator-acm {
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230277bd"><path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H8V4h12v12zM10 9h8v2h-8zm0 3h4v2h-4zm0-6h8v2h-8z"/></svg>');
    }
    
    .annotator-openreview {
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236d4c41"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm0 4h-2v-2h2v2z"/></svg>');
    }
    
    .paper-popup {
      position: absolute;
      z-index: 10000;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 12px;
      width: 300px;
      max-width: 90vw;
      font-size: 14px;
      font-family: system-ui, sans-serif;
    }
    
    .paper-popup-container {
      position: relative;
    }
    
    .vote-button.active {
      background: #e0f7fa !important;
      border-color: #4dd0e1 !important;
    }
  `;
  document.head.appendChild(style);
}
