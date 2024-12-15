// background.js
let githubToken = '';
let githubRepo = '';
let currentPaperData = null;

// Load credentials when extension starts
async function loadCredentials() {
  const items = await chrome.storage.sync.get(['githubToken', 'githubRepo']);
  githubToken = items.githubToken || '';
  githubRepo = items.githubRepo || '';
  console.log('Credentials loaded:', { hasToken: !!githubToken, hasRepo: !!githubRepo });
}

// Listen for credential changes
chrome.storage.onChanged.addListener((changes) => {
  console.log('Storage changes detected:', Object.keys(changes));
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
  console.log('Navigation detected:', details.url);
  if (details.url.includes('arxiv.org')) {
    console.log('arXiv URL detected, processing...');
    const paperData = await processArxivUrl(details.url);
    if (paperData) {
      console.log('Paper data extracted:', paperData);
      await createGithubIssue(paperData);
    } else {
      console.log('Failed to extract paper data');
    }
  }
}, {
  url: [{
    hostSuffix: 'arxiv.org'
  }]
});

// Message passing between background and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getCurrentPaper') {
    console.log('Popup requested current paper:', currentPaperData);
    sendResponse(currentPaperData);
  }
  return true;
});

async function parseXMLText(xmlText) {
  console.log('Parsing XML response...');
  try {
    // Parse using regex since we're in a service worker
    const getTagContent = (tag, text) => {
      const regex = new RegExp(`<${tag}[^>]*>(.*?)</${tag}>`, 's');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    };
    
    const getAuthors = (text) => {
      const authors = [];
      const regex = /<author>[^]*?<name>([^]*?)<\/name>[^]*?<\/author>/g;
      let match;
      while (match = regex.exec(text)) {
        authors.push(match[1].trim());
      }
      return authors;
    };

    const parsed = {
      title: getTagContent('title', xmlText),
      summary: getTagContent('summary', xmlText),
      authors: getAuthors(xmlText)
    };
    
    console.log('Parsed XML:', parsed);
    return parsed;
    
  } catch (error) {
    console.error('Error parsing XML:', error);
    return null;
  }
}

async function processArxivUrl(url) {
  console.log('Processing URL:', url);
  
  // Extract arxiv ID from URL - support more URL patterns
  const patterns = [
    /arxiv\.org\/abs\/([0-9.]+)/,
    /arxiv\.org\/pdf\/([0-9.]+)\.pdf/,
    /arxiv\.org\/\w+\/([0-9.]+)/
  ];
  
  let arxivId = null;
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      arxivId = match[1];
      break;
    }
  }
  
  if (!arxivId) {
    console.log('No arXiv ID found in URL');
    return null;
  }
  
  console.log('Found arXiv ID:', arxivId);
  
  try {
    const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
    console.log('Fetching from arXiv API:', apiUrl);
    
    const response = await fetch(apiUrl);
    console.log('API response status:', response.status);
    
    const text = await response.text();
    const parsed = await parseXMLText(text);
    
    if (!parsed) {
      console.log('Failed to parse API response');
      return null;
    }
    
    const paperData = {
      arxivId,
      url,
      title: parsed.title,
      authors: parsed.authors.join(", "),
      abstract: parsed.summary,
      timestamp: new Date().toISOString(),
      rating: 'novote'
    };
    
    // Store for popup access
    currentPaperData = paperData;
    console.log('Paper data processed:', paperData);
    
    return paperData;
  } catch (error) {
    console.error('Error processing arXiv URL:', error);
    return null;
  }
}

async function createGithubIssue(paperData) {
  if (!githubToken || !githubRepo) {
    console.error('GitHub credentials not set. Please configure extension options.');
    return;
  }

  try {
    console.log('Creating GitHub issue for paper:', paperData.arxivId);
    
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
    console.log('GitHub issue created successfully:', issueData.html_url);
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
    console.log(`Updating rating for issue ${issueNumber} to ${rating}`);
    
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

    console.log('Rating updated successfully');
  } catch (error) {
    console.error('Error updating rating:', error);
  }
}