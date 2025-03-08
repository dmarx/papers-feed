// Consolidation Plan for OpenReview Functionality

/**
 * 1. Enhanced OpenReview Plugin
 * 
 * The OpenReview plugin should handle all aspects of interacting with OpenReview:
 * - URL detection and ID extraction
 * - API data fetching
 * - DOM extraction as fallback
 * - Custom styling and UI elements
 * - Specific processing needs
 */

// extension/papers/plugins/sources/openreview_plugin.ts
import { SourcePlugin } from '../source_plugin';
import { UnifiedPaperData } from '../../types';
import { loguru } from '../../../utils/logger';

// Add any OpenReview-specific types here
interface OpenReviewNote {
  id: string;
  forum: string;
  content: Record<string, any>;
  invitation: string;
  readers: string[];
  signatures: string[];
  writers: string[];
  cdate: number;
  pdate?: number;
  mdate?: number;
  venue?: string;
  venueid?: string;
}

interface OpenReviewRating {
  rating: string | null;
  confidence: string | null;
}

export const openreviewPlugin: SourcePlugin = {
  id: 'openreview',
  name: 'OpenReview',
  description: 'Support for OpenReview papers and conferences',
  version: '2.0.0',
  
  urlPatterns: [
    /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/,
    /openreview\.net\/pdf\?id=([a-zA-Z0-9_\-]+)/
  ],
  
  extractId(url: string): string | null {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  },
  
  /**
   * Process a paper URL from OpenReview
   * This encapsulates behavior that might have been in processPaperUrl.ts
   */
  async processUrl(url: string): Promise<Partial<UnifiedPaperData> | null> {
    const id = this.extractId(url);
    if (!id) return null;
    
    // First try API
    try {
      const apiData = await this.fetchApiData(id);
      if (Object.keys(apiData).length > 0) {
        return {
          ...apiData,
          source: 'openreview',
          sourceId: id,
          primary_id: this.formatId(id),
          url: url
        };
      }
    } catch (error) {
      loguru.getLogger('OpenReviewPlugin').error(`API fetch failed: ${error}`);
      // Continue to DOM extraction
    }
    
    // If API fails, rely on DOM extraction which will be performed later
    return {
      source: 'openreview',
      sourceId: id,
      primary_id: this.formatId(id),
      url: url,
      title: `OpenReview Paper: ${id}`
    };
  },
  
  async extractMetadata(document: Document, url: string): Promise<Partial<UnifiedPaperData>> {
    const logger = loguru.getLogger('OpenReviewPlugin');
    logger.info(`Extracting metadata from OpenReview page: ${url}`);
    
    try {
      // First priority: Extract from meta tags (most reliable)
      const getMetaContent = (name: string): string | undefined => {
        const element = document.querySelector(`meta[name="${name}"]`);
        return element ? element.getAttribute('content') : undefined;
      };
      
      // Get all citation_author meta tags
      const authorElements = document.querySelectorAll('meta[name="citation_author"]');
      const authors = Array.from(authorElements)
        .map(el => el.getAttribute('content'))
        .filter(Boolean)
        .join(', ');
      
      // Extract title, abstract, and other metadata from meta tags
      const title = getMetaContent('citation_title') || document.title.replace(' | OpenReview', '');
      const abstract = getMetaContent('citation_abstract');
      const publicationDate = getMetaContent('citation_online_date');
      const conferenceTitle = getMetaContent('citation_conference_title');
      const pdfUrl = getMetaContent('citation_pdf_url');
      
      // Secondary approach: Extract from DOM structure if meta tags are incomplete
      const extractFromDOM = () => {
        const getContentFieldValue = (fieldName: string): string | null => {
          // Find the field element that contains the field name
          const fields = Array.from(document.querySelectorAll('.note-content-field, .note_content_field'));
          for (const field of fields) {
            if (field.textContent?.includes(fieldName)) {
              // Get its sibling or parent's next element which contains the value
              const valueEl = field.nextElementSibling || 
                             field.parentElement?.querySelector('.note-content-value, .note_content_value');
              
              if (valueEl && valueEl.textContent) {
                return valueEl.textContent.trim();
              }
            }
          }
          return null;
        };
        
        // Extract the submission title if not found in meta
        const domTitle = document.querySelector('.note_content_title, .note-content-title')?.textContent?.trim();
        
        // Extract authors if not found in meta
        let domAuthors = '';
        const authorEl = document.querySelector('.signatures, .author, .authors');
        if (authorEl && authorEl.textContent) {
          domAuthors = authorEl.textContent.trim();
        }
        
        // Extract abstract if not found in meta
        const domAbstract = getContentFieldValue('Abstract');
        
        // Extract keywords
        const keywords = getContentFieldValue('Keywords');
        
        // Extract TL;DR summary
        const tldr = getContentFieldValue('TL;DR');
        
        // Extract venue information
        let venue = '';
        const venueEl = document.querySelector('.item:contains("venue"), .meta_row .item');
        if (venueEl && venueEl.textContent) {
          venue = venueEl.textContent.trim();
        }
        
        return {
          domTitle,
          domAuthors,
          domAbstract,
          keywords,
          tldr,
          venue
        };
      };
      
      // Extract review information
      const extractReviewInfo = () => {
        // Check if there are reviews on the page
        const reviewElements = document.querySelectorAll('.reply-container, .note-reply');
        const reviewCount = reviewElements.length;
        
        // Try to determine decision based on common decision elements
        let decision = '';
        const decisionEl = document.querySelector(
          '.decision, .meta-review, .metareview, [id*="decision"], [class*="decision"]'
        );
        if (decisionEl && decisionEl.textContent) {
          decision = decisionEl.textContent.trim();
        }
        
        // Extract ratings if available
        const ratings: Array<{type: string, value: string}> = [];
        const ratingElements = document.querySelectorAll('.rating, .score, .evaluation');
        
        ratingElements.forEach(el => {
          const ratingText = el.textContent?.trim();
          if (ratingText) {
            const match = ratingText.match(/(.+):\s*(\d+)/);
            if (match) {
              ratings.push({ type: match[1].trim(), value: match[2].trim() });
            } else {
              ratings.push({ type: 'rating', value: ratingText });
            }
          }
        });
        
        return {
          reviewCount,
          decision,
          ratings
        };
      };
      
      // Get additional DOM-based data
      const domData = extractFromDOM();
      const reviewInfo = extractReviewInfo();
      
      // Construct the source-specific metadata
      const sourceSpecificMetadata: Record<string, any> = {
        forum_id: this.extractId(url) || '',
        conference: conferenceTitle || domData.venue || '',
        pdf_url: pdfUrl || '',
        publication_date: publicationDate || '',
        tldr: domData.tldr || '',
        keywords: domData.keywords || '',
        review_info: {
          review_count: reviewInfo.reviewCount,
          decision: reviewInfo.decision,
          ratings: reviewInfo.ratings
        }
      };
      
      // Filter out empty values
      Object.keys(sourceSpecificMetadata).forEach(key => {
        if (
          sourceSpecificMetadata[key] === '' || 
          sourceSpecificMetadata[key] === null || 
          sourceSpecificMetadata[key] === undefined ||
          (Array.isArray(sourceSpecificMetadata[key]) && sourceSpecificMetadata[key].length === 0) ||
          (typeof sourceSpecificMetadata[key] === 'object' && Object.keys(sourceSpecificMetadata[key]).length === 0)
        ) {
          delete sourceSpecificMetadata[key];
        }
      });
      
      return {
        title: title || domData.domTitle || '',
        authors: authors || domData.domAuthors || '',
        abstract: abstract || domData.domAbstract || '',
        url: url,
        source_specific_metadata: sourceSpecificMetadata
      };
    } catch (error) {
      logger.error('Error extracting metadata from OpenReview page', error);
      return {
        title: `OpenReview Paper: ${this.extractId(url) || 'Unknown'}`,
        url: url
      };
    }
  },
  
  hasApi: true,
  
  async fetchApiData(id: string): Promise<Partial<UnifiedPaperData>> {
    const logger = loguru.getLogger('OpenReviewPlugin');
    logger.info(`Fetching OpenReview API data for ID: ${id}`);
    
    try {
      // OpenReview public API endpoint for notes
      const apiUrl = `https://api.openreview.net/notes?id=${id}`;
      
      // Fetch note data from API
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Check if we got valid data
      if (!data.notes || data.notes.length === 0) {
        logger.warning(`No note found for ID: ${id}`);
        return {};
      }
      
      // Extract the note data
      const note: OpenReviewNote = data.notes[0];
      const content = note.content || {};
      
      // Extract basic metadata
      const title = content.title || '';
      const authors = Array.isArray(content.authors) ? content.authors.join(', ') : content.authors || '';
      const abstract = content.abstract || '';
      
      // Construct source-specific metadata
      const sourceSpecificMetadata: Record<string, any> = {
        forum_id: id,
        venue: note.venue || '',
        venueid: note.venueid || '',
        invitation: note.invitation || '',
        creation_date: note.cdate ? new Date(note.cdate).toISOString() : '',
        publication_date: note.pdate ? new Date(note.pdate).toISOString() : '',
        tldr: content.TL_DR || content['TL;DR'] || '',
        keywords: content.keywords || '',
      };
      
      // Try to get reviews/comments if they exist
      try {
        // Fetch forum data (includes replies/reviews)
        const forumApiUrl = `https://api.openreview.net/notes?forum=${id}`;
        const forumResponse = await fetch(forumApiUrl);
        
        if (forumResponse.ok) {
          const forumData = await forumResponse.json();
          
          // Extract reviews and comments
          const replies = forumData.notes.filter((n: OpenReviewNote) => n.id !== id);
          
          if (replies.length > 0) {
            // Find review notes
            const reviews = replies.filter((n: OpenReviewNote) => 
              n.invitation.includes('/Review') || 
              n.invitation.includes('/review') || 
              n.invitation.includes('/evaluation')
            );
            
            // Find meta-review/decision notes
            const decisions = replies.filter((n: OpenReviewNote) => 
              n.invitation.includes('/Decision') || 
              n.invitation.includes('/decision') || 
              n.invitation.includes('/Meta_Review') || 
              n.invitation.includes('/meta-review')
            );
            
            sourceSpecificMetadata.review_info = {
              reviews_count: reviews.length,
              decisions_count: decisions.length,
              total_replies: replies.length,
              // Extract ratings if available
              ratings: reviews
                .filter((r: OpenReviewNote) => r.content.rating || r.content.score || r.content.confidence)
                .map((r: OpenReviewNote) => ({
                  rating: r.content.rating || r.content.score || null,
                  confidence: r.content.confidence || null,
                } as OpenReviewRating)),
              // Extract decision text if available
              decision: decisions.length > 0 ? 
                (decisions[0].content.decision || decisions[0].content.recommendation || '') : ''
            };
          }
        }
      } catch (error) {
        logger.warning(`Error fetching forum data: ${error}`);
        // Continue without forum data
      }
      
      // Filter out empty values
      Object.keys(sourceSpecificMetadata).forEach(key => {
        if (
          sourceSpecificMetadata[key] === '' || 
          sourceSpecificMetadata[key] === null || 
          sourceSpecificMetadata[key] === undefined ||
          (Array.isArray(sourceSpecificMetadata[key]) && sourceSpecificMetadata[key].length === 0) ||
          (typeof sourceSpecificMetadata[key] === 'object' && 
            Object.keys(sourceSpecificMetadata[key]).filter(k => sourceSpecificMetadata[key][k] !== null).length === 0)
        ) {
          delete sourceSpecificMetadata[key];
        }
      });
      
      return {
        title,
        authors,
        abstract,
        source_specific_metadata: sourceSpecificMetadata,
        url: `https://openreview.net/forum?id=${id}`
      };
    } catch (error) {
      logger.error(`Error fetching OpenReview API data: ${error}`);
      return {};
    }
  },

  /**
   * Custom content script functionality for OpenReview pages
   * This can be injected by the plugin system when on OpenReview pages
   */
  getContentScriptCode(): string {
    return `
      // OpenReview specific content script functionality
      (function() {
        console.log('OpenReview plugin content script loaded');
        
        // Add custom styling for OpenReview annotations
        const style = document.createElement('style');
        style.textContent = \`
          .openreview-annotator {
            margin-left: 8px;
            padding: 2px 6px;
            background-color: #6d4c41;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.8em;
          }
          
          .openreview-popup-header {
            font-weight: bold;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
            margin-bottom: 8px;
          }
        \`;
        document.head.appendChild(style);
        
        // Add annotators to paper links
        function processOpenReviewLinks() {
          const links = document.querySelectorAll('a[href*="openreview.net/forum"], a[href*="openreview.net/pdf"]');
          
          links.forEach(link => {
            if (link.classList.contains('processed-link')) return;
            link.classList.add('processed-link');
            
            // Create annotator button
            const annotator = document.createElement('span');
            annotator.className = 'openreview-annotator';
            annotator.textContent = 'Track';
            annotator.title = 'Track this OpenReview paper';
            
            // Add click handler
            annotator.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Extract paper ID from URL
              const url = link.href;
              const match = url.match(/id=([a-zA-Z0-9_\\-]+)/);
              if (!match) return;
              
              const paperId = match[1];
              
              // Send message to background script
              chrome.runtime.sendMessage({
                type: 'trackPaper',
                source: 'openreview',
                url: url,
                id: paperId
              });
            });
            
            // Add to page
            link.insertAdjacentElement('afterend', annotator);
          });
        }
        
        // Initial processing
        processOpenReviewLinks();
        
        // Set up observer for dynamically added content
        const observer = new MutationObserver((mutations) => {
          let shouldProcess = false;
          
          for (const mutation of mutations) {
            if (mutation.addedNodes.length) {
              shouldProcess = true;
              break;
            }
          }
          
          if (shouldProcess) {
            processOpenReviewLinks();
          }
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      })();
    `;
  },
  
  color: '#6d4c41',
  icon: '📋',
  
  formatId(id: string): string {
    return `openreview.${id}`;
  }
};

// Register the plugin
import { pluginRegistry } from '../registry';
pluginRegistry.register(openreviewPlugin);

/**
 * 2. Changes to remove OpenReview-specific code from other files
 * 
 * Identify and refactor or remove OpenReview-specific code from the following files:
 */

// In papers/source_utils.ts:
// Remove the OpenReview-specific entries from SOURCE_TYPES and references elsewhere

// In papers/process_paper_url.ts:
// Remove OpenReview-specific handling and defer to the plugin system

// In papers/detector.ts:
// Remove OpenReview-specific detection code and use the plugin registry instead

// In content.js:
// Remove OpenReview-specific selectors and styling
// The plugin system should handle injecting custom content scripts when needed

// In background.js:
// Remove hardcoded OpenReview handling
// Use the plugin system to delegate processing
