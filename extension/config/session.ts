// extension/config/session.ts

// Define the configuration interface
export interface SessionConfig {
    idleThresholdMinutes: number;
    minSessionDurationSeconds: number;
    requireContinuousActivity: boolean;
    logPartialSessions: boolean;
    activityUpdateIntervalSeconds: number;
}

export interface SessionConfigMs {
    idleThreshold: number;
    minSessionDuration: number;
    activityUpdateInterval: number;
    requireContinuousActivity: boolean;
    logPartialSessions: boolean;
}

// Default configuration values
export const DEFAULT_CONFIG: SessionConfig = {
    idleThresholdMinutes: 5,
    minSessionDurationSeconds: 30,
    // Adding more granular control
    requireContinuousActivity: true,  // If true, resets timer on idle
    logPartialSessions: false,        // If true, logs sessions even if under minimum duration
    activityUpdateIntervalSeconds: 1  // How often to update active time
};

// Load session configuration from storage
export async function loadSessionConfig(): Promise<SessionConfig> {
    const items = await chrome.storage.sync.get('sessionConfig');
    return { ...DEFAULT_CONFIG, ...items.sessionConfig };
}

// Save session configuration to storage
export async function saveSessionConfig(config: Partial<SessionConfig>): Promise<void> {
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

// Convert configuration to milliseconds for internal use
export function getConfigurationInMs(config: SessionConfig): SessionConfigMs {
    return {
        idleThreshold: config.idleThresholdMinutes * 60 * 1000,
        minSessionDuration: config.minSessionDurationSeconds * 1000,
        activityUpdateInterval: config.activityUpdateIntervalSeconds * 1000,
        requireContinuousActivity: config.requireContinuousActivity,
        logPartialSessions: config.logPartialSessions
    };
}
