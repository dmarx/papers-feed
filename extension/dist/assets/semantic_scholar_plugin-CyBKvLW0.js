import { l as loguru, p as pluginRegistry } from '../background.bundle.js';

const logger = loguru.getLogger("SemanticScholarPlugin");
const semanticScholarPlugin = {
  id: "semanticscholar",
  name: "Semantic Scholar",
  description: "Support for Semantic Scholar papers",
  version: "1.0.0",
  urlPatterns: [
    /semanticscholar\.org\/paper\/([a-f0-9]+)/,
    /s2-research\.org\/papers\/([a-f0-9]+)/
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
    logger.info(`Extracting metadata from ${url}`);
    try {
      const getMetaContent = (selector) => {
        const element = document.querySelector(selector);
        return element && "content" in element ? element.content : void 0;
      };
      const title = getMetaContent('meta[name="citation_title"]') || getMetaContent('meta[property="og:title"]') || document.title;
      let authors = "";
      const authorElements = document.querySelectorAll('[data-test-id="author-list"] a');
      if (authorElements.length > 0) {
        authors = Array.from(authorElements).map((el) => el.textContent?.trim()).filter(Boolean).join(", ");
      } else {
        authors = getMetaContent('meta[name="citation_author"]') || "";
      }
      let abstract = getMetaContent('meta[name="description"]') || getMetaContent('meta[property="og:description"]');
      if (!abstract) {
        const abstractEl = document.querySelector('[data-test-id="abstract-text"]') || document.querySelector(".abstract");
        abstract = abstractEl?.textContent?.trim();
      }
      let citations;
      const citationEl = document.querySelector('[data-test-id="citation-count"]');
      if (citationEl) {
        const citText = citationEl.textContent;
        if (citText) {
          const match = citText.match(/(\d+)/);
          if (match) {
            citations = parseInt(match[1], 10);
          }
        }
      }
      const doi = getMetaContent('meta[name="citation_doi"]');
      return {
        title: title || "",
        authors: authors || "",
        abstract: abstract || "",
        source_specific_metadata: {
          citations
          // Any other S2-specific metadata
        },
        identifiers: doi ? { doi } : void 0
      };
    } catch (error) {
      logger.error("Error extracting metadata from Semantic Scholar page", error);
      return {};
    }
  },
  hasApi: true,
  async fetchApiData(id) {
    logger.info(`Fetching API data for S2:${id}`);
    try {
      const apiUrl = `https://api.semanticscholar.org/v1/paper/${id}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      const authors = data.authors ? data.authors.map((author) => author.name).join(", ") : "";
      const paperData = {
        title: data.title || "",
        authors,
        abstract: data.abstract || "",
        source_specific_metadata: {
          citations: data.citations
          // Any other S2-specific metadata
        },
        published_date: data.year ? `${data.year}` : void 0,
        identifiers: {}
      };
      if (data.doi) {
        paperData.identifiers.doi = data.doi;
      }
      if (data.arxivId) {
        paperData.identifiers.arxiv = data.arxivId;
      }
      return paperData;
    } catch (error) {
      logger.error("Error fetching Semantic Scholar API data", error);
      return {};
    }
  },
  color: "#2e7d32",
  icon: "📊",
  formatId(id) {
    return `s2.${id}`;
  }
};
pluginRegistry.register(semanticScholarPlugin);

export { semanticScholarPlugin };
//# sourceMappingURL=semantic_scholar_plugin-CyBKvLW0.js.map
