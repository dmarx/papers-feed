class Logger {
  constructor(name) {
    this.name = name;
  }
  info(message, ...args) {
    console.log(`[INFO] ${this.name}: ${message}`, ...args);
  }
  warning(message, ...args) {
    console.warn(`[WARNING] ${this.name}: ${message}`, ...args);
  }
  error(message, ...args) {
    console.error(`[ERROR] ${this.name}: ${message}`, ...args);
  }
  debug(message, ...args) {
    console.debug(`[DEBUG] ${this.name}: ${message}`, ...args);
  }
}
const loguru = {
  getLogger: (name) => new Logger(name)
};

const logger$g = loguru.getLogger("PluginRegistry");
const debugLogger = loguru.getLogger("PluginRegistryDebug");
class PluginRegistry {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  register(plugin) {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name})`);
    if (!plugin.id || typeof plugin.id !== "string") {
      debugLogger.error(`Plugin missing valid id: ${JSON.stringify(plugin)}`);
      return;
    }
    if (!Array.isArray(plugin.urlPatterns) || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    if (!plugin.extractId || typeof plugin.extractId !== "function") {
      debugLogger.error(`Plugin ${plugin.id} missing required extractId method`);
      return;
    }
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger$g.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.hasApi}, formatId=${!!plugin.formatId}`);
    logger$g.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  getAll() {
    debugLogger.info(`Getting all plugins, currently ${this.plugins.size} registered`);
    return Array.from(this.plugins.values());
  }
  get(id) {
    debugLogger.info(`Looking up plugin by id: ${id}`);
    const plugin = this.plugins.get(id);
    if (!plugin) {
      debugLogger.warning(`No plugin found with id: ${id}`);
    } else {
      debugLogger.info(`Found plugin: ${plugin.name} (${plugin.id})`);
    }
    return plugin;
  }
  findForUrl(url) {
    debugLogger.info(`Finding plugin for URL: ${url}`);
    for (const plugin of this.plugins.values()) {
      debugLogger.info(`Testing URL against plugin: ${plugin.id}`);
      for (const pattern of plugin.urlPatterns) {
        debugLogger.info(`Testing pattern: ${pattern.toString()}`);
        if (pattern.test(url)) {
          debugLogger.info(`URL matches pattern for plugin: ${plugin.id}`);
          const id = plugin.extractId(url);
          if (id) {
            debugLogger.info(`Successfully extracted ID: ${id}`);
            return { plugin, id };
          } else {
            debugLogger.warning(`Pattern matched but failed to extract ID`);
          }
        }
      }
    }
    debugLogger.warning(`No plugin found for URL: ${url}`);
    return null;
  }
}
const pluginRegistry = new PluginRegistry();
debugLogger.info("PluginRegistry singleton instance created");

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

const logger$f = loguru.getLogger("ServiceWorkerParser");
function createServiceWorkerDOM(htmlString) {
  const dom = {
    _html: htmlString,
    // Simplified querySelector that uses regex
    querySelector(selector) {
      try {
        if (selector.startsWith("#")) {
          const idName = selector.substring(1);
          const match = new RegExp(`id=["']${idName}["'][^>]*>(.*?)<`, "is").exec(htmlString);
          if (match) {
            return {
              textContent: match[1].replace(/<[^>]*>/g, ""),
              getAttribute: (attr) => {
                const attrMatch = new RegExp(`id=["']${idName}["'][^>]*${attr}=["']([^"']*)["']`, "i").exec(htmlString);
                return attrMatch ? attrMatch[1] : null;
              }
            };
          }
        }
        if (selector.startsWith(".")) {
          const className = selector.substring(1);
          const match = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*>(.*?)<`, "is").exec(htmlString);
          if (match) {
            return {
              textContent: match[1].replace(/<[^>]*>/g, ""),
              getAttribute: (attr) => {
                const attrMatch = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*${attr}=["']([^"']*)["']`, "i").exec(htmlString);
                return attrMatch ? attrMatch[1] : null;
              }
            };
          }
        }
        if (selector.includes("meta[")) {
          const nameMatch = /meta\[name=["']([^"']*)["']\]/.exec(selector);
          if (nameMatch) {
            const metaName = nameMatch[1];
            const match = new RegExp(`<meta[^>]*name=["']${metaName}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i").exec(htmlString);
            if (match) {
              return {
                content: match[1],
                getAttribute: (_attr) => null
              };
            }
          }
          const propertyMatch = /meta\[property=["']([^"']*)["']\]/.exec(selector);
          if (propertyMatch) {
            const propName = propertyMatch[1];
            const match = new RegExp(`<meta[^>]*property=["']${propName}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i").exec(htmlString);
            if (match) {
              return {
                content: match[1],
                getAttribute: (_attr) => null
              };
            }
          }
        }
        const tagMatch = /^([a-zA-Z0-9]+)/.exec(selector);
        if (tagMatch) {
          const tagName = tagMatch[1].toLowerCase();
          const match = new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, "is").exec(htmlString);
          if (match) {
            return {
              textContent: match[1].replace(/<[^>]*>/g, ""),
              getAttribute: (attr) => {
                const attrMatch = new RegExp(`<${tagName}[^>]*${attr}=["']([^"']*)["'][^>]*>`, "i").exec(htmlString);
                return attrMatch ? attrMatch[1] : null;
              }
            };
          }
        }
        return null;
      } catch (error) {
        logger$f.error(`Error in service worker DOM querySelector: ${error}`);
        return null;
      }
    },
    // Simplified querySelectorAll that uses regex
    querySelectorAll(selector) {
      try {
        const results = [];
        if (selector.startsWith(".")) {
          const className = selector.substring(1);
          const regex = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*>(.*?)<`, "gis");
          let match;
          while ((match = regex.exec(htmlString)) !== null) {
            const capturedText = match[0];
            results.push({
              textContent: match[1].replace(/<[^>]*>/g, ""),
              getAttribute: (attr) => {
                const attrMatch = new RegExp(`class=["'][^"']*${className}[^"']*["'][^>]*${attr}=["']([^"']*)["']`, "i").exec(capturedText);
                return attrMatch ? attrMatch[1] : null;
              }
            });
          }
          return results;
        }
        if (selector.includes("meta[")) {
          const nameMatch = /meta\[name=["']([^"']*)["']\]/.exec(selector);
          if (nameMatch) {
            const metaName = nameMatch[1];
            const regex = new RegExp(`<meta[^>]*name=["']${metaName}["'][^>]*content=["']([^"']*)["'][^>]*>`, "gi");
            let match;
            while ((match = regex.exec(htmlString)) !== null) {
              results.push({
                content: match[1],
                getAttribute: (_attr) => null
              });
            }
            return results;
          }
        }
        const tagMatch = /^([a-zA-Z0-9]+)/.exec(selector);
        if (tagMatch) {
          const tagName = tagMatch[1].toLowerCase();
          const regex = new RegExp(`<${tagName}[^>]*>(.*?)</${tagName}>`, "gis");
          let match;
          while ((match = regex.exec(htmlString)) !== null) {
            const capturedText = match[0];
            results.push({
              textContent: match[1].replace(/<[^>]*>/g, ""),
              innerHTML: match[1],
              getAttribute: (attr) => {
                const attrMatch = new RegExp(`<${tagName}[^>]*${attr}=["']([^"']*)["'][^>]*>`, "i").exec(capturedText);
                return attrMatch ? attrMatch[1] : null;
              }
            });
          }
          return results;
        }
        return results;
      } catch (error) {
        logger$f.error(`Error in service worker DOM querySelectorAll: ${error}`);
        return [];
      }
    },
    // For convenience
    getElementById(id) {
      return this.querySelector(`#${id}`);
    },
    getElementsByClassName(className) {
      return this.querySelectorAll(`.${className}`);
    },
    getElementsByTagName(tagName) {
      return this.querySelectorAll(tagName);
    }
  };
  return dom;
}

const logger$e = loguru.getLogger("ArXivPlugin");
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
    logger$e.info(`Extracting metadata from ${url}`);
    try {
      const isServiceWorker = typeof document !== "object" || !document.querySelector || typeof document.querySelector !== "function";
      if (isServiceWorker) {
        logger$e.info("Service worker context detected, using service worker DOM parser");
        const htmlContent = typeof document === "string" ? document : document.innerHTML || document.outerHTML || "";
        const swDOM = createServiceWorkerDOM(htmlContent);
        let title2 = swDOM.querySelector(".title")?.textContent?.trim();
        if (title2?.startsWith("Title:")) {
          title2 = title2.substring(6).trim();
        }
        let authors2 = "";
        const authorElements2 = swDOM.querySelectorAll(".authors a");
        if (authorElements2.length > 0) {
          const authorTexts = [];
          authorElements2.forEach((el) => {
            const text = el.textContent?.trim();
            if (text) authorTexts.push(text);
          });
          authors2 = authorTexts.join(", ");
        }
        let abstract2 = swDOM.querySelector(".abstract")?.textContent?.trim();
        if (abstract2?.startsWith("Abstract:")) {
          abstract2 = abstract2.substring(9).trim();
        }
        const categories2 = [];
        const categoryElements2 = swDOM.querySelectorAll(".subjects .tag");
        categoryElements2.forEach((el) => {
          const text = el.textContent?.trim();
          if (text) categories2.push(text);
        });
        return {
          title: title2 || "",
          authors: authors2 || "",
          abstract: abstract2 || "",
          source_specific_metadata: {
            arxiv_tags: categories2,
            published_date: ""
            // Will be filled by API if available
          }
        };
      }
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
        const authorTexts = [];
        authorElements.forEach((el) => {
          const text = el.textContent?.trim();
          if (text) authorTexts.push(text);
        });
        authors = authorTexts.join(", ");
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
        source_specific_metadata: {
          arxiv_tags: categories,
          published_date: ""
          // Will be filled by API if available
        }
      };
    } catch (error) {
      logger$e.error("Error extracting metadata from arXiv page", error);
      return {};
    }
  },
  hasApi: true,
  async fetchApiData(id) {
    logger$e.info(`Fetching API data for arXiv:${id}`);
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
        source_specific_metadata: {
          arxiv_tags: categories,
          published_date: published
        }
      };
    } catch (error) {
      logger$e.error("Error fetching arXiv API data", error);
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

const logger$d = loguru.getLogger("SemanticScholarPlugin");
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
    logger$d.info(`Extracting metadata from ${url}`);
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
      const published_date = getMetaContent('meta[name="citation_publication_date"]');
      return {
        title: title || "",
        authors: authors || "",
        abstract: abstract || "",
        source_specific_metadata: {
          citations,
          published_date: published_date || ""
        },
        identifiers: doi ? { doi } : void 0
      };
    } catch (error) {
      logger$d.error("Error extracting metadata from Semantic Scholar page", error);
      return {};
    }
  },
  hasApi: true,
  async fetchApiData(id) {
    logger$d.info(`Fetching API data for S2:${id}`);
    try {
      const apiUrl = `https://api.semanticscholar.org/v1/paper/${id}`;
      const response = await self.fetch(apiUrl);
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
          citations: data.citations,
          published_date: data.year ? `${data.year}` : void 0
        },
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
      logger$d.error("Error fetching Semantic Scholar API data", error);
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

const logger$c = loguru.getLogger("OpenReviewPlugin");
const openreviewPlugin = {
  id: "openreview",
  name: "OpenReview",
  description: "Support for OpenReview papers",
  version: "1.2.0",
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
    logger$c.info(`Extracting metadata from OpenReview page: ${url}`);
    try {
      const paperId = this.extractId(url);
      if (!paperId) {
        logger$c.warning(`Could not extract paper ID from URL: ${url}`);
        return { title: "Unknown OpenReview Paper", url };
      }
      const isServiceWorker = typeof document !== "object" || !document.querySelector || typeof document.querySelector !== "function";
      if (isServiceWorker) {
        logger$c.info("Service worker context detected, using service worker DOM parser");
        const htmlContent = typeof document === "string" ? document : document.innerHTML || document.outerHTML || "";
        const swDOM = createServiceWorkerDOM(htmlContent);
        const getMetaContent2 = (name) => {
          const element = swDOM.querySelector(`meta[name="${name}"]`);
          return element ? element.getAttribute("content") : void 0;
        };
        const authorElements2 = swDOM.querySelectorAll('meta[name="citation_author"]');
        let authors2 = "";
        if (authorElements2.length > 0) {
          const authorTexts = [];
          authorElements2.forEach((el) => {
            const content = el.getAttribute("content");
            if (content) authorTexts.push(content);
          });
          authors2 = authorTexts.join(", ");
        }
        const title2 = getMetaContent2("citation_title") || swDOM.querySelector("title")?.textContent?.replace(" | OpenReview", "") || "";
        const abstract2 = getMetaContent2("citation_abstract");
        const publicationDate2 = getMetaContent2("citation_online_date");
        const conferenceTitle2 = getMetaContent2("citation_conference_title");
        const pdfUrl2 = getMetaContent2("citation_pdf_url");
        let domTitle = "";
        let domAuthors = "";
        let domAbstract = "";
        let keywords = "";
        let tldr = "";
        let decision = "";
        let venue = "";
        const venueElements = swDOM.querySelectorAll(".forum-meta .item");
        if (venueElements.length > 0) {
          venueElements.forEach((el) => {
            const text = el.textContent?.trim();
            if (text && text.includes("Submitted to")) {
              venue = text.replace("Submitted to", "").trim();
            }
          });
        }
        const contentFields = swDOM.querySelectorAll(".note-content-field");
        contentFields.forEach((el) => {
          const fieldName = el.textContent?.trim();
          if (!fieldName) return;
          const valueEl = el.parentElement?.querySelector(".note-content-value");
          const value = valueEl?.textContent?.trim();
          if (!value) return;
          if (fieldName.includes("Keywords")) {
            keywords = value;
          } else if (fieldName.includes("Abstract") && !abstract2) {
            domAbstract = value;
          } else if (fieldName.includes("TL;DR") || fieldName.includes("TLDR")) {
            tldr = value;
          } else if (fieldName.includes("Decision")) {
            decision = value;
          }
        });
        if (!title2) {
          const h1 = swDOM.querySelector("h1");
          if (h1 && h1.textContent) {
            domTitle = h1.textContent.trim();
          } else {
            const h2 = swDOM.querySelector("h2.citation_title");
            if (h2 && h2.textContent) {
              domTitle = h2.textContent.trim();
            } else {
              const h2Alt = swDOM.querySelector(".forum-title h2");
              if (h2Alt && h2Alt.textContent) {
                domTitle = h2Alt.textContent.trim();
              }
            }
          }
        }
        if (!authors2) {
          const authorDiv = swDOM.querySelector(".forum-authors h3");
          if (authorDiv && authorDiv.textContent) {
            domAuthors = authorDiv.textContent.trim();
          }
        }
        const sourceSpecificMetadata2 = {
          forum_id: paperId,
          conference: conferenceTitle2 || venue || "",
          pdf_url: pdfUrl2 || "",
          publication_date: publicationDate2 || "",
          keywords: keywords || "",
          tldr: tldr || ""
        };
        if (decision) {
          sourceSpecificMetadata2.review_info = {
            decision
          };
        }
        Object.keys(sourceSpecificMetadata2).forEach((key) => {
          if (sourceSpecificMetadata2[key] === "" || sourceSpecificMetadata2[key] === null || sourceSpecificMetadata2[key] === void 0 || Array.isArray(sourceSpecificMetadata2[key]) && sourceSpecificMetadata2[key].length === 0 || typeof sourceSpecificMetadata2[key] === "object" && Object.keys(sourceSpecificMetadata2[key]).length === 0) {
            delete sourceSpecificMetadata2[key];
          }
        });
        return {
          title: title2 || domTitle || `OpenReview Paper: ${paperId}`,
          authors: authors2 || domAuthors || "",
          abstract: abstract2 || domAbstract || "",
          url,
          source_specific_metadata: sourceSpecificMetadata2
        };
      }
      const getMetaContent = (name) => {
        const element = document.querySelector(`meta[name="${name}"]`);
        return element ? element.getAttribute("content") || void 0 : void 0;
      };
      const authorElements = document.querySelectorAll('meta[name="citation_author"]');
      let authors = "";
      if (authorElements.length > 0) {
        const authorTexts = [];
        authorElements.forEach((el) => {
          const content = el.getAttribute("content");
          if (content) authorTexts.push(content);
        });
        authors = authorTexts.join(", ");
      }
      const title = getMetaContent("citation_title") || document.title.replace(" | OpenReview", "");
      const abstract = getMetaContent("citation_abstract");
      const publicationDate = getMetaContent("citation_online_date");
      const conferenceTitle = getMetaContent("citation_conference_title");
      const pdfUrl = getMetaContent("citation_pdf_url");
      const extractFromDOM = () => {
        const getContentFieldValue = (fieldName) => {
          const fields = Array.from(document.querySelectorAll(".note-content-field, .note_content_field"));
          for (const field of fields) {
            const fieldElement = field;
            if (fieldElement.textContent?.includes(fieldName)) {
              const valueEl = fieldElement.nextElementSibling || fieldElement.parentElement?.querySelector(".note-content-value, .note_content_value");
              if (valueEl && valueEl.textContent) {
                return valueEl.textContent.trim();
              }
            }
          }
          return null;
        };
        const domTitle = document.querySelector(".note_content_title, .note-content-title, .forum-title h2")?.textContent?.trim() || "";
        let domAuthors = "";
        const authorEl = document.querySelector(".signatures, .author, .authors, .forum-authors h3");
        if (authorEl && authorEl.textContent) {
          domAuthors = authorEl.textContent.trim();
        }
        const domAbstract = getContentFieldValue("Abstract") || "";
        const keywords = getContentFieldValue("Keywords") || "";
        const tldr = getContentFieldValue("TL;DR") || getContentFieldValue("TLDR") || "";
        let venue = "";
        const venueItems = document.querySelectorAll(".forum-meta .item");
        for (const item of venueItems) {
          const text = item.textContent?.trim();
          if (text && text.includes("Submitted to")) {
            venue = text.replace("Submitted to", "").trim();
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
      logger$c.error("Error extracting metadata from OpenReview page", error);
      return {
        title: `OpenReview Paper: ${this.extractId(url) || "Unknown"}`,
        url
      };
    }
  },
  hasApi: true,
  async fetchApiData(id) {
    logger$c.info(`Fetching OpenReview API data for ID: ${id}`);
    try {
      const pdfUrl = `https://openreview.net/pdf?id=${id}`;
      let note = null;
      let reviewsData = null;
      logger$c.info(`Trying forum endpoint for ID: ${id}`);
      const forumApiUrl = `https://api.openreview.net/notes?forum=${id}`;
      const forumResponse = await fetch(forumApiUrl);
      if (forumResponse.ok) {
        const data = await forumResponse.json();
        reviewsData = data;
        if (data.notes && data.notes.length > 0) {
          const mainNote = data.notes.find((n) => n.id === id || n.forum === id);
          if (mainNote) {
            note = mainNote;
          } else {
            note = data.notes[0];
          }
        } else {
          logger$c.warning(`No notes found in forum for ID: ${id}`);
        }
      }
      if (!note) {
        logger$c.info(`Forum approach failed, trying direct ID endpoint for: ${id}`);
        const notesApiUrl = `https://api.openreview.net/notes?id=${id}`;
        const notesResponse = await fetch(notesApiUrl);
        if (notesResponse.ok) {
          const data = await notesResponse.json();
          if (data.notes && data.notes.length > 0) {
            note = data.notes[0];
          } else {
            logger$c.warning(`No note found for ID: ${id}`);
          }
        } else {
          logger$c.warning(`API error for notes endpoint: ${notesResponse.status}`);
        }
      }
      if (!note) {
        return {
          title: `OpenReview Paper: ${id}`,
          url: `https://openreview.net/forum?id=${id}`,
          source_specific_metadata: {
            forum_id: id,
            pdf_url: pdfUrl
          }
        };
      }
      const content = note.content || {};
      const getContentValue = (field) => {
        if (!content[field]) return "";
        return typeof content[field] === "object" && "value" in content[field] ? content[field].value : content[field];
      };
      const title = getContentValue("title") || "";
      let authors = "";
      const authorsData = getContentValue("authors");
      if (Array.isArray(authorsData)) {
        authors = authorsData.join(", ");
      } else if (typeof authorsData === "string") {
        authors = authorsData;
      }
      const abstract = getContentValue("abstract") || "";
      const keywords = getContentValue("keywords") || "";
      const tldr = getContentValue("TL;DR") || getContentValue("TLDR") || "";
      const sourceSpecificMetadata = {
        forum_id: id,
        venue: getContentValue("venue") || note.venue || "",
        venueid: getContentValue("venueid") || note.venueid || "",
        pdf_url: pdfUrl,
        keywords: Array.isArray(keywords) ? keywords.join(", ") : keywords,
        tldr,
        creation_date: note.cdate ? new Date(note.cdate).toISOString() : "",
        publication_date: note.pdate ? new Date(note.pdate).toISOString() : ""
      };
      if (reviewsData && reviewsData.notes && reviewsData.notes.length > 1) {
        const replies = reviewsData.notes.filter((n) => n.id !== id && n.id !== note?.id);
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
            total_replies: replies.length
          };
          if (reviews.length > 0) {
            const ratings = reviews.filter((r) => {
              const content2 = r.content || {};
              return content2.rating || content2.score || content2.confidence || content2.rating && content2.rating.value || content2.score && content2.score.value;
            }).map((r) => {
              const content2 = r.content || {};
              const getRatingValue = (field) => {
                if (!content2[field]) return null;
                return typeof content2[field] === "object" && "value" in content2[field] ? content2[field].value : content2[field];
              };
              return {
                rating: getRatingValue("rating") || getRatingValue("score") || null,
                confidence: getRatingValue("confidence") || null
              };
            });
            if (ratings.length > 0) {
              sourceSpecificMetadata.review_info.ratings = ratings;
            }
          }
          if (decisions.length > 0) {
            const decisionContent = decisions[0].content || {};
            const getDecisionValue = (field) => {
              if (!decisionContent[field]) return null;
              return typeof decisionContent[field] === "object" && "value" in decisionContent[field] ? decisionContent[field].value : decisionContent[field];
            };
            const decision = getDecisionValue("decision") || getDecisionValue("recommendation") || getDecisionValue("metareview") || "";
            if (decision) {
              sourceSpecificMetadata.review_info.decision = decision;
            }
          }
        }
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
      logger$c.error(`Error fetching OpenReview API data: ${error}`);
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
  color: "#6d4c41",
  icon: "📋",
  formatId(id) {
    return `openreview.${id}`;
  }
};
pluginRegistry.register(openreviewPlugin);

const logger$b = loguru.getLogger("PluginLoader");
let pluginsInitialized = false;
let initializationPromise = null;
function registerCorePlugins() {
  try {
    const existingPlugins = pluginRegistry.getAll();
    if (existingPlugins.length > 0) {
      logger$b.info(`Found ${existingPlugins.length} plugins already registered`);
      return;
    }
    pluginRegistry.register(arxivPlugin);
    pluginRegistry.register(semanticScholarPlugin);
    pluginRegistry.register(openreviewPlugin);
    const pluginCount = pluginRegistry.getAll().length;
    logger$b.info(`Registered ${pluginCount} core plugins manually`);
  } catch (error) {
    logger$b.error("Error registering core plugins:", error);
    throw error;
  }
}
async function loadBuiltinPlugins() {
  logger$b.info("Loading built-in plugins");
  try {
    registerCorePlugins();
    const pluginCount = pluginRegistry.getAll().length;
    if (pluginCount === 0) {
      logger$b.warning("No plugins were registered. Attempting emergency direct registration.");
      try {
        pluginRegistry.register(arxivPlugin);
        pluginRegistry.register(semanticScholarPlugin);
        pluginRegistry.register(openreviewPlugin);
        const emergencyCount = pluginRegistry.getAll().length;
        if (emergencyCount > 0) {
          logger$b.info(`Emergency plugin registration successful: ${emergencyCount} plugins registered`);
        } else {
          throw new Error("Failed to register any plugins even with emergency registration");
        }
      } catch (emergencyError) {
        logger$b.error("Emergency plugin registration failed:", emergencyError);
        throw emergencyError;
      }
    } else {
      logger$b.info(`${pluginCount} plugins are registered`);
    }
  } catch (error) {
    logger$b.error("Error loading plugins", error);
    if (error instanceof Error) {
      logger$b.error(`Plugin loading error: ${error.message}`);
      if (error.stack) {
        logger$b.error(`Stack trace: ${error.stack}`);
      }
    }
    throw error;
  }
}
async function initializePluginSystem(retries = 3) {
  if (pluginsInitialized) {
    return;
  }
  if (initializationPromise) {
    return initializationPromise;
  }
  logger$b.info("Initializing plugin system");
  initializationPromise = (async () => {
    let attemptCount = 0;
    let lastError = null;
    while (attemptCount < retries) {
      try {
        await loadBuiltinPlugins();
        const loadedPlugins = pluginRegistry.getAll();
        logger$b.info(`Initialized ${loadedPlugins.length} plugins:`);
        loadedPlugins.forEach((plugin) => {
          logger$b.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
        });
        pluginsInitialized = true;
        return;
      } catch (error) {
        attemptCount++;
        lastError = error instanceof Error ? error : new Error(String(error));
        logger$b.warning(`Plugin initialization attempt ${attemptCount} failed: ${lastError.message}`);
        if (attemptCount < retries) {
          const delay = Math.pow(2, attemptCount) * 500;
          logger$b.info(`Retrying plugin initialization in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    logger$b.error(`Plugin initialization failed after ${retries} attempts.`);
    if (lastError) {
      throw lastError;
    } else {
      throw new Error("Plugin initialization failed for unknown reasons");
    }
  })();
  try {
    await initializationPromise;
    return;
  } catch (error) {
    initializationPromise = null;
    throw error;
  }
}
function getPluginInitializationState() {
  return {
    initialized: pluginsInitialized,
    initializationInProgress: !!initializationPromise,
    pluginCount: pluginRegistry.getAll().length
  };
}

function formatPrimaryId(source, id) {
  const plugin = pluginRegistry.get(source);
  if (plugin && plugin.formatId) {
    return plugin.formatId(id);
  }
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${source}.${safeId}`;
}

const logger$a = loguru.getLogger("Detector");
class MultiSourceDetector {
  /**
   * Detect paper source and metadata from URL using the plugin registry
   * 
   * @param {string} url - URL to analyze
   * @returns {SourceInfo|null} Paper source information or null if not detected
   */
  static detect(url) {
    const plugins = pluginRegistry.getAll();
    for (const plugin of plugins) {
      for (const pattern of plugin.urlPatterns) {
        const match = url.match(pattern);
        if (match) {
          const id = plugin.extractId(url);
          if (id) {
            const primary_id = plugin.formatId ? plugin.formatId(id) : formatPrimaryId(plugin.id, id);
            logger$a.info(`Detected ${plugin.id} paper: ${id} (${primary_id})`);
            return {
              type: plugin.id,
              id,
              primary_id,
              url
            };
          }
        }
      }
    }
    logger$a.info(`No matching plugin found for URL: ${url}`);
    return null;
  }
}

const logger$9 = loguru.getLogger("DetectionService");
const urlDetectionService = {
  /**
   * Check if URL is valid
   * @param {string} url URL to check
   * @returns {boolean} Whether URL is valid
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  },
  /**
   * Detect paper source info from URL
   * @param {string} url URL to analyze
   * @returns {Promise<DetectedSourceInfo|null>} Detection result with plugin
   */
  async detectSource(url) {
    const sourceInfo = MultiSourceDetector.detect(url);
    if (!sourceInfo) {
      return null;
    }
    const plugin = pluginRegistry.get(sourceInfo.type);
    if (!plugin) {
      logger$9.warning(`No plugin found for detected source: ${sourceInfo.type}`);
      return sourceInfo;
    }
    return {
      ...sourceInfo,
      plugin
    };
  }
};
async function processUrl(url) {
  if (!urlDetectionService.isValidUrl(url)) {
    logger$9.info(`Invalid or unsupported URL: ${url}`);
    return null;
  }
  try {
    return await urlDetectionService.detectSource(url);
  } catch (error) {
    logger$9.error(`Error processing URL ${url}:`, error);
    return null;
  }
}
async function processTab(tab) {
  if (!tab.url) {
    logger$9.info("Tab has no URL");
    return null;
  }
  return processUrl(tab.url);
}
async function processNavigation(details) {
  if (!details.url) {
    logger$9.info("Navigation event has no URL");
    return null;
  }
  return processUrl(details.url);
}

var d=class{constructor(e={}){this.cache=new Map,this.maxSize=e.maxSize??1e3,this.ttl=e.ttl??1e3*60*60,this.accessOrder=[];}get(e){let s=this.cache.get(e);if(s){if(Date.now()-s.lastAccessed>this.ttl){this.cache.delete(e),this.removeFromAccessOrder(e);return}return s.lastAccessed=Date.now(),this.updateAccessOrder(e),s.issueNumber}}set(e,s,t){if(this.cache.size>=this.maxSize&&!this.cache.has(e)){let r=this.accessOrder[this.accessOrder.length-1];r&&(this.cache.delete(r),this.removeFromAccessOrder(r));}this.cache.set(e,{issueNumber:s,lastAccessed:Date.now(),createdAt:t.createdAt,updatedAt:t.updatedAt}),this.updateAccessOrder(e);}remove(e){this.cache.delete(e),this.removeFromAccessOrder(e);}clear(){this.cache.clear(),this.accessOrder=[];}getStats(){return {size:this.cache.size,maxSize:this.maxSize,ttl:this.ttl}}shouldRefresh(e,s){let t=this.cache.get(e);return t?s>t.updatedAt:true}updateAccessOrder(e){this.removeFromAccessOrder(e),this.accessOrder.unshift(e);}removeFromAccessOrder(e){let s=this.accessOrder.indexOf(e);s>-1&&this.accessOrder.splice(s,1);}};var l="0.3.2";var f=class{constructor(e,s,t={}){this.token=e,this.repo=s,this.config={baseLabel:t.baseLabel??"stored-object",uidPrefix:t.uidPrefix??"UID:",reactions:{processed:t.reactions?.processed??"+1",initialState:t.reactions?.initialState??"rocket"}},this.cache=new d(t.cache);}async fetchFromGitHub(e,s={}){let t=new URL(`https://api.github.com/repos/${this.repo}${e}`);s.params&&(Object.entries(s.params).forEach(([i,a])=>{t.searchParams.append(i,a);}),delete s.params);let r=await fetch(t.toString(),{...s,headers:{Authorization:`token ${this.token}`,Accept:"application/vnd.github.v3+json",...s.headers}});if(!r.ok)throw new Error(`GitHub API error: ${r.status}`);return r.json()}createCommentPayload(e,s){let t={_data:e,_meta:{client_version:l,timestamp:new Date().toISOString(),update_mode:"append"}};return s&&(t.type=s),t}async getObject(e){let s=this.cache.get(e),t;if(s)try{t=await this.fetchFromGitHub(`/issues/${s}`),this._verifyIssueLabels(t,e)||(this.cache.remove(e),t=void 0);}catch{this.cache.remove(e);}if(!t){let c=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"closed"}});if(!c||c.length===0)throw new Error(`No object found with ID: ${e}`);t=c[0];}if(!t?.body)throw new Error(`Invalid issue data received for ID: ${e}`);let r=JSON.parse(t.body),i=new Date(t.created_at),a=new Date(t.updated_at);return this.cache.set(e,t.number,{createdAt:i,updatedAt:a}),{meta:{objectId:e,label:`${this.config.uidPrefix}${e}`,createdAt:i,updatedAt:a,version:await this._getVersion(t.number)},data:r}}async createObject(e,s){let t=`${this.config.uidPrefix}${e}`,r=await this.fetchFromGitHub("/issues",{method:"POST",body:JSON.stringify({title:`Stored Object: ${e}`,body:JSON.stringify(s,null,2),labels:[this.config.baseLabel,t]})});this.cache.set(e,r.number,{createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at)});let i=this.createCommentPayload(s,"initial_state"),a=await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})});return await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.processed})}),await this.fetchFromGitHub(`/issues/comments/${a.id}/reactions`,{method:"POST",body:JSON.stringify({content:this.config.reactions.initialState})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"closed"})}),{meta:{objectId:e,label:t,createdAt:new Date(r.created_at),updatedAt:new Date(r.updated_at),version:1},data:s}}_verifyIssueLabels(e,s){let t=new Set([this.config.baseLabel,`${this.config.uidPrefix}${s}`]);return e.labels.some(r=>t.has(r.name))}async updateObject(e,s){let t=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!t||t.length===0)throw new Error(`No object found with ID: ${e}`);let r=t[0],i=this.createCommentPayload(s);return await this.fetchFromGitHub(`/issues/${r.number}/comments`,{method:"POST",body:JSON.stringify({body:JSON.stringify(i,null,2)})}),await this.fetchFromGitHub(`/issues/${r.number}`,{method:"PATCH",body:JSON.stringify({state:"open"})}),this.getObject(e)}async listAll(){let e=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed"}}),s={};for(let t of e)if(!t.labels.some(r=>r.name==="archived"))try{let r=this._getObjectIdFromLabels(t),i=JSON.parse(t.body),a={objectId:r,label:r,createdAt:new Date(t.created_at),updatedAt:new Date(t.updated_at),version:await this._getVersion(t.number)};s[r]={meta:a,data:i};}catch{continue}return s}async listUpdatedSince(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:this.config.baseLabel,state:"closed",since:e.toISOString()}}),t={};for(let r of s)if(!r.labels.some(i=>i.name==="archived"))try{let i=this._getObjectIdFromLabels(r),a=JSON.parse(r.body),n=new Date(r.updated_at);if(n>e){let c={objectId:i,label:i,createdAt:new Date(r.created_at),updatedAt:n,version:await this._getVersion(r.number)};t[i]={meta:c,data:a};}}catch{continue}return t}async getObjectHistory(e){let s=await this.fetchFromGitHub("/issues",{method:"GET",params:{labels:[this.config.baseLabel,`${this.config.uidPrefix}${e}`].join(","),state:"all"}});if(!s||s.length===0)throw new Error(`No object found with ID: ${e}`);let t=s[0],r=await this.fetchFromGitHub(`/issues/${t.number}/comments`),i=[];for(let a of r)try{let n=JSON.parse(a.body),c="update",m,b={client_version:"legacy",timestamp:a.created_at,update_mode:"append"};typeof n=="object"?"_data"in n?(c=n.type||"update",m=n._data,b=n._meta||b):"type"in n&&n.type==="initial_state"?(c="initial_state",m=n.data):m=n:m=n,i.push({timestamp:a.created_at,type:c,data:m,commentId:a.id});}catch{continue}return i}async _getVersion(e){return (await this.fetchFromGitHub(`/issues/${e}/comments`)).length+1}_getObjectIdFromLabels(e){for(let s of e.labels)if(s.name!==this.config.baseLabel&&s.name.startsWith(this.config.uidPrefix))return s.name.slice(this.config.uidPrefix.length);throw new Error(`No UID label found with prefix ${this.config.uidPrefix}`)}};

const logger$8 = loguru.getLogger("PaperManager");
function isInteractionLog(data) {
  return typeof data === "object" && data !== null && typeof data.paper_id === "string" && Array.isArray(data.interactions);
}
class PaperManager {
  constructor(client) {
    // Concurrency control locks
    this.creationLocks = /* @__PURE__ */ new Map();
    this.client = client;
  }
  /**
   * Get or create a paper record
   */
  async getOrCreatePaper(paperData) {
    if (!paperData.primary_id) {
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      } else {
        throw new Error("Invalid paper data: missing primary_id and cannot generate it");
      }
    }
    const objectId = `paper:${paperData.primary_id}`;
    logger$8.info(`Getting or creating paper: ${objectId}`);
    try {
      const obj = await this.client.getObject(objectId);
      const data = obj.data;
      logger$8.info(`Found existing paper: ${objectId}`);
      return data;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        const defaultPaperData = {
          primary_id: paperData.primary_id,
          source: paperData.source,
          sourceId: paperData.sourceId,
          url: paperData.url || "",
          title: paperData.title || paperData.sourceId,
          authors: paperData.authors || "",
          abstract: paperData.abstract || "",
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          rating: "novote"
        };
        if (paperData.source_specific_metadata) {
          defaultPaperData.source_specific_metadata = paperData.source_specific_metadata;
        }
        defaultPaperData.identifiers = {
          original: paperData.sourceId,
          url: paperData.url
        };
        if (paperData.doi) {
          defaultPaperData.identifiers.doi = paperData.doi;
        }
        logger$8.info(`Creating new paper object: ${objectId}`);
        try {
          await this.client.createObject(objectId, defaultPaperData);
          logger$8.info(`Successfully created paper: ${objectId}`);
          return defaultPaperData;
        } catch (createError) {
          logger$8.error(`Error creating paper object: ${createError}`);
          throw createError;
        }
      }
      logger$8.error(`Error in getOrCreatePaper: ${error}`);
      throw error;
    }
  }
  /**
   * Get or create an interaction log
   */
  async getOrCreateInteractionLog(paperId) {
    const objectId = `interactions:${paperId}`;
    if (this.creationLocks.has(objectId)) {
      logger$8.info(`Waiting for existing creation of interaction log: ${objectId}`);
      return this.creationLocks.get(objectId);
    }
    const creationPromise = (async () => {
      try {
        const obj = await this.client.getObject(objectId);
        const data = obj.data;
        if (isInteractionLog(data)) {
          return data;
        }
        throw new Error("Invalid interaction log format");
      } catch (error) {
        if (error instanceof Error && error.message.includes("No object found")) {
          const newLog = {
            paper_id: paperId,
            interactions: []
          };
          logger$8.info(`Creating new interaction log: ${objectId}`);
          await this.client.createObject(objectId, newLog);
          return newLog;
        }
        throw error;
      } finally {
        setTimeout(() => {
          this.creationLocks.delete(objectId);
        }, 500);
      }
    })();
    this.creationLocks.set(objectId, creationPromise);
    return creationPromise;
  }
  /**
   * Log a reading session for a paper
   */
  async logReadingSession(paperId, session, paperData) {
    if (paperData) {
      if (!paperData.primary_id) {
        paperData.primary_id = paperId;
      }
      await this.getOrCreatePaper(paperData);
    }
    await this.addInteraction(paperId, {
      type: "reading_session",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: session
    });
  }
  /**
   * Log an annotation for a paper
   */
  async logAnnotation(paperId, key, value, paperData) {
    if (paperData) {
      if (!paperData.primary_id) {
        paperData.primary_id = paperId;
      }
      await this.getOrCreatePaper(paperData);
    }
    await this.addInteraction(paperId, {
      type: "annotation",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { key, value }
    });
  }
  /**
   * Update a paper's rating
   */
  async updateRating(paperId, rating, paperData) {
    const paper = await this.getOrCreatePaper(paperData || { primary_id: paperId });
    const objectId = `paper:${paperId}`;
    await this.client.updateObject(objectId, {
      ...paper,
      rating
    });
    await this.addInteraction(paperId, {
      type: "rating",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      data: { rating }
    });
  }
  /**
   * Add an interaction to a paper's log
   */
  async addInteraction(paperId, interaction) {
    const log = await this.getOrCreateInteractionLog(paperId);
    log.interactions.push(interaction);
    const objectId = `interactions:${paperId}`;
    await this.client.updateObject(objectId, log);
  }
  /**
   * Get interactions for a paper
   */
  async getInteractions(paperId, options = {}) {
    try {
      const log = await this.getOrCreateInteractionLog(paperId);
      let interactions = log.interactions;
      if (options.type) {
        interactions = interactions.filter((i) => i.type === options.type);
      }
      if (options.startTime || options.endTime) {
        interactions = interactions.filter((i) => {
          const time = new Date(i.timestamp);
          if (options.startTime && time < options.startTime) return false;
          if (options.endTime && time > options.endTime) return false;
          return true;
        });
      }
      return interactions;
    } catch (error) {
      if (error instanceof Error && error.message.includes("No object found")) {
        return [];
      }
      throw error;
    }
  }
  /**
   * Get total reading time for a paper
   */
  async getPaperReadingTime(paperId) {
    const interactions = await this.getInteractions(paperId, { type: "reading_session" });
    return interactions.reduce((total, i) => {
      const data = i.data;
      if (typeof data === "object" && data !== null && "duration_seconds" in data) {
        return total + data.duration_seconds;
      }
      return total;
    }, 0);
  }
  /**
   * Get paper history
   */
  async getPaperHistory(paperId) {
    const objectId = `paper:${paperId}`;
    return this.client.getObjectHistory(objectId);
  }
}

const logger$7 = loguru.getLogger("CredentialManager");
class CredentialManager {
  constructor() {
    this.githubToken = "";
    this.githubRepo = "";
    this.paperManager = null;
    chrome.storage.onChanged.addListener(this._handleStorageChanges.bind(this));
  }
  /**
   * Load credentials from storage
   * @returns {Promise<{paperManager: PaperManager|null}>}
   */
  async loadCredentials() {
    const items = await chrome.storage.sync.get(["githubToken", "githubRepo"]);
    this.githubToken = items.githubToken || "";
    this.githubRepo = items.githubRepo || "";
    logger$7.info("Credentials loaded:", {
      hasToken: !!this.githubToken,
      hasRepo: !!this.githubRepo
    });
    return this._initializePaperManager();
  }
  /**
   * Initialize the paper manager if credentials are available
   * @private
   * @returns {Promise<{paperManager: PaperManager|null}>}
   */
  async _initializePaperManager() {
    if (this.githubToken && this.githubRepo) {
      const githubClient = new f(this.githubToken, this.githubRepo);
      this.paperManager = new PaperManager(githubClient);
      logger$7.info("Paper manager initialized");
    } else {
      this.paperManager = null;
      logger$7.info("Paper manager not initialized - missing credentials");
    }
    return { paperManager: this.paperManager };
  }
  /**
   * Handle storage changes
   * @private
   * @param {Object} changes - Storage changes object
   */
  async _handleStorageChanges(changes) {
    let credentialsChanged = false;
    if (changes.githubToken) {
      this.githubToken = changes.githubToken.newValue;
      credentialsChanged = true;
    }
    if (changes.githubRepo) {
      this.githubRepo = changes.githubRepo.newValue;
      credentialsChanged = true;
    }
    if (credentialsChanged) {
      logger$7.info("GitHub credentials changed, reinitializing paper manager");
      await this._initializePaperManager();
    }
  }
  /**
   * Get the current paper manager instance
   * @returns {PaperManager|null}
   */
  getPaperManager() {
    return this.paperManager;
  }
  /**
   * Check if credentials are configured
   * @returns {boolean}
   */
  hasValidCredentials() {
    return !!(this.githubToken && this.githubRepo);
  }
}
const credentialManager = new CredentialManager();

const DEFAULT_CONFIG = {
  idleThresholdMinutes: 5,
  minSessionDurationSeconds: 30,
  // Adding more granular control
  requireContinuousActivity: true,
  // If true, resets timer on idle
  logPartialSessions: false,
  // If true, logs sessions even if under minimum duration
  activityUpdateIntervalSeconds: 1
  // How often to update active time
};
async function loadSessionConfig() {
  const items = await chrome.storage.sync.get("sessionConfig");
  return { ...DEFAULT_CONFIG, ...items.sessionConfig };
}
function getConfigurationInMs(config) {
  return {
    idleThreshold: config.idleThresholdMinutes * 60 * 1e3,
    minSessionDuration: config.minSessionDurationSeconds * 1e3,
    activityUpdateInterval: config.activityUpdateIntervalSeconds * 1e3,
    requireContinuousActivity: config.requireContinuousActivity,
    logPartialSessions: config.logPartialSessions
  };
}

const logger$6 = loguru.getLogger("SessionManager");
class EnhancedReadingSession {
  /**
   * Create a new reading session
   * @param {PaperData} paperData - Paper metadata
   * @param {SessionConfig} config - Session configuration
   */
  constructor(paperData, config) {
    if (!paperData.primary_id) {
      throw new Error("Paper data must include primary_id");
    }
    this.paperId = paperData.primary_id;
    this.paperData = paperData;
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    this.startTime = /* @__PURE__ */ new Date();
    this.activeTime = 0;
    this.idleTime = 0;
    this.lastActiveTime = /* @__PURE__ */ new Date();
    this.isTracking = true;
    this.config = config;
    this.endTime = null;
    this.finalizedData = null;
  }
  /**
   * Update session timing data
   */
  update() {
    if (this.isTracking && !this.finalizedData) {
      const now = /* @__PURE__ */ new Date();
      const timeSinceLastActive = now.getTime() - this.lastActiveTime.getTime();
      if (timeSinceLastActive < this.config.idleThreshold) {
        this.activeTime += timeSinceLastActive;
      } else {
        this.idleTime += timeSinceLastActive;
      }
      this.lastActiveTime = now;
    }
  }
  /**
   * Finalize session data
   * @returns {SessionData|null} Session data or null if session was too short
   */
  finalize() {
    if (this.finalizedData) {
      return this.finalizedData;
    }
    this.update();
    this.isTracking = false;
    this.endTime = /* @__PURE__ */ new Date();
    const totalElapsed = this.endTime.getTime() - this.startTime.getTime();
    if (this.activeTime >= this.config.minSessionDuration) {
      this.finalizedData = {
        session_id: this.sessionId,
        duration_seconds: Math.round(this.activeTime / 1e3),
        idle_seconds: Math.round(this.idleTime / 1e3),
        start_time: this.startTime.toISOString(),
        end_time: this.endTime.toISOString(),
        total_elapsed_seconds: Math.round(totalElapsed / 1e3)
      };
      return this.finalizedData;
    }
    return null;
  }
  /**
   * Get session metadata
   * @returns {SessionMetadata} Session metadata
   */
  getMetadata() {
    return {
      sourceType: this.paperData.source,
      paperId: this.paperId,
      title: this.paperData.title,
      sessionId: this.sessionId,
      startTime: this.startTime.toISOString(),
      activeSeconds: Math.round(this.activeTime / 1e3),
      idleSeconds: Math.round(this.idleTime / 1e3)
    };
  }
}
class SessionManager {
  constructor() {
    this.currentPaperData = null;
    this.currentSession = null;
    this.activityInterval = null;
    this.sessionConfig = null;
  }
  /**
   * Load session configuration
   * @returns {Promise<SessionConfig>} Session configuration
   */
  async loadSessionConfig() {
    const config = await loadSessionConfig();
    this.sessionConfig = getConfigurationInMs(config);
    logger$6.info("Session configuration loaded:", this.sessionConfig);
    chrome.storage.onChanged.addListener((changes) => {
      if (changes.sessionConfig) {
        this.sessionConfig = getConfigurationInMs(changes.sessionConfig.newValue);
        logger$6.info("Session configuration updated:", this.sessionConfig);
      }
    });
    return this.sessionConfig;
  }
  /**
   * Start a new reading session for a paper
   * @param {PaperData} paperData - Paper metadata
   * @returns {SessionMetadata|null} Session metadata
   */
  startSession(paperData) {
    if (!paperData || !paperData.primary_id) {
      logger$6.error("Cannot start session: invalid paper data");
      return null;
    }
    if (!this.sessionConfig) {
      logger$6.error("Session configuration not loaded, loading default config");
      this.sessionConfig = getConfigurationInMs(DEFAULT_CONFIG);
    }
    if (this.currentSession) {
      logger$6.info("Ending existing session before starting new one");
      this.endCurrentSession();
    }
    logger$6.info(`Starting new session for: ${paperData.primary_id}`);
    this.currentPaperData = paperData;
    this.currentSession = new EnhancedReadingSession(paperData, this.sessionConfig);
    const metadata = this.currentSession.getMetadata();
    logger$6.info("New session created:", metadata);
    this._startActivityTracking();
    return metadata;
  }
  /**
   * End the current reading session
   * @returns {Promise<{paperData: PaperData, sessionData: SessionData} | null>} Session result or null if no active session
   */
  async endCurrentSession() {
    if (this.currentSession && this.currentPaperData) {
      logger$6.info(`Ending session for: ${this.currentPaperData.primary_id}`);
      const sessionData = this.currentSession.finalize();
      if (sessionData) {
        logger$6.info("Creating reading event:", sessionData);
        await this._createReadingEvent(this.currentPaperData, sessionData);
      }
      const result = {
        paperData: this.currentPaperData,
        sessionData
      };
      this.currentSession = null;
      this.currentPaperData = null;
      this._stopActivityTracking();
      return result;
    }
    return null;
  }
  /**
   * Get the current paper data
   * @returns {PaperData|null} Current paper data
   */
  getCurrentPaper() {
    return this.currentPaperData;
  }
  /**
   * Start tracking activity
   * @private
   */
  _startActivityTracking() {
    if (!this.activityInterval && this.sessionConfig) {
      logger$6.info("Starting activity tracking");
      this.activityInterval = self.setInterval(() => {
        if (this.currentSession) {
          this.currentSession.update();
        }
      }, this.sessionConfig.activityUpdateInterval);
    }
  }
  /**
   * Stop tracking activity
   * @private
   */
  _stopActivityTracking() {
    if (this.activityInterval) {
      clearInterval(this.activityInterval);
      this.activityInterval = null;
    }
  }
  /**
   * Create reading event in GitHub
   * @private
   * @param {PaperData} paperData - Paper metadata
   * @param {SessionData} sessionData - Session data
   * @returns {Promise<void>}
   */
  async _createReadingEvent(paperData, sessionData) {
    const paperManager = credentialManager.getPaperManager();
    if (!paperManager || !paperData) {
      logger$6.error("Missing required data for creating reading event:", {
        hasPaperManager: !!paperManager,
        hasPaperData: !!paperData
      });
      return;
    }
    try {
      if (!paperData.primary_id) {
        logger$6.error("Paper data missing primary_id. This should not happen.");
        return;
      }
      const paperId = paperData.primary_id;
      await paperManager.logReadingSession(
        paperId,
        sessionData,
        paperData
      );
      logger$6.info("Reading session logged:", {
        paperId,
        sessionId: sessionData.session_id,
        activeTime: sessionData.duration_seconds,
        idleTime: sessionData.idle_seconds,
        totalTime: sessionData.total_elapsed_seconds
      });
    } catch (error) {
      logger$6.error("Error logging reading session:", error);
    }
  }
}
const sessionManager = new SessionManager();

const logger$5 = loguru.getLogger("MetadataService");
async function extractMetadataFromSource(sourceInfo) {
  if (!sourceInfo || !sourceInfo.plugin) {
    logger$5.info("No valid source info or plugin");
    return null;
  }
  try {
    if (sourceInfo.plugin.hasApi && sourceInfo.plugin.fetchApiData) {
      try {
        logger$5.info(`Using ${sourceInfo.plugin.id} plugin API to extract metadata`);
        const apiData = await sourceInfo.plugin.fetchApiData(sourceInfo.id);
        if (apiData && Object.keys(apiData).length > 0) {
          return {
            ...apiData,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (apiError) {
        logger$5.error(`Error using plugin API: ${apiError}`);
      }
    }
    return {
      source: sourceInfo.type,
      sourceId: sourceInfo.id,
      primary_id: sourceInfo.primary_id,
      url: sourceInfo.url,
      title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      rating: "novote"
    };
  } catch (error) {
    logger$5.error(`Error extracting metadata: ${error}`);
    return null;
  }
}
async function extractMetadataFromDOM(tabId, sourceInfo) {
  if (!sourceInfo || !sourceInfo.plugin || !sourceInfo.plugin.extractMetadata) {
    return null;
  }
  try {
    logger$5.info(`Attempting DOM extraction for ${sourceInfo.type}`);
    const script = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => document.documentElement.outerHTML
    });
    if (script && script[0] && script[0].result) {
      try {
        const htmlString = script[0].result;
        const metadata = await sourceInfo.plugin.extractMetadata({
          documentElement: { outerHTML: htmlString }
        }, sourceInfo.url);
        if (metadata && Object.keys(metadata).length > 0) {
          return {
            ...metadata,
            source: sourceInfo.type,
            sourceId: sourceInfo.id,
            primary_id: sourceInfo.primary_id,
            url: sourceInfo.url
          };
        }
      } catch (parserError) {
        logger$5.error(`Error parsing HTML in service worker: ${parserError}`);
        try {
          const metadata = await sourceInfo.plugin.extractMetadata(
            { innerHTML: script[0].result },
            sourceInfo.url
          );
          if (metadata && Object.keys(metadata).length > 0) {
            return {
              ...metadata,
              source: sourceInfo.type,
              sourceId: sourceInfo.id,
              primary_id: sourceInfo.primary_id,
              url: sourceInfo.url
            };
          }
        } catch (fallbackError) {
          logger$5.error(`Error with fallback metadata extraction: ${fallbackError}`);
        }
      }
    }
  } catch (error) {
    logger$5.error(`Error extracting metadata from DOM: ${error}`);
  }
  return null;
}
async function extractPaperMetadata(sourceInfo, tabId = null) {
  try {
    if (!sourceInfo) {
      logger$5.info("No source info provided");
      return null;
    }
    logger$5.info(`Extracting metadata for ${sourceInfo.type} paper: ${sourceInfo.id}`);
    let paperData = await extractMetadataFromSource(sourceInfo);
    if (tabId && (!paperData || !paperData.title || paperData.title.includes(sourceInfo.id))) {
      logger$5.info("API extraction failed or returned minimal data, trying DOM extraction");
      const domData = await extractMetadataFromDOM(tabId, sourceInfo);
      if (domData) {
        paperData = {
          ...paperData,
          ...domData,
          // Ensure critical fields are preserved
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url
        };
      }
    }
    if (paperData) {
      logger$5.info(`Successfully extracted metadata: ${paperData.title || paperData.primary_id}`);
    }
    return paperData;
  } catch (error) {
    logger$5.error(`Error extracting paper metadata: ${error}`);
    return null;
  }
}

const logger$4 = loguru.getLogger("PaperProcessor");
async function fullyProcessUrl(url, tabId = null) {
  try {
    const sourceInfo = await processUrl(url);
    if (!sourceInfo) {
      logger$4.info(`No source detected for URL: ${url}`);
      return null;
    }
    logger$4.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id}`);
    return await extractPaperMetadata(sourceInfo, tabId);
  } catch (error) {
    logger$4.error(`Error fully processing URL ${url}:`, error);
    return null;
  }
}
async function fullyProcessTab(tab) {
  if (!tab.url || !tab.id) {
    logger$4.info("Tab has no URL or ID");
    return null;
  }
  try {
    const sourceInfo = await processTab(tab);
    if (!sourceInfo) {
      logger$4.info(`No source detected for tab URL: ${tab.url}`);
      return null;
    }
    logger$4.info(`Detected ${sourceInfo.type} paper: ${sourceInfo.id} in tab ${tab.id}`);
    return await extractPaperMetadata(sourceInfo, tab.id);
  } catch (error) {
    logger$4.error(`Error fully processing tab: ${error}`);
    return null;
  }
}

const logger$3 = loguru.getLogger("GitHubIntegration");
class GitHubIntegration {
  /**
   * Create or update a GitHub issue for a paper
   * @param {PaperData} paperData - Paper metadata
   * @returns {Promise<PaperData|null>} Created or updated paper data
   */
  async createGithubIssue(paperData) {
    const paperManager = credentialManager.getPaperManager();
    if (!paperManager) {
      logger$3.error("Paper manager not initialized");
      return null;
    }
    if (!paperData.primary_id) {
      if (paperData.source && paperData.sourceId) {
        paperData.primary_id = formatPrimaryId(paperData.source, paperData.sourceId);
      } else {
        logger$3.error("Cannot create paper - no valid identifier");
        return null;
      }
    }
    try {
      logger$3.info(`Creating/getting paper issue: ${paperData.primary_id}`);
      const existingPaper = await paperManager.getOrCreatePaper(paperData);
      logger$3.info(`Paper metadata stored/retrieved: ${existingPaper.primary_id}`);
      return existingPaper;
    } catch (error) {
      logger$3.error(`Error handling paper metadata: ${error}`, error);
      return null;
    }
  }
  /**
   * Update paper rating
   * @param {PaperData} paperData - Paper metadata
   * @param {string} rating - Rating value
   * @returns {Promise<boolean>} Success status
   */
  async updateRating(paperData, rating) {
    const paperManager = credentialManager.getPaperManager();
    if (!paperManager) {
      logger$3.error("Paper manager not initialized");
      return false;
    }
    try {
      const paperId = paperData.primary_id;
      if (!paperId) {
        logger$3.error("Paper data missing primary_id");
        return false;
      }
      await paperManager.updateRating(paperId, rating, paperData);
      logger$3.info(`Updated rating for ${paperId}: ${rating}`);
      return true;
    } catch (error) {
      logger$3.error("Error updating rating:", error);
      return false;
    }
  }
  /**
   * Update paper annotation
   * @param {string} type - Annotation type
   * @param {Object} data - Annotation data
   * @returns {Promise<boolean>} Success status
   */
  async updateAnnotation(type, data) {
    const paperManager = credentialManager.getPaperManager();
    if (!paperManager) {
      logger$3.error("Paper manager not initialized");
      return false;
    }
    try {
      let paperId = data.paperId;
      if (!paperId.includes(".")) {
        const source = data.source || "arxiv";
        paperId = formatPrimaryId(source, paperId);
        logger$3.info(`Converted ID to standardized format: ${paperId}`);
      }
      const paperData = data.title ? {
        title: data.title,
        source: data.source,
        primary_id: paperId
      } : void 0;
      if (type === "vote") {
        await paperManager.updateRating(
          paperId,
          data.vote,
          paperData
        );
      } else {
        await paperManager.logAnnotation(
          paperId,
          "notes",
          data.notes,
          paperData
        );
      }
      return true;
    } catch (error) {
      logger$3.error("Error logging interaction:", error);
      return false;
    }
  }
}
const githubIntegration = new GitHubIntegration();

const logger$2 = loguru.getLogger("EventHandlers");
class EventHandlers {
  constructor() {
    this.pendingUrls = /* @__PURE__ */ new Set();
  }
  /**
   * Set up all event listeners
   * @returns {Promise<void>}
   */
  async setupListeners() {
    logger$2.info("Setting up unified event listeners");
    const plugins = pluginRegistry.getAll();
    const hostPatterns = this._buildHostPatterns(plugins);
    logger$2.info(`Setting up navigation listener with patterns: ${JSON.stringify(hostPatterns)}`);
    chrome.webNavigation.onCompleted.addListener(
      this.handleUnifiedNavigation.bind(this),
      { url: hostPatterns }
    );
    chrome.tabs.onActivated.addListener(
      this.handleUnifiedTabActivation.bind(this)
    );
    chrome.tabs.onUpdated.addListener(
      this.handleUnifiedTabUpdate.bind(this)
    );
    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        sessionManager.endCurrentSession();
      }
    });
    logger$2.info("All event listeners initialized");
  }
  /**
   * Build host patterns from plugins
   * @private
   * @param {Plugin[]} plugins - Available plugins
   * @returns {HostPattern[]} Host patterns for navigation listener
   */
  _buildHostPatterns(plugins) {
    const hostPatterns = [];
    for (const plugin of plugins) {
      try {
        for (const pattern of plugin.urlPatterns) {
          const patternStr = pattern.toString();
          const match = patternStr.match(/([a-zA-Z0-9.-]+)\\?\.([a-zA-Z]+)/);
          if (match) {
            const domain = match[1];
            const tld = match[2];
            hostPatterns.push({ hostSuffix: `${domain}.${tld}` });
          }
        }
      } catch (err) {
        logger$2.error(`Error processing plugin URL patterns: ${err}`);
      }
    }
    if (hostPatterns.length === 0) {
      hostPatterns.push(
        { hostSuffix: "arxiv.org" },
        { hostSuffix: "semanticscholar.org" },
        { hostSuffix: "doi.org" },
        { hostSuffix: "dl.acm.org" },
        { hostSuffix: "openreview.net" }
      );
    }
    return hostPatterns;
  }
  /**
   * Handle navigation events
   * @param {NavDetails} details - Navigation details
   * @returns {Promise<void>}
   */
  async handleUnifiedNavigation(details) {
    logger$2.info(`Unified navigation handler: ${details.url}`);
    try {
      const sourceInfo = await processNavigation(details);
      if (!sourceInfo) {
        logger$2.info("Not a recognized paper URL");
        return;
      }
      logger$2.info(`Detected paper: ${sourceInfo.type}:${sourceInfo.id}`);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id === details.tabId) {
        await this.handleTabChangeWithPlugins(tabs[0]);
      } else {
        const paperData = await fullyProcessUrl(details.url);
        if (paperData) {
          logger$2.info(`Processed paper data: ${paperData.title}`);
        }
      }
    } catch (error) {
      logger$2.error(`Error in navigation handler: ${error}`);
    }
  }
  /**
   * Handle tab activation events
   * @param {chrome.tabs.TabActiveInfo} activeInfo - Tab activation info
   * @returns {Promise<void>}
   */
  async handleUnifiedTabActivation(activeInfo) {
    logger$2.info(`Unified tab activation handler: ${activeInfo.tabId}`);
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (!tab.url || this.pendingUrls.has(tab.url)) {
      logger$2.info(`Tab URL empty or already being processed: ${tab.url}`);
      return;
    }
    try {
      this.pendingUrls.add(tab.url);
      await this.handleTabChangeWithPlugins(tab);
    } catch (error) {
      logger$2.error(`Error in tab activation handler: ${error}`);
    } finally {
      setTimeout(() => {
        if (tab.url) this.pendingUrls.delete(tab.url);
      }, 500);
    }
  }
  /**
   * Handle tab update events
   * @param {number} tabId - Tab ID
   * @param {chrome.tabs.TabChangeInfo} changeInfo - Change info
   * @param {chrome.tabs.Tab} tab - Tab object
   * @returns {Promise<void>}
   */
  async handleUnifiedTabUpdate(tabId, changeInfo, tab) {
    if (changeInfo.status !== "complete" || !tab.url || this.pendingUrls.has(tab.url)) {
      return;
    }
    logger$2.info(`Unified tab update handler: ${tab.url}`);
    try {
      this.pendingUrls.add(tab.url);
      await this.handleTabChangeWithPlugins(tab);
    } catch (error) {
      logger$2.error(`Error in tab update handler: ${error}`);
    } finally {
      setTimeout(() => {
        if (tab.url) this.pendingUrls.delete(tab.url);
      }, 500);
    }
  }
  /**
   * Handle tab changes for papers
   * @param {chrome.tabs.Tab} tab - Tab object
   * @returns {Promise<void>}
   */
  async handleTabChangeWithPlugins(tab) {
    if (!tab.url) return;
    const sourceInfo = await processTab(tab);
    if (!sourceInfo) {
      logger$2.info("Not a recognized paper page, ending current session");
      await sessionManager.endCurrentSession();
      return;
    }
    logger$2.info(`Processing paper URL: ${tab.url}`);
    const paperData = await fullyProcessTab(tab);
    if (paperData) {
      logger$2.info(`Starting new session for: ${paperData.primary_id}`);
      sessionManager.startSession(paperData);
      logger$2.info(`Creating GitHub issue for: ${paperData.primary_id}`);
      try {
        await githubIntegration.createGithubIssue(paperData);
      } catch (error) {
        logger$2.error(`Error creating GitHub issue: ${error}`);
      }
    }
  }
  /**
   * Process a paper URL
   * @param {string} url - Paper URL
   * @param {Object} options - Processing options
   * @returns {Promise<any|null>} Paper data or null
   */
  async processPaperUrl(url, options = {}) {
    logger$2.info(`Processing paper URL: ${url}`);
    try {
      const tabId = options.tabId || null;
      return await fullyProcessUrl(url, tabId);
    } catch (error) {
      logger$2.error(`Error processing paper URL: ${error}`);
      return null;
    }
  }
}
const eventHandlers = new EventHandlers();

const logger$1 = loguru.getLogger("Debug");
function initializeDebugObjects(enhancedServices) {
  if (typeof self !== "undefined") {
    self.__DEBUG__ = {
      // Paper manager
      get paperManager() {
        return credentialManager.getPaperManager();
      },
      // GitHub client - use any to bypass type checking for this property
      getGithubClient: () => {
        return credentialManager.getPaperManager();
      },
      // Session info
      getCurrentPaper: () => sessionManager.getCurrentPaper(),
      getCurrentSession: () => sessionManager.currentSession,
      getConfig: () => sessionManager.sessionConfig,
      // Enhanced services - construct with proper defaults
      enhancedServices: {
        urlDetectionService,
        getPluginState: getPluginInitializationState,
        handleUrl: enhancedServices?.handleUrl || ((url) => Promise.resolve(null)),
        ...enhancedServices || {}
      }
    };
    logger$1.info("Debug objects registered, access via __DEBUG__ in service worker console");
  } else {
    logger$1.warning("Debug objects not initialized: service worker context not detected");
  }
}
const debugModule = {
  initializeDebugObjects
};

const logger = loguru.getLogger("Background");
async function initialize() {
  logger.info("Initializing extension");
  try {
    const { paperManager } = await credentialManager.loadCredentials();
    logger.info("Credentials loaded:", {
      hasPaperManager: !!paperManager
    });
    const sessionConfig = await sessionManager.loadSessionConfig();
    logger.info("Session configuration loaded");
    logger.info("Initializing plugin system");
    await initializePluginSystem(3);
    logger.info("Plugin system initialized");
    await eventHandlers.setupListeners();
    debugModule.initializeDebugObjects({
      urlDetectionService,
      getPluginState: getPluginInitializationState,
      handleUrl: processUrl
    });
    logger.info("Extension initialized successfully");
  } catch (error) {
    logger.error("Extension initialization failed:", error);
  }
}
initialize();
//# sourceMappingURL=background.bundle.js.map
