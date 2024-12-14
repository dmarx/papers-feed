// background.js
let GITHUB_TOKEN = ''; // Will need to be set by user
const GITHUB_REPO = ''; // Format: 'username/repo'
const GITHUB_API = 'https://api.github.com';

// Listen for URL changes
chrome.webNavigation.onCompleted.addListener(async (details) => {
  if (details.url.includes('arxiv.org')) {
    const paperData = await processArxivUrl(details.url);
    if (paperData) {
      await logPaperToGithub(paperData);
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
  return {
    arxivId,
    url,
    timestamp: new Date().toISOString(),
    rating: 'novote'
  };
}

async function logPaperToGithub(paperData) {
  const date = new Date();
  const logFileName = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}.json`;
  
  try {
    // First try to get existing file
    const existingContent = await getGithubFile(logFileName);
    let logs = [];
    
    if (existingContent) {
      logs = JSON.parse(atob(existingContent.content));
    }
    
    // Add new entry
    logs.push(paperData);
    
    // Update file on Github
    await updateGithubFile(logFileName, logs, existingContent?.sha);
    
    // Trigger workflow
    await dispatchWorkflow('update-metadata');
  } catch (error) {
    console.error('Error logging to Github:', error);
  }
}

async function getGithubFile(path) {
  try {
    const response = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (response.status === 404) return null;
    return response.json();
  } catch (error) {
    console.error('Error getting file:', error);
    return null;
  }
}

async function updateGithubFile(path, content, sha = null) {
  const body = {
    message: `Update paper log: ${new Date().toISOString()}`,
    content: btoa(JSON.stringify(content, null, 2)),
    ...(sha && { sha })
  };
  
  await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    },
    body: JSON.stringify(body)
  });
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
