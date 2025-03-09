function detectPaperSource(url) {
  for (const source of PAPER_SOURCES) {
    for (let i = 0; i < source.urlPatterns.length; i++) {
      const match = url.match(source.urlPatterns[i]);
      if (match) {
        const id = source.getIdFromMatch(match);
        return {
          type: source.type,
          id,
          url
        };
      }
    }
  }
  return null;
}
function formatPrimaryId(source, id) {
  const safeId = id.replace(/\//g, "_").replace(/:/g, ".").replace(/\s/g, "_").replace(/\\/g, "_");
  return `${source}.${safeId}`;
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
async function createPopup(source, id, initialTitle = "") {
  console.log(`Creating popup for ${source}:${id}`);
  const primary_id = formatPrimaryId(source, id);
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
        popup.remove();
        activePopup = null;
      });
    }
  });
  popup.paperSource = source;
  popup.paperId = id;
  popup.primary_id = primary_id;
  return popup;
}
function trackPaper(url) {
  const sourceInfo = detectPaperSource(url);
  if (!sourceInfo) {
    console.log("Not a recognized paper URL:", url);
    return;
  }
  const title = document.title || `${sourceInfo.type.toUpperCase()} Paper: ${sourceInfo.id}`;
  chrome.runtime.sendMessage({
    type: "trackPaper",
    source: sourceInfo.type,
    id: sourceInfo.id,
    url,
    title
  }, (response) => {
    console.log("Paper tracking result:", response);
  });
}
self.paperTracker = {
  detectPaperSource,
  fetchPaperMetadata,
  processPaperLink,
  trackPaper
};
self.trackPaper = trackPaper;
//# sourceMappingURL=content.bundle.js.map
