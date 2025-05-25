// extension/source-integration/misc/index.ts
/*
 * Catch-all for registering with URL pattern only
 */
import { BaseSourceIntegration } from '../base-source';

export class MiscIntegration extends BaseSourceIntegration {
  readonly id = 'url-misc';
  readonly name = 'misc tracked url';

  readonly urlPatterns = []; // set this empty to disable attaching the content injection icon thing
    
  // add URLs here to track
  readonly contentScriptMatches = [
    "sciencedirect.com/science/article/",
    "philpapers.org/rec/",
    "proceedings.neurips.cc/paper_files/paper/",
    "journals.sagepub.com/doi/",
    "link.springer.com/article/",
    ".science.org/doi/",
    "journals.aps.org/prx/abstract/",
    "onlinelibrary.wiley.com/doi/",
    //"https://www.cell.com/trends/cognitive-sciences/fulltext/",
    "researchgate.net/publication/",
    "psycnet.apa.org/record/",
    "biorxiv.org/content/",
    "osf.io/preprints/",
    "frontiersin.org/journals/",
    "jstor.org/",
    "proceedings.mlr.press/",
    "journals.plos.org/plosone/article",
    "ieeexplore.ieee.org/document/",
  ];

  canHandleUrl(url: string): boolean {
    return this.contentScriptMatches.some(pattern => url.includes(pattern));
  }
}

export const miscIntegration = new MiscIntegration();
