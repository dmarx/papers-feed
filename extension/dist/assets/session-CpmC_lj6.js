const DEFAULT_CONFIG = {
  idleThresholdMinutes: 5,
  minSessionDurationSeconds: 30,
  // Adding more granular control
  requireContinuousActivity: true,
  // If true, resets timer on idle
  logPartialSessions: false,
  // If true, logs sessions even if under minimum duration
  activityUpdateIntervalSeconds: 1
  // How often to update active time
};
async function loadSessionConfig() {
  const items = await chrome.storage.sync.get("sessionConfig");
  return { ...DEFAULT_CONFIG, ...items.sessionConfig };
}
async function saveSessionConfig(config) {
  await chrome.storage.sync.set({
    sessionConfig: {
      idleThresholdMinutes: Number(config.idleThresholdMinutes),
      minSessionDurationSeconds: Number(config.minSessionDurationSeconds),
      requireContinuousActivity: Boolean(config.requireContinuousActivity),
      logPartialSessions: Boolean(config.logPartialSessions),
      activityUpdateIntervalSeconds: Number(config.activityUpdateIntervalSeconds)
    }
  });
}
function getConfigurationInMs(config) {
  return {
    idleThreshold: config.idleThresholdMinutes * 60 * 1e3,
    minSessionDuration: config.minSessionDurationSeconds * 1e3,
    activityUpdateInterval: config.activityUpdateIntervalSeconds * 1e3,
    requireContinuousActivity: config.requireContinuousActivity,
    logPartialSessions: config.logPartialSessions
  };
}

export { DEFAULT_CONFIG as D, getConfigurationInMs as g, loadSessionConfig as l, saveSessionConfig as s };
//# sourceMappingURL=session-CpmC_lj6.js.map
