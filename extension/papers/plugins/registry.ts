// extension/papers/plugins/registry.ts

import { SourcePlugin } from './source_plugin';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('PluginRegistry');

class PluginRegistry {
  private plugins: Map<string, SourcePlugin> = new Map();
  
  register(plugin: SourcePlugin): void {
    if (this.plugins.has(plugin.id)) {
      logger.warning(`Plugin with ID ${plugin.id} already registered, overwriting`);
    }
    this.plugins.set(plugin.id, plugin);
    logger.info(`Registered plugin: ${plugin.name} (${plugin.id})`);
  }
  
  getAll(): SourcePlugin[] {
    return Array.from(this.plugins.values());
  }
  
  get(id: string): SourcePlugin | undefined {
    return this.plugins.get(id);
  }
  
  findForUrl(url: string): { plugin: SourcePlugin; id: string } | null {
    for (const plugin of this.plugins.values()) {
      for (const pattern of plugin.urlPatterns) {
        if (pattern.test(url)) {
          const id = plugin.extractId(url);
          if (id) {
            return { plugin, id };
          }
        }
      }
    }
    return null;
  }
}

// Export singleton instance
export const pluginRegistry = new PluginRegistry();
