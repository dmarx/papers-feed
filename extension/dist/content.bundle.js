console.log("Academic Paper Tracker content script loaded");
const STYLES = `
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

.paper-popup {
    position: absolute;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    width: 300px;
    z-index: 10000;
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

.paper-popup-source {
    display: inline-block;
    font-size: 11px;
    border-radius: 4px;
    padding: 2px 6px;
    margin-bottom: 10px;
    color: white;
    font-weight: 500;
}

.source-arxiv {
    background-color: #B31B1B;
}

.source-doi, .source-acm {
    background-color: #0277bd;
}

.source-semanticscholar {
    background-color: #2e7d32;
}

.source-openreview {
    background-color: #6d4c41;
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

/* Loading state */
.paper-popup-header:empty::after,
.paper-popup-header:contains('Loading...') {
    content: '';
    display: inline-block;
    width: 12px;
    height: 12px;
    border: 2px solid #ddd;
    border-top-color: #666;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to { transform: rotate(360deg); }
}

/* Source-specific annotator icons */
.annotator-arxiv::after {
    content: '📝';
}

.annotator-doi::after, .annotator-acm::after {
    content: '🔍';
}

.annotator-semanticscholar::after {
    content: '📊';
}

.annotator-openreview::after {
    content: '📋';
}

.annotator-generic::after {
    content: '📄';
}
`;
const styleSheet = document.createElement("style");
styleSheet.textContent = STYLES;
document.head.appendChild(styleSheet);
let activePopup = null;
document.addEventListener("click", (e) => {
  if (activePopup && !activePopup.contains(e.target) && !e.target.classList.contains("paper-annotator")) {
    activePopup.parentElement?.remove();
    activePopup = null;
  }
});
const metadataCache = /* @__PURE__ */ new Map();
const PAPER_SOURCES = [
  {
    type: "arxiv",
    urlPatterns: [
      /arxiv\.org\/abs\/([0-9.]+)/,
      /arxiv\.org\/pdf\/([0-9.]+)\.pdf/,
      /arxiv\.org\/\w+\/([0-9.]+)/
    ],
    getIdFromMatch: (match) => match[1]
  },
  {
    type: "doi",
    urlPatterns: [
      /doi\.org\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    getIdFromMatch: (match) => match[1]
  },
  {
    type: "acm",
    urlPatterns: [
      /dl\.acm\.org\/doi\/(10\.[0-9.]+\/[a-zA-Z0-9._\-/:()\[\]]+)/
    ],
    getIdFromMatch: (match) => match[1]
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
    type: "openreview",
    urlPatterns: [
      /openreview\.net\/forum\?id=([a-zA-Z0-9_\-]+)/
    ],
    getIdFromMatch: (match) => match[1]
  }
];
function detectPaperSource(url) {
  for (const source of PAPER_SOURCES) {
    for (let i = 0; i < source.urlPatterns.length; i++) {
      const match = url.match(source.urlPatterns[i]);
      if (match) {
        return {
          type: source.type,
          id: source.getIdFromMatch(match),
          url
        };
      }
    }
  }
  return null;
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
async function parseXMLResponse(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");
  const entry = xmlDoc.querySelector("entry");
  if (!entry) return null;
  return {
    title: entry.querySelector("title")?.textContent?.trim(),
    authors: Array.from(entry.querySelectorAll("author name")).map((name) => name.textContent.trim()).join(", "),
    abstract: entry.querySelector("summary")?.textContent?.trim(),
    published: entry.querySelector("published")?.textContent?.trim()
  };
}
async function fetchPaperMetadata(source, id) {
  console.log(`Starting metadata fetch for ${source}:${id}`);
  const cacheKey = `${source}:${id}`;
  if (metadataCache.has(cacheKey)) {
    console.log("Found in cache:", cacheKey);
    return metadataCache.get(cacheKey);
  }
  try {
    let metadata = null;
    if (source === "arxiv") {
      const apiUrl = `https://export.arxiv.org/api/query?id_list=${id}`;
      console.log("API URL:", apiUrl);
      const response = await fetch(apiUrl);
      console.log("API response status:", response.status);
      if (response.ok) {
        const text = await response.text();
        metadata = await parseXMLResponse(text);
      }
    } else {
      metadata = {
        title: document.querySelector('meta[name="citation_title"]')?.content || document.querySelector('meta[property="og:title"]')?.content,
        authors: document.querySelector('meta[name="citation_authors"]')?.content || document.querySelector('meta[name="author"]')?.content,
        abstract: document.querySelector('meta[name="description"]')?.content || document.querySelector('meta[property="og:description"]')?.content,
        published: document.querySelector('meta[name="citation_publication_date"]')?.content
      };
      if (!metadata.title) {
        metadata.title = `${getSourceLabel(source)} Paper: ${id}`;
      }
    }
    if (metadata) {
      console.log("Fetched metadata:", metadata);
      metadataCache.set(cacheKey, metadata);
      return metadata;
    }
  } catch (error) {
    console.error("Error fetching metadata:", error);
  }
  const defaultMetadata = {
    title: `${getSourceLabel(source)} Paper: ${id}`,
    authors: "",
    abstract: "",
    published: ""
  };
  metadataCache.set(cacheKey, defaultMetadata);
  return defaultMetadata;
}
async function createPopup(source, id, initialTitle = "") {
  console.log(`Creating popup for ${source}:${id}`);
  const metadata = await fetchPaperMetadata(source, id);
  console.log("Fetched metadata:", metadata);
  const popup = document.createElement("div");
  popup.className = "paper-popup";
  popup.innerHTML = `
        <div class="paper-popup-source source-${source}">${getSourceLabel(source)}</div>
        <div class="paper-popup-header">${metadata?.title || initialTitle || id}</div>
        <div class="paper-popup-meta">${metadata?.authors || ""}</div>
        <div class="paper-popup-buttons">
            <button class="vote-button" data-vote="thumbsup">👍 Interesting</button>
            <button class="vote-button" data-vote="thumbsdown">👎 Not Relevant</button>
        </div>
        <textarea placeholder="Add notes..."></textarea>
        <div class="paper-popup-actions">
            <button class="save-button">Save</button>
        </div>
    `;
  popup.querySelectorAll(".vote-button").forEach((button) => {
    button.addEventListener("click", () => {
      popup.querySelectorAll(".vote-button").forEach((b) => b.classList.remove("active"));
      button.classList.add("active");
    });
  });
  popup.querySelector(".save-button").addEventListener("click", () => {
    const vote = popup.querySelector(".vote-button.active")?.dataset.vote;
    const notes = popup.querySelector("textarea").value;
    if (vote || notes) {
      chrome.runtime.sendMessage({
        type: "updateAnnotation",
        annotationType: notes ? "notes" : "vote",
        data: {
          paperId: id,
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
        popup.remove();
        activePopup = null;
      });
    }
  });
  popup.paperSource = source;
  popup.paperId = id;
  return popup;
}
function createPopupWrapper() {
  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.zIndex = "10000";
  return wrapper;
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
      if (activePopup.paperSource === source && activePopup.paperId === id) {
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
function processInitialLinks() {
  document.querySelectorAll('a[href*="arxiv.org"]').forEach(processPaperLink);
  document.querySelectorAll('a[href*="doi.org"]').forEach(processPaperLink);
  document.querySelectorAll('a[href*="dl.acm.org/doi"]').forEach(processPaperLink);
  document.querySelectorAll('a[href*="semanticscholar.org/paper"]').forEach(processPaperLink);
  document.querySelectorAll('a[href*="openreview.net/forum"]').forEach(processPaperLink);
}
processInitialLinks();
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "A") {
          processPaperLink(node);
        } else {
          node.querySelectorAll('a[href*="arxiv.org"]').forEach(processPaperLink);
          node.querySelectorAll('a[href*="doi.org"]').forEach(processPaperLink);
          node.querySelectorAll('a[href*="dl.acm.org/doi"]').forEach(processPaperLink);
          node.querySelectorAll('a[href*="semanticscholar.org/paper"]').forEach(processPaperLink);
          node.querySelectorAll('a[href*="openreview.net/forum"]').forEach(processPaperLink);
        }
      }
    });
  });
});
function processOpenReviewLinks() {
  document.querySelectorAll('a[href*="openreview.net/forum"], a[href*="openreview.net/pdf"]').forEach((link) => {
    if (link.classList.contains("paper-processed")) return;
    link.classList.add("paper-processed");
    const match = link.href.match(/id=([a-zA-Z0-9_\-]+)/);
    if (!match) return;
    const paperId = match[1];
    const annotator = document.createElement("span");
    annotator.className = "paper-annotator annotator-openreview";
    annotator.title = "Track this OpenReview paper";
    annotator.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (activePopup && activePopup.paperId === paperId) {
        activePopup.parentElement?.remove();
        activePopup = null;
        return;
      }
      if (activePopup) {
        activePopup.parentElement?.remove();
      }
      const popup = await createPopup("openreview", paperId, link.textContent?.trim());
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
  });
}
function addOpenReviewToInitialProcessing() {
  const originalProcessInitialLinks = processInitialLinks;
  processInitialLinks = function() {
    originalProcessInitialLinks();
    processOpenReviewLinks();
  };
  processOpenReviewLinks();
}
addOpenReviewToInitialProcessing();
observer.observe(document.body, {
  childList: true,
  subtree: true
});
self.paperTracker = {
  detectPaperSource,
  fetchPaperMetadata,
  processPaperLink
};
//# sourceMappingURL=content.bundle.js.map
