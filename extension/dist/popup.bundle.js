async function getCurrentPaper() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getCurrentPaper" }, (response) => {
      console.log("Got paper data from background:", response);
      resolve(response);
    });
  });
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
function updateUI(paperData) {
  const titleElement = document.getElementById("paperTitle");
  const authorsElement = document.getElementById("paperAuthors");
  const statusElement = document.getElementById("status");
  const sourceElement = document.getElementById("paperSource");
  if (paperData) {
    titleElement.textContent = paperData.title || paperData.arxivId || paperData.sourceId || "Untitled Paper";
    authorsElement.textContent = paperData.authors || "";
    if (paperData.source) {
      sourceElement.textContent = getSourceLabel(paperData.source);
      sourceElement.classList.remove("hidden");
      sourceElement.className = "paper-source";
      sourceElement.classList.add(`source-${paperData.source}`);
    } else if (paperData.arxivId) {
      sourceElement.textContent = "arXiv";
      sourceElement.classList.remove("hidden");
      sourceElement.className = "paper-source source-arxiv";
    } else {
      sourceElement.classList.add("hidden");
    }
    statusElement.textContent = "Paper tracked! Data stored on GitHub.";
    document.getElementById("thumbsUp").disabled = false;
    document.getElementById("thumbsDown").disabled = false;
    if (paperData.rating === "thumbsup") {
      document.getElementById("thumbsUp").classList.add("active");
    } else if (paperData.rating === "thumbsdown") {
      document.getElementById("thumbsDown").classList.add("active");
    }
  } else {
    titleElement.textContent = "No academic paper detected";
    authorsElement.textContent = "";
    sourceElement.classList.add("hidden");
    statusElement.textContent = "Visit a supported academic paper to track it";
    document.getElementById("thumbsUp").disabled = true;
    document.getElementById("thumbsDown").disabled = true;
  }
}
function isPaperUrl(url) {
  return url.includes("arxiv.org/") || url.includes("semanticscholar.org/paper/") || url.includes("doi.org/") || url.includes("dl.acm.org/doi/") || url.includes("openreview.net/forum");
}
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Popup opened");
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  console.log("Current tab:", tab.url);
  if (isPaperUrl(tab.url)) {
    console.log("On academic paper page, getting paper data...");
    let retries = 3;
    let paperData = null;
    while (retries > 0 && !paperData) {
      paperData = await getCurrentPaper();
      if (!paperData) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        retries--;
      }
    }
    updateUI(paperData);
    document.getElementById("thumbsUp").addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "updateRating",
        rating: "thumbsup"
      }, (response) => {
        if (response && response.success) {
          document.getElementById("status").textContent = "Rating updated to: thumbs up";
          document.getElementById("thumbsUp").classList.add("active");
          document.getElementById("thumbsDown").classList.remove("active");
          setTimeout(() => self.close(), 1500);
        } else if (response && response.error) {
          document.getElementById("status").textContent = `Error: ${response.error}`;
        }
      });
    });
    document.getElementById("thumbsDown").addEventListener("click", () => {
      chrome.runtime.sendMessage({
        type: "updateRating",
        rating: "thumbsdown"
      }, (response) => {
        if (response && response.success) {
          document.getElementById("status").textContent = "Rating updated to: thumbs down";
          document.getElementById("thumbsUp").classList.remove("active");
          document.getElementById("thumbsDown").classList.add("active");
          setTimeout(() => self.close(), 1500);
        } else if (response && response.error) {
          document.getElementById("status").textContent = `Error: ${response.error}`;
        }
      });
    });
  } else {
    updateUI(null);
  }
});
//# sourceMappingURL=popup.bundle.js.map
