// extension/source-integration/index.ts
// Create a barrel file to export all source integrations

import { arxivIntegration } from './arxiv';

// Export all available integrations
export const availableIntegrations = [
  arxivIntegration,
];

// Export individual integrations
export {
  arxivIntegration,
};
