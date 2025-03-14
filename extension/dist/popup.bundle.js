import { l as loguru } from './assets/logger-CPjPFdcb.js';

const logger = loguru.getLogger("popup");
async function getCurrentPaper() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "getCurrentPaper" }, (response) => {
      logger.debug("Got paper data from background:", response);
      resolve(response);
    });
  });
}
function updateUI(paperData) {
  const titleElement = document.getElementById("paperTitle");
  const authorsElement = document.getElementById("paperAuthors");
  const statusElement = document.getElementById("status");
  if (!titleElement || !authorsElement || !statusElement) {
    logger.error("Unable to find UI elements");
    return;
  }
  if (paperData) {
    titleElement.textContent = paperData.title || paperData.paperId;
    authorsElement.textContent = paperData.authors || "";
    statusElement.textContent = "Paper tracked! Stored in GitHub.";
    const thumbsUpButton = document.getElementById("thumbsUp");
    const thumbsDownButton = document.getElementById("thumbsDown");
    if (thumbsUpButton) thumbsUpButton.disabled = false;
    if (thumbsDownButton) thumbsDownButton.disabled = false;
    if (paperData.rating === "thumbsup" && thumbsUpButton) {
      thumbsUpButton.classList.add("active");
    } else if (paperData.rating === "thumbsdown" && thumbsDownButton) {
      thumbsDownButton.classList.add("active");
    }
  } else {
    titleElement.textContent = "No paper detected";
    authorsElement.textContent = "";
    statusElement.textContent = "Visit a paper to track it";
    const thumbsUpButton = document.getElementById("thumbsUp");
    const thumbsDownButton = document.getElementById("thumbsDown");
    if (thumbsUpButton) thumbsUpButton.disabled = true;
    if (thumbsDownButton) thumbsDownButton.disabled = true;
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  logger.info("Popup opened");
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  logger.debug("Current tab:", tab.url);
  const isPaperUrl = tab.url && /arxiv\.org|example\.com/.test(tab.url);
  if (isPaperUrl) {
    logger.debug("On supported paper site, getting paper data...");
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
    const thumbsUpButton = document.getElementById("thumbsUp");
    if (thumbsUpButton) {
      thumbsUpButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({
          type: "popupAction",
          action: "rate",
          sourceId: paperData?.sourceId,
          paperId: paperData?.paperId,
          data: { value: "thumbsup" }
        }, (response) => {
          if (response && response.success) {
            const statusElement = document.getElementById("status");
            if (statusElement) {
              statusElement.textContent = "Rating updated to: thumbs up";
              setTimeout(() => window.close(), 1500);
            }
          }
        });
      });
    }
    const thumbsDownButton = document.getElementById("thumbsDown");
    if (thumbsDownButton) {
      thumbsDownButton.addEventListener("click", () => {
        chrome.runtime.sendMessage({
          type: "popupAction",
          action: "rate",
          sourceId: paperData?.sourceId,
          paperId: paperData?.paperId,
          data: { value: "thumbsdown" }
        }, (response) => {
          if (response && response.success) {
            const statusElement = document.getElementById("status");
            if (statusElement) {
              statusElement.textContent = "Rating updated to: thumbs down";
              setTimeout(() => window.close(), 1500);
            }
          }
        });
      });
    }
  } else {
    updateUI(null);
  }
});
//# sourceMappingURL=popup.bundle.js.map
