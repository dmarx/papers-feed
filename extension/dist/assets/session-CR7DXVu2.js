import { l as loguru } from './logger-BXFtlJ3r.js';

const logger = loguru.getLogger("session-config");
const DEFAULT_CONFIG = {
  idleThresholdMinutes: 5,
  minSessionDurationSeconds: 30,
  requireContinuousActivity: true,
  // If true, resets timer on idle
  logPartialSessions: false,
  // If true, logs sessions even if under minimum duration
  activityUpdateIntervalSeconds: 1
  // How often to update active time
};
async function loadSessionConfig() {
  try {
    const items = await chrome.storage.sync.get("sessionConfig");
    const config = { ...DEFAULT_CONFIG, ...items.sessionConfig };
    logger.debug("Loaded session config", config);
    return config;
  } catch (error) {
    logger.error("Error loading session config", error);
    return DEFAULT_CONFIG;
  }
}
async function saveSessionConfig(config) {
  try {
    const sanitizedConfig = {
      idleThresholdMinutes: Number(config.idleThresholdMinutes),
      minSessionDurationSeconds: Number(config.minSessionDurationSeconds),
      requireContinuousActivity: Boolean(config.requireContinuousActivity),
      logPartialSessions: Boolean(config.logPartialSessions),
      activityUpdateIntervalSeconds: Number(config.activityUpdateIntervalSeconds)
    };
    await chrome.storage.sync.set({ sessionConfig: sanitizedConfig });
    logger.debug("Saved session config", sanitizedConfig);
  } catch (error) {
    logger.error("Error saving session config", error);
    throw error;
  }
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
//# sourceMappingURL=session-CR7DXVu2.js.map
