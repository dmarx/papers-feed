let currentIssueNumber = null;

document.addEventListener('DOMContentLoaded', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab.url.includes('arxiv.org')) {
    const paperData = await processArxivUrl(tab.url);
    if (paperData) {
      document.getElementById('paperTitle').textContent = paperData.title || paperData.arxivId;
      document.getElementById('paperAuthors').textContent = paperData.authors;
      
      document.getElementById('thumbsUp').addEventListener('click', () => updateRating('thumbsup'));
      document.getElementById('thumbsDown').addEventListener('click', () => updateRating('thumbsdown'));
      
      // Show status
      document.getElementById('status').textContent = 'Paper tracked! Issue created on GitHub.';
    }
  }
});

async function updateRating(rating) {
  if (currentIssueNumber) {
    await updatePaperRating(currentIssueNumber, rating);
    document.getElementById('status').textContent = `Rating updated to ${rating}`;
    setTimeout(() => window.close(), 1500);
  }
}
