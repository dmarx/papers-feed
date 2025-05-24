// extension/source-integration/misc/index.ts
/*
 * Catch-all for registering with URL pattern only
 */
import { BaseSourceIntegration } from '../base-source';

export class MiscIntegration extends BaseSourceIntegration {
  readonly id = 'url-misc';
  readonly name = 'misc tracked url';
  
  // URL match patterns for content script registration
  readonly contentScriptMatches = [
    "*://*.sciencedirect.com/science/article/*",
    "*://*.philpapers.org/rec/*",
  ];

  // Convert match patterns to regexes for URL testing
  private readonly urlRegexes = this.contentScriptMatches.map(pattern => 
    this.matchPatternToRegex(pattern)
  );

  canHandleUrl(url: string): boolean {
    return this.urlRegexes.some(regex => regex.test(url));
  }

  private matchPatternToRegex(pattern: string): RegExp {
    // Convert URL match pattern to regex
    // * becomes [^/]* for path segments, ** becomes .* for any characters
    const escaped = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/\\\*/g, '[^/]*') // * matches any chars except /
      .replace(/\[\\^\/\]\*:\/\/\[\\^\/\]\*/g, 'https?://[^/]*') // Handle *://
      .replace(/\\\*\\\*/g, '.*'); // ** matches any characters
    
    return new RegExp(`^${escaped}$`);
  }
}

export const miscIntegration = new MiscIntegration();
