import { l as loguru } from './assets/logger-Cyvnc9vo.js';

const logger$2 = loguru.getLogger("ContentMessageHandlers");
function initializeMessageHandlers() {
  logger$2.info("Initializing content script message handlers");
  chrome.runtime.onMessage.addListener(handleMessage);
  self.addEventListener("message", handleWindowMessage);
}
function handleMessage(message, sender, sendResponse) {
  logger$2.info("Content script received message:", message);
  switch (message.type) {
    case "extractPageMetadata":
      executeExtractor(message.extractorCode, self.location.href).then((metadata) => {
        sendResponse({
          success: true,
          metadata
        });
      }).catch((error) => {
        logger$2.error("Error executing extractor:", error);
        sendResponse({
          success: false,
          error: String(error)
        });
      });
      break;
    case "getPluginForUrl":
      sendResponse({ success: true });
      break;
    default:
      logger$2.info("Unhandled message type:", message.type);
      sendResponse({
        success: false,
        error: `Unhandled message type: ${message.type}`
      });
  }
  return true;
}
function handleWindowMessage(event) {
  if (event.source !== self) {
    return;
  }
  const message = event.data;
  if (typeof message !== "object" || message === null || message.target !== "paper_tracker_extension") {
    return;
  }
  logger$2.info("Content script received window message:", message);
  switch (message.action) {
    case "extractMetadata":
      chrome.runtime.sendMessage({
        type: "getExtractorForUrl",
        url: self.location.href
      }, async (response) => {
        if (response && response.success && response.extractorCode) {
          try {
            const metadata = await executeExtractor(response.extractorCode, self.location.href);
            self.postMessage({
              source: "paper_tracker_extension",
              response: "extractMetadata",
              success: true,
              metadata
            }, "*");
          } catch (error) {
            self.postMessage({
              source: "paper_tracker_extension",
              response: "extractMetadata",
              success: false,
              error: String(error)
            }, "*");
          }
        } else {
          self.postMessage({
            source: "paper_tracker_extension",
            response: "extractMetadata",
            success: false,
            error: response?.error || "No extractor available"
          }, "*");
        }
      });
      break;
    default:
      logger$2.info("Unhandled window message action:", message.action);
  }
}
async function executeExtractor(extractorCode, url) {
  try {
    const extractorFn = new Function("document", "url", `
      return (async function(document, url) {
        ${extractorCode}
      })(document, url);
    `);
    const metadata = await extractorFn(document, url);
    if (metadata) {
      logger$2.info(`Extracted metadata: ${metadata.title || "Untitled"}`);
      return metadata;
    } else {
      logger$2.warning("Extractor returned no metadata");
      return null;
    }
  } catch (error) {
    logger$2.error(`Error executing extractor: ${error}`);
    throw error;
  }
}
async function extractCurrentPageMetadata() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({
      type: "getExtractorForUrl",
      url: self.location.href
    }, async (response) => {
      if (!response || !response.success || !response.extractorCode) {
        return resolve(null);
      }
      try {
        const metadata = await executeExtractor(response.extractorCode, self.location.href);
        resolve(metadata);
      } catch (error) {
        reject(error);
      }
    });
  });
}
async function reportExtractedMetadata(metadata) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: "metadataExtracted",
      data: metadata
    }, (response) => {
      resolve(response && response.success);
    });
  });
}

const logger$1 = loguru.getLogger("PaperOverlay");
function setupPaperUIOverlay() {
  logger$1.info("Setting up paper UI overlay");
  setupLinkAnnotation();
  checkCurrentPageForPaper();
}
function setupLinkAnnotation() {
  processExistingLinks();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === "A" && node.href) {
            processLink(node);
          }
          node.querySelectorAll("a[href]").forEach((link) => {
            processLink(link);
          });
        }
      });
    });
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}
function processExistingLinks() {
  document.querySelectorAll("a[href]").forEach((link) => {
    processLink(link);
  });
}
function processLink(link) {
  if (link.classList.contains("paper-processed")) {
    return;
  }
  link.classList.add("paper-processed");
  self.paperTracker.isPaperUrl(link.href).then((isPaper) => {
    if (isPaper) {
      addPaperIndicator(link);
    }
  }).catch((error) => {
    logger$1.error(`Error checking if URL is paper: ${error}`);
  });
}
function addPaperIndicator(link) {
  const indicator = document.createElement("span");
  indicator.className = "paper-indicator";
  indicator.title = "Academic paper - Click to track";
  indicator.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    self.paperTracker.trackPaper(link.href);
    showTrackingFeedback(indicator);
  });
  link.parentNode?.insertBefore(indicator, link.nextSibling);
}
function showTrackingFeedback(element) {
  element.classList.add("tracked");
  const tooltip = document.createElement("div");
  tooltip.className = "paper-tooltip";
  tooltip.textContent = "Paper tracked!";
  const rect = element.getBoundingClientRect();
  tooltip.style.top = `${rect.top - 30}px`;
  tooltip.style.left = `${rect.left}px`;
  document.body.appendChild(tooltip);
  setTimeout(() => {
    tooltip.remove();
    element.classList.remove("tracked");
  }, 2e3);
}
function checkCurrentPageForPaper() {
  self.paperTracker.extractMetadata().then((metadata) => {
    if (metadata) {
      logger$1.info("Current page is a paper. Adding overlay UI");
      addPageOverlay(metadata);
    }
  }).catch((error) => {
    logger$1.error(`Error checking if current page is paper: ${error}`);
  });
}
function addPageOverlay(metadata) {
  const fab = document.createElement("div");
  fab.className = "paper-fab";
  fab.title = "Paper actions";
  const icon = document.createElement("span");
  icon.className = "paper-fab-icon";
  icon.textContent = "📝";
  fab.appendChild(icon);
  fab.addEventListener("click", () => {
    if (document.querySelector(".paper-action-popup")) {
      removeActionPopup();
    } else {
      showActionPopup(fab, metadata);
    }
  });
  document.body.appendChild(fab);
}
function showActionPopup(trigger, metadata) {
  const popup = document.createElement("div");
  popup.className = "paper-action-popup";
  popup.innerHTML = `
    <div class="paper-popup-header">
      <div class="paper-popup-title">${metadata.title || "Untitled Paper"}</div>
      <div class="paper-popup-source">${getSourceLabel$1(metadata.source)}</div>
    </div>
    <div class="paper-popup-authors">${metadata.authors || ""}</div>
    ${metadata.abstract ? `<div class="paper-popup-abstract">${metadata.abstract}</div>` : ""}
    <div class="paper-popup-actions">
      <button class="paper-action-button" data-action="rate-up">👍 Interesting</button>
      <button class="paper-action-button" data-action="rate-down">👎 Not interesting</button>
    </div>
    <textarea class="paper-notes" placeholder="Add notes..."></textarea>
    <button class="paper-save-button">Save</button>
  `;
  const rect = trigger.getBoundingClientRect();
  popup.style.bottom = `${self.innerHeight - rect.top + 10}px`;
  popup.style.right = `${self.innerWidth - rect.right + 10}px`;
  document.body.appendChild(popup);
  popup.querySelector(".paper-save-button")?.addEventListener("click", () => {
    const notes = popup.querySelector(".paper-notes").value;
    if (notes) {
      saveNotes(metadata, notes);
    }
    removeActionPopup();
  });
  popup.querySelectorAll(".paper-action-button").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "rate-up") {
        rateCurrentPaper("thumbsup");
      } else if (action === "rate-down") {
        rateCurrentPaper("thumbsdown");
      }
      popup.querySelectorAll(".paper-action-button").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
    });
  });
  document.addEventListener("click", outsideClickHandler);
}
function removeActionPopup() {
  document.querySelector(".paper-action-popup")?.remove();
  document.removeEventListener("click", outsideClickHandler);
}
function outsideClickHandler(e) {
  const popup = document.querySelector(".paper-action-popup");
  const fab = document.querySelector(".paper-fab");
  if (popup && fab && !popup.contains(e.target) && !fab.contains(e.target)) {
    removeActionPopup();
  }
}
function saveNotes(metadata, notes) {
  chrome.runtime.sendMessage({
    type: "updateAnnotation",
    annotationType: "notes",
    data: {
      paperId: metadata.primary_id,
      source: metadata.source,
      notes,
      title: metadata.title
    }
  }, (response) => {
    if (response && response.success) {
      showSaveSuccess();
    }
  });
}
function rateCurrentPaper(rating) {
  chrome.runtime.sendMessage({
    type: "updateRating",
    rating
  }, (response) => {
    if (response && response.success) {
      showSaveSuccess();
    }
  });
}
function showSaveSuccess() {
  const toast = document.createElement("div");
  toast.className = "paper-toast";
  toast.textContent = "Saved successfully!";
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3e3);
}
function getSourceLabel$1(source) {
  const labels = {
    "arxiv": "arXiv",
    "semanticscholar": "Semantic Scholar",
    "doi": "DOI",
    "acm": "ACM Digital Library",
    "openreview": "OpenReview"
  };
  return labels[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

const metadataCache = /* @__PURE__ */ new Map();
async function fetchPaperMetadata(source, id) {
  const cacheKey = `${source}:${id}`;
  if (metadataCache.has(cacheKey)) {
    return metadataCache.get(cacheKey);
  }
  try {
    const backgroundMetadata = await getMetadataFromBackground(source, id);
    if (backgroundMetadata) {
      metadataCache.set(cacheKey, backgroundMetadata);
      return backgroundMetadata;
    }
    let metadata;
    switch (source) {
      case "arxiv":
        metadata = await fetchArxivMetadata(id);
        break;
      case "semanticscholar":
        metadata = await fetchSemanticScholarMetadata(id);
        break;
      case "openreview":
        metadata = await fetchOpenReviewMetadata(id);
        break;
      default:
        metadata = {
          title: `${source.toUpperCase()} Paper: ${id}`,
          id,
          source
        };
    }
    metadataCache.set(cacheKey, metadata);
    return metadata;
  } catch (error) {
    console.error(`Error fetching metadata for ${source}:${id}:`, error);
    return {
      title: `${source.toUpperCase()} Paper: ${id}`,
      id,
      source
    };
  }
}
async function getMetadataFromBackground(source, id) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      type: "getPaperMetadata",
      source,
      id
    }, (response) => {
      if (response && response.title) {
        resolve(response);
      } else {
        resolve(null);
      }
    });
  });
}
async function fetchArxivMetadata(id) {
  try {
    const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`);
    }
    const text = await response.text();
    const titleMatch = text.match(/<title>(.*?)<\/title>/);
    const authorsMatch = text.match(/<author>(.*?)<\/author>/g);
    const summaryMatch = text.match(/<summary>(.*?)<\/summary>/s);
    const title = titleMatch ? titleMatch[1].trim() : `arXiv Paper: ${id}`;
    let authors = "";
    if (authorsMatch) {
      const authorNames = authorsMatch.map((authorTag) => {
        const nameMatch = authorTag.match(/<name>(.*?)<\/name>/);
        return nameMatch ? nameMatch[1].trim() : "";
      }).filter(Boolean);
      authors = authorNames.join(", ");
    }
    const abstract = summaryMatch ? summaryMatch[1].trim() : "";
    return {
      title,
      authors,
      abstract,
      id,
      source: "arxiv",
      url: `https://arxiv.org/abs/${id}`
    };
  } catch (error) {
    console.error("Error fetching arXiv metadata:", error);
    return {
      title: `arXiv Paper: ${id}`,
      id,
      source: "arxiv",
      url: `https://arxiv.org/abs/${id}`
    };
  }
}
async function fetchSemanticScholarMetadata(id) {
  try {
    const apiUrl = `https://api.semanticscholar.org/v1/paper/${id}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Semantic Scholar API error: ${response.status}`);
    }
    const data = await response.json();
    const authors = data.authors ? data.authors.map((author) => author.name).join(", ") : "";
    return {
      title: data.title || `Semantic Scholar Paper: ${id}`,
      authors,
      abstract: data.abstract || "",
      id,
      source: "semanticscholar",
      url: `https://www.semanticscholar.org/paper/${id}`,
      year: data.year,
      citationCount: data.citationCount
    };
  } catch (error) {
    console.error("Error fetching Semantic Scholar metadata:", error);
    return {
      title: `Semantic Scholar Paper: ${id}`,
      id,
      source: "semanticscholar",
      url: `https://www.semanticscholar.org/paper/${id}`
    };
  }
}
async function fetchOpenReviewMetadata(id) {
  try {
    const apiUrl = `https://api.openreview.net/notes?id=${id}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`OpenReview API error: ${response.status}`);
    }
    const data = await response.json();
    if (data.notes && data.notes.length > 0) {
      const note = data.notes[0];
      const content = note.content || {};
      const getContentValue = (field) => {
        if (!content[field]) return "";
        return typeof content[field] === "object" && "value" in content[field] ? content[field].value : content[field];
      };
      const title = getContentValue("title") || `OpenReview Paper: ${id}`;
      let authors = "";
      const authorsData = getContentValue("authors");
      if (Array.isArray(authorsData)) {
        authors = authorsData.join(", ");
      } else if (typeof authorsData === "string") {
        authors = authorsData;
      }
      const abstract = getContentValue("abstract") || "";
      return {
        title,
        authors,
        abstract,
        id,
        source: "openreview",
        url: `https://openreview.net/forum?id=${id}`,
        venue: getContentValue("venue") || note.venue,
        forum_id: note.forum
      };
    }
    return {
      title: `OpenReview Paper: ${id}`,
      id,
      source: "openreview",
      url: `https://openreview.net/forum?id=${id}`
    };
  } catch (error) {
    console.error("Error fetching OpenReview metadata:", error);
    return {
      title: `OpenReview Paper: ${id}`,
      id,
      source: "openreview",
      url: `https://openreview.net/forum?id=${id}`
    };
  }
}

function createPopupWrapper() {
  const wrapper = document.createElement("div");
  wrapper.className = "paper-popup-container";
  wrapper.style.position = "relative";
  return wrapper;
}
async function createPopup(source, id, initialTitle = "") {
  console.log(`Creating popup for ${source}:${id}`);
  const primary_id = formatPrimaryId(source, id);
  const metadata = await fetchPaperMetadata(source, id);
  console.log("Fetched metadata:", metadata);
  const popup = document.createElement("div");
  popup.className = "paper-popup";
  Object.assign(popup.style, {
    position: "absolute",
    zIndex: "10000",
    background: "white",
    border: "1px solid #ccc",
    borderRadius: "4px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
    padding: "12px",
    width: "300px",
    maxWidth: "90vw",
    fontSize: "14px",
    fontFamily: "system-ui, sans-serif"
  });
  popup.innerHTML = `
    <div class="paper-popup-source source-${source}" style="
      display: inline-block;
      font-size: 11px;
      border-radius: 4px;
      padding: 2px 6px;
      margin-bottom: 10px;
      color: white;
      font-weight: 500;
      background-color: ${getSourceColor(source)};
    ">${getSourceLabel(source)}</div>
    <div class="paper-popup-header" style="
      font-weight: bold;
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.4;
    ">${metadata?.title || initialTitle || id}</div>
    <div class="paper-popup-meta" style="
      font-size: 12px;
      color: #666;
      margin-bottom: 12px;
      line-height: 1.4;
    ">${metadata?.authors || ""}</div>
    <div class="paper-popup-buttons" style="
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    ">
      <button class="vote-button" data-vote="thumbsup" style="
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f5f5f5;
        cursor: pointer;
      ">👍 Interesting</button>
      <button class="vote-button" data-vote="thumbsdown" style="
        flex: 1;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: #f5f5f5;
        cursor: pointer;
      ">👎 Not Relevant</button>
    </div>
    <textarea placeholder="Add notes..." style="
      width: 100%;
      min-height: 80px;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      box-sizing: border-box;
      font-family: inherit;
      font-size: 13px;
      margin-bottom: 10px;
      resize: vertical;
    "></textarea>
    <div class="paper-popup-actions" style="
      display: flex;
      justify-content: flex-end;
    ">
      <button class="save-button" style="
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        background: #0366d6;
        color: white;
        cursor: pointer;
        font-weight: 500;
      ">Save</button>
    </div>
  `;
  popup.querySelectorAll(".vote-button").forEach((button) => {
    button.addEventListener("click", () => {
      popup.querySelectorAll(".vote-button").forEach((b) => {
        b.style.background = "#f5f5f5";
        b.style.borderColor = "#ddd";
        b.classList.remove("active");
      });
      button.classList.add("active");
      button.style.background = "#e0f7fa";
      button.style.borderColor = "#4dd0e1";
    });
  });
  const saveButton = popup.querySelector(".save-button");
  if (saveButton) {
    saveButton.addEventListener("click", () => {
      const vote = popup.querySelector(".vote-button.active")?.getAttribute("data-vote");
      const notes = popup.querySelector("textarea").value;
      if (vote || notes) {
        chrome.runtime.sendMessage({
          type: "updateAnnotation",
          annotationType: notes ? "notes" : "vote",
          data: {
            paperId: primary_id,
            // Use the formatted primary ID
            source,
            vote,
            notes,
            title: metadata?.title,
            authors: metadata?.authors,
            abstract: metadata?.abstract,
            timestamp: (/* @__PURE__ */ new Date()).toISOString()
          }
        }, (response) => {
          console.log("Annotation saved:", response);
          const feedbackEl = document.createElement("div");
          feedbackEl.textContent = "Saved successfully!";
          feedbackEl.style.color = "#4CAF50";
          feedbackEl.style.padding = "8px";
          feedbackEl.style.textAlign = "center";
          feedbackEl.style.fontWeight = "bold";
          const actionsContainer = popup.querySelector(".paper-popup-actions");
          if (actionsContainer) {
            actionsContainer.parentElement.insertBefore(feedbackEl, actionsContainer);
          }
          setTimeout(() => {
            popup.parentElement?.remove();
          }, 1500);
        });
      }
    });
  }
  Object.defineProperties(popup, {
    paperSource: {
      value: source,
      writable: true,
      enumerable: true
    },
    paperId: {
      value: id,
      writable: true,
      enumerable: true
    },
    primary_id: {
      value: primary_id,
      writable: true,
      enumerable: true
    }
  });
  return popup;
}
function getSourceColor(source) {
  const colors = {
    "arxiv": "#B31B1B",
    "semanticscholar": "#2e7d32",
    "doi": "#0277bd",
    "acm": "#0277bd",
    "openreview": "#6d4c41"
  };
  return colors[source] || "#666666";
}

let activePopup = null;
function formatPrimaryId(source, id) {
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${source}.${safeId}`;
}
function getSourceLabel(source) {
  const labels = {
    "arxiv": "arXiv",
    "semanticscholar": "Semantic Scholar",
    "doi": "DOI",
    "acm": "ACM Digital Library",
    "openreview": "OpenReview"
  };
  return labels[source] || source.charAt(0).toUpperCase() + source.slice(1);
}
const PAPER_SOURCES = [
  {
    type: "arxiv",
    urlPatterns: [
      /arxiv\.org\/abs\/([0-9.]+)(v[0-9]+)?/,
      /arxiv\.org\/pdf\/([0-9.]+)(v[0-9]+)?\.pdf/
    ],
    getIdFromMatch: (match) => match[1] + (match[2] || "")
  },
  {
    type: "semanticscholar",
    urlPatterns: [
      /semanticscholar\.org\/paper\/([a-f0-9]+)/,
      /s2-research\.org\/papers\/([a-f0-9]+)/
    ],
    getIdFromMatch: (match) => match[1]
  },
  {
    type: "doi",
    urlPatterns: [
      /doi\.org\/(10\.[0-9.]+\/[^\s&\/?#]+[^\s&\/?#.:])/
    ],
    getIdFromMatch: (match) => match[1]
  },
  {
    type: "acm",
    urlPatterns: [
      /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[^\s&\/?#]+[^\s&\/?#.:])/
    ],
    getIdFromMatch: (match) => match[1]
  },
  {
    type: "openreview",
    urlPatterns: [
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/,
      /openreview\.net\/pdf\?id=([a-zA-Z0-9_\-]+)/
    ],
    getIdFromMatch: (match) => match[1]
  }
];
function detectPaperSource(url) {
  for (const source of PAPER_SOURCES) {
    for (let i = 0; i < source.urlPatterns.length; i++) {
      const match = url.match(source.urlPatterns[i]);
      if (match) {
        const id = source.getIdFromMatch(match);
        const primary_id = formatPrimaryId(source.type, id);
        return {
          type: source.type,
          id,
          primary_id,
          // Include primary_id to match common.ts SourceInfo
          url
        };
      }
    }
  }
  return null;
}
async function processPaperLink(link) {
  if (link.classList.contains("paper-processed")) return;
  link.classList.add("paper-processed");
  const sourceInfo = detectPaperSource(link.href);
  if (!sourceInfo) return;
  const { type: source, id } = sourceInfo;
  const annotator = document.createElement("span");
  annotator.className = `paper-annotator annotator-${source}`;
  annotator.title = `Add ${getSourceLabel(source)} annotation`;
  annotator.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (activePopup) {
      activePopup.parentElement?.remove();
      if (
        // Access properties directly - they're properly defined 
        // on the HTMLElement with Object.defineProperties
        activePopup.hasOwnProperty("paperSource") && activePopup.hasOwnProperty("paperId") && activePopup.paperSource === source && activePopup.paperId === id
      ) {
        activePopup = null;
        return;
      }
    }
    const popup = await createPopup(source, id);
    const wrapper = createPopupWrapper();
    wrapper.appendChild(popup);
    const annotatorRect = annotator.getBoundingClientRect();
    const available_width = self.innerWidth - annotatorRect.left;
    if (available_width < 320) {
      popup.style.right = "0";
      popup.style.left = "auto";
    } else {
      popup.style.left = "0";
    }
    popup.style.top = `${annotatorRect.height + 5}px`;
    annotator.parentNode.insertBefore(wrapper, annotator.nextSibling);
    activePopup = popup;
  });
  link.parentNode.insertBefore(annotator, link.nextSibling);
}

const logger = loguru.getLogger("ContentScript");
function initialize() {
  logger.info("Academic Paper Tracker content script initialized");
  initializeMessageHandlers();
  setupPaperUIOverlay();
  analyzeCurrentPage();
  exposeGlobalFunctions();
}
async function analyzeCurrentPage() {
  try {
    logger.info(`Analyzing current page: ${self.location.href}`);
    const metadata = await extractCurrentPageMetadata();
    if (metadata) {
      logger.info(`Extracted metadata: ${metadata.title || "Untitled"}`);
      const success = await reportExtractedMetadata(metadata);
      if (success) {
        logger.info("Successfully processed paper metadata");
      } else {
        logger.warning("Failed to process paper metadata");
      }
    } else {
      logger.info("Current page is not a recognized paper or metadata extraction failed");
    }
  } catch (error) {
    logger.error(`Error analyzing current page: ${error}`);
  }
}
function exposeGlobalFunctions() {
  const paperTracker = {
    // Import functions directly from their modules
    detectPaperSource,
    fetchPaperMetadata,
    processPaperLink,
    // Extract metadata from the current page
    extractMetadata: async () => {
      try {
        const metadata = await extractCurrentPageMetadata();
        return metadata;
      } catch (error) {
        logger.error(`Error extracting metadata: ${error}`);
        return null;
      }
    },
    // Track a paper URL
    trackPaper: (url) => {
      chrome.runtime.sendMessage({
        type: "trackPaper",
        url
      }, (response) => {
        if (response && response.success) {
          logger.info(`Paper tracked: ${response.paperData?.title || url}`);
        } else {
          logger.warning(`Failed to track paper: ${response?.error || "Unknown error"}`);
        }
      });
    },
    // Check if a URL is a supported paper source
    isPaperUrl: async (url) => {
      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: "detectPaperSource",
          url
        }, (response) => {
          resolve(response && response.success && response.detected);
        });
      });
    }
  };
  self.paperTracker = paperTracker;
  self.trackPaper = paperTracker.trackPaper;
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initialize);
} else {
  initialize();
}
//# sourceMappingURL=content.bundle.js.map
