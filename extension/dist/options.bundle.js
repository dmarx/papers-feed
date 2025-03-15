import { l as loadSessionConfig, D as DEFAULT_CONFIG, s as saveSessionConfig } from './assets/session-CR7DXVu2.js';
import './assets/logger-BXFtlJ3r.js';

function setFormValues(settings) {
  if (settings.githubRepo) {
    document.getElementById("repo").value = settings.githubRepo;
  }
  if (settings.githubToken) {
    document.getElementById("token").placeholder = "••••••••••••••••••••••";
  }
  document.getElementById("idleThreshold").value = String(settings.sessionConfig?.idleThresholdMinutes ?? DEFAULT_CONFIG.idleThresholdMinutes);
  document.getElementById("minDuration").value = String(settings.sessionConfig?.minSessionDurationSeconds ?? DEFAULT_CONFIG.minSessionDurationSeconds);
  document.getElementById("requireContinuous").checked = settings.sessionConfig?.requireContinuousActivity ?? DEFAULT_CONFIG.requireContinuousActivity;
  document.getElementById("logPartial").checked = settings.sessionConfig?.logPartialSessions ?? DEFAULT_CONFIG.logPartialSessions;
}
function getFormValues() {
  return {
    githubRepo: document.getElementById("repo").value.trim(),
    githubToken: document.getElementById("token").value.trim(),
    sessionConfig: {
      idleThresholdMinutes: Number(document.getElementById("idleThreshold").value),
      minSessionDurationSeconds: Number(document.getElementById("minDuration").value),
      requireContinuousActivity: document.getElementById("requireContinuous").checked,
      logPartialSessions: document.getElementById("logPartial").checked,
      activityUpdateIntervalSeconds: DEFAULT_CONFIG.activityUpdateIntervalSeconds
      // Keep default
    }
  };
}
function showStatus(message, isError = false) {
  const status = document.getElementById("status");
  if (!status) return;
  status.textContent = message;
  status.className = `status ${isError ? "error" : "success"}`;
  if (!isError) {
    setTimeout(() => {
      if (status) {
        status.textContent = "";
        status.className = "status";
      }
    }, 3e3);
  }
}
async function validateSettings(settings) {
  if (!/^[\w-]+\/[\w-]+$/.test(settings.githubRepo)) {
    throw new Error("Invalid repository format. Use username/repository");
  }
  const response = await fetch(`https://api.github.com/repos/${settings.githubRepo}`, {
    headers: {
      "Authorization": `token ${settings.githubToken}`,
      "Accept": "application/vnd.github.v3+json"
    }
  });
  if (!response.ok) {
    throw new Error("Invalid token or repository. Please check your credentials.");
  }
  const { sessionConfig } = settings;
  if (sessionConfig.idleThresholdMinutes < 1 || sessionConfig.idleThresholdMinutes > 60) {
    throw new Error("Idle threshold must be between 1 and 60 minutes");
  }
  if (sessionConfig.minSessionDurationSeconds < 1 || sessionConfig.minSessionDurationSeconds > 300) {
    throw new Error("Minimum session duration must be between 10 and 300 seconds");
  }
}
async function saveSettings(settings) {
  await chrome.storage.sync.set({
    githubRepo: settings.githubRepo,
    githubToken: settings.githubToken
  });
  await saveSessionConfig(settings.sessionConfig);
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const [storageItems, sessionConfig] = await Promise.all([
      chrome.storage.sync.get(["githubRepo", "githubToken"]),
      loadSessionConfig()
    ]);
    setFormValues({
      ...storageItems,
      sessionConfig
    });
    const saveButton = document.getElementById("save");
    if (saveButton) {
      saveButton.addEventListener("click", async () => {
        try {
          const settings = getFormValues();
          await validateSettings(settings);
          await saveSettings(settings);
          showStatus("Settings saved successfully!");
        } catch (error) {
          showStatus(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, true);
        }
      });
    }
  } catch (error) {
    showStatus(`Error loading settings: ${error instanceof Error ? error.message : "Unknown error"}`, true);
  }
});
//# sourceMappingURL=options.bundle.js.map
