// source-integration/manager.ts
// Implementation of the integration manager

import { SourceIntegration, IntegrationManager } from './types';
import { loguru } from '../utils/logger';

const logger = loguru.getLogger('integration-manager');

export class SourceIntegrationManager implements IntegrationManager {
  private integrations: Map<string, SourceIntegration> = new Map();

  constructor() {
    logger.info('Source integration manager initialized');
  }

  registerIntegration(integration: SourceIntegration): void {
    if (this.integrations.has(integration.id)) {
      logger.warning(`Integration with ID '${integration.id}' already registered, overwriting`);
    }
    
    this.integrations.set(integration.id, integration);
    logger.info(`Registered integration: ${integration.name} (${integration.id})`);
  }

  getIntegrationForUrl(url: string): SourceIntegration | null {
    for (const integration of this.integrations.values()) {
      if (integration.canHandleUrl(url)) {
        logger.debug(`Found integration for URL '${url}': ${integration.id}`);
        return integration;
      }
    }
    
    logger.debug(`No integration found for URL: ${url}`);
    return null;
  }

  getAllIntegrations(): SourceIntegration[] {
    return Array.from(this.integrations.values());
  }

  getAllContentScriptMatches(): string[] {
    const patterns: string[] = [];
    
    for (const integration of this.integrations.values()) {
      patterns.push(...integration.getContentScriptMatches());
    }
    
    return patterns;
  }
}
