// extension/source-integration/index.ts
// Create a barrel file to export all source integrations

import { arxivIntegration } from './arxiv';
import { genericIntegration } from './generic';

// Export all available integrations
export const availableIntegrations = [
  arxivIntegration,
  genericIntegration
];

// Export individual integrations
export {
  arxivIntegration,
  genericIntegration
};
