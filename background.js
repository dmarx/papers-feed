// background.js
let githubToken = '';
let githubRepo = '';

// Load credentials when extension starts
async function loadCredentials() {
  const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
  githubToken = items.githubToken || '';
  githubRepo = items.githubRepo || '';
}

// Listen for credential changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.githubToken) {
    githubToken = changes.githubToken.newValue;
  }
  if (changes.githubRepo) {
    githubRepo = changes.githubRepo.newValue;
  }
});

// Initialize credentials
loadCredentials();

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
  if (!githubToken || !githubRepo) {
    console.error('GitHub credentials not set. Please configure extension options.');
    return;
  }

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

    const response = await fetch(`https://api.github.com/repos/${githubRepo}/issues`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        title: `[Paper] ${paperData.title || paperData.arxivId}`,
        body: issueBody,
        labels: ['paper', `rating:${paperData.rating}`]
      })
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const issueData = await response.json();
    return issueData;
  } catch (error) {
    console.error('Error creating Github issue:', error);
  }
}

async function updatePaperRating(issueNumber, rating) {
  if (!githubToken || !githubRepo) {
    console.error('GitHub credentials not set. Please configure extension options.');
    return;
  }

  try {
    // Update issue labels
    await fetch(`https://api.github.com/repos/${githubRepo}/issues/${issueNumber}/labels`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify([
        'paper',
        `rating:${rating}`
      ])
    });

    // Add comment about rating change
    await fetch(`https://api.github.com/repos/${githubRepo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
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
