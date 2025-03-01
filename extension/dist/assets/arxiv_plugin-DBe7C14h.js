import { l as loguru, p as pluginRegistry } from '../background.bundle.js';

function parseXML(xmlText) {
  return {
    getTagContent(tag, content) {
      const searchText = content || xmlText;
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "s");
      const match = searchText.match(regex);
      return match ? match[1].trim() : "";
    },
    getAll(tag) {
      const result = [];
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, "gs");
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        result.push(match[1].trim());
      }
      return result;
    },
    getAttribute(tag, attr) {
      const result = [];
      const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, "g");
      let match;
      while ((match = regex.exec(xmlText)) !== null) {
        result.push(match[1]);
      }
      return result;
    },
    getEntry(text) {
      const searchText = text || xmlText;
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/;
      const entryMatch = searchText.match(entryRegex);
      return entryMatch ? entryMatch[1] : "";
    },
    getAuthor(text) {
      const searchText = text || xmlText;
      const authors = [];
      const regex = /<author>[^]*?<name>([^]*?)<\/name>[^]*?<\/author>/g;
      let match;
      while (match = regex.exec(searchText)) {
        authors.push(match[1].trim());
      }
      return authors;
    },
    getCategories(text) {
      const searchText = text || xmlText;
      const categories = /* @__PURE__ */ new Set();
      const primaryMatch = searchText.match(/<arxiv:primary_category[^>]*term="([^"]+)"/);
      if (primaryMatch) {
        categories.add(primaryMatch[1]);
      }
      const categoryRegex = /<category[^>]*term="([^"]+)"/g;
      let match;
      while (match = categoryRegex.exec(searchText)) {
        categories.add(match[1]);
      }
      return Array.from(categories);
    },
    getPublishedDate(text) {
      const searchText = text || xmlText;
      const match = searchText.match(/<published>([^<]+)<\/published>/);
      return match ? match[1].trim() : "";
    }
  };
}

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
      const response = await self.fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const text = await response.text();
      const parser = parseXML(text);
      const entryContent = parser.getEntry();
      const title = parser.getTagContent("title");
      const authorsList = parser.getAuthor();
      const authors = authorsList.join(", ");
      const abstract = parser.getTagContent("summary");
      const categories = parser.getCategories();
      const published = parser.getPublishedDate();
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
//# sourceMappingURL=arxiv_plugin-DBe7C14h.js.map
