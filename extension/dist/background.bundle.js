import { l as loguru } from './assets/logger-Cyvnc9vo.js';
import { l as loadSessionConfig, g as getConfigurationInMs, D as DEFAULT_CONFIG } from './assets/session-CpmC_lj6.js';

function extractIdWithPlugin(plugin, url) {
  const id = plugin.serviceWorker.detectSourceId(url);
  if (id) return id;
  for (const pattern of plugin.urlPatterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1] || null;
    }
  }
  return null;
}

const logger$d = loguru.getLogger("PluginRegistry");
const debugLogger = loguru.getLogger("PluginRegistryDebug");
class PluginRegistry {
  constructor() {
    this.plugins = /* @__PURE__ */ new Map();
  }
  /**
   * Register a plugin with the registry
   * @param plugin Plugin to register
   */
  register(plugin) {
    debugLogger.info(`Registering plugin: ${plugin.id} (${plugin.name})`);
    if (!plugin.id || typeof plugin.id !== "string") {
      debugLogger.error(`Plugin missing valid id: ${JSON.stringify(plugin)}`);
      return;
    }
    if (!Array.isArray(plugin.urlPatterns) || plugin.urlPatterns.length === 0) {
      debugLogger.warning(`Plugin ${plugin.id} has no URL patterns`);
    }
    if (!plugin.serviceWorker) {
      debugLogger.error(`Plugin ${plugin.id} missing required serviceWorker component`);
      return;
    }
    if (!plugin.serviceWorker.detectSourceId || typeof plugin.serviceWorker.detectSourceId !== "function") {
      debugLogger.error(`Plugin ${plugin.id} missing required detectSourceId method`);
      return;
    }
    if (!plugin.serviceWorker.formatId || typeof plugin.serviceWorker.formatId !== "function") {
      debugLogger.error(`Plugin ${plugin.id} missing required formatId method`);
      return;
    }
    if (!plugin.contentScript) {
      debugLogger.error(`Plugin ${plugin.id} missing required contentScript component`);
      return;
    }
    if (!plugin.contentScript.extractorModulePath) {
      debugLogger.error(`Plugin ${plugin.id} missing required extractorModulePath`);
      return;
    }
    if (this.plugins.has(plugin.id)) {
      debugLogger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
      logger$d.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    this.plugins.set(plugin.id, plugin);
    debugLogger.info(`Successfully registered plugin: ${plugin.name} (${plugin.id})`);
    debugLogger.info(`Plugin capabilities: hasApi=${!!plugin.serviceWorker.fetchApiData}, formatId=${!!plugin.serviceWorker.formatId}`);
    logger$d.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  /**
   * Get all registered plugins
   * @returns Array of registered plugins
   */
  getAll() {
    debugLogger.info(`Getting all plugins, currently ${this.plugins.size} registered`);
    return Array.from(this.plugins.values());
  }
  /**
   * Get a plugin by ID
   * @param id Plugin ID
   * @returns Plugin instance or undefined if not found
   */
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
  /**
   * Find a plugin that can handle a URL and extract its ID
   * @param url URL to find a plugin for
   * @returns Object with plugin and extracted ID, or null if no match
   */
  findForUrl(url) {
    debugLogger.info(`Finding plugin for URL: ${url}`);
    for (const plugin of this.plugins.values()) {
      debugLogger.info(`Testing URL against plugin: ${plugin.id}`);
      const id = extractIdWithPlugin(plugin, url);
      if (id) {
        debugLogger.info(`URL matches plugin ${plugin.id}, extracted ID: ${id}`);
        return { plugin, id };
      }
    }
    debugLogger.warning(`No plugin found for URL: ${url}`);
    return null;
  }
  /**
   * Get the path to the extractor module for a plugin
   * @param id Plugin ID
   * @returns Path to extractor module or null if plugin not found
   */
  getExtractorPath(id) {
    const plugin = this.get(id);
    if (!plugin) {
      return null;
    }
    return plugin.contentScript.extractorModulePath;
  }
  /**
   * Check if a URL is supported by any registered plugin
   * @param url URL to check
   * @returns True if URL is supported
   */
  isSupportedUrl(url) {
    return this.findForUrl(url) !== null;
  }
  /**
   * Get information about all registered plugins
   * @returns Array of plugin information objects
   */
  getPluginInfo() {
    return this.getAll().map((plugin) => ({
      id: plugin.id,
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      hasApi: !!plugin.serviceWorker.fetchApiData
    }));
  }
}
const pluginRegistry = new PluginRegistry();
debugLogger.info("PluginRegistry singleton instance created");

const logger$c = loguru.getLogger("SourcePluginFactory");
class SourcePluginFactory {
  /**
   * Create a new source plugin from configuration and register it
   * @param config Plugin configuration
   * @returns The created plugin
   */
  createPlugin(config) {
    logger$c.info(`Creating plugin: ${config.id}`);
    this.validateConfig(config);
    const serviceWorker = {
      detectSourceId: config.serviceWorker.detectSourceId,
      formatId: config.serviceWorker.formatId,
      fetchApiData: config.serviceWorker.fetchApiData,
      // Default quality evaluation if not provided
      evaluateMetadataQuality: config.serviceWorker.evaluateMetadataQuality || ((paperData) => {
        const essentialFields = ["title", "primary_id", "url"];
        const standardFields = [...essentialFields, "authors"];
        const completeFields = [...standardFields, "abstract", "timestamp"];
        const missingEssential = essentialFields.filter((field) => {
          const value = paperData[field];
          return value === void 0 || value === null || value === "";
        });
        const missingComplete = completeFields.filter((field) => {
          const value = paperData[field];
          return value === void 0 || value === null || value === "";
        });
        let quality;
        if (missingEssential.length > 0) {
          quality = "minimal";
        } else if (missingComplete.length > 0) {
          quality = "partial";
        } else {
          quality = "complete";
        }
        return {
          quality,
          missingFields: missingComplete,
          hasEssentialFields: missingEssential.length === 0
        };
      })
    };
    const contentScript = {
      extractorModulePath: config.contentScript.extractorModulePath
    };
    const plugin = {
      id: config.id,
      name: config.name,
      description: config.description,
      version: config.version,
      urlPatterns: config.urlPatterns,
      color: config.color,
      icon: config.icon,
      serviceWorker,
      contentScript
    };
    pluginRegistry.register(plugin);
    return plugin;
  }
  /**
   * Validate plugin configuration
   * @param config Configuration to validate
   * @throws Error if required fields are missing
   */
  validateConfig(config) {
    const requiredFields = [
      "id",
      "name",
      "description",
      "version",
      "urlPatterns",
      "serviceWorker",
      "contentScript"
    ];
    const missingFields = requiredFields.filter((field) => !config[field]);
    if (missingFields.length > 0) {
      const error = `Plugin configuration missing required fields: ${missingFields.join(", ")}`;
      logger$c.error(error);
      throw new Error(error);
    }
    if (!Array.isArray(config.urlPatterns) || config.urlPatterns.length === 0) {
      const error = `Plugin ${config.id} has no URL patterns`;
      logger$c.error(error);
      throw new Error(error);
    }
    const requiredSWFields = ["detectSourceId", "formatId"];
    const missingSWFields = requiredSWFields.filter((field) => !config.serviceWorker[field]);
    if (missingSWFields.length > 0) {
      const error = `Plugin ${config.id} service worker is missing required fields: ${missingSWFields.join(", ")}`;
      logger$c.error(error);
      throw new Error(error);
    }
    if (!config.contentScript.extractorModulePath) {
      const error = `Plugin ${config.id} content script is missing required extractorModulePath`;
      logger$c.error(error);
      throw new Error(error);
    }
  }
}
const sourcePluginFactory = new SourcePluginFactory();

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

const logger$b = loguru.getLogger("ArXivPlugin");
const arxivPlugin = sourcePluginFactory.createPlugin({
  id: "arxiv",
  name: "arXiv",
  description: "Support for arXiv papers",
  version: "1.0.0",
  color: "#B31B1B",
  icon: "📝",
  // URL patterns for detecting arXiv papers (used in both contexts)
  urlPatterns: [
    /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
    /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
    /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
  ],
  // Service worker specific functionality
  serviceWorker: {
    // Extract ID from URL (service worker context)
    detectSourceId: (url) => {
      for (const pattern of [
        /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
        /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/,
        /arxiv\.org\/[a-z]+\/([0-9.]+)(v[0-9]+)?/
      ]) {
        const match = url.match(pattern);
        if (match) {
          return match[1] + (match[2] || "");
        }
      }
      return null;
    },
    // Format ID consistently
    formatId: (id) => `arxiv.${id}`,
    // API-based metadata fetching (service worker context)
    fetchApiData: async (id) => {
      logger$b.info(`Fetching arXiv API data for ID: ${id}`);
      try {
        const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
        const response = await fetch(apiUrl);
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
        const primary_id = `arxiv.${id}`;
        return {
          primary_id,
          source: "arxiv",
          sourceId: id,
          url: `https://arxiv.org/abs/${id}`,
          title,
          authors,
          abstract,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          source_specific_metadata: {
            arxiv_tags: categories,
            published_date: published
          }
        };
      } catch (error) {
        logger$b.error(`Error fetching arXiv API data: ${error}`);
        return {};
      }
    },
    // Custom metadata quality evaluation
    evaluateMetadataQuality: (paperData) => {
      const essentialFields = ["title", "primary_id", "url"];
      const standardFields = [...essentialFields, "authors"];
      const completeFields = [...standardFields, "abstract", "source_specific_metadata"];
      const missingEssential = essentialFields.filter((field) => !paperData[field] || paperData[field] === "");
      const missingComplete = completeFields.filter((field) => {
        if (field === "source_specific_metadata") {
          return !paperData.source_specific_metadata || !paperData.source_specific_metadata.arxiv_tags || !Array.isArray(paperData.source_specific_metadata.arxiv_tags) || paperData.source_specific_metadata.arxiv_tags.length === 0;
        }
        return !paperData[field] || paperData[field] === "";
      });
      let quality;
      if (missingEssential.length > 0) {
        quality = "minimal";
      } else if (missingComplete.length > 0) {
        quality = "partial";
      } else {
        quality = "complete";
      }
      return {
        quality,
        missingFields: missingComplete,
        hasEssentialFields: missingEssential.length === 0
      };
    }
  },
  // Content script specific functionality
  contentScript: {
    // Path to the content script extractor module
    // This will be imported at build time
    extractorModulePath: "./extractors/arxiv_extractor"
  }
});

const logger$a = loguru.getLogger("PluginLoader");
let pluginsInitialized = false;
let initializationPromise = null;
function registerCorePlugins() {
  try {
    const existingPlugins = pluginRegistry.getAll();
    if (existingPlugins.length > 0) {
      logger$a.info(`Found ${existingPlugins.length} plugins already registered`);
      return;
    }
    pluginRegistry.register(arxivPlugin);
    const pluginCount = pluginRegistry.getAll().length;
    logger$a.info(`Registered ${pluginCount} core plugins manually`);
  } catch (error) {
    logger$a.error("Error registering core plugins:", error);
    throw error;
  }
}
async function loadBuiltinPlugins() {
  logger$a.info("Loading built-in plugins");
  try {
    registerCorePlugins();
    const pluginCount = pluginRegistry.getAll().length;
    if (pluginCount === 0) {
      logger$a.warning("No plugins were registered. Attempting emergency direct registration.");
      try {
        pluginRegistry.register(arxivPlugin);
        const emergencyCount = pluginRegistry.getAll().length;
        if (emergencyCount > 0) {
          logger$a.info(`Emergency plugin registration successful: ${emergencyCount} plugins registered`);
        } else {
          throw new Error("Failed to register any plugins even with emergency registration");
        }
      } catch (emergencyError) {
        logger$a.error("Emergency plugin registration failed:", emergencyError);
        throw emergencyError;
      }
    } else {
      logger$a.info(`${pluginCount} plugins are registered`);
    }
  } catch (error) {
    logger$a.error("Error loading plugins", error);
    if (error instanceof Error) {
      logger$a.error(`Plugin loading error: ${error.message}`);
      if (error.stack) {
        logger$a.error(`Stack trace: ${error.stack}`);
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
  logger$a.info("Initializing plugin system");
  initializationPromise = (async () => {
    let attemptCount = 0;
    let lastError = null;
    while (attemptCount < retries) {
      try {
        await loadBuiltinPlugins();
        const loadedPlugins = pluginRegistry.getAll();
        logger$a.info(`Initialized ${loadedPlugins.length} plugins:`);
        loadedPlugins.forEach((plugin) => {
          logger$a.info(`- ${plugin.name} (${plugin.id}) v${plugin.version}`);
        });
        pluginsInitialized = true;
        return;
      } catch (error) {
        attemptCount++;
        lastError = error instanceof Error ? error : new Error(String(error));
        logger$a.warning(`Plugin initialization attempt ${attemptCount} failed: ${lastError.message}`);
        if (attemptCount < retries) {
          const delay = Math.pow(2, attemptCount) * 500;
          logger$a.info(`Retrying plugin initialization in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
    logger$a.error(`Plugin initialization failed after ${retries} attempts.`);
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
function arePluginsInitialized() {
  return pluginsInitialized;
}
function getPluginInitializationState() {
  return {
    initialized: pluginsInitialized,
    initializationInProgress: !!initializationPromise,
    pluginCount: pluginRegistry.getAll().length
  };
}

const logger$9 = loguru.getLogger("DetectionService");
class URLDetectionService {
  constructor() {
    // Track processing state
    this.pendingUrls = /* @__PURE__ */ new Set();
    // Debounce configuration
    this.debounceTime = 500;
    // ms
    this.debounceTimers = /* @__PURE__ */ new Map();
    // Cache successful detections to avoid repeat processing
    this.detectionCache = /* @__PURE__ */ new Map();
    this.maxCacheSize = 100;
    logger$9.info("URL Detection Service initialized");
  }
  /**
   * Detect paper source from URL
   * @param {string} url URL to analyze
   * @returns {Promise<DetectedSourceInfo|null>} Detection result with plugin
   */
  async detectSource(url) {
    if (!url) {
      logger$9.warning("Empty URL provided to detectSource");
      return null;
    }
    if (this.detectionCache.has(url)) {
      logger$9.info(`Cache hit for ${url}`);
      return this.detectionCache.get(url);
    }
    if (!arePluginsInitialized()) {
      logger$9.info("Plugins not initialized, initializing now...");
      try {
        await initializePluginSystem();
      } catch (error) {
        logger$9.error("Failed to initialize plugins:", error);
        return null;
      }
    }
    if (this.isUrlPending(url)) {
      logger$9.info(`URL already being processed: ${url}`);
      return null;
    }
    try {
      this.addPendingUrl(url);
      const result = pluginRegistry.findForUrl(url);
      if (result) {
        const sourceInfo = {
          type: result.plugin.id,
          id: result.id,
          primary_id: result.plugin.serviceWorker.formatId ? result.plugin.serviceWorker.formatId(result.id) : `${result.plugin.id}.${result.id}`,
          url,
          plugin: result.plugin
        };
        this.addToCache(url, sourceInfo);
        logger$9.info(`Detected source using plugin registry: ${sourceInfo.type}:${sourceInfo.id}`);
        return sourceInfo;
      }
      const plugins = pluginRegistry.getAll();
      for (const plugin of plugins) {
        for (const pattern of plugin.urlPatterns) {
          const match = url.match(pattern);
          if (match) {
            const id = plugin.serviceWorker.detectSourceId(url);
            if (id) {
              const sourceInfo = {
                type: plugin.id,
                id,
                primary_id: plugin.serviceWorker.formatId ? plugin.serviceWorker.formatId(id) : `${plugin.id}.${id}`,
                url,
                plugin
              };
              this.addToCache(url, sourceInfo);
              logger$9.info(`Detected source using manual check: ${sourceInfo.type}:${sourceInfo.id}`);
              return sourceInfo;
            }
          }
        }
      }
      logger$9.info(`No matching source found for URL: ${url}`);
      return null;
    } finally {
      this.removePendingUrlWithDelay(url);
    }
  }
  /**
   * Check if a URL is valid for paper detection
   * @param {string} url URL to check
   * @returns {boolean} True if URL is valid
   */
  isValidUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
      new URL(url);
      const commonDomains = [
        "arxiv.org",
        "semanticscholar.org",
        "doi.org",
        "dl.acm.org",
        "openreview.net",
        "s2-research.org"
      ];
      return commonDomains.some((domain) => url.includes(domain));
    } catch (e) {
      return false;
    }
  }
  /**
   * Check if URL is currently being processed
   * @param {string} url URL to check
   * @returns {boolean} True if URL is pending
   */
  isUrlPending(url) {
    return this.pendingUrls.has(url);
  }
  /**
   * Add URL to pending set
   * @param {string} url URL to add
   */
  addPendingUrl(url) {
    this.pendingUrls.add(url);
  }
  /**
   * Remove URL from pending set
   * @param {string} url URL to remove
   */
  removePendingUrl(url) {
    this.pendingUrls.delete(url);
    if (this.debounceTimers.has(url)) {
      clearTimeout(this.debounceTimers.get(url));
      this.debounceTimers.delete(url);
    }
  }
  /**
   * Remove URL from pending set after a delay
   * @param {string} url URL to remove
   * @param {number} delay Delay in ms (default: debounceTime)
   */
  removePendingUrlWithDelay(url, delay) {
    if (this.debounceTimers.has(url)) {
      clearTimeout(this.debounceTimers.get(url));
    }
    const timer = setTimeout(() => {
      this.pendingUrls.delete(url);
      this.debounceTimers.delete(url);
    }, delay || this.debounceTime);
    this.debounceTimers.set(url, timer);
  }
  /**
   * Add a successful detection to cache
   * @param {string} url URL 
   * @param {DetectedSourceInfo} info Detection info
   */
  addToCache(url, info) {
    if (!url) {
      logger$9.warning("Attempted to cache with empty URL");
      return;
    }
    if (this.detectionCache.size >= this.maxCacheSize) {
      const oldestKey = this.detectionCache.keys().next().value;
      if (oldestKey) {
        this.detectionCache.delete(oldestKey);
      }
    }
    this.detectionCache.set(url, info);
  }
  /**
   * Clear the detection cache
   */
  clearCache() {
    this.detectionCache.clear();
  }
  /**
   * Get information about extractor module for a plugin
   * @param id Plugin ID
   * @returns Extractor information or null
   */
  getExtractorInfoForPlugin(id) {
    const plugin = pluginRegistry.get(id);
    if (!plugin || !plugin.contentScript || !plugin.contentScript.extractorModulePath) {
      return null;
    }
    return {
      path: plugin.contentScript.extractorModulePath
    };
  }
  /**
   * Reset the service state
   * Used for testing and emergency recovery
   */
  reset() {
    this.pendingUrls.clear();
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
    this.clearCache();
    logger$9.info("URL Detection Service has been reset");
  }
  /**
   * Get service status information
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      pendingUrlsCount: this.pendingUrls.size,
      activeTimersCount: this.debounceTimers.size,
      cacheSize: this.detectionCache.size,
      pluginsInitialized: arePluginsInitialized(),
      pluginCount: pluginRegistry.getAll().length
    };
  }
}
const urlDetectionService = new URLDetectionService();
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

function formatPrimaryId(source, id) {
  const plugin = pluginRegistry.get(source);
  if (plugin && plugin.serviceWorker && plugin.serviceWorker.formatId) {
    return plugin.serviceWorker.formatId(id);
  }
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${source}.${safeId}`;
}

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
    if (sourceInfo.plugin.serviceWorker && sourceInfo.plugin.serviceWorker.fetchApiData) {
      try {
        logger$5.info(`Using ${sourceInfo.plugin.id} plugin API to extract metadata`);
        const apiData = await sourceInfo.plugin.serviceWorker.fetchApiData(sourceInfo.id);
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
  if (!sourceInfo || !sourceInfo.plugin || !sourceInfo.plugin.contentScript || !sourceInfo.plugin.contentScript.extractorModulePath) {
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
        const extractorModule = sourceInfo.plugin.contentScript.extractorModulePath;
        return {
          source: sourceInfo.type,
          sourceId: sourceInfo.id,
          primary_id: sourceInfo.primary_id,
          url: sourceInfo.url,
          title: `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`,
          _note: `Would load extractor from: ${extractorModule}`
        };
      } catch (parserError) {
        logger$5.error(`Error parsing HTML in service worker: ${parserError}`);
        return null;
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
        source: data.source || "unknown",
        sourceId: paperId.split(".")[1] || paperId,
        primary_id: paperId,
        url: ""
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
