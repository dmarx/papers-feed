// extension/source-integration/misc/index.ts
/*
 * Catch-all for registering with URL pattern only
 */
import { BaseSourceIntegration } from '../base-source';

export class MiscIntegration extends BaseSourceIntegration {
  readonly id = 'url-misc';
  readonly name = 'misc tracked url';

  // add URLs here to track
  readonly contentScriptMatches = [
    "*://*.sciencedirect.com/science/article/*",
    "*://*.philpapers.org/rec/*",
  ];

  canHandleUrl(url: string): boolean {
    return false; //this.contentScriptMatches.some(pattern => pattern.test(url));
  }
  
}

export const miscIntegration = new MiscIntegration();
