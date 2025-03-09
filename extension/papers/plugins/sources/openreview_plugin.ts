// extension/papers/plugins/sources/openreview_plugin.ts

import { SourcePlugin } from '../source_plugin';
import { UnifiedPaperData } from '../../types';
import { loguru } from '../../../utils/logger';
import { pluginRegistry } from '../registry';
import { createServiceWorkerDOM } from '../../../utils/service_worker_parser';

const logger = loguru.getLogger('OpenReviewPlugin');

// Types for OpenReview API responses
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
  description: 'Support for OpenReview papers',
  version: '1.1.0',
  
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
  
  async extractMetadata(document: any, url: string): Promise<Partial<UnifiedPaperData>> {
    logger.info(`Extracting metadata from OpenReview page: ${url}`);
    
    try {
      // Extract paper ID from URL
      const paperId = this.extractId(url);
      if (!paperId) {
        logger.warning(`Could not extract paper ID from URL: ${url}`);
        return { title: 'Unknown OpenReview Paper', url };
      }
      
      // Check if we're in a service worker context (document is not a real DOM)
      const isServiceWorker = typeof document !== 'object' || 
                             !document.querySelector || 
                             typeof document.querySelector !== 'function';
      
      if (isServiceWorker) {
        // Use our service worker DOM utility instead of bespoke string processing
        logger.info('Service worker context detected, using service worker DOM parser');
        const htmlContent = typeof document === 'string' 
          ? document 
          : (document.innerHTML || document.outerHTML || '');
        
        // Create a lightweight DOM-like object we can query
        const swDOM = createServiceWorkerDOM(htmlContent);
        
        // Now we can use querySelector-like methods
        const getMetaContent = (name: string): string | undefined => {
          const element = swDOM.querySelector(`meta[name="${name}"]`);
          return element ? element.getAttribute('content') : undefined;
        };
        
        // Get all citation_author meta tags
        const authorElements = swDOM.querySelectorAll('meta[name="citation_author"]');
        let authors = '';
        if (authorElements.length > 0) {
          const authorTexts: string[] = [];
          authorElements.forEach((el: any) => {
            const content = el.getAttribute('content');
            if (content) authorTexts.push(content);
          });
          authors = authorTexts.join(', ');
        }
        
        // Extract title, abstract, and other metadata from meta tags
        const title = getMetaContent('citation_title') || 
                      swDOM.querySelector('title')?.textContent?.replace(' | OpenReview', '') || '';
        const abstract = getMetaContent('citation_abstract');
        const publicationDate = getMetaContent('citation_online_date');
        const conferenceTitle = getMetaContent('citation_conference_title');
        const pdfUrl = getMetaContent('citation_pdf_url');
        
        // Look for OpenReview's specific metadata in the HTML content
        let domTitle = '';
        let domAuthors = '';
        let domAbstract = '';
        let keywords = '';
        let tldr = '';
        let decision = '';
        
        // More aggressive title extraction
        const titleRegex = /<h1.*?>(.*?)<\/h1>/i;
        const titleMatch = htmlContent.match(titleRegex);
        if (titleMatch && titleMatch[1]) {
          domTitle = titleMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        // Extract authors from note content or meta
        const authorsRegex = /<div[^>]*class="authors"[^>]*>(.*?)<\/div>/is;
        const authorsMatch = htmlContent.match(authorsRegex);
        if (authorsMatch && authorsMatch[1]) {
          domAuthors = authorsMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        // Extract abstract from note content
        const abstractRegex = /Abstract:(.*?)(?:<\/div>|<\/p>|<\/span>)/is;
        const abstractMatch = htmlContent.match(abstractRegex);
        if (abstractMatch && abstractMatch[1]) {
          domAbstract = abstractMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        // Try to find keywords
        const keywordsRegex = /Keywords:(.*?)(?:<\/div>|<\/p>|<\/span>)/is;
        const keywordsMatch = htmlContent.match(keywordsRegex);
        if (keywordsMatch && keywordsMatch[1]) {
          keywords = keywordsMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        // Try to find TL;DR
        const tldrRegex = /TL;DR:(.*?)(?:<\/div>|<\/p>|<\/span>)/is;
        const tldrMatch = htmlContent.match(tldrRegex);
        if (tldrMatch && tldrMatch[1]) {
          tldr = tldrMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        // Try to find decision
        const decisionRegex = /Decision:(.*?)(?:<\/div>|<\/p>|<\/span>)/is;
        const decisionMatch = htmlContent.match(decisionRegex);
        if (decisionMatch && decisionMatch[1]) {
          decision = decisionMatch[1].replace(/<[^>]*>/g, '').trim();
        }
        
        // Construct the source-specific metadata with more complete information
        const sourceSpecificMetadata: Record<string, any> = {
          forum_id: paperId,
          conference: conferenceTitle || '',
          pdf_url: pdfUrl || '',
          publication_date: publicationDate || '',
          keywords: keywords || '',
          tldr: tldr || '',
          review_info: decision ? {
            decision: decision
          } : undefined
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
          title: title || domTitle || `OpenReview Paper: ${paperId}`,
          authors: authors || domAuthors || '',
          abstract: abstract || domAbstract || '',
          url: url,
          source_specific_metadata: sourceSpecificMetadata
        };
      }
      
      // Browser context - use real DOM methods
      // First priority: Extract from meta tags (most reliable)
      const getMetaContent = (name: string): string | undefined => {
        const element = document.querySelector(`meta[name="${name}"]`);
        return element ? element.getAttribute('content') || undefined : undefined;
      };
      
      // Get all citation_author meta tags
      const authorElements = document.querySelectorAll('meta[name="citation_author"]');
      let authors = '';
      if (authorElements.length > 0) {
        const authorTexts: string[] = [];
        authorElements.forEach((el: Element) => {
          const content = el.getAttribute('content');
          if (content) authorTexts.push(content);
        });
        authors = authorTexts.join(', ');
      }
      
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
            const fieldElement = field as Element;
            if (fieldElement.textContent?.includes(fieldName)) {
              // Get its sibling or parent's next element which contains the value
              const valueEl = fieldElement.nextElementSibling || 
                             fieldElement.parentElement?.querySelector('.note-content-value, .note_content_value');
              
              if (valueEl && valueEl.textContent) {
                return valueEl.textContent.trim();
              }
            }
          }
          return null;
        };
        
        // Extract the submission title if not found in meta
        const domTitle = document.querySelector('.note_content_title, .note-content-title')?.textContent?.trim() || '';
        
        // Extract authors if not found in meta
        let domAuthors = '';
        const authorEl = document.querySelector('.signatures, .author, .authors');
        if (authorEl && authorEl.textContent) {
          domAuthors = authorEl.textContent.trim();
        }
        
        // Extract abstract if not found in meta
        const domAbstract = getContentFieldValue('Abstract') || '';
        
        // Extract keywords
        const keywords = getContentFieldValue('Keywords') || '';
        
        // Extract TL;DR summary
        const tldr = getContentFieldValue('TL;DR') || '';
        
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
        
        ratingElements.forEach((el: Element) => {
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
        forum_id: paperId,
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
        title: title || domData.domTitle || `OpenReview Paper: ${paperId}`,
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
    logger.info(`Fetching OpenReview API data for ID: ${id}`);
    
    try {
      // OpenReview public API endpoint - try forum endpoint first, then notes
      // The 404 error suggests the direct note query isn't working
      logger.info(`Trying forum endpoint first for ID: ${id}`);
      const forumApiUrl = `https://api.openreview.net/notes?forum=${id}`;
      
      // Fetch note data from forum API
      const forumResponse = await fetch(forumApiUrl);
      let note: OpenReviewNote; // Declare note variable outside the conditional blocks
      
      if (!forumResponse.ok) {
        // If forum API fails, try the notes endpoint as fallback
        logger.info(`Forum endpoint failed, trying notes endpoint for ID: ${id}`);
        const notesApiUrl = `https://api.openreview.net/notes?id=${id}`;
        
        const notesResponse = await fetch(notesApiUrl);
        if (!notesResponse.ok) {
          throw new Error(`API error: ${notesResponse.status}`);
        }
        
        const data = await notesResponse.json();
        
        // Check if we got valid data
        if (!data.notes || data.notes.length === 0) {
          logger.warning(`No note found for ID: ${id}`);
          return {};
        }
        
        // Extract the note data
        note = data.notes[0] as OpenReviewNote;
      } else {
        // Process forum response
        const data = await forumResponse.json();
        
        // Check if we got valid data
        if (!data.notes || data.notes.length === 0) {
          logger.warning(`No notes found in forum for ID: ${id}`);
          return {};
        }
        
        // Find the main paper (should be the note with ID matching the forum ID)
        const mainNote = data.notes.find((n: any) => n.id === id || n.forum === id);
        
        if (!mainNote) {
          logger.warning(`Main note not found in forum data for ID: ${id}`);
          return {};
        }
        
        // Extract the note data
        note = mainNote as OpenReviewNote;
      }
      
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
      
      // If we used the forum endpoint already, we already have review data
      // If not, try to get reviews/comments
      let reviewsData: any = null;
      try {
        if (forumResponse.ok) {
          // We already have the forum data
          reviewsData = await forumResponse.json();
        } else {
          // Fetch forum data (includes replies/reviews)
          const forumApiUrl = `https://api.openreview.net/notes?forum=${id}`;
          const forumResponse = await fetch(forumApiUrl);
          if (forumResponse.ok) {
            reviewsData = await forumResponse.json();
          }
        }
        
        if (reviewsData) {
          // Extract reviews and comments
          const replies = reviewsData.notes.filter((n: OpenReviewNote) => n.id !== id);
          
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
  
  color: '#6d4c41',
  icon: '📋',
  
  formatId(id: string): string {
    return `openreview.${id}`;
  }
};

// Register the plugin
pluginRegistry.register(openreviewPlugin);

// Export the plugin for direct import by the loader
export default openreviewPlugin;
