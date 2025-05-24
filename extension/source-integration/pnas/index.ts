// extension/source-integration/pnas/index.ts
// pnas.org integration with custom metadata extractor

import { BaseSourceIntegration } from '../base-source';
import { PaperMetadata } from '../../papers/types';
import { MetadataExtractor, ExtractedMetadata } from '../metadata-extractor';
import { loguru } from '../../utils/logger';

const logger = loguru.getLogger('nature-integration');


export class PnasIntegration extends BaseSourceIntegration {
  readonly id = 'pnas';
  readonly name = 'PNAS'; 

  readonly urlPatterns = [
    /pnas\.org\/doi\/10\.1073\/pnas\.([0-9]+)/
  ];

  // Content script matches  
  readonly contentScriptMatches = [
    "*://*.pnas.org/doi/*"
  ];

  // upstream BaseSourceIntegration.extractPaperId should default to this behavior when able
  extractPaperId(url: string): string | null {
    const match = url.match(this.urlPatterns[0]);
    return match ? match[1] : null;
  }

export const pnasIntegration = new PnasIntegration();
