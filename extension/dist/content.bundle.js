import { l as loguru, a as arxivIntegration } from './assets/index-CeCyCSyP.js';

const logger$1 = loguru.getLogger("link-processor");
class LinkProcessor {
  constructor(onLinkFound) {
    this.patterns = [];
    this.observer = null;
    this.processedLinks = /* @__PURE__ */ new Set();
    this.onLinkFound = onLinkFound;
    logger$1.debug("Link processor initialized");
  }
  /**
   * Register a new link pattern
   */
  registerPattern(pattern) {
    this.patterns.push(pattern);
    logger$1.debug(`Registered pattern for ${pattern.sourceId}`);
  }
  /**
   * Process all links in the document
   */
  processLinks(document2) {
    const links = document2.querySelectorAll("a[href]");
    links.forEach((link) => {
      const linkId = this.getLinkId(link);
      if (this.processedLinks.has(linkId)) {
        return;
      }
      this.processedLinks.add(linkId);
      for (const pattern of this.patterns) {
        if (pattern.pattern.test(link.href)) {
          const paperId = pattern.extractPaperId(link.href);
          if (paperId) {
            this.onLinkFound(pattern.sourceId, paperId, link);
            break;
          }
        }
      }
    });
  }
  /**
   * Start observing for DOM changes
   */
  startObserving(document2) {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.observer = new MutationObserver((mutations) => {
      let newLinks = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === "A") {
              newLinks = true;
            }
            const links = node.querySelectorAll("a[href]");
            if (links.length > 0) {
              newLinks = true;
            }
          }
        });
      });
      if (newLinks) {
        this.processLinks(document2);
      }
    });
    this.observer.observe(document2.body, {
      childList: true,
      subtree: true
    });
    logger$1.debug("Started observing for DOM changes");
  }
  /**
   * Create a unique ID for a link
   */
  getLinkId(link) {
    const path = this.getElementPath(link);
    return `${link.href}|${path}`;
  }
  /**
   * Get element path in DOM for identification
   */
  getElementPath(element) {
    const path = [];
    let current = element;
    while (current && current !== document.body) {
      let selector = current.tagName.toLowerCase();
      if (current.id) {
        selector += `#${current.id}`;
      } else {
        const siblings = Array.from(current.parentElement?.children || []);
        const index = siblings.indexOf(current) + 1;
        if (siblings.length > 1) {
          selector += `:nth-child(${index})`;
        }
      }
      path.unshift(selector);
      current = current.parentElement;
    }
    return path.join(" > ");
  }
  /**
   * Stop observing DOM changes
   */
  stopObserving() {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
      logger$1.debug("Stopped observing DOM changes");
    }
  }
}

const logger = loguru.getLogger("content-script");
logger.info("Paper Tracker content script loaded");
const sourceIntegrations = [
  arxivIntegration
  // Add more sources as they become available
];
let activePopup = null;
const linkProcessor = new LinkProcessor((sourceId, paperId, link) => {
  injectAnnotationButton(link, sourceId, paperId);
});
function initializeSources() {
  for (const source of sourceIntegrations) {
    logger.debug(`Initializing source: ${source.id}`);
    source.urlPatterns.forEach((pattern) => {
      linkProcessor.registerPattern({
        sourceId: source.id,
        pattern,
        extractPaperId: (url) => source.extractPaperId(url)
      });
    });
  }
}
function injectStyles() {
  if (document.getElementById("paper-tracker-styles")) {
    return;
  }
  const styles = `
  .paper-annotator {
    display: inline-block;
    margin-left: 4px;
    cursor: pointer;
    font-size: 0.9em;
    opacity: 0.7;
    transition: opacity 0.2s;
    vertical-align: baseline;
  }

  .paper-annotator:hover {
    opacity: 1;
  }

  .paper-popup-wrapper {
    position: fixed;
    z-index: 10000;
  }

  .paper-popup {
    position: relative;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 300px;
    box-sizing: border-box;
  }

  .paper-popup-header {
    font-weight: bold;
    margin-bottom: 8px;
    line-height: 1.4;
    font-size: 1em;
  }

  .paper-popup-meta {
    color: #666;
    font-size: 0.85em;
    margin-bottom: 12px;
    line-height: 1.4;
  }

  .paper-popup-buttons {
    display: flex;
    gap: 8px;
    margin: 8px 0;
  }

  .paper-popup button {
    padding: 6px 12px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: #f5f5f5;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.9em;
  }

  .paper-popup button:hover {
    background: #e8e8e8;
    border-color: #ccc;
  }

  .paper-popup button.active {
    background: #e0e0e0;
    border-color: #aaa;
  }

  .paper-popup textarea {
    width: calc(100% - 16px);
    min-height: 80px;
    margin: 8px 0;
    padding: 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    resize: vertical;
    font-family: inherit;
    font-size: 0.9em;
    line-height: 1.4;
    box-sizing: border-box;
  }

  .paper-popup textarea:focus {
    outline: none;
    border-color: #aaa;
  }

  .paper-popup-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 12px;
  }

  .paper-popup .save-button {
    background: #2563eb;
    color: white;
    border-color: #2563eb;
  }

  .paper-popup .save-button:hover {
    background: #1d4ed8;
    border-color: #1d4ed8;
  }
  `;
  const styleSheet = document.createElement("style");
  styleSheet.id = "paper-tracker-styles";
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
  logger.debug("Injected styles");
}
function injectAnnotationButton(link, sourceId, paperId) {
  if (link.nextSibling && link.nextSibling.nodeType === Node.ELEMENT_NODE && link.nextSibling.classList.contains("paper-annotator")) {
    return;
  }
  const annotator = document.createElement("span");
  annotator.className = "paper-annotator";
  annotator.textContent = "📝";
  annotator.title = "Add annotation";
  annotator.dataset.sourceId = sourceId;
  annotator.dataset.paperId = paperId;
  annotator.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    chrome.runtime.sendMessage({
      type: "showAnnotationPopup",
      sourceId,
      paperId,
      position: {
        x: e.clientX,
        y: e.clientY
      }
    });
  });
  link.parentNode?.insertBefore(annotator, link.nextSibling);
}
function extractPaperId(url) {
  for (const source of sourceIntegrations) {
    if (source.canHandleUrl(url)) {
      const paperId = source.extractPaperId(url);
      if (paperId) {
        return { sourceId: source.id, paperId };
      }
    }
  }
  return null;
}
document.addEventListener("click", (e) => {
  if (activePopup && !activePopup.contains(e.target) && !e.target.classList.contains("paper-annotator")) {
    activePopup.parentElement?.remove();
    activePopup = null;
  }
});
async function processCurrentPage() {
  const url = window.location.href;
  const paperInfo = extractPaperId(url);
  if (paperInfo) {
    logger.info(`Detected paper: ${paperInfo.sourceId}:${paperInfo.paperId}`);
    const { sourceId, paperId } = paperInfo;
    const source = sourceIntegrations.find((s) => s.id === sourceId);
    if (source) {
      try {
        const metadata = await source.extractMetadata(document, paperId);
        if (metadata) {
          chrome.runtime.sendMessage({
            type: "paperMetadata",
            metadata
          });
          logger.debug(`Sent metadata to background script for ${sourceId}:${paperId}`);
        }
      } catch (error) {
        logger.error(`Error extracting metadata for ${sourceId}:${paperId}`, error);
      }
    }
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  logger.debug("Received message", message);
  if (message.type === "showPopup") {
    if (activePopup) {
      activePopup.parentElement?.remove();
      activePopup = null;
    }
    const wrapper = document.createElement("div");
    wrapper.className = "paper-popup-wrapper";
    if (message.position) {
      wrapper.style.left = `${message.position.x}px`;
      wrapper.style.top = `${message.position.y}px`;
    }
    const popup = document.createElement("div");
    popup.className = "paper-popup";
    popup.innerHTML = message.html;
    wrapper.appendChild(popup);
    document.body.appendChild(wrapper);
    if (message.handlers) {
      for (const handler of message.handlers) {
        const elements = popup.querySelectorAll(handler.selector);
        elements.forEach((element) => {
          element.addEventListener(handler.event, () => {
            chrome.runtime.sendMessage({
              type: "popupAction",
              action: handler.action,
              sourceId: message.sourceId,
              paperId: message.paperId,
              data: {
                value: element.tagName === "TEXTAREA" ? element.value : element.getAttribute("data-vote"),
                checked: element.tagName === "INPUT" ? element.checked : void 0,
                id: element.id
              }
            });
          });
        });
      }
    }
    activePopup = popup;
    sendResponse({ success: true });
    return true;
  }
  if (message.type === "processPage") {
    linkProcessor.processLinks(document);
    processCurrentPage();
    sendResponse({ success: true });
    return true;
  }
});
(async function initialize() {
  injectStyles();
  initializeSources();
  linkProcessor.processLinks(document);
  linkProcessor.startObserving(document);
  processCurrentPage();
  chrome.runtime.sendMessage(
    {
      type: "contentScriptReady",
      url: window.location.href
    },
    (response) => {
      if (response?.success) {
        logger.debug("Background script acknowledged ready status");
      }
    }
  );
})();
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    processCurrentPage();
  }
}).observe(document, { subtree: true, childList: true });
//# sourceMappingURL=content.bundle.js.map
