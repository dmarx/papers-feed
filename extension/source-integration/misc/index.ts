// extension/source-integration/misc/index.ts
/*
 * Catch-all for registering with URL pattern only
 */
import { BaseSourceIntegration } from '../base-source';

export class PnasIntegration extends BaseSourceIntegration {
  readonly id = 'url-misc';
  readonly name = 'misc tracked url';

  readonly contentScriptMatches = [
    "*://*.sciencedirect.com/science/article/abs*",
    "https://philpapers.org/rec/EKRDLL",
  ];

  // upstream BaseSourceIntegration.extractPaperId should default to this behavior when able
  extractPaperId(url: string): string | null {
    const match = url.match(this.urlPatterns[0]);
    return match ? match[1] : null;
  }
}

export const pnasIntegration = new PnasIntegration();
