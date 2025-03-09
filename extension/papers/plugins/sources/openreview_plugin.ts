// extension/papers/plugins/sources/openreview_plugin.ts
// Fixed version of openreview_plugin.ts with corrected title fallback logic

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
  version: '1.2.0',
  
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
        
        // Now we can use querySelector-like methods to extract metadata from head tags
        // These are more reliable than trying to parse the body content
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
        
        // Extract title from meta tags first
        let metaTitle = getMetaContent('citation_title');
        
        // If not found in meta tags, try to get from title element
        let titleElement = swDOM.querySelector('title');
        let docTitle = titleElement?.textContent || '';
        
        // Clean up title from title element (remove " | OpenReview" suffix)
        if (docTitle) {
          docTitle = docTitle.replace(' | OpenReview', '').trim();
        }
        
        // Use meta title or document title
        let title = metaTitle || docTitle || '';
        
        const abstract = getMetaContent('citation_abstract');
        const publicationDate = getMetaContent('citation_online_date');
        const conferenceTitle = getMetaContent('citation_conference_title');
        const pdfUrl = getMetaContent('citation_pdf_url');
        
        // Additional metadata extraction from body content 
        // using more robust pattern matching
        let domTitle = '';
        let domAuthors = '';
        let domAbstract = '';
        let keywords = '';
        let tldr = '';
        let decision = '';
        let venue = '';
        
        // Try to extract venue information from metadata section
        const venueElements = swDOM.querySelectorAll('.forum-meta .item');
        if (venueElements.length > 0) {
          venueElements.forEach((el: any) => {
            const text = el.textContent?.trim();
            if (text && text.includes('Submitted to')) {
              venue = text.replace('Submitted to', '').trim();
            }
          });
        }
        
        // Extract keywords, abstract, etc. from content fields
        const contentFields = swDOM.querySelectorAll('.note-content-field');
        contentFields.forEach((el: any) => {
          const fieldName = el.textContent?.trim();
          if (!fieldName) return;
          
          const valueEl = el.parentElement?.querySelector('.note-content-value');
          const value = valueEl?.textContent?.trim();
          if (!value) return;
          
          if (fieldName.includes('Keywords')) {
            keywords = value;
          } else if (fieldName.includes('Abstract') && !abstract) {
            domAbstract = value;
          } else if (fieldName.includes('TL;DR') || fieldName.includes('TLDR')) {
            tldr = value;
          } else if (fieldName.includes('Decision')) {
            decision = value;
          }
        });
        
        // Fallback title extraction from h1/h2 elements if meta tags failed
        if (!title) {
          const h1 = swDOM.querySelector('h1');
          if (h1 && h1.textContent) {
            domTitle = h1.textContent.trim();
          } else {
            const h2 = swDOM.querySelector('h2.citation_title');
            if (h2 && h2.textContent) {
              domTitle = h2.textContent.trim();
            } else {
              const h2Alt = swDOM.querySelector('.forum-title h2');
              if (h2Alt && h2Alt.textContent) {
                domTitle = h2Alt.textContent.trim();
              }
            }
          }
        }
        
        // Fallback author extraction from specific elements if meta tags failed
        if (!authors) {
          const authorDiv = swDOM.querySelector('.forum-authors h3');
          if (authorDiv && authorDiv.textContent) {
            domAuthors = authorDiv.textContent.trim();
          }
        }
        
        // Construct the source-specific metadata with more complete information
        const sourceSpecificMetadata: Record<string, any> = {
          forum_id: paperId,
          conference: conferenceTitle || venue || '',
          pdf_url: pdfUrl || '',
          publication_date: publicationDate || '',
          keywords: keywords || '',
          tldr: tldr || ''
        };
        
        // Add decision if available
        if (decision) {
          sourceSpecificMetadata.review_info = {
            decision: decision
          };
        }
        
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
        
        // Fixed title fallback: properly use the available title information
        const finalTitle = title || domTitle || `OpenReview Paper: ${paperId}`;
        
        return {
          title: finalTitle,
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
      // FIXED: Explicitly store meta title separately
      const metaTitle = getMetaContent('citation_title');
      const docTitle = document.title.replace(' | OpenReview', '').trim();
      // Use meta title first, fallback to document title
      let title = metaTitle || docTitle || '';
      
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
        let domTitle = '';
        const titleEl = document.querySelector('.note_content_title, .note-content-title, .forum-title h2');
        if (titleEl && titleEl.textContent) {
          domTitle = titleEl.textContent.trim();
        }
        
        // Extract authors if not found in meta
        let domAuthors = '';
        const authorEl = document.querySelector('.signatures, .author, .authors, .forum-authors h3');
        if (authorEl && authorEl.textContent) {
          domAuthors = authorEl.textContent.trim();
        }
        
        // Extract abstract if not found in meta
        const domAbstract = getContentFieldValue('Abstract') || '';
        
        // Extract keywords
        const keywords = getContentFieldValue('Keywords') || '';
        
        // Extract TL;DR summary
        const tldr = getContentFieldValue('TL;DR') || getContentFieldValue('TLDR') || '';
        
        // Extract venue information
        let venue = '';
        const venueItems = document.querySelectorAll('.forum-meta .item');
        for (const item of venueItems) {
          const text = item.textContent?.trim();
          if (text && text.includes('Submitted to')) {
            venue = text.replace('Submitted to', '').trim();
            break;
          }
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
      
      // FIXED: properly use the available title information with clear fallback chain
      const finalTitle = title || domData.domTitle || `OpenReview Paper: ${paperId}`;
      
      return {
        title: finalTitle,
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
      // First try the direct PDF url
      const pdfUrl = `https://openreview.net/pdf?id=${id}`;
      
      // API attempts - we'll try multiple approaches
      let note: OpenReviewNote | null = null;
      let reviewsData: any = null;
      
      // Try approach 1: Forum endpoint
      logger.info(`Trying forum endpoint for ID: ${id}`);
      const forumApiUrl = `https://api.openreview.net/notes?forum=${id}`;
      const forumResponse = await fetch(forumApiUrl);
      
      if (forumResponse.ok) {
        const data = await forumResponse.json();
        reviewsData = data; // Store this for review extraction later
        
        // Check if we got valid data
        if (data.notes && data.notes.length > 0) {
          // Find the main paper (should be the note with ID matching the forum ID)
          const mainNote = data.notes.find((n: any) => n.id === id || n.forum === id);
          
          if (mainNote) {
            note = mainNote as OpenReviewNote;
          } else {
            // If we can't find the main note, just use the first one
            note = data.notes[0] as OpenReviewNote;
          }
        } else {
          logger.warning(`No notes found in forum for ID: ${id}`);
        }
      }
      
      // Try approach 2: Direct ID endpoint if forum approach failed
      if (!note) {
        logger.info(`Forum approach failed, trying direct ID endpoint for: ${id}`);
        const notesApiUrl = `https://api.openreview.net/notes?id=${id}`;
        
        const notesResponse = await fetch(notesApiUrl);
        if (notesResponse.ok) {
          const data = await notesResponse.json();
          
          // Check if we got valid data
          if (data.notes && data.notes.length > 0) {
            note = data.notes[0] as OpenReviewNote;
          } else {
            logger.warning(`No note found for ID: ${id}`);
          }
        } else {
          logger.warning(`API error for notes endpoint: ${notesResponse.status}`);
        }
      }
      
      // Fallback with minimal data if both API approaches failed
      if (!note) {
        // Construct minimal metadata with the URL and ID
        return {
          title: `OpenReview Paper: ${id}`,
          url: `https://openreview.net/forum?id=${id}`,
          source_specific_metadata: {
            forum_id: id,
            pdf_url: pdfUrl
          }
        };
      }
      
      // Process the note data we found
      const content = note.content || {};
      
      // Extract basic metadata
      // Handle different content structures - newer OpenReview notes have value objects
      const getContentValue = (field: string): any => {
        if (!content[field]) return '';
        return typeof content[field] === 'object' && 'value' in content[field] 
          ? content[field].value 
          : content[field];
      };
      
      const title = getContentValue('title') || '';
      
      // Handle authors which could be in different formats
      let authors = '';
      const authorsData = getContentValue('authors');
      if (Array.isArray(authorsData)) {
        authors = authorsData.join(', ');
      } else if (typeof authorsData === 'string') {
        authors = authorsData;
      }
      
      const abstract = getContentValue('abstract') || '';
      const keywords = getContentValue('keywords') || '';
      const tldr = getContentValue('TL;DR') || getContentValue('TLDR') || '';
      
      // Construct source-specific metadata
      const sourceSpecificMetadata: Record<string, any> = {
        forum_id: id,
        venue: getContentValue('venue') || note.venue || '',
        venueid: getContentValue('venueid') || note.venueid || '',
        pdf_url: pdfUrl,
        keywords: Array.isArray(keywords) ? keywords.join(', ') : keywords,
        tldr: tldr,
        creation_date: note.cdate ? new Date(note.cdate).toISOString() : '',
        publication_date: note.pdate ? new Date(note.pdate).toISOString() : ''
      };
      
      // Extract review information if we have review data
      if (reviewsData && reviewsData.notes && reviewsData.notes.length > 1) {
        // Filter out the main note to get just the replies
        const replies = reviewsData.notes.filter((n: OpenReviewNote) => n.id !== id && n.id !== note?.id);
        
        if (replies.length > 0) {
          // Find review notes based on invitation patterns
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
          
          // Create review info object
          sourceSpecificMetadata.review_info = {
            reviews_count: reviews.length,
            decisions_count: decisions.length,
            total_replies: replies.length
          };
          
          // Extract ratings if available
          if (reviews.length > 0) {
            const ratings = reviews
              .filter((r: OpenReviewNote) => {
                const content = r.content || {};
                return content.rating || content.score || content.confidence || 
                      (content.rating && content.rating.value) || 
                      (content.score && content.score.value);
              })
              .map((r: OpenReviewNote) => {
                const content = r.content || {};
                const getRatingValue = (field: string) => {
                  if (!content[field]) return null;
                  return typeof content[field] === 'object' && 'value' in content[field]
                    ? content[field].value
                    : content[field];
                };
                
                return {
                  rating: getRatingValue('rating') || getRatingValue('score') || null,
                  confidence: getRatingValue('confidence') || null
                } as OpenReviewRating;
              });
              
            if (ratings.length > 0) {
              sourceSpecificMetadata.review_info.ratings = ratings;
            }
          }
          
          // Extract decision text if available
          if (decisions.length > 0) {
            const decisionContent = decisions[0].content || {};
            const getDecisionValue = (field: string) => {
              if (!decisionContent[field]) return null;
              return typeof decisionContent[field] === 'object' && 'value' in decisionContent[field]
                ? decisionContent[field].value
                : decisionContent[field];
            };
            
            const decision = getDecisionValue('decision') || 
                            getDecisionValue('recommendation') || 
                            getDecisionValue('metareview') || '';
                            
            if (decision) {
              sourceSpecificMetadata.review_info.decision = decision;
            }
          }
        }
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
      // Return minimal data on error
      return {
        title: `OpenReview Paper: ${id}`,
        url: `https://openreview.net/forum?id=${id}`,
        source_specific_metadata: {
          forum_id: id,
          pdf_url: `https://openreview.net/pdf?id=${id}`
        }
      };
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
