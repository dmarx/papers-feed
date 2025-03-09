import { l as loguru, p as pluginRegistry } from '../background.bundle.js';

const logger = loguru.getLogger("OpenReviewPlugin");
const openreviewPlugin = {
  id: "openreview",
  name: "OpenReview",
  description: "Support for OpenReview papers",
  version: "1.1.0",
  urlPatterns: [
    /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/,
    /openreview\.net\/pdf\?id=([a-zA-Z0-9_\-]+)/
  ],
  extractId(url) {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  },
  async extractMetadata(document, url) {
    logger.info(`Extracting metadata from OpenReview page: ${url}`);
    try {
      const paperId = this.extractId(url);
      if (!paperId) {
        logger.warning(`Could not extract paper ID from URL: ${url}`);
        return { title: "Unknown OpenReview Paper", url };
      }
      const getMetaContent = (name) => {
        const element = document.querySelector(`meta[name="${name}"]`);
        return element ? element.getAttribute("content") || void 0 : void 0;
      };
      const authorElements = document.querySelectorAll('meta[name="citation_author"]');
      const authors = Array.from(authorElements).map((el) => el.getAttribute("content") || "").filter(Boolean).join(", ");
      const title = getMetaContent("citation_title") || document.title.replace(" | OpenReview", "");
      const abstract = getMetaContent("citation_abstract");
      const publicationDate = getMetaContent("citation_online_date");
      const conferenceTitle = getMetaContent("citation_conference_title");
      const pdfUrl = getMetaContent("citation_pdf_url");
      const extractFromDOM = () => {
        const getContentFieldValue = (fieldName) => {
          const fields = Array.from(document.querySelectorAll(".note-content-field, .note_content_field"));
          for (const field of fields) {
            if (field.textContent?.includes(fieldName)) {
              const valueEl = field.nextElementSibling || field.parentElement?.querySelector(".note-content-value, .note_content_value");
              if (valueEl && valueEl.textContent) {
                return valueEl.textContent.trim();
              }
            }
          }
          return null;
        };
        const domTitle = document.querySelector(".note_content_title, .note-content-title")?.textContent?.trim() || "";
        let domAuthors = "";
        const authorEl = document.querySelector(".signatures, .author, .authors");
        if (authorEl && authorEl.textContent) {
          domAuthors = authorEl.textContent.trim();
        }
        const domAbstract = getContentFieldValue("Abstract") || "";
        const keywords = getContentFieldValue("Keywords") || "";
        const tldr = getContentFieldValue("TL;DR") || "";
        let venue = "";
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
      const extractReviewInfo = () => {
        const reviewElements = document.querySelectorAll(".reply-container, .note-reply");
        const reviewCount = reviewElements.length;
        let decision = "";
        const decisionEl = document.querySelector(
          '.decision, .meta-review, .metareview, [id*="decision"], [class*="decision"]'
        );
        if (decisionEl && decisionEl.textContent) {
          decision = decisionEl.textContent.trim();
        }
        const ratings = [];
        const ratingElements = document.querySelectorAll(".rating, .score, .evaluation");
        ratingElements.forEach((el) => {
          const ratingText = el.textContent?.trim();
          if (ratingText) {
            const match = ratingText.match(/(.+):\s*(\d+)/);
            if (match) {
              ratings.push({ type: match[1].trim(), value: match[2].trim() });
            } else {
              ratings.push({ type: "rating", value: ratingText });
            }
          }
        });
        return {
          reviewCount,
          decision,
          ratings
        };
      };
      const domData = extractFromDOM();
      const reviewInfo = extractReviewInfo();
      const sourceSpecificMetadata = {
        forum_id: paperId,
        conference: conferenceTitle || domData.venue || "",
        pdf_url: pdfUrl || "",
        publication_date: publicationDate || "",
        tldr: domData.tldr || "",
        keywords: domData.keywords || "",
        review_info: {
          review_count: reviewInfo.reviewCount,
          decision: reviewInfo.decision,
          ratings: reviewInfo.ratings
        }
      };
      Object.keys(sourceSpecificMetadata).forEach((key) => {
        if (sourceSpecificMetadata[key] === "" || sourceSpecificMetadata[key] === null || sourceSpecificMetadata[key] === void 0 || Array.isArray(sourceSpecificMetadata[key]) && sourceSpecificMetadata[key].length === 0 || typeof sourceSpecificMetadata[key] === "object" && Object.keys(sourceSpecificMetadata[key]).length === 0) {
          delete sourceSpecificMetadata[key];
        }
      });
      return {
        title: title || domData.domTitle || `OpenReview Paper: ${paperId}`,
        authors: authors || domData.domAuthors || "",
        abstract: abstract || domData.domAbstract || "",
        url,
        source_specific_metadata: sourceSpecificMetadata
      };
    } catch (error) {
      logger.error("Error extracting metadata from OpenReview page", error);
      return {
        title: `OpenReview Paper: ${this.extractId(url) || "Unknown"}`,
        url
      };
    }
  },
  hasApi: true,
  async fetchApiData(id) {
    logger.info(`Fetching OpenReview API data for ID: ${id}`);
    try {
      const apiUrl = `https://api.openreview.net/notes?id=${id}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      if (!data.notes || data.notes.length === 0) {
        logger.warning(`No note found for ID: ${id}`);
        return {};
      }
      const note = data.notes[0];
      const content = note.content || {};
      const title = content.title || "";
      const authors = Array.isArray(content.authors) ? content.authors.join(", ") : content.authors || "";
      const abstract = content.abstract || "";
      const sourceSpecificMetadata = {
        forum_id: id,
        venue: note.venue || "",
        venueid: note.venueid || "",
        invitation: note.invitation || "",
        creation_date: note.cdate ? new Date(note.cdate).toISOString() : "",
        publication_date: note.pdate ? new Date(note.pdate).toISOString() : "",
        tldr: content.TL_DR || content["TL;DR"] || "",
        keywords: content.keywords || ""
      };
      try {
        const forumApiUrl = `https://api.openreview.net/notes?forum=${id}`;
        const forumResponse = await fetch(forumApiUrl);
        if (forumResponse.ok) {
          const forumData = await forumResponse.json();
          const replies = forumData.notes.filter((n) => n.id !== id);
          if (replies.length > 0) {
            const reviews = replies.filter(
              (n) => n.invitation.includes("/Review") || n.invitation.includes("/review") || n.invitation.includes("/evaluation")
            );
            const decisions = replies.filter(
              (n) => n.invitation.includes("/Decision") || n.invitation.includes("/decision") || n.invitation.includes("/Meta_Review") || n.invitation.includes("/meta-review")
            );
            sourceSpecificMetadata.review_info = {
              reviews_count: reviews.length,
              decisions_count: decisions.length,
              total_replies: replies.length,
              // Extract ratings if available
              ratings: reviews.filter((r) => r.content.rating || r.content.score || r.content.confidence).map((r) => ({
                rating: r.content.rating || r.content.score || null,
                confidence: r.content.confidence || null
              })),
              // Extract decision text if available
              decision: decisions.length > 0 ? decisions[0].content.decision || decisions[0].content.recommendation || "" : ""
            };
          }
        }
      } catch (error) {
        logger.warning(`Error fetching forum data: ${error}`);
      }
      Object.keys(sourceSpecificMetadata).forEach((key) => {
        if (sourceSpecificMetadata[key] === "" || sourceSpecificMetadata[key] === null || sourceSpecificMetadata[key] === void 0 || Array.isArray(sourceSpecificMetadata[key]) && sourceSpecificMetadata[key].length === 0 || typeof sourceSpecificMetadata[key] === "object" && Object.keys(sourceSpecificMetadata[key]).filter((k) => sourceSpecificMetadata[key][k] !== null).length === 0) {
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
  color: "#6d4c41",
  icon: "📋",
  formatId(id) {
    return `openreview.${id}`;
  }
};
pluginRegistry.register(openreviewPlugin);

export { openreviewPlugin };
//# sourceMappingURL=openreview_plugin-D10kTOwB.js.map
