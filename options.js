
// options.js
document.addEventListener('DOMContentLoaded', () => {
  // Load saved settings
  chrome.storage.sync.get(['githubRepo', 'githubToken'], (items) => {
    if (items.githubRepo) {
      document.getElementById('repo').value = items.githubRepo;
    }
    if (items.githubToken) {
      // Don't show the actual token, just indicate it's set
      document.getElementById('token').placeholder = '••••••••••••••••••••••';
    }
  });

  // Save settings
  document.getElementById('save').addEventListener('click', async () => {
    const repo = document.getElementById('repo').value.trim();
    const token = document.getElementById('token').value.trim();
    const status = document.getElementById('status');

    try {
      // Validate repository format
      if (!/^[\w-]+\/[\w-]+$/.test(repo)) {
        throw new Error('Invalid repository format. Use username/repository');
      }

      // Validate the token by making a test API call
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token or repository. Please check your credentials.');
      }

      // Save to Chrome's secure storage
      await chrome.storage.sync.set({
        githubRepo: repo,
        githubToken: token
      });

      status.textContent = 'Settings saved successfully!';
      status.className = 'status success';

      // Clear status after 3 seconds
      setTimeout(() => {
        status.textContent = '';
        status.className = 'status';
      }, 3000);

    } catch (error) {
      status.textContent = `Error: ${error.message}`;
      status.className = 'status error';
    }
  });
});
