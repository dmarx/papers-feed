import { l as loguru, p as pluginRegistry } from '../background.bundle.js';

const logger = loguru.getLogger("ArXivPlugin");
const arxivPlugin = {
  id: "arxiv",
  name: "arXiv",
  description: "Support for arXiv papers",
  version: "1.0.0",
  urlPatterns: [
    /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
    /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
    /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
  ],
  extractId(url) {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1] + (match[2] || "");
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
      let title = document.querySelector(".title")?.textContent?.trim();
      if (title?.startsWith("Title:")) {
        title = title.substring(6).trim();
      }
      let authors = "";
      const authorElements = document.querySelectorAll(".authors a");
      if (authorElements.length > 0) {
        authors = Array.from(authorElements).map((el) => el.textContent?.trim()).filter(Boolean).join(", ");
      }
      let abstract = document.querySelector(".abstract")?.textContent?.trim();
      if (abstract?.startsWith("Abstract:")) {
        abstract = abstract.substring(9).trim();
      }
      const categories = [];
      const categoryElements = document.querySelectorAll(".subjects .tag");
      categoryElements.forEach((el) => {
        const text = el.textContent?.trim();
        if (text) categories.push(text);
      });
      return {
        title: title || "",
        authors: authors || "",
        abstract: abstract || "",
        arxiv_tags: categories
      };
    } catch (error) {
      logger.error("Error extracting metadata from arXiv page", error);
      return {};
    }
  },
  hasApi: true,
  async fetchApiData(id) {
    logger.info(`Fetching API data for arXiv:${id}`);
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const text = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      const entry = xmlDoc.querySelector("entry");
      if (!entry) {
        throw new Error("No entry found in API response");
      }
      const title = entry.querySelector("title")?.textContent?.trim() || "";
      const authorNodes = entry.querySelectorAll("author name");
      const authors = Array.from(authorNodes).map((node) => node.textContent?.trim()).filter(Boolean).join(", ");
      const abstract = entry.querySelector("summary")?.textContent?.trim() || "";
      const categoryNodes = entry.querySelectorAll("category");
      const categories = Array.from(categoryNodes).map((node) => node.getAttribute("term")).filter(Boolean);
      const published = entry.querySelector("published")?.textContent?.trim() || "";
      return {
        title,
        authors,
        abstract,
        arxiv_tags: categories,
        published_date: published
      };
    } catch (error) {
      logger.error("Error fetching arXiv API data", error);
      return {};
    }
  },
  color: "#B31B1B",
  icon: "📝",
  formatId(id) {
    return `arxiv.${id}`;
  }
};
pluginRegistry.register(arxivPlugin);

export { arxivPlugin };
//# sourceMappingURL=arxiv_plugin-Br5PaNkc.js.map
