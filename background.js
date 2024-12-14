// manifest.json remains the same

// background.js
let GITHUB_TOKEN = ''; // Will need to be set by user
const GITHUB_REPO = ''; // Format: 'username/repo'
const GITHUB_API = 'https://api.github.com';

// Listen for URL changes
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.url.includes('arxiv.org')) {
    const paperData = await processArxivUrl(details.url);
    if (paperData) {
      await createGithubIssue(paperData);
    }
  }
}, {
  url: [{
    hostSuffix: 'arxiv.org'
  }]
});

async function processArxivUrl(url) {
  // Extract arxiv ID from URL
  const match = url.match(/arxiv\.org\/abs\/([0-9.]+)/);
  if (!match) return null;
  
  const arxivId = match[1];
  
  // Fetch paper metadata from arXiv API
  const response = await fetch(`http://export.arxiv.org/api/query?id_list=${arxivId}`);
  const text = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, "text/xml");
  
  const entry = xmlDoc.querySelector("entry");
  if (!entry) return null;
  
  return {
    arxivId,
    url,
    title: entry.querySelector("title")?.textContent?.trim(),
    authors: Array.from(entry.querySelectorAll("author name"))
      .map(author => author.textContent.trim())
      .join(", "),
    abstract: entry.querySelector("summary")?.textContent?.trim(),
    timestamp: new Date().toISOString(),
    rating: 'novote'
  };
}

async function createGithubIssue(paperData) {
  try {
    const issueBody = `
## Paper Details
- **arXiv ID**: ${paperData.arxivId}
- **URL**: ${paperData.url}
- **Authors**: ${paperData.authors}
- **First Read**: ${paperData.timestamp}
- **Initial Rating**: ${paperData.rating}

## Abstract
${paperData.abstract}

## Notes
<!-- Add your notes about the paper here -->

## Metadata
\`\`\`json
${JSON.stringify(paperData, null, 2)}
\`\`\`
`;

    const response = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title: `[Paper] ${paperData.title || paperData.arxivId}`,
        body: issueBody,
        labels: ['paper', `rating:${paperData.rating}`]
      })
    });

    const issueData = await response.json();
    return issueData;
  } catch (error) {
    console.error('Error creating Github issue:', error);
  }
}

// Function to update paper rating
async function updatePaperRating(issueNumber, rating) {
  try {
    // Update issue labels
    await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues/${issueNumber}/labels`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify([
        'paper',
        `rating:${rating}`
      ])
    });

    // Add comment about rating change
    await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        body: `Updated paper rating to: ${rating}`
      })
    });
  } catch (error) {
    console.error('Error updating rating:', error);
  }
}

async function dispatchWorkflow(workflow) {
  await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/dispatches`, {
    method: 'POST',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify({
      event_type: workflow
    })
  });
}
