// options.js
import { loadSessionConfig, DEFAULT_CONFIG, saveSessionConfig } from './config/session.js';

// Helper to set form field values
function setFormValues(settings) {
  // GitHub settings
  if (settings.githubRepo) {
    document.getElementById('repo').value = settings.githubRepo;
  }
  if (settings.githubToken) {
    // Don't show the actual token, just indicate it's set
    document.getElementById('token').placeholder = '••••••••••••••••••••••';
  }

  // Session settings
  document.getElementById('idleThreshold').value = settings.sessionConfig?.idleThresholdMinutes ?? DEFAULT_CONFIG.idleThresholdMinutes;
  document.getElementById('minDuration').value = settings.sessionConfig?.minSessionDurationSeconds ?? DEFAULT_CONFIG.minSessionDurationSeconds;
  document.getElementById('requireContinuous').checked = settings.sessionConfig?.requireContinuousActivity ?? DEFAULT_CONFIG.requireContinuousActivity;
  document.getElementById('logPartial').checked = settings.sessionConfig?.logPartialSessions ?? DEFAULT_CONFIG.logPartialSessions;
}

// Helper to get form values
function getFormValues() {
  return {
    githubRepo: document.getElementById('repo').value.trim(),
    githubToken: document.getElementById('token').value.trim(),
    sessionConfig: {
      idleThresholdMinutes: Number(document.getElementById('idleThreshold').value),
      minSessionDurationSeconds: Number(document.getElementById('minDuration').value),
      requireContinuousActivity: document.getElementById('requireContinuous').checked,
      logPartialSessions: document.getElementById('logPartial').checked
    }
  };
}

// Display status message
function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.className = `status ${isError ? 'error' : 'success'}`;

  // Clear status after 3 seconds if it's a success message
  if (!isError) {
    setTimeout(() => {
      status.textContent = '';
      status.className = 'status';
    }, 3000);
  }
}

// Validate settings before saving
async function validateSettings(settings) {
  // Validate repository format
  if (!/^[\w-]+\/[\w-]+$/.test(settings.githubRepo)) {
    throw new Error('Invalid repository format. Use username/repository');
  }

  // Validate the token by making a test API call
  const response = await fetch(`https://api.github.com/repos/${settings.githubRepo}`, {
    headers: {
      'Authorization': `token ${settings.githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error('Invalid token or repository. Please check your credentials.');
  }

  // Validate session settings
  const { sessionConfig } = settings;
  if (sessionConfig.idleThresholdMinutes < 1 || sessionConfig.idleThresholdMinutes > 60) {
    throw new Error('Idle threshold must be between 1 and 60 minutes');
  }
  if (sessionConfig.minSessionDurationSeconds < 1 || sessionConfig.minSessionDurationSeconds > 300) {
    throw new Error('Minimum session duration must be between 10 and 300 seconds');
  }
}

// Save settings
async function saveSettings(settings) {
  await chrome.storage.sync.set({
    githubRepo: settings.githubRepo,
    githubToken: settings.githubToken
  });

  await saveSessionConfig(settings.sessionConfig);
}

// Initialize options page
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Load current settings
    const [storageItems, sessionConfig] = await Promise.all([
      chrome.storage.sync.get(['githubRepo', 'githubToken']),
      loadSessionConfig()
    ]);

    // Combine settings and display them
    setFormValues({
      ...storageItems,
      sessionConfig
    });

    // Add save button handler
    document.getElementById('save').addEventListener('click', async () => {
      try {
        const settings = getFormValues();
        await validateSettings(settings);
        await saveSettings(settings);
        showStatus('Settings saved successfully!');
      } catch (error) {
        showStatus(`Error: ${error.message}`, true);
      }
    });

  } catch (error) {
    showStatus(`Error loading settings: ${error.message}`, true);
  }
});