class Logger {
  constructor(module) {
    this.module = module;
  }
  /**
   * Log debug message
   */
  debug(message, data) {
    console.debug(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
  /**
   * Log info message
   */
  info(message, data) {
    console.info(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
  /**
   * Log warning message
   */
  warning(message, data) {
    console.warn(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
  /**
   * Log error message
   */
  error(message, data) {
    console.error(`[${this.module}] ${message}`, data !== void 0 ? data : "");
  }
}
class LoguruMock {
  /**
   * Get logger for a module
   */
  getLogger(module) {
    return new Logger(module);
  }
}
const loguru = new LoguruMock();

const logger$2 = loguru.getLogger("arxiv-xml-parser");
async function parseXMLText(xmlText) {
  logger$2.debug("Parsing ArXiv XML response");
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    const parseError = xmlDoc.querySelector("parsererror");
    if (parseError) {
      throw new Error("XML parsing error: " + parseError.textContent);
    }
    const entry = xmlDoc.querySelector("entry");
    if (!entry) {
      throw new Error("No entry element found in XML");
    }
    const title = entry.querySelector("title")?.textContent?.trim() || "";
    const summary = entry.querySelector("summary")?.textContent?.trim() || "";
    const published = entry.querySelector("published")?.textContent?.trim() || "";
    const authors = Array.from(entry.querySelectorAll("author name")).map((name) => name.textContent?.trim() || "");
    const categories = /* @__PURE__ */ new Set();
    const primaryCategory = entry.querySelector("arxiv\\:primary_category, primary_category");
    if (primaryCategory && primaryCategory.hasAttribute("term")) {
      categories.add(primaryCategory.getAttribute("term") || "");
    }
    const categoryElements = entry.querySelectorAll("category");
    categoryElements.forEach((cat) => {
      if (cat.hasAttribute("term")) {
        categories.add(cat.getAttribute("term") || "");
      }
    });
    const result = {
      title,
      summary,
      authors,
      published_date: published,
      arxiv_tags: Array.from(categories)
    };
    logger$2.debug("XML parsing completed successfully");
    return result;
  } catch (error) {
    logger$2.error("Error parsing ArXiv XML", error);
    return null;
  }
}

const logger$1 = loguru.getLogger("metadata-transformer");
function transformMetadata(sourceId, paperId, apiData, mapping, sourceUrl) {
  const getField = (data, fieldPath) => {
    if (Array.isArray(fieldPath)) {
      for (const path of fieldPath) {
        const value2 = getField(data, path);
        if (value2 !== void 0 && value2 !== null && value2 !== "") {
          return value2;
        }
      }
      return "";
    }
    const parts = fieldPath.split(".");
    let value = data;
    for (const part of parts) {
      if (value === void 0 || value === null) return "";
      value = value[part];
    }
    return value !== void 0 && value !== null ? value : "";
  };
  const title = getField(apiData, mapping.titleField);
  const authors = mapping.extractAuthors ? mapping.extractAuthors(apiData) : Array.isArray(getField(apiData, mapping.authorsField)) ? getField(apiData, mapping.authorsField).join(", ") : getField(apiData, mapping.authorsField);
  const abstract = getField(apiData, mapping.abstractField);
  const publishedDate = mapping.extractDate ? mapping.extractDate(apiData) : getField(apiData, mapping.dateField);
  const tags = mapping.extractTags ? mapping.extractTags(apiData) : Array.isArray(getField(apiData, mapping.tagsField)) ? getField(apiData, mapping.tagsField) : [];
  const metadata = {
    sourceId,
    paperId,
    url: sourceUrl,
    title,
    authors,
    abstract,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    rating: "novote",
    publishedDate,
    tags
  };
  logger$1.debug("Transformed metadata", { sourceId, paperId });
  return metadata;
}

const logger = loguru.getLogger("arxiv-integration");
class ArXivIntegration {
  constructor() {
    this.id = "arxiv";
    this.name = "arXiv.org";
    // URL patterns for papers
    this.urlPatterns = [
      /arxiv\.org\/(abs|pdf|html)\/([0-9.]+)/,
      /arxiv\.org\/\w+\/([0-9.]+)/
    ];
    // Content script matches
    this.contentScriptMatches = [
      "*://*.arxiv.org/*"
    ];
    // Metadata mapping for ArXiv
    this.METADATA_MAPPING = {
      titleField: "title",
      authorsField: "authors",
      abstractField: "summary",
      dateField: "published_date",
      tagsField: "arxiv_tags",
      // Custom author extraction (since authors is an array)
      extractAuthors: (data) => {
        if (Array.isArray(data.authors)) {
          return data.authors.join(", ");
        }
        return data.authors || "";
      }
    };
  }
  /**
   * Check if this integration can handle the given URL
   */
  canHandleUrl(url) {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  }
  /**
   * Extract paper ID from URL
   */
  extractPaperId(url) {
    for (const pattern of this.urlPatterns) {
      const match = url.match(pattern);
      if (match) {
        return match[2] || match[1];
      }
    }
    return null;
  }
  /**
   * Extract metadata from page or fetch from API
   */
  async extractMetadata(document, paperId) {
    logger.info(`Extracting metadata for arXiv ID: ${paperId}`);
    const pageMetadata = this.extractFromPage(document, paperId);
    if (pageMetadata) {
      logger.debug("Extracted metadata from page");
      return pageMetadata;
    }
    logger.debug("Falling back to API for metadata");
    return this.fetchFromApi(paperId);
  }
  /**
   * Extract metadata from ArXiv page
   */
  extractFromPage(document, paperId) {
    try {
      const titleElement = document.querySelector(".title");
      if (!titleElement) return null;
      const title = titleElement.textContent?.replace("Title:", "").trim() || "";
      const authorsElement = document.querySelector(".authors");
      const authors = authorsElement?.textContent?.replace("Authors:", "").trim() || "";
      const abstractElement = document.querySelector(".abstract");
      const abstract = abstractElement?.textContent?.replace("Abstract:", "").trim() || "";
      const categoriesElement = document.querySelector(".subjects");
      const categoriesText = categoriesElement?.textContent?.replace("Subjects:", "").trim() || "";
      const tags = categoriesText.split(";").map((tag) => tag.trim());
      const dateElement = document.querySelector(".dateline");
      const publishedDate = dateElement?.textContent?.trim() || "";
      return {
        sourceId: this.id,
        paperId,
        url: window.location.href,
        title,
        authors,
        abstract,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        rating: "novote",
        publishedDate,
        tags
      };
    } catch (error) {
      logger.error("Error extracting from page:", error);
      return null;
    }
  }
  /**
   * Fetch metadata from ArXiv API
   */
  async fetchFromApi(arxivId) {
    try {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;
      logger.debug(`API URL: ${apiUrl}`);
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error(`ArXiv API error: ${response.status}`);
      }
      const text = await response.text();
      const parsedXml = await parseXMLText(text);
      if (!parsedXml) {
        logger.error("Failed to parse API response");
        return null;
      }
      const paperData = transformMetadata(
        this.id,
        arxivId,
        parsedXml,
        this.METADATA_MAPPING,
        `https://arxiv.org/abs/${arxivId}`
      );
      logger.debug("Paper metadata processed", paperData);
      return paperData;
    } catch (error) {
      logger.error("Error processing arXiv metadata", error);
      return null;
    }
  }
}
const arxivIntegration = new ArXivIntegration();

export { arxivIntegration as a, loguru as l };
//# sourceMappingURL=index-CeCyCSyP.js.map
